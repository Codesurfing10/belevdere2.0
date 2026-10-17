import LegalPage, { CONTACT } from '@/components/LegalPage';

export const metadata = { title: 'Refund & Cancellation Policy (Draft) – Belevdere' };

export default function Refunds() {
  return (
    <LegalPage title="Refund & Cancellation Policy">
      <h2>Stays</h2>
      <ul>
        <li>Cancel [7+] days before check-in: full refund of the nightly rate and cleaning fee. Service fee: [refundable / non-refundable – TBD].</li>
        <li>Cancel [2–6] days before check-in: [50%] refund of the nightly rate.</li>
        <li>Cancel within [48 hours] of check-in or no-show: no refund, unless the property manager agrees otherwise.</li>
        <li>If the property is unavailable, materially not as described, or unsafe, contact us within [24 hours] of check-in for a rebooking or full refund.</li>
      </ul>
      <h2>Supplies, equipment, and meals</h2>
      <ul>
        <li>Add-ons cancelled at least [72 hours] before delivery are fully refunded.</li>
        <li>Perishable meals cannot be refunded after preparation begins, except for missing or incorrect orders.</li>
      </ul>
      <h2>Tips</h2>
      <p>Voluntary tips are non-refundable.</p>
      <h2>How refunds are paid</h2>
      <p>Refunds go back to the original payment method (PayPal or card) within [5–10] business days after approval.</p>
      <h2>Requests</h2>
      <p>Email {CONTACT} with your booking ID.</p>
    </LegalPage>
  );
}
