/**
 * stripeInit.ts
 *
 * Called once on server startup to:
 *   1. Run stripe-replit-sync migrations (creates/updates the stripe schema in Replit PostgreSQL)
 *   2. Instantiate StripeSync
 *   3. Register / verify the managed webhook endpoint with Stripe
 *   4. Run a backfill of all Stripe objects into the local stripe schema
 *
 * Non-blocking best-effort: if Stripe credentials are unavailable (e.g. connector
 * not yet connected in dev), initialization is skipped with a warning so the server
 * still boots normally.
 */

import { getStripeSync } from "./stripeClient.js";
import { logger } from "./lib/logger.js";

export async function initStripe(): Promise<void> {
  // Check if the Replit connector env vars are present
  const hasConnector =
    !!(process.env["REPL_IDENTITY"] || process.env["WEB_REPL_RENEWAL"]) &&
    !!process.env["REPLIT_CONNECTORS_HOSTNAME"];

  if (!hasConnector) {
    logger.warn("Replit Stripe connector env vars not found — skipping Stripe initialization");
    return;
  }

  const databaseUrl = process.env["DATABASE_URL"];
  if (!databaseUrl) {
    logger.warn("DATABASE_URL is not set — skipping Stripe initialization");
    return;
  }

  // Migrations are run by scripts/run-stripe-migrations.mjs before server boot.
  // (runMigrations uses __dirname internally which breaks inside esbuild bundles)

  // 1. Instantiate StripeSync
  let sync: any;
  try {
    sync = await getStripeSync();
  } catch (err) {
    logger.error({ err }, "Failed to initialize StripeSync");
    return;
  }

  // 3. Register managed webhook
  const rawDomains = process.env["REPLIT_DOMAINS"] ?? "";
  const domain = rawDomains.split(",")[0]?.trim();
  if (domain) {
    const webhookUrl = `https://${domain}/api/stripe/webhook`;
    try {
      logger.info({ webhookUrl }, "Registering managed Stripe webhook…");
      await sync.findOrCreateManagedWebhook?.(webhookUrl);
      logger.info("Stripe webhook registered");
    } catch (err) {
      logger.warn({ err }, "Stripe managed webhook registration skipped (may already exist)");
    }
  } else {
    logger.warn("REPLIT_DOMAINS is not set — skipping webhook registration");
  }

  // 4. Backfill Stripe data
  try {
    logger.info("Starting Stripe backfill…");
    await sync.syncBackfill?.();
    logger.info("Stripe backfill complete");
  } catch (err) {
    logger.warn({ err }, "Stripe backfill failed (non-fatal)");
  }
}
