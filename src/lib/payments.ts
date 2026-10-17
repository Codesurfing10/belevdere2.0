/**
 * Payment mode helpers.
 * Demo checkout (marking orders paid without a real charge) is ONLY allowed when
 * DEMO_MODE=true (or 1) is set explicitly. Missing/placeholder keys without
 * DEMO_MODE now fail safe: checkout returns 503 and leaves orders pending.
 */
export function isDemoMode(): boolean {
  const v = (process.env.DEMO_MODE || '').trim().toLowerCase();
  return v === 'true' || v === '1';
}

export function isPlaceholderStripeKey(key: string | undefined): boolean {
  if (!key || !key.trim()) return true;
  const k = key.trim();
  if (k === 'sk_test_placeholder') return true;
  if (k.includes('your_stripe')) return true;
  if (k.startsWith('sk_test_your_') || k.startsWith('sk_live_your_')) return true;
  return false;
}

export const PAYMENTS_NOT_CONFIGURED = {
  error:
    'Payments are not configured yet, so no charge was made and your booking is still pending. Please try again later.',
  code: 'PAYMENTS_NOT_CONFIGURED',
  success: false,
} as const;
