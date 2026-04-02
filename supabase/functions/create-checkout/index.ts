/**
 * create-checkout/index.ts
 *
 * Creates a Stripe Checkout Session for Lucky premium plan.
 * Requires STRIPE_SECRET_KEY Supabase secret.
 *
 * Accepts: { deviceId, plan?, priceId?, successUrl?, cancelUrl? }
 *   - plan: "annual" | "monthly" | "weekly" (maps to STRIPE_PRICE_ID_ANNUAL etc)
 *   - priceId: explicit Stripe price ID (overrides plan)
 *   - successUrl/cancelUrl: optional, falls back to env SUCCESS_URL / CANCEL_URL
 *
 * NOTE: Uses Deno.serve (not imported serve) — required for current Supabase Edge Runtime.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_ENV_MAP: Record<string, string> = {
  annual:  "STRIPE_PRICE_ID_ANNUAL",
  monthly: "STRIPE_PRICE_ID_MONTHLY",
  weekly:  "STRIPE_PRICE_ID_WEEKLY",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── 1. Stripe key ────────────────────────────────────────────────────────
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "STRIPE_SECRET_KEY not configured in Supabase secrets." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 503 },
      );
    }

    // ── 2. Parse body ────────────────────────────────────────────────────────
    let body: Record<string, string> = {};
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    const { deviceId, plan, priceId: explicitPriceId, successUrl, cancelUrl } = body;

    if (!deviceId) {
      return new Response(
        JSON.stringify({ error: "deviceId is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    // ── 3. Resolve priceId ───────────────────────────────────────────────────
    let targetPriceId = explicitPriceId;

    if (!targetPriceId && plan && PLAN_ENV_MAP[plan]) {
      targetPriceId = Deno.env.get(PLAN_ENV_MAP[plan]) ?? "";
    }

    if (!targetPriceId) {
      targetPriceId = Deno.env.get("STRIPE_PRICE_ID") ?? "";
    }

    if (!targetPriceId) {
      return new Response(
        JSON.stringify({
          error:         "No Stripe price ID configured. Set STRIPE_PRICE_ID_ANNUAL / STRIPE_PRICE_ID_MONTHLY / STRIPE_PRICE_ID_WEEKLY or STRIPE_PRICE_ID in Supabase secrets.",
          received_plan: plan ?? null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 503 },
      );
    }

    // ── 4. Resolve redirect URLs ─────────────────────────────────────────────
    const resolvedSuccessUrl =
      successUrl ||
      Deno.env.get("SUCCESS_URL") ||
      "https://theluckytrip.com/success";

    const resolvedCancelUrl =
      cancelUrl ||
      Deno.env.get("CANCEL_URL") ||
      "https://theluckytrip.com/subscription";

    // ── 5. Call Stripe ───────────────────────────────────────────────────────
    const params = new URLSearchParams({
      "mode":                                    "subscription",
      "line_items[0][price]":                    targetPriceId,
      "line_items[0][quantity]":                 "1",
      "success_url":                             resolvedSuccessUrl,
      "cancel_url":                              resolvedCancelUrl,
      "metadata[device_id]":                     deviceId,
      "subscription_data[metadata][device_id]":  deviceId,
    });

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method:  "POST",
      headers: {
        "Authorization": `Bearer ${stripeKey}`,
        "Content-Type":  "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const session = await stripeRes.json();

    if (!stripeRes.ok) {
      return new Response(
        JSON.stringify({
          error:         session.error?.message ?? "Stripe API error",
          stripe_code:   session.error?.code ?? null,
          stripe_type:   session.error?.type ?? null,
          price_id_used: targetPriceId,
        }),
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
