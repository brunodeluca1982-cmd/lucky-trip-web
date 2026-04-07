/**
 * stripeClient.ts
 *
 * Provides authenticated Stripe SDK client and StripeSync instance.
 * Credentials are read from environment variables:
 *   STRIPE_SECRET_KEY          — Stripe secret key (required)
 *   STRIPE_WEBHOOK_SECRET      — Webhook signing secret (required for webhook validation)
 *   DATABASE_URL               — Replit PostgreSQL connection string (required for stripe-replit-sync)
 *
 * IMPORTANT: never cache the Stripe client — this function must be called fresh on every request.
 */

import Stripe from "stripe";
import { StripeSync } from "stripe-replit-sync";

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`${name} environment variable is required`);
  return val;
}

/**
 * Returns a fresh, authenticated Stripe client.
 * Call on every request — never cache the result.
 */
export async function getUncachableStripeClient(): Promise<Stripe> {
  const secretKey = requireEnv("STRIPE_SECRET_KEY");
  return new Stripe(secretKey, { apiVersion: "2025-06-30.basil" });
}

let _stripeSync: StripeSync | null = null;

/**
 * Returns a StripeSync instance for webhook processing and backfill.
 * Cached after first creation (connection pool is long-lived).
 */
export async function getStripeSync(): Promise<StripeSync> {
  if (_stripeSync) return _stripeSync;

  const stripeSecretKey     = requireEnv("STRIPE_SECRET_KEY");
  const stripeWebhookSecret = process.env["STRIPE_WEBHOOK_SECRET"];
  const databaseUrl         = requireEnv("DATABASE_URL");

  _stripeSync = new StripeSync({
    stripeSecretKey,
    stripeWebhookSecret,
    databaseUrl,
  });

  return _stripeSync;
}
