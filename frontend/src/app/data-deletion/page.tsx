import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Deletion Request — Unpress",
  description:
    "Request deletion of any personal data Unpress holds about you. Most data never reaches our servers — your backup is processed entirely in your browser.",
};

const UPDATED = "July 5, 2026";

export default function DataDeletion() {
  return (
    <main className="legal-page">
      <section className="section">
        <h1 className="section-title">Data Deletion Request</h1>
        <p className="lp-meta">Last updated: {UPDATED}</p>

        <p className="lp-lead">
          Unpress is built so that <strong>your backup file and its contents never leave your browser</strong> —
          there is nothing for us to delete on your behalf for that data. The small amount of
          personal data we do hold is described below, along with how to request its deletion.
        </p>

        <h2 className="lp-h2">What data we actually hold</h2>
        <ul className="lp-ul">
          <li>
            <strong>Server logs</strong> — Netlify (our host) retains standard server logs containing
            IP addresses, browser type, and request timestamps. These are used for security and abuse
            prevention and are automatically deleted after a limited retention period.
          </li>
          <li>
            <strong>Payment records</strong> — if you made a purchase, Stripe or PayPal hold your
            payment details under their own privacy policies. We receive only a session or order ID
            confirming that a payment succeeded, plus a record of the transaction amount. These are
            retained as required for tax and accounting obligations.
          </li>
          <li>
            <strong>Email correspondence</strong> — if you contacted us by email, we hold what you
            chose to send.
          </li>
          <li>
            <strong>On-device storage</strong> — a small rate-limit counter stored in your
            browser&apos;s local storage stays entirely on your device. To clear it yourself:
            open your browser&apos;s developer tools → Application → Local Storage →
            delete the <code>unpress_rl</code> key.
          </li>
        </ul>

        <h2 className="lp-h2">How to request deletion</h2>
        <p>
          Email us at{" "}
          <a href="mailto:legal@wpunpress.com?subject=Data%20Deletion%20Request">
            legal@wpunpress.com
          </a>{" "}
          with the subject line <strong>Data Deletion Request</strong>. Include enough detail to
          identify your records (for example, the email address you used to contact us, or the
          approximate date of a purchase). We will respond within <strong>30 days</strong>.
        </p>

        <h2 className="lp-h2">Payment data held by Stripe or PayPal</h2>
        <p>
          Payment details are held by Stripe and PayPal under their own privacy policies. To
          request deletion of data they hold, contact them directly:
        </p>
        <ul className="lp-ul">
          <li>
            <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">
              Stripe Privacy Policy
            </a>{" "}
            — includes instructions for exercising data rights.
          </li>
          <li>
            <a href="https://www.paypal.com/us/legalhub/privacy-full" target="_blank" rel="noopener noreferrer">
              PayPal Privacy Statement
            </a>{" "}
            — includes instructions for exercising data rights.
          </li>
        </ul>

        <h2 className="lp-h2">Your rights</h2>
        <p>
          Under GDPR and CCPA you have the right to access, correct, erase, restrict, object to,
          or port your personal data. Because we never receive your backup content, these rights
          apply only to the limited data described above. We do not sell personal data.
        </p>

        <h2 className="lp-h2">Contact</h2>
        <p>
          Questions about this page or our privacy practices?{" "}
          <a href="mailto:legal@wpunpress.com">legal@wpunpress.com</a> or see our full{" "}
          <a href="/privacy-policy">Privacy Policy</a>.
        </p>
      </section>
    </main>
  );
}
