import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { WebhookHandlers } from "./webhookHandlers.js";
import { getUncachableStripeClient } from "./stripeClient.js";
import { storage } from "./storage.js";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());

// ── Stripe webhook — MUST be registered BEFORE express.json() ────────────────
// Stripe requires the raw body Buffer for signature verification.
// Using express.raw() here only for this path; all other routes use express.json().
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;

    if (!sig) {
      logger.warn("Stripe webhook received without signature header");
      return res.status(400).json({ error: "Missing stripe-signature header" });
    }

    // 1. Let stripe-replit-sync process + sync the event to the stripe schema
    try {
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
    } catch (err: any) {
      logger.error({ err }, "stripe-replit-sync processWebhook failed");
      return res.status(400).json({ error: "Webhook processing failed" });
    }

    // 2. Business logic: update user_subscriptions based on the event
    const webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"];
    if (webhookSecret) {
      try {
        const stripe = await getUncachableStripeClient();
        const event = stripe.webhooks.constructEvent(req.body as Buffer, sig, webhookSecret);

        await handleSubscriptionWebhook(event);
      } catch (err: any) {
        // Non-fatal: log but still return 200 so Stripe doesn't retry
        logger.error({ err }, "Subscription webhook business-logic handler failed");
      }
    }

    res.json({ received: true });
  }
);

// ── Standard middleware ───────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;

// ── Webhook business logic ────────────────────────────────────────────────────

async function handleSubscriptionWebhook(event: any) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode !== "subscription") break;

      const customerId     = session.customer as string;
      const subscriptionId = session.subscription as string;

      // Find user by Stripe customer ID and update their subscription record
      const sub = await storage.getSubscriptionByCustomerId(customerId);
      if (sub) {
        await storage.upsertUserSubscription(sub.user_id, {
          stripe_subscription_id: subscriptionId,
          subscription_status:    "active",
        });
        logger.info({ userId: sub.user_id, subscriptionId }, "Subscription activated via checkout");
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object;
      const customerId   = subscription.customer as string;
      const sub          = await storage.getSubscriptionByCustomerId(customerId);

      if (sub) {
        await storage.upsertUserSubscription(sub.user_id, {
          stripe_subscription_id: subscription.id,
          subscription_status:    subscription.status,
          plan_type:              subscription.items?.data?.[0]?.price?.recurring?.interval ?? null,
        });
        logger.info(
          { userId: sub.user_id, status: subscription.status },
          "Subscription status updated"
        );
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const customerId   = subscription.customer as string;
      const sub          = await storage.getSubscriptionByCustomerId(customerId);

      if (sub) {
        await storage.upsertUserSubscription(sub.user_id, {
          stripe_subscription_id: subscription.id,
          subscription_status:    "canceled",
        });
        logger.info({ userId: sub.user_id }, "Subscription canceled");
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice    = event.data.object;
      const customerId = invoice.customer as string;
      const sub        = await storage.getSubscriptionByCustomerId(customerId);

      if (sub) {
        await storage.upsertUserSubscription(sub.user_id, {
          subscription_status: "past_due",
        });
        logger.info({ userId: sub.user_id }, "Invoice payment failed — marked past_due");
      }
      break;
    }

    default:
      // Unhandled event type — not an error
      break;
  }
}
