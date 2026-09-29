/**
 * PayPal REST helpers (Orders API v2).
 * When PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET are missing or placeholders,
 * callers should use DEMO_MODE-style stubs instead of these helpers.
 */

export function isPlaceholderPayPalCredential(value: string | undefined): boolean {
  if (!value || !value.trim()) return true;
  const v = value.trim().toLowerCase();
  if (v.includes('your_paypal') || v.includes('your_client') || v.includes('placeholder')) return true;
  if (v === 'client_id' || v === 'client_secret') return true;
  return false;
}

export function isPayPalConfigured(): boolean {
  const forceDemo = process.env.DEMO_MODE === 'true' || process.env.DEMO_MODE === '1';
  if (forceDemo) return false;
  return (
    !isPlaceholderPayPalCredential(process.env.PAYPAL_CLIENT_ID) &&
    !isPlaceholderPayPalCredential(process.env.PAYPAL_CLIENT_SECRET)
  );
}

export function getPayPalMode(): 'sandbox' | 'live' {
  return process.env.PAYPAL_MODE === 'live' ? 'live' : 'sandbox';
}

export function getPayPalApiBase(): string {
  return getPayPalMode() === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

export async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID!.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET!.trim();
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(`${getPayPalApiBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal auth failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error('PayPal auth response missing access_token');
  return data.access_token;
}

export async function createPayPalOrder(opts: {
  amount: number;
  currency?: string;
  description?: string;
  bookingId: string;
  orderId: string;
}): Promise<{ id: string; status: string }> {
  const token = await getPayPalAccessToken();
  const value = opts.amount.toFixed(2);

  const res = await fetch(`${getPayPalApiBase()}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: (opts.currency || 'USD').toUpperCase(),
            value,
          },
          description: opts.description?.slice(0, 127) || 'Belevdere booking',
          custom_id: opts.bookingId,
          invoice_id: opts.orderId,
        },
      ],
      application_context: {
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
        brand_name: 'Belevdere',
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal create order failed (${res.status}): ${text.slice(0, 300)}`);
  }

  return (await res.json()) as { id: string; status: string };
}

export async function capturePayPalOrder(paypalOrderId: string): Promise<{
  id: string;
  status: string;
}> {
  const token = await getPayPalAccessToken();

  const res = await fetch(
    `${getPayPalApiBase()}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal capture failed (${res.status}): ${text.slice(0, 300)}`);
  }

  return (await res.json()) as { id: string; status: string };
}
