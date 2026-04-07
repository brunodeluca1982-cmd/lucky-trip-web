#!/usr/bin/env node
/**
 * One-time script: creates Lucky Pro products + prices in Stripe.
 * Run from the workspace root: node artifacts/api-server/scripts/seed-stripe-products.mjs
 *
 * Plans:
 *   - Lucky Pro Anual   → BRL R$97.00 / year
 *   - Lucky Pro Mensal  → BRL R$29.90 / month
 */

// ── Fetch Stripe secret via Replit Connectors API ─────────────────────────────

async function getStripeSecretKey() {
  const hostname = process.env["REPLIT_CONNECTORS_HOSTNAME"];
  const replIdentity = process.env["REPL_IDENTITY"];
  const webReplRenewal = process.env["WEB_REPL_RENEWAL"];
  const token = replIdentity
    ? "repl " + replIdentity
    : webReplRenewal
    ? "depl " + webReplRenewal
    : null;

  if (!hostname || !token) {
    throw new Error("REPLIT_CONNECTORS_HOSTNAME / REPL_IDENTITY not available");
  }

  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set("include_secrets", "true");
  url.searchParams.set("connector_names", "stripe");
  url.searchParams.set("target_env", "development");

  const res = await fetch(url.toString(), {
    headers: { "X-Replit-Token": token },
  });

  if (!res.ok) throw new Error(`Connectors API error: ${res.status} ${await res.text()}`);

  const json = await res.json();
  const item = json?.items?.[0];
  if (!item?.settings?.secret) throw new Error("No secret in Stripe connection settings");
  return item.settings.secret;
}

// ── Stripe REST helper ────────────────────────────────────────────────────────

async function stripePost(secretKey, path, body) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) {
    if (v !== undefined && v !== null) params.append(k, String(v));
  }

  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(`Stripe error on ${path}: ${json.error?.message}`);
  return json;
}

async function stripeGet(secretKey, path) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Stripe error on ${path}: ${json.error?.message}`);
  return json;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Fetching Stripe credentials…");
  const secretKey = await getStripeSecretKey();
  console.log("Got credentials");

  // Check existing products to avoid duplicates
  const existing = await stripeGet(secretKey, "products?active=true&limit=20");
  const existingNames = existing.data.map((p) => p.name);
  console.log("Existing products:", existingNames.length > 0 ? existingNames : "(none)");

  const plans = [
    {
      name:     "Lucky Pro Anual",
      desc:     "Acesso total ao Lucky Trip por um ano. R$97 cobrados anualmente.",
      amount:   9700,   // in centavos
      currency: "brl",
      interval: "year",
      label:    "annual",
    },
    {
      name:     "Lucky Pro Mensal",
      desc:     "Acesso total ao Lucky Trip por mês. Cancele quando quiser.",
      amount:   2990,   // in centavos
      currency: "brl",
      interval: "month",
      label:    "monthly",
    },
  ];

  for (const plan of plans) {
    if (existingNames.includes(plan.name)) {
      console.log(`⏭  Skipping "${plan.name}" — already exists`);
      continue;
    }

    console.log(`Creating product "${plan.name}"…`);
    const product = await stripePost(secretKey, "products", {
      name:        plan.name,
      description: plan.desc,
      "metadata[plan_type]": "premium",
      "metadata[label]":     plan.label,
    });
    console.log(`  → product id: ${product.id}`);

    const price = await stripePost(secretKey, "prices", {
      product:                      product.id,
      unit_amount:                  plan.amount,
      currency:                     plan.currency,
      "recurring[interval]":        plan.interval,
      "recurring[interval_count]":  1,
      "metadata[plan_type]":        "premium",
      "metadata[label]":            plan.label,
    });
    console.log(`  → price id: ${price.id} (${plan.interval})`);
  }

  console.log("\n✅ Done. Restart the API server so stripe-replit-sync picks up the new products.");
}

main().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});
