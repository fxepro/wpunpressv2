import type { Handler } from "@netlify/functions";
import { z } from "zod";
import { json, parseBody, paypalBase, paypalToken } from "./_lib";

const Body = z.object({
  orderId: z.string().min(1).max(64).regex(/^[A-Z0-9]+$/, "Invalid order ID format"),
});

// Captures (charges) an approved PayPal order. Source of truth for entitlement.
export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const parsed = Body.safeParse(parseBody(event.body));
  if (!parsed.success) return json(400, { error: "Invalid request body." });
  const { orderId } = parsed.data;
  try {
    const token = await paypalToken();
    const res = await fetch(`${paypalBase()}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    });
    const data = (await res.json()) as { status?: string };
    return json(200, { paid: data.status === "COMPLETED" });
  } catch (err) {
    console.error("[capture-paypal-order]", err);
    return json(503, { error: "Could not complete payment. Please try again." });
  }
};
