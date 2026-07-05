import type { Handler } from "@netlify/functions";
import { z } from "zod";
import { checkRateLimit, getClientIp, json, parseBody, paypalBase, paypalToken, totalUsd } from "./_lib";

const Body = z.object({ store: z.boolean().default(false) });

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

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

  try {
    const token = await paypalToken();
    const res = await fetch(`${paypalBase()}/v2/checkout/orders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            description: store ? "Unpress site recovery + store export" : "Unpress site recovery",
            amount: { currency_code: "USD", value: totalUsd(store) },
          },
        ],
      }),
    });
    const data = (await res.json()) as { id?: string };
    if (!data.id) return json(502, { error: "PayPal order failed" });
    return json(200, { id: data.id });
  } catch (err) {
    console.error("[create-paypal-order]", err);
    return json(503, { error: "Could not start checkout. Please try again." });
  }
};
