/**
 * stripeInit.ts
 *
 * Called once on server startup to:
 *   1. Run stripe-replit-sync migrations (creates/updates the stripe schema in Replit PostgreSQL)
 *   2. Instantiate StripeSync
 *   3. Register / verify the managed webhook endpoint with Stripe
 *   4. Run a backfill of all Stripe objects into the local stripe schema
 *
 * This is a non-blocking best-effort init. If STRIPE_SECRET_KEY is not set,
 * initialization is skipped with a warning (so the server still boots in dev).
 */

import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./stripeClient.js";
import { logger } from "./lib/logger.js";

export async function initStripe(): Promise<void> {
  const stripeKey = process.env["STRIPE_SECRET_KEY"];
  if (!stripeKey) {
    logger.warn("STRIPE_SECRET_KEY is not set — skipping Stripe initialization");
    return;
  }

  const databaseUrl = process.env["DATABASE_URL"];
  if (!databaseUrl) {
    logger.warn("DATABASE_URL is not set — skipping Stripe initialization");
    return;
  }

  try {
    logger.info("Running stripe-replit-sync migrations…");
    await runMigrations({ databaseUrl });
    logger.info("stripe-replit-sync migrations complete");
  } catch (err) {
    logger.error({ err }, "stripe-replit-sync migrations failed");
    return;
  }

  let sync;
  try {
    sync = await getStripeSync();
  } catch (err) {
    logger.error({ err }, "Failed to initialize StripeSync");
    return;
  }

  // Register managed webhook (auto-creates an endpoint in Stripe if not present)
  const rawDomains = process.env["REPLIT_DOMAINS"] ?? "";
  const domain = rawDomains.split(",")[0]?.trim();
  if (domain) {
    const webhookUrl = `https://${domain}/api/stripe/webhook`;
    try {
      logger.info({ webhookUrl }, "Registering managed Stripe webhook…");
      await (sync as any).findOrCreateManagedWebhook?.(webhookUrl);
      logger.info("Stripe webhook registered");
    } catch (err) {
      // Non-fatal — webhook may already be registered
      logger.warn({ err }, "Stripe managed webhook registration skipped");
    }
  } else {
    logger.warn("REPLIT_DOMAINS is not set — skipping webhook registration");
  }

  // Backfill Stripe data into the local stripe schema
  try {
    logger.info("Starting Stripe backfill…");
    await (sync as any).syncBackfill?.();
    logger.info("Stripe backfill complete");
  } catch (err) {
    logger.warn({ err }, "Stripe backfill failed (non-fatal)");
  }
}
