'use client';

interface Props {
  booking: any;
  listing: any;
  cartItems: any[];
  order: any;
  onCheckout: () => void;
  checkoutStatus?: 'idle' | 'loading' | 'success' | 'error';
  checkoutMessage?: string | null;
  demoCheckout?: boolean;
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
}: Props) {
  if (!booking) {
    return (
      <div className="bg-white rounded-xl shadow-md p-4 sticky top-20">
        <h2 className="font-bold text-lg mb-3">🛒 Your Cart</h2>
        <div className="text-center py-8 text-gray-400">
          <div className="text-4xl mb-2">🏠</div>
          <p className="text-sm">Select a listing to start building your order</p>
        </div>
      </div>
    );
  }

  const nights = Math.ceil(
    (new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) /
    (1000 * 60 * 60 * 24)
  );

  const isPaid = checkoutStatus === 'success' || booking.status === 'confirmed' || order?.status === 'paid';

  return (
    <div className="bg-white rounded-xl shadow-md p-4 sticky top-20">
      <h2 className="font-bold text-lg mb-3">🛒 Your Cart</h2>

      {/* Booking summary */}
      <div className="bg-indigo-50 rounded-lg p-3 mb-3">
        <p className="font-semibold text-sm text-indigo-800">{listing?.title}</p>
        <p className="text-xs text-indigo-600 mt-1">
          {new Date(booking.startDate).toLocaleDateString()} – {new Date(booking.endDate).toLocaleDateString()}
        </p>
        <p className="text-xs text-indigo-600">{nights} nights · {booking.guests} guests</p>
        {(booking.guestName || booking.guestEmail) && (
          <p className="text-xs text-indigo-600 mt-1">
            {booking.guestName}{booking.guestEmail ? ` · ${booking.guestEmail}` : ''}
          </p>
        )}
        <div className="mt-2 pt-2 border-t border-indigo-200">
          <div className="flex justify-between text-xs text-indigo-700">
            <span>${listing?.nightlyPrice}/night × {nights}</span>
            <span>${(listing?.nightlyPrice * nights).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs text-indigo-700 mt-1">
            <span>Cleaning fee</span>
            <span>${listing?.cleaningFee?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs text-indigo-700 mt-1">
            <span>Service fee</span>
            <span>${listing?.serviceFee?.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Cart Items */}
      {cartItems.length > 0 && (
        <div className="mb-3">
          <p className="font-medium text-sm mb-2">Add-ons</p>
          {cartItems.map((item: any) => (
            <div key={item.id} className="flex justify-between text-xs text-gray-600 py-1 border-b">
              <span>{item.catalogItem?.name || item.mealOption?.name} ×{item.quantity}</span>
              <span>${(item.unitPrice * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Total */}
      <div className="border-t pt-3">
        <div className="flex justify-between font-bold text-sm">
          <span>Total</span>
          <span>${order?.total?.toFixed(2) || booking.totalPrice.toFixed(2)}</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Status: <span className="capitalize">{isPaid ? 'confirmed' : booking.status}</span>
        </p>
      </div>

      {checkoutStatus === 'success' && (
        <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          <p className="font-semibold">{demoCheckout ? '✓ Demo booking confirmed' : '✓ Payment initiated'}</p>
          <p className="text-xs mt-1 text-green-700">{checkoutMessage}</p>
        </div>
      )}

      {checkoutStatus === 'error' && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <p className="font-semibold">Checkout failed</p>
          <p className="text-xs mt-1">{checkoutMessage || 'Something went wrong.'}</p>
        </div>
      )}

      <button
        onClick={onCheckout}
        disabled={checkoutStatus === 'loading' || isPaid}
        className="mt-4 w-full bg-green-600 text-white py-2.5 rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {checkoutStatus === 'loading'
          ? 'Processing...'
          : isPaid
            ? 'Booking confirmed'
            : 'Checkout'}
      </button>
      {!isPaid && (
        <p className="text-[11px] text-gray-400 mt-2 text-center">
          Without real Stripe keys, checkout runs in demo mode (no charge).
        </p>
      )}
    </div>
  );
}
