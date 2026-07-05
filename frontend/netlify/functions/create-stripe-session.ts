import type { Handler } from "@netlify/functions";
import Stripe from "stripe";
import { z } from "zod";
import { PRICE, checkRateLimit, getClientIp, json, parseBody } from "./_lib";

const Body = z.object({ store: z.boolean().default(false) });

// Creates an EMBEDDED Stripe Checkout session (no redirect — keeps the user on
// the page so the in-browser recovery isn't lost). Returns a client secret.
export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return json(503, { error: "Stripe is not configured." });

  const parsed = Body.safeParse(parseBody(event.body));
  if (!parsed.success) return json(400, { error: "Invalid request body." });
  const { store } = parsed.data;

  const ip = getClientIp(event.headers as Record<string, string | undefined>);
  const product = store ? "site+store" : "site";
  const rl = await checkRateLimit(ip, product);
  if (!rl.allowed) {
    return json(
      429,
      { error: "Too many checkout attempts. Please wait before trying again." },
      { "Retry-After": String(rl.retryAfter ?? 3600) },
    );
  }

  const stripe = new Stripe(key);

  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      price_data: {
        currency: "usd",
        product_data: { name: "Unpress — full site recovery" },
        unit_amount: PRICE.siteCents,
      },
      quantity: 1,
    },
  ];
  if (store) {
    line_items.push({
      price_data: {
        currency: "usd",
        product_data: { name: "WooCommerce store export" },
        unit_amount: PRICE.storeCents,
      },
      quantity: 1,
    });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      mode: "payment",
      line_items,
      redirect_on_completion: "never",
      metadata: { store: store ? "1" : "0" },
    });
    return json(200, { clientSecret: session.client_secret, sessionId: session.id });
  } catch (err) {
    console.error("[create-stripe-session]", err);
    return json(502, { error: "Could not start checkout. Please try again." });
  }
};
