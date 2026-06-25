# Go-live runbook

No code changes are needed to go live — only configuration. Do a **test pass
first** (Step 0), then flip to live keys.

## Step 0 — Test the full payment → download FIRST (strongly recommended)

1. Get **test** keys: Stripe (test mode) publishable `pk_test_…` + secret `sk_test_…`;
   PayPal **Sandbox** app client id + secret.
2. Put them in `frontend/.env.local` (see `.env.example`) with `PAYPAL_ENV=sandbox`.
3. Run the functions + app locally:
   ```
   cd frontend && npx netlify dev
   ```
4. Recover a backup → Download → pay with Stripe test card `4242 4242 4242 4242`
   (any future expiry / CVC) or a PayPal sandbox account → confirm the `.zip`
   downloads. Both methods.

Only when that's green, continue.

## Step 1 — Get live keys

- **Stripe** → Dashboard (toggle **test mode OFF**) → Developers → API keys →
  copy `pk_live_…` and `sk_live_…`.
- **PayPal** → developer.paypal.com → Apps & Credentials → **Live** → your app →
  Client ID + Secret.

## Step 2 — Set env vars in Netlify

Site configuration → **Environment variables** → add (mark the secrets as secret):

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_…` |
| `STRIPE_SECRET_KEY` | `sk_live_…` |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | live client id |
| `PAYPAL_CLIENT_ID` | live client id |
| `PAYPAL_SECRET` | live secret |
| `PAYPAL_ENV` | `live` |

The `NEXT_PUBLIC_*` vars are baked at build time → **trigger a redeploy** after
adding them (Deploys → Trigger deploy → Clear cache and deploy site).

## Step 3 — Custom domain (wpunpress.com)

Netlify → **Domain management** → Add custom domain → `wpunpress.com`:
- Easiest: use **Netlify DNS** (point your registrar's nameservers to Netlify), or
- add the **A / CNAME** records Netlify shows at your current DNS host.
- Netlify auto-provisions HTTPS (Let's Encrypt) once DNS resolves.

## Step 4 — Verify in production

- Hard-refresh `https://wpunpress.com` (Ctrl/Cmd+Shift+R).
- Confirm the checkout modal shows the Card + PayPal options (not "not configured").
- Do one real purchase to confirm end-to-end, then refund yourself in Stripe/PayPal.

## Notes

- The site, recovery, previews and legal pages work **without** payment keys — the
  checkout just shows "payments aren't configured" until the env vars are set.
- No webhooks are required: payment is confirmed synchronously (verify-stripe /
  capture-paypal) before the download is released.
