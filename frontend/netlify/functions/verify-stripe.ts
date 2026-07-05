import type { Handler } from "@netlify/functions";
import Stripe from "stripe";
import { z } from "zod";
import { json, parseBody } from "./_lib";

const Body = z.object({
  sessionId: z.string().regex(/^cs_(test|live)_/, "Invalid session ID format"),
});

// Server-side confirmation that a Stripe session was actually paid. Never trust
// the client for entitlement — this is the source of truth.
export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return json(503, { error: "Stripe is not configured." });

  const parsed = Body.safeParse(parseBody(event.body));
  if (!parsed.success) return json(400, { error: "Invalid request body." });
  const { sessionId } = parsed.data;

  const stripe = new Stripe(key);
  try {
    const s = await stripe.checkout.sessions.retrieve(sessionId);
    return json(200, {
      paid: s.payment_status === "paid",
      store: s.metadata?.store === "1",
    });
  } catch (err) {
    console.error("[verify-stripe]", err);
    return json(502, { error: "Could not confirm payment. Please try again." });
  }
};
