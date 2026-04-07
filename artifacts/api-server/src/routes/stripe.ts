/**
 * routes/stripe.ts
 *
 * Stripe-related API routes. All routes except /products are auth-guarded
 * using the Supabase JWT from the Authorization header.
 *
 * Endpoints:
 *   GET  /api/stripe/products       — list active products + prices (public)
 *   POST /api/stripe/checkout       — create Stripe Checkout session (auth required)
 *   GET  /api/stripe/subscription   — get user's subscription status (auth required)
 *   POST /api/stripe/portal         — create billing portal session (auth required)
 */

import { Router, type Request, type Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { storage } from "../storage.js";
import { stripeService } from "../stripeService.js";
import { logger } from "../lib/logger.js";

const router = Router();

// ── Supabase auth helper ──────────────────────────────────────────────────────

async function getUserFromRequest(req: Request): Promise<{ id: string; email?: string } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);

  const url = process.env["SUPABASE_URL"];
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !serviceKey) return null;

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email };
}

function requireAuth(handler: (req: Request & { user: { id: string; email?: string } }, res: Response) => Promise<void>) {
  return async (req: Request, res: Response) => {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    await handler(Object.assign(req, { user }), res);
  };
}

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
      const { price_id: priceId, success_url, cancel_url } = req.body as {
        price_id: string;
        success_url?: string;
        cancel_url?: string;
      };

      if (!priceId) {
        return res.status(400).json({ error: "price_id is required" }) as any;
      }

      // Build default success/cancel URLs from Replit domain
      const domain = process.env["REPLIT_DOMAINS"]?.split(",")[0];
      const baseUrl = domain ? `https://${domain}` : "https://example.com";
      const successUrl = success_url ?? `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl  = cancel_url  ?? `${baseUrl}/checkout/cancel`;

      // Find or create Stripe customer linked to this Supabase user
      let sub = await storage.getUserSubscription(req.user.id);
      let customerId = sub?.stripe_customer_id ?? null;

      if (!customerId) {
        const customer = await stripeService.createCustomer(req.user.email ?? "", req.user.id);
        customerId = customer.id;
        await storage.upsertUserSubscription(req.user.id, {
          stripe_customer_id: customerId,
        });
        logger.info({ userId: req.user.id, customerId }, "Stripe customer created");
      }

      const session = await stripeService.createCheckoutSession(
        customerId,
        priceId,
        successUrl,
        cancelUrl,
        req.user.email,
      );

      logger.info({ userId: req.user.id, sessionId: session.id }, "Checkout session created");
      res.json({ url: session.url });
    } catch (err: any) {
      logger.error({ err }, "POST /checkout failed");
      res.status(500).json({ error: "Failed to create checkout session" });
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

      // Enrich with live Stripe data from the synced stripe schema
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

      const domain = process.env["REPLIT_DOMAINS"]?.split(",")[0];
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
