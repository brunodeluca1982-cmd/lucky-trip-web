/**
 * storage.ts
 *
 * All data goes through Replit PostgreSQL (no Supabase DDL needed):
 *
 *   stripe.*            — synced by stripe-replit-sync (read-only)
 *   public.user_subscriptions — user ↔ Stripe customer/subscription mapping (read-write)
 *
 * Drizzle ORM via @workspace/db.
 */

import { eq, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { userSubscriptionsTable, type UserSubscription } from "@workspace/db/schema";

export type { UserSubscription };

export class Storage {

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
}

export const storage = new Storage();
