'use client';

interface Props {
  booking: any;
  listing: any;
  cartItems: any[];
  order: any;
  onCheckout: () => void;
}

export default function CartPanel({ booking, listing, cartItems, order, onCheckout }: Props) {
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
          Status: <span className="capitalize">{booking.status}</span>
        </p>
      </div>

      <button
        onClick={onCheckout}
        className="mt-4 w-full bg-green-600 text-white py-2.5 rounded-xl font-semibold hover:bg-green-700 transition-colors"
      >
        Checkout with Stripe
      </button>
    </div>
  );
}
