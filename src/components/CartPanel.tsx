'use client';

import PayPalCheckoutButton from '@/components/PayPalCheckoutButton';

type PayMethod = 'card' | 'paypal';

interface Props {
  booking: any;
  listing: any;
  cartItems: any[];
  order: any;
  onCheckout: () => void;
  checkoutStatus?: 'idle' | 'loading' | 'success' | 'error';
  checkoutMessage?: string | null;
  demoCheckout?: boolean;
  payMethod?: PayMethod;
  onPayMethodChange?: (method: PayMethod) => void;
  onPayPalSuccess?: (payload: { demoMode: boolean; message: string; amount?: number }) => void;
  onPayPalError?: (message: string) => void;
  onPayPalLoadingChange?: (loading: boolean) => void;
}

export default function CartPanel({
  booking,
  listing,
  cartItems,
  order,
  onCheckout,
  checkoutStatus = 'idle',
  checkoutMessage = null,
  demoCheckout = false,
  payMethod = 'card',
  onPayMethodChange,
  onPayPalSuccess,
  onPayPalError,
  onPayPalLoadingChange,
}: Props) {
  if (!booking) {
    return (
      <div className="bg-white rounded-xl shadow-md p-3 sm:p-4 sticky top-16 sm:top-20">
        <h2 className="font-bold text-base sm:text-lg mb-3">🛒 Your Cart</h2>
        <div className="text-center py-6 sm:py-8 text-gray-400">
          <div className="text-3xl sm:text-4xl mb-2">🏠</div>
          <p className="text-sm px-2">Select a listing to start building your order</p>
        </div>
      </div>
    );
  }

  const nights = Math.ceil(
    (new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) /
    (1000 * 60 * 60 * 24)
  );

  const isPaid = checkoutStatus === 'success' || booking.status === 'confirmed' || order?.status === 'paid';
  const isLoading = checkoutStatus === 'loading';

  return (
    <div className="bg-white rounded-xl shadow-md p-3 sm:p-4 sticky top-16 sm:top-20 max-w-full overflow-hidden">
      <h2 className="font-bold text-base sm:text-lg mb-3">🛒 Your Cart</h2>

      {/* Booking summary */}
      <div className="bg-indigo-50 rounded-lg p-3 mb-3">
        <p className="font-semibold text-sm text-indigo-800 break-words">{listing?.title}</p>
        <p className="text-xs text-indigo-600 mt-1">
          {new Date(booking.startDate).toLocaleDateString()} – {new Date(booking.endDate).toLocaleDateString()}
        </p>
        <p className="text-xs text-indigo-600">{nights} nights · {booking.guests} guests</p>
        {(booking.guestName || booking.guestEmail) && (
          <p className="text-xs text-indigo-600 mt-1 break-all">
            {booking.guestName}{booking.guestEmail ? ` · ${booking.guestEmail}` : ''}
          </p>
        )}
        <div className="mt-2 pt-2 border-t border-indigo-200 space-y-1">
          <div className="flex justify-between gap-2 text-xs text-indigo-700">
            <span className="min-w-0 truncate">${listing?.nightlyPrice}/night × {nights}</span>
            <span className="shrink-0">${(listing?.nightlyPrice * nights).toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-2 text-xs text-indigo-700">
            <span>Cleaning fee</span>
            <span className="shrink-0">${listing?.cleaningFee?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-2 text-xs text-indigo-700">
            <span>Service fee</span>
            <span className="shrink-0">${listing?.serviceFee?.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Cart Items */}
      {cartItems.length > 0 && (
        <div className="mb-3">
          <p className="font-medium text-sm mb-2">Add-ons</p>
          {cartItems.map((item: any) => (
            <div key={item.id} className="flex justify-between gap-2 text-xs text-gray-600 py-1.5 border-b">
              <span className="min-w-0 break-words">
                {item.catalogItem?.name || item.mealOption?.name} ×{item.quantity}
              </span>
              <span className="shrink-0">${(item.unitPrice * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Total */}
      <div className="border-t pt-3">
        <div className="flex justify-between font-bold text-sm sm:text-base">
          <span>Total</span>
          <span>${order?.total?.toFixed(2) || booking.totalPrice.toFixed(2)}</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Status: <span className="capitalize">{isPaid ? 'confirmed' : booking.status}</span>
        </p>
      </div>

      {checkoutStatus === 'success' && (
        <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          <p className="font-semibold">
            {demoCheckout ? '✓ Demo booking confirmed' : '✓ Payment successful'}
          </p>
          <p className="text-xs mt-1 text-green-700 leading-snug break-words">{checkoutMessage}</p>
        </div>
      )}

      {checkoutStatus === 'error' && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <p className="font-semibold">Checkout failed</p>
          <p className="text-xs mt-1 leading-snug break-words">{checkoutMessage || 'Something went wrong.'}</p>
        </div>
      )}

      {!isPaid && (
        <div className="mt-4 space-y-3">
          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Payment method</p>
          {/* Stacked on narrow; side-by-side when cart is wide enough */}
          <div
            className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2"
            role="radiogroup"
            aria-label="Payment method"
          >
            <button
              type="button"
              role="radio"
              aria-checked={payMethod === 'card'}
              onClick={() => onPayMethodChange?.('card')}
              className={`min-h-[48px] px-3 py-2.5 rounded-xl text-sm font-semibold border-2 touch-manipulation
                transition-colors ${
                  payMethod === 'card'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-800'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
            >
              💳 Card / Stripe
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={payMethod === 'paypal'}
              onClick={() => onPayMethodChange?.('paypal')}
              className={`min-h-[48px] px-3 py-2.5 rounded-xl text-sm font-semibold border-2 touch-manipulation
                transition-colors ${
                  payMethod === 'paypal'
                    ? 'border-[#0070ba] bg-[#e8f4fc] text-[#003087]'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
            >
              🅿️ PayPal
            </button>
          </div>

          {payMethod === 'card' ? (
            <>
              <button
                onClick={onCheckout}
                disabled={isLoading}
                className="w-full min-h-[48px] bg-green-600 text-white py-3 px-4 rounded-xl font-semibold
                  text-sm sm:text-base hover:bg-green-700 active:bg-green-800
                  transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              >
                {isLoading ? 'Processing…' : 'Pay with Card'}
              </button>
              <p className="text-[11px] text-gray-400 text-center leading-snug px-1">
                Without real Stripe keys, checkout runs in demo mode (no charge).
              </p>
            </>
          ) : (
            <PayPalCheckoutButton
              bookingId={booking.id}
              disabled={isLoading}
              onSuccess={(payload) => onPayPalSuccess?.(payload)}
              onError={(msg) => onPayPalError?.(msg)}
              onLoadingChange={onPayPalLoadingChange}
            />
          )}
        </div>
      )}

      {isPaid && (
        <div className="mt-4 w-full min-h-[48px] flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 font-semibold text-sm">
          Booking confirmed
        </div>
      )}
    </div>
  );
}
