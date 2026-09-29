'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: Record<string, unknown>) => {
        render: (el: HTMLElement) => Promise<void>;
        close?: () => void;
      };
    };
  }
}

type PayPalStatus = {
  configured: boolean;
  demoMode: boolean;
  clientId: string | null;
  mode: string;
};

interface Props {
  bookingId: string;
  disabled?: boolean;
  onSuccess: (payload: { demoMode: boolean; message: string; amount?: number }) => void;
  onError: (message: string) => void;
  onLoadingChange?: (loading: boolean) => void;
}

function loadPayPalScript(clientId: string, mode: string): Promise<void> {
  const existing = document.getElementById('paypal-sdk');
  if (existing && window.paypal) return Promise.resolve();

  return new Promise((resolve, reject) => {
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('PayPal SDK failed to load')));
      return;
    }
    const script = document.createElement('script');
    script.id = 'paypal-sdk';
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture${mode === 'live' ? '' : ''}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('PayPal SDK failed to load'));
    document.body.appendChild(script);
  });
}

export default function PayPalCheckoutButton({
  bookingId,
  disabled = false,
  onSuccess,
  onError,
  onLoadingChange,
}: Props) {
  const [status, setStatus] = useState<PayPalStatus | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/checkout/paypal');
        const data = await res.json();
        if (!cancelled) setStatus(data);
      } catch {
        if (!cancelled) {
          setStatus({ configured: false, demoMode: true, clientId: null, mode: 'sandbox' });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const runDemoCheckout = useCallback(async () => {
    setDemoLoading(true);
    onLoadingChange?.(true);
    try {
      const res = await fetch('/api/checkout/paypal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        onError(data.error || 'PayPal demo checkout failed.');
        return;
      }
      onSuccess({
        demoMode: !!data.demoMode,
        message: data.message || 'Demo PayPal checkout complete.',
        amount: data.amount,
      });
    } catch {
      onError('Network error during PayPal checkout.');
    } finally {
      setDemoLoading(false);
      onLoadingChange?.(false);
    }
  }, [bookingId, onError, onSuccess, onLoadingChange]);

  useEffect(() => {
    if (!status?.configured || !status.clientId || disabled || renderedRef.current) return;
    if (!buttonsRef.current) return;

    let cancelled = false;

    (async () => {
      try {
        await loadPayPalScript(status.clientId!, status.mode);
        if (cancelled || !buttonsRef.current || !window.paypal) return;

        buttonsRef.current.innerHTML = '';
        window.paypal
          .Buttons({
            style: {
              layout: 'vertical',
              color: 'gold',
              shape: 'rect',
              label: 'paypal',
              height: 44,
              tagline: false,
            },
            createOrder: async () => {
              onLoadingChange?.(true);
              const res = await fetch('/api/checkout/paypal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookingId }),
              });
              const data = await res.json();
              if (!res.ok || data.error || !data.paypalOrderId) {
                onLoadingChange?.(false);
                throw new Error(data.error || 'Could not create PayPal order');
              }
              return data.paypalOrderId as string;
            },
            onApprove: async (data: { orderID: string }) => {
              try {
                const res = await fetch('/api/checkout/paypal/capture', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ bookingId, paypalOrderId: data.orderID }),
                });
                const result = await res.json();
                onLoadingChange?.(false);
                if (!res.ok || result.error) {
                  onError(result.error || 'PayPal capture failed.');
                  return;
                }
                onSuccess({
                  demoMode: false,
                  message: result.message || 'PayPal payment complete.',
                  amount: result.amount,
                });
              } catch {
                onLoadingChange?.(false);
                onError('Network error capturing PayPal payment.');
              }
            },
            onCancel: () => {
              onLoadingChange?.(false);
            },
            onError: () => {
              onLoadingChange?.(false);
              onError('PayPal checkout error. Please try again.');
            },
          })
          .render(buttonsRef.current);
        renderedRef.current = true;
      } catch (e) {
        if (!cancelled) {
          setSdkError(e instanceof Error ? e.message : 'PayPal SDK error');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, bookingId, disabled, onSuccess, onError, onLoadingChange]);

  if (!status) {
    return (
      <div className="w-full min-h-[44px] rounded-xl bg-gray-100 animate-pulse" aria-hidden />
    );
  }

  // Demo / unconfigured: tappable stub button (mobile-friendly)
  if (status.demoMode || !status.clientId) {
    return (
      <div className="w-full space-y-2">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs sm:text-sm text-amber-900 leading-snug">
          <span className="font-semibold">Demo PayPal</span> — no credentials set. Tap below to
          simulate a successful PayPal payment (no charge).
        </div>
        <button
          type="button"
          onClick={runDemoCheckout}
          disabled={disabled || demoLoading}
          className="w-full min-h-[48px] px-4 py-3 rounded-xl font-semibold text-sm sm:text-base
            bg-[#0070ba] text-white hover:bg-[#005ea6] active:bg-[#004c87]
            transition-colors disabled:opacity-50 disabled:cursor-not-allowed
            touch-manipulation flex items-center justify-center gap-2"
        >
          {demoLoading ? (
            'Processing…'
          ) : (
            <>
              <span aria-hidden>🅿️</span>
              <span>Pay with PayPal (Demo)</span>
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      {sdkError && (
        <p className="text-xs text-red-600 leading-snug">{sdkError}</p>
      )}
      <div
        ref={buttonsRef}
        className={`w-full min-h-[48px] ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      />
    </div>
  );
}
