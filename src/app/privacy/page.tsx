import LegalPage, { LLC, CONTACT } from '@/components/LegalPage';

export const metadata = { title: 'Privacy Policy (Draft) – Belevdere' };

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy">
      <p>This policy explains how {LLC} (&quot;we&quot;) collects and uses information when you use Belevdere, a short-term rental booking marketplace.</p>
      <h2>Information we collect</h2>
      <ul>
        <li>Booking details you provide: name, email, dates, guest count, and add-on orders (supplies, meals).</li>
        <li>Payment information is collected and processed by our payment processors (PayPal and Stripe). We do not store full card numbers.</li>
        <li>Technical data: IP address, browser type, and cookies used to keep your session and booking secure.</li>
        <li>Location searches you enter (processed with Mapbox for maps and geocoding).</li>
      </ul>
      <h2>How we use it</h2>
      <ul>
        <li>To create and manage bookings and orders, and share necessary details with the property manager for your stay.</li>
        <li>To process payments, prevent fraud and abuse, and provide customer support.</li>
        <li>To meet legal, tax, and accounting obligations.</li>
      </ul>
      <h2>Sharing</h2>
      <p>We share data only with property managers for your booking, service providers (PayPal, Stripe, Mapbox, hosting on Render, error monitoring), and authorities where required by law. We do not sell personal information.</p>
      <h2>Your California privacy rights</h2>
      <p>California residents may request access to, correction of, or deletion of their personal information, and may opt out of any sale or sharing (we do not sell). [Lawyer: confirm CCPA/CPRA applicability and required disclosures.]</p>
      <h2>Retention and security</h2>
      <p>We keep booking records for [X years] for tax and legal purposes. We use reasonable safeguards, but no system is perfectly secure.</p>
      <h2>Children</h2>
      <p>Belevdere is not intended for anyone under 18.</p>
      <h2>Contact</h2>
      <p>Email {CONTACT} to make a privacy request.</p>
    </LegalPage>
  );
}
