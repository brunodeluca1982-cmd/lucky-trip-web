/**
 * create-checkout/index.ts
 *
 * Creates a Stripe Checkout Session for Lucky premium plan.
 * Requires STRIPE_SECRET_KEY Supabase secret.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  deviceId:   string;
  successUrl: string;
  cancelUrl:  string;
  priceId?:   string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "Stripe not configured. Contact support." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 503 },
      );
    }

    const body: RequestBody = await req.json();
    const { deviceId, successUrl, cancelUrl, priceId } = body;

    if (!deviceId || !successUrl || !cancelUrl) {
      return new Response(
        JSON.stringify({ error: "deviceId, successUrl and cancelUrl are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    const targetPriceId = priceId || Deno.env.get("STRIPE_PRICE_ID") || "";
    if (!targetPriceId) {
      return new Response(
        JSON.stringify({ error: "No Stripe price configured." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 503 },
      );
    }

    const params = new URLSearchParams({
      "mode":                          "subscription",
      "line_items[0][price]":          targetPriceId,
      "line_items[0][quantity]":       "1",
      "success_url":                   successUrl,
      "cancel_url":                    cancelUrl,
      "metadata[device_id]":           deviceId,
      "subscription_data[metadata][device_id]": deviceId,
    });

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method:  "POST",
      headers: {
        "Authorization": `Bearer ${stripeKey}`,
        "Content-Type":  "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const session = await res.json();

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: session.error?.message ?? "Stripe error" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
