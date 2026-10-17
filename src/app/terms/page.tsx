import LegalPage, { LLC, CONTACT } from '@/components/LegalPage';

export const metadata = { title: 'Terms of Service (Draft) – Belevdere' };

export default function Terms() {
  return (
    <LegalPage title="Terms of Service">
      <p>These terms govern your use of Belevdere, operated by {LLC}, a California company. By booking or using the site you agree to them.</p>
      <h2>What Belevdere does</h2>
      <p>Belevdere is a marketplace that connects guests with independent property managers for short-term rentals, and lets guests add supplies, equipment, and meal packages. [Lawyer: confirm whether we act as agent of the manager or merchant of record.] Property managers are responsible for their listings, accuracy, safety, licensing, and compliance with local short-term rental rules.</p>
      <h2>Bookings and payment</h2>
      <ul>
        <li>A booking is confirmed only after payment is successfully completed through PayPal or Stripe.</li>
        <li>Prices include nightly rate, cleaning fee, service fee, and any add-ons shown at checkout. Applicable occupancy/lodging taxes: [TBD].</li>
        <li>Cancellations and refunds follow our <a className="underline" href="/refunds">Refund &amp; Cancellation Policy</a>.</li>
      </ul>
      <h2>Guest responsibilities</h2>
      <p>Provide accurate information, follow house rules, respect occupancy limits, and pay for damage you cause.</p>
      <h2>Optional tips</h2>
      <p>Tips sent through our PayPal.me link are voluntary, non-refundable, and do not purchase any goods or services.</p>
      <h2>Disclaimers and limitation of liability</h2>
      <p>The service is provided &quot;as is.&quot; To the extent permitted by law, our total liability for any claim is limited to the amount you paid us for the booking at issue. [Lawyer: review.]</p>
      <h2>Governing law</h2>
      <p>California law governs these terms. Disputes: [venue / arbitration TBD].</p>
      <h2>Changes and contact</h2>
      <p>We may update these terms and will post the new date above. Contact: {CONTACT}.</p>
    </LegalPage>
  );
}
