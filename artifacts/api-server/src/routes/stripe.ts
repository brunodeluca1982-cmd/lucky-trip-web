/**
 * routes/stripe.ts
 *
 * Endpoints:
 *   GET  /api/stripe/products             — list active products + prices (public)
 *   POST /api/stripe/checkout             — create Stripe Checkout session (auth required)
 *   GET  /api/stripe/subscription         — get user's subscription status (auth required)
 *   GET  /api/stripe/verify-session       — verify a checkout session by ID (auth required)
 *   POST /api/stripe/portal               — create billing portal session (auth required)
 *   GET  /api/stripe/publishable-key      — return publishable key for client (public)
 *
 * Auth: Bearer token (Supabase JWT) in Authorization header.
 *
 * Plan name → Stripe price resolution:
 *   "annual"  → first active price with recurring.interval = "year"
 *   "monthly" → first active price with recurring.interval = "month"
 *   "weekly"  → first active price with recurring.interval = "week"
 */

import { Router, type Request, type Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { storage } from "../storage.js";
import { stripeService } from "../stripeService.js";
import { getStripePublishableKey, getUncachableStripeClient } from "../stripeClient.js";
import { logger } from "../lib/logger.js";

const router = Router();

// ── Supabase auth helper ──────────────────────────────────────────────────────

async function getUserFromRequest(req: Request): Promise<{ id: string; email?: string } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);

  const url        = process.env["SUPABASE_URL"];
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !serviceKey) return null;

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email };
}

function requireAuth(
  handler: (req: Request & { user: { id: string; email?: string } }, res: Response) => Promise<void>
) {
  return async (req: Request, res: Response) => {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    await handler(Object.assign(req, { user }), res);
  };
}

// ── Plan name → Stripe interval mapping ──────────────────────────────────────

const PLAN_TO_INTERVAL: Record<string, string> = {
  annual:  "year",
  monthly: "month",
  weekly:  "week",
};

async function resolvePriceId(planOrPriceId: string): Promise<string | null> {
  // If it looks like a Stripe price ID, use it directly
  if (planOrPriceId.startsWith("price_")) return planOrPriceId;

  const interval = PLAN_TO_INTERVAL[planOrPriceId];
  if (!interval) return null;

  // Env-var override (STRIPE_PRICE_ID_ANNUAL, STRIPE_PRICE_ID_MONTHLY, STRIPE_PRICE_ID_WEEKLY)
  const envKey = `STRIPE_PRICE_ID_${planOrPriceId.toUpperCase()}`;
  const envVal = process.env[envKey];
  if (envVal) return envVal;

  // Fall back to looking up from the synced stripe schema
  const price = await storage.getPriceByInterval(interval);
  return price?.id ?? null;
}

// ── GET /api/stripe/publishable-key ──────────────────────────────────────────

router.get("/publishable-key", async (_req, res) => {
  try {
    const key = await getStripePublishableKey();
    res.json({ publishableKey: key });
  } catch (err: any) {
    logger.error({ err }, "GET /publishable-key failed");
    res.status(500).json({ error: "Failed to get publishable key" });
  }
});

// ── GET /api/stripe/products ──────────────────────────────────────────────────

router.get("/products", async (_req, res) => {
  try {
    const rows = await storage.listProductsWithPrices();

    const productsMap = new Map<string, any>();
    for (const row of rows) {
      if (!productsMap.has(row.product_id as string)) {
        productsMap.set(row.product_id as string, {
          id:          row.product_id,
          name:        row.product_name,
          description: row.product_description,
          active:      row.product_active,
          prices:      [],
        });
      }
      if (row.price_id) {
        productsMap.get(row.product_id as string).prices.push({
          id:          row.price_id,
          unit_amount: row.unit_amount,
          currency:    row.currency,
          recurring:   row.recurring,
          active:      row.price_active,
        });
      }
    }

    res.json({ data: Array.from(productsMap.values()) });
  } catch (err: any) {
    logger.error({ err }, "GET /products failed");
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// ── POST /api/stripe/checkout ─────────────────────────────────────────────────

router.post(
  "/checkout",
  requireAuth(async (req, res) => {
    try {
      const { plan, price_id: rawPriceId, success_url, cancel_url } = req.body as {
        plan?:       string;
        price_id?:   string;
        success_url?: string;
        cancel_url?:  string;
      };

      // Resolve price ID: accept either plan name ("annual") or raw price ID ("price_...")
      const planOrId = plan ?? rawPriceId;
      if (!planOrId) {
        return res.status(400).json({ error: "Either 'plan' (annual/monthly/weekly) or 'price_id' is required" }) as any;
      }

      const priceId = await resolvePriceId(planOrId);
      if (!priceId) {
        return res.status(400).json({
          error: `No active Stripe price found for plan "${planOrId}". ` +
            "Create a recurring price in the Stripe dashboard and sync it, or set the " +
            `STRIPE_PRICE_ID_${(planOrId ?? "").toUpperCase()} env var.`,
        }) as any;
      }

      // Build success / cancel URLs
      const domain     = process.env["REPLIT_DOMAINS"]?.split(",")[0];
      const baseUrl    = domain ? `https://${domain}` : "https://example.com";
      const successUrl = success_url
        ?? `${baseUrl}/post-purchase?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl  = cancel_url ?? `${baseUrl}/subscription`;

      // Find or create Stripe customer for this user
      let sub        = await storage.getUserSubscription(req.user.id);
      let customerId = sub?.stripe_customer_id ?? null;

      if (!customerId) {
        const customer = await stripeService.createCustomer(req.user.email ?? "", req.user.id);
        customerId = customer.id;
        await storage.upsertUserSubscription(req.user.id, { stripe_customer_id: customerId });
        logger.info({ userId: req.user.id, customerId }, "Stripe customer created");
      }

      const session = await stripeService.createCheckoutSession(
        customerId,
        priceId,
        successUrl,
        cancelUrl,
        req.user.email,
      );

      logger.info({ userId: req.user.id, sessionId: session.id, plan: planOrId }, "Checkout session created");
      res.json({ url: session.url, session_id: session.id });
    } catch (err: any) {
      logger.error({ err }, "POST /checkout failed");
      res.status(500).json({ error: err.message ?? "Failed to create checkout session" });
    }
  })
);

// ── GET /api/stripe/verify-session ───────────────────────────────────────────
// Called by post-purchase screen to confirm payment + provision premium immediately.
// More reliable than polling because Stripe guarantees the session is paid when
// redirecting to the success_url.

router.get(
  "/verify-session",
  requireAuth(async (req, res) => {
    try {
      const sessionId = req.query.session_id as string;
      if (!sessionId) {
        return res.status(400).json({ error: "session_id query param required" }) as any;
      }

      const stripe  = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["subscription"],
      });

      if (session.payment_status !== "paid") {
        return res.json({ confirmed: false, payment_status: session.payment_status }) as any;
      }

      // Session is paid — ensure the subscription is in user_subscriptions and premium is provisioned
      const customerId = session.customer as string;
      let sub = await storage.getSubscriptionByCustomerId(customerId);

      // If webhook hasn't fired yet, create the record now
      if (!sub) {
        const sub2 = await storage.getUserSubscription(req.user.id);
        if (sub2) {
          sub = sub2;
        }
      }

      if (sub || session.customer) {
        const stripeSubscription = typeof session.subscription === "string"
          ? await stripe.subscriptions.retrieve(session.subscription)
          : (session.subscription as any);

        if (stripeSubscription) {
          const periodEndMs = stripeSubscription.current_period_end * 1000;
          const interval    = stripeSubscription.items.data[0]?.price?.recurring?.interval;

          await storage.upsertUserSubscription(req.user.id, {
            stripe_customer_id:     customerId,
            stripe_subscription_id: stripeSubscription.id,
            subscription_status:    stripeSubscription.status,
            plan_type:              interval ?? null,
          });

          await storage.provisionPremiumInSupabase(req.user.id, periodEndMs, interval);
          logger.info({ userId: req.user.id, sessionId }, "Premium provisioned via verify-session");
        }
      }

      res.json({
        confirmed:           true,
        payment_status:      session.payment_status,
        subscription_status: "active",
      });
    } catch (err: any) {
      logger.error({ err }, "GET /verify-session failed");
      res.status(500).json({ error: err.message ?? "Failed to verify session" });
    }
  })
);

// ── GET /api/stripe/subscription ─────────────────────────────────────────────

router.get(
  "/subscription",
  requireAuth(async (req, res) => {
    try {
      const sub = await storage.getUserSubscription(req.user.id);
      if (!sub?.stripe_subscription_id) {
        return res.json({ subscription: null }) as any;
      }

      const stripeSub = await storage.getSubscriptionFromStripe(sub.stripe_subscription_id);
      res.json({
        subscription: {
          ...sub,
          stripe_data: stripeSub ?? null,
        },
      });
    } catch (err: any) {
      logger.error({ err }, "GET /subscription failed");
      res.status(500).json({ error: "Failed to fetch subscription" });
    }
  })
);

// ── POST /api/stripe/portal ───────────────────────────────────────────────────

router.post(
  "/portal",
  requireAuth(async (req, res) => {
    try {
      const sub = await storage.getUserSubscription(req.user.id);
      if (!sub?.stripe_customer_id) {
        return res.status(400).json({ error: "No Stripe customer found for this user" }) as any;
      }

      const domain    = process.env["REPLIT_DOMAINS"]?.split(",")[0];
      const returnUrl = req.body.return_url ?? (domain ? `https://${domain}` : "https://example.com");

      const portalSession = await stripeService.createCustomerPortalSession(
        sub.stripe_customer_id,
        returnUrl,
      );

      res.json({ url: portalSession.url });
    } catch (err: any) {
      logger.error({ err }, "POST /portal failed");
      res.status(500).json({ error: "Failed to create portal session" });
    }
  })
);

export default router;
