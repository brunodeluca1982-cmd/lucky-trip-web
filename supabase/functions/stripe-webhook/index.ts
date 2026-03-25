/**
 * stripe-webhook/index.ts
 *
 * Handles Stripe webhook events and updates access_levels table.
 * Requires STRIPE_WEBHOOK_SECRET Supabase secret.
 *
 * Listens to:
 *  - checkout.session.completed  → grant premium access (1 year)
 *  - customer.subscription.deleted → revoke premium access
 *  - invoice.payment_failed       → handle gracefully (keep until end of period)
 */

import { serve }        from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret:   string,
): Promise<boolean> {
  try {
    const parts = sigHeader.split(",").reduce<Record<string, string>>((acc, part) => {
      const [k, v] = part.split("=");
      acc[k] = v;
      return acc;
    }, {});

    const timestamp = parts["t"];
    const sig       = parts["v1"];

    if (!timestamp || !sig) return false;

    const signedPayload  = `${timestamp}.${payload}`;
    const keyData        = new TextEncoder().encode(secret);
    const messageData    = new TextEncoder().encode(signedPayload);

    const key = await crypto.subtle.importKey(
      "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
    );

    const signature = await crypto.subtle.sign("HMAC", key, messageData);
    const computed  = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return computed === sig;
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) {
    return new Response("Webhook secret not configured", { status: 503 });
  }

  const payload   = await req.text();
  const sigHeader = req.headers.get("stripe-signature") ?? "";

  const valid = await verifyStripeSignature(payload, sigHeader, webhookSecret);
  if (!valid) {
    return new Response("Invalid signature", { status: 400 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(payload);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const supa = createClient(
    Deno.env.get("SUPABASE_URL")               ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const eventType = event.type as string;
  const obj       = (event.data as Record<string, unknown>)?.object as Record<string, unknown>;

  try {
    if (eventType === "checkout.session.completed") {
      const deviceId = (obj?.metadata as Record<string, string>)?.device_id;
      if (!deviceId) {
        return new Response("No device_id in metadata", { status: 400 });
      }

      const periodEnd = obj?.subscription
        ? null
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

      await supa.from("access_levels").upsert({
        device_id:    deviceId,
        plan_type:    "premium",
        access_until: periodEnd ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at:   new Date().toISOString(),
      });

      await supa.from("subscriptions").upsert({
        device_id:       deviceId,
        stripe_session:  obj?.id as string,
        status:          "active",
        created_at:      new Date().toISOString(),
      }).maybeSingle();
    }

    if (eventType === "customer.subscription.deleted") {
      const deviceId = (obj?.metadata as Record<string, string>)?.device_id;
      if (deviceId) {
        await supa.from("access_levels").update({
          plan_type:    "free",
          access_until: null,
          updated_at:   new Date().toISOString(),
        }).eq("device_id", deviceId);
      }
    }

    if (eventType === "invoice.payment_succeeded" && obj?.subscription) {
      const sub = obj as Record<string, unknown>;
      const deviceId = (sub?.subscription_details as Record<string, unknown>)?.metadata
        ? ((sub.subscription_details as Record<string, unknown>).metadata as Record<string, string>).device_id
        : undefined;

      if (deviceId) {
        const periodEnd = sub?.period_end
          ? new Date((sub.period_end as number) * 1000).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        await supa.from("access_levels").update({
          plan_type:    "premium",
          access_until: periodEnd,
          updated_at:   new Date().toISOString(),
        }).eq("device_id", deviceId);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status:  200,
    });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
    });
  }
});
