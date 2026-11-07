import type { PayPalOrderDetails } from '@/lib/paypal';
import { sameAmount } from '@/lib/money';

export type Expected = { total: number; currency: string; bookingId: string; orderId: string };

/** Checks an approved (not yet captured) PayPal order matches our order before capture. */
export function verifyPayPalOrderBeforeCapture(o: PayPalOrderDetails, e: Expected): string | null {
  const units = o.purchase_units || [];
  if (units.length !== 1) return 'unexpected purchase units';
  const u = units[0];
  if ((u.amount?.currency_code || '').toUpperCase() !== e.currency) return 'currency mismatch';
  if (!sameAmount(u.amount?.value, e.total)) return 'amount mismatch';
  if (u.custom_id && u.custom_id !== e.bookingId) return 'booking mismatch';
  if (u.invoice_id && u.invoice_id !== e.orderId) return 'order mismatch';
  return null;
}

/** Checks the capture response: completed, and captured amount/currency equal our order. */
export function verifyPayPalCapture(c: PayPalOrderDetails, e: Expected): string | null {
  const units = c.purchase_units || [];
  if (units.length !== 1) return 'unexpected purchase units';
  const captures = units[0].payments?.captures || [];
  if (captures.length !== 1) return 'unexpected captures';
  const cap = captures[0];
  if (cap.status !== 'COMPLETED') return `capture not completed`;
  if ((cap.amount?.currency_code || '').toUpperCase() !== e.currency) return 'currency mismatch';
  if (!sameAmount(cap.amount?.value, e.total)) return 'amount mismatch';
  return null;
}
