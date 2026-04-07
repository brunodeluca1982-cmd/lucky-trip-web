/**
 * storage.ts
 *
 * All data goes through Replit PostgreSQL (no Supabase DDL needed):
 *
 *   stripe.*                  — synced by stripe-replit-sync (read-only)
 *   public.user_subscriptions — user ↔ Stripe customer/subscription mapping (read-write)
 *
 * Supabase app_metadata is written via the admin API for premium provisioning.
 * app_metadata is admin-only writeable (not spoofable by the client).
 *
 * Drizzle ORM via @workspace/db.
 */

import { eq, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { userSubscriptionsTable, type UserSubscription } from "@workspace/db/schema";
import { createClient } from "@supabase/supabase-js";

export type { UserSubscription };

// ── Supabase admin client ────────────────────────────────────────────────────

function makeSupabaseAdmin() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ── Storage class ─────────────────────────────────────────────────────────────

export class Storage {

  // ── Webhook secret (cached from stripe._managed_webhooks) ────────────────

  private _webhookSecret: string | null = null;

  async getWebhookSecret(): Promise<string | null> {
    if (this._webhookSecret) return this._webhookSecret;

    // Priority 1: user-supplied env var (works with live keys + manually registered webhooks)
    const envSecret = process.env["STRIPE_WEBHOOK_SECRET"];
    if (envSecret) {
      this._webhookSecret = envSecret;
      return envSecret;
    }

    // Priority 2: stripe-replit-sync managed webhook secret (sandbox/test connector)
    try {
      const result = await db.execute(
        sql`SELECT secret FROM stripe._managed_webhooks LIMIT 1`
      );
      const secret = result.rows[0]?.secret as string | null;
      if (secret) this._webhookSecret = secret;
      return secret ?? null;
    } catch {
      return null;
    }
  }

  // ── Stripe schema reads (stripe-replit-sync, read-only) ──────────────────

  async listProductsWithPrices(active = true) {
    const result = await db.execute(sql`
      SELECT
        p.id           AS product_id,
        p.name         AS product_name,
        p.description  AS product_description,
        p.active       AS product_active,
        p.metadata     AS product_metadata,
        pr.id          AS price_id,
        pr.unit_amount,
        pr.currency,
        pr.recurring,
        pr.active      AS price_active,
        pr.metadata    AS price_metadata
      FROM stripe.products p
      LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
      WHERE p.active = ${active}
      ORDER BY p.created DESC, pr.unit_amount
    `);
    return result.rows;
  }

  async listProducts(active = true) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE active = ${active} ORDER BY created DESC`
    );
    return result.rows;
  }

  async getProduct(productId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE id = ${productId}`
    );
    return result.rows[0] ?? null;
  }

  async getPricesForProduct(productId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.prices WHERE product = ${productId} AND active = true`
    );
    return result.rows;
  }

  async getPrice(priceId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.prices WHERE id = ${priceId}`
    );
    return result.rows[0] ?? null;
  }

  /**
   * Look up first active recurring price matching a billing interval.
   * interval: "year" | "month" | "week"
   * If STRIPE_PRODUCT_ID is set, restricts to prices under that product only.
   */
  async getPriceByInterval(interval: string): Promise<{ id: string } | null> {
    const productId = process.env["STRIPE_PRODUCT_ID"] ?? null;
    const result = productId
      ? await db.execute(sql`
          SELECT id FROM stripe.prices
          WHERE active = true
            AND product = ${productId}
            AND (recurring::jsonb->>'interval') = ${interval}
          ORDER BY created DESC
          LIMIT 1
        `)
      : await db.execute(sql`
          SELECT id FROM stripe.prices
          WHERE active = true
            AND (recurring::jsonb->>'interval') = ${interval}
          ORDER BY created DESC
          LIMIT 1
        `);
    return (result.rows[0] as { id: string } | null) ?? null;
  }

  async getSubscriptionFromStripe(subscriptionId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.subscriptions WHERE id = ${subscriptionId}`
    );
    return result.rows[0] ?? null;
  }

  // ── User subscription reads/writes (Drizzle) ─────────────────────────────

  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    const rows = await db
      .select()
      .from(userSubscriptionsTable)
      .where(eq(userSubscriptionsTable.user_id, userId))
      .limit(1);
    return rows[0] ?? null;
  }

  async upsertUserSubscription(
    userId: string,
    fields: Partial<Omit<UserSubscription, "id" | "user_id" | "created_at" | "updated_at">>
  ): Promise<UserSubscription> {
    const existing = await this.getUserSubscription(userId);

    if (existing) {
      const rows = await db
        .update(userSubscriptionsTable)
        .set({ ...fields, updated_at: new Date() })
        .where(eq(userSubscriptionsTable.user_id, userId))
        .returning();
      return rows[0]!;
    }

    const rows = await db
      .insert(userSubscriptionsTable)
      .values({ user_id: userId, ...fields })
      .returning();
    return rows[0]!;
  }

  async getSubscriptionByCustomerId(stripeCustomerId: string): Promise<UserSubscription | null> {
    const rows = await db
      .select()
      .from(userSubscriptionsTable)
      .where(eq(userSubscriptionsTable.stripe_customer_id, stripeCustomerId))
      .limit(1);
    return rows[0] ?? null;
  }

  // ── Supabase app_metadata (premium provisioning) ──────────────────────────
  // app_metadata is admin-only — cannot be set by the client, so it's tamper-proof.

  /**
   * Grant premium in Supabase app_metadata.
   * @param userId  Supabase auth user ID
   * @param accessUntilMs  Unix timestamp (ms) of subscription end date
   * @param interval  Stripe billing interval ("year" | "month" | "week")
   */
  async provisionPremiumInSupabase(
    userId: string,
    accessUntilMs: number,
    interval?: string,
  ): Promise<void> {
    const sb = makeSupabaseAdmin();
    const { error } = await sb.auth.admin.updateUserById(userId, {
      app_metadata: {
        plan_type:    "premium",
        access_until: new Date(accessUntilMs).toISOString(),
        plan_interval: interval ?? null,
      },
    });
    if (error) throw new Error(`provisionPremiumInSupabase: ${error.message}`);
  }

  /**
   * Revoke premium in Supabase app_metadata.
   */
  async revokePremiumInSupabase(userId: string): Promise<void> {
    const sb = makeSupabaseAdmin();
    const { error } = await sb.auth.admin.updateUserById(userId, {
      app_metadata: {
        plan_type:    null,
        access_until: null,
        plan_interval: null,
      },
    });
    if (error) throw new Error(`revokePremiumInSupabase: ${error.message}`);
  }
}

export const storage = new Storage();
