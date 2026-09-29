'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import SearchBar from '@/components/SearchBar';
import ListingsPanel from '@/components/ListingsPanel';
import ManagersPanel from '@/components/ManagersPanel';
import InventoryPanel from '@/components/InventoryPanel';
import CartPanel from '@/components/CartPanel';
import ChatDrawer from '@/components/ChatDrawer';
import Footer from '@/components/Footer';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

type TabType = 'listings' | 'managers' | 'breakfast' | 'dinner' | 'toiletries' | 'food' | 'equipment';
type PayMethod = 'card' | 'paypal';

interface SearchParams {
  city: string;
  startDate: string;
  endDate: string;
  guests: number;
}

export default function Home() {
  const [searchParams, setSearchParams] = useState<SearchParams>({ city: '', startDate: '', endDate: '', guests: 2 });
  const [listings, setListings] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [booking, setBooking] = useState<any>(null);
  const [order, setOrder] = useState<any>(null);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('listings');
  const [chatOpen, setChatOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [guestModalListing, setGuestModalListing] = useState<any>(null);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [demoCheckout, setDemoCheckout] = useState(false);
  const [payMethod, setPayMethod] = useState<PayMethod>('card');

  const handleSearch = useCallback(async (params: SearchParams) => {
    setLoading(true);
    setSearchParams(params);
    try {
      const res = await fetch(
        `/api/search?city=${encodeURIComponent(params.city)}&startDate=${params.startDate}&endDate=${params.endDate}&guests=${params.guests}`
      );
      const data = await res.json();
      setListings(data.listings || []);
      if (data.center?.lat) setCenter(data.center);

      const mgrRes = await fetch(`/api/managers?city=${encodeURIComponent(params.city)}`);
      const mgrData = await mgrRes.json();
      setManagers(mgrData.managers || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const openBookModal = (listing: any) => {
    if (!searchParams.startDate || !searchParams.endDate) {
      setBookingError('Please select dates first (use Search).');
      return;
    }
    setBookingError(null);
    setGuestName('');
    setGuestEmail('');
    setGuestModalListing(listing);
  };

  const confirmBookNow = async () => {
    if (!guestModalListing) return;
    if (!guestName.trim() || !guestEmail.trim()) {
      setBookingError('Guest name and email are required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim())) {
      setBookingError('Please enter a valid email.');
      return;
    }

    setBookingLoading(true);
    setBookingError(null);
    try {
      const res = await fetch('/api/bookings/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: guestModalListing.id,
          startDate: searchParams.startDate,
          endDate: searchParams.endDate,
          guests: searchParams.guests,
          guestName: guestName.trim(),
          guestEmail: guestEmail.trim(),
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setBookingError(data.error || 'Could not create hold booking.');
        return;
      }
      setSelectedListing(guestModalListing);
      setBooking(data.booking);
      setOrder(data.order);
      setCartItems([]);
      setCheckoutStatus('idle');
      setCheckoutMessage(null);
      setDemoCheckout(false);
      setPayMethod('card');
      setActiveTab('breakfast');
      setGuestModalListing(null);
    } catch {
      setBookingError('Network error creating booking.');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleAddToCart = async (type: 'catalog' | 'meal', id: string, qty: number = 1) => {
    if (!booking) { setCheckoutMessage('Please select a listing first'); setCheckoutStatus('error'); return; }
    const body: Record<string, unknown> = { bookingId: booking.id, qty };
    if (type === 'meal') { body.mealOptionId = id; body.type = 'meal'; }
    else { body.itemId = id; }

    await fetch('/api/cart/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const cartRes = await fetch(`/api/cart?bookingId=${booking.id}`);
    const cartData = await cartRes.json();
    setCartItems(cartData.order?.cartItems || []);
    setOrder(cartData.order);
  };

  const handleCheckout = async () => {
    if (!booking) return;
    setCheckoutStatus('loading');
    setCheckoutMessage(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setCheckoutStatus('error');
        setCheckoutMessage(data.error || 'Checkout failed.');
        return;
      }
      if (data.demoMode) {
        setDemoCheckout(true);
        setCheckoutStatus('success');
        setCheckoutMessage(data.message || 'Demo checkout complete — no real charge.');
        setBooking((prev: any) => prev ? { ...prev, status: 'confirmed' } : prev);
        setOrder((prev: any) => prev ? { ...prev, status: 'paid' } : prev);
        return;
      }
      setDemoCheckout(false);
      setCheckoutStatus('success');
      setCheckoutMessage(
        `Payment ready for $${Number(data.amount).toFixed(2)}. Connect Stripe Elements in production to collect the card.`
      );
    } catch {
      setCheckoutStatus('error');
      setCheckoutMessage('Network error during checkout.');
    }
  };

  const handlePayPalSuccess = useCallback((payload: { demoMode: boolean; message: string; amount?: number }) => {
    setDemoCheckout(!!payload.demoMode);
    setCheckoutStatus('success');
    setCheckoutMessage(payload.message);
    setBooking((prev: any) => (prev ? { ...prev, status: 'confirmed' } : prev));
    setOrder((prev: any) => (prev ? { ...prev, status: 'paid' } : prev));
  }, []);

  const handlePayPalError = useCallback((message: string) => {
    setCheckoutStatus('error');
    setCheckoutMessage(message);
  }, []);

  const handlePayPalLoadingChange = useCallback((loadingPayPal: boolean) => {
    if (loadingPayPal) {
      setCheckoutStatus('loading');
      setCheckoutMessage(null);
    } else {
      setCheckoutStatus((prev) => (prev === 'loading' ? 'idle' : prev));
    }
  }, []);

  const handleAgentAction = useCallback((action: any) => {
    if (action.type === 'FILTER_PRICE') {
      setListings(prev => prev.filter((l: any) => l.nightlyPrice <= action.maxPrice));
    } else if (action.type === 'FILTER_AMENITY') {
      setListings(prev => prev.filter((l: any) => {
        const amenities = Array.isArray(l.amenities) ? l.amenities : JSON.parse(l.amenities || '[]');
        return amenities.some((a: string) => a.toLowerCase().includes(action.amenity.toLowerCase()));
      }));
    } else if (action.type === 'SEARCH') {
      handleSearch({ ...searchParams, city: action.city });
    } else if (action.type === 'ADD_TO_CART') {
      handleAddToCart(action.itemType === 'meal' ? 'meal' : 'catalog', action.mealOptionId || action.itemId, action.qty);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, handleSearch]);

  const inventoryTabs = ['breakfast', 'dinner', 'toiletries', 'food', 'equipment'] as const;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col overflow-x-hidden">
      {/* Demo banner */}
      <div className="bg-amber-400 text-amber-950 text-center text-xs sm:text-sm font-medium px-3 sm:px-4 py-2 leading-snug">
        Public demo — seed data for Miami, Austin, Denver, Scottsdale, Nashville. No real bookings.
      </div>

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-indigo-600 shrink-0">🏠 Belevdere</h1>
            {booking && (
              <div className="sm:hidden text-xs text-gray-600 truncate max-w-[50%]">
                📋 <span className="font-medium text-green-600">{selectedListing?.title}</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 w-full">
            <SearchBar onSearch={handleSearch} loading={loading} />
          </div>
          {booking && (
            <div className="hidden sm:block text-sm text-gray-600 shrink-0 max-w-[200px] truncate">
              📋 <span className="font-medium text-green-600">{selectedListing?.title}</span>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-4 py-3 sm:py-4">
        {bookingError && !guestModalListing && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {bookingError}
          </div>
        )}
        {/* Stack cart below content on mobile; side-by-side from lg */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Left: Map + Content */}
          <div className="flex-1 min-w-0 order-2 lg:order-1">
            {/* Map — shorter on phones */}
            <div className="rounded-xl overflow-hidden shadow-md mb-4 h-[220px] sm:h-[320px] lg:h-[400px]">
              <MapView
                listings={listings}
                center={center}
                onSelectListing={setSelectedListing}
                selectedListing={selectedListing}
              />
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="flex border-b overflow-x-auto overscroll-x-contain -mx-0 scrollbar-thin">
                {(['listings', 'managers', ...inventoryTabs] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium capitalize whitespace-nowrap border-b-2 transition-colors touch-manipulation min-h-[44px] ${activeTab === tab ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  >
                    {tab === 'listings' ? `🏠 Listings (${listings.length})` :
                     tab === 'managers' ? '👤 Managers' :
                     tab === 'breakfast' ? '🌅 Breakfast' :
                     tab === 'dinner' ? '🌙 Dinner' :
                     tab === 'toiletries' ? '🧴 Toiletries' :
                     tab === 'food' ? '🍿 Food' : '🚴 Equipment'}
                  </button>
                ))}
              </div>
              <div className="p-3 sm:p-4">
                {activeTab === 'listings' && (
                  <ListingsPanel listings={listings} onBook={openBookModal} selectedListing={selectedListing} />
                )}
                {activeTab === 'managers' && <ManagersPanel managers={managers} />}
                {(inventoryTabs as readonly string[]).includes(activeTab) && (
                  <InventoryPanel
                    activeTab={activeTab as 'breakfast' | 'dinner' | 'toiletries' | 'food' | 'equipment'}
                    onAddToCart={handleAddToCart}
                    hasBooking={!!booking}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Right / top on mobile: Cart */}
          <div className="w-full lg:w-80 shrink-0 order-1 lg:order-2">
            <CartPanel
              booking={booking}
              listing={selectedListing}
              cartItems={cartItems}
              order={order}
              onCheckout={handleCheckout}
              checkoutStatus={checkoutStatus}
              checkoutMessage={checkoutMessage}
              demoCheckout={demoCheckout}
              payMethod={payMethod}
              onPayMethodChange={setPayMethod}
              onPayPalSuccess={handlePayPalSuccess}
              onPayPalError={handlePayPalError}
              onPayPalLoadingChange={handlePayPalLoadingChange}
            />
          </div>
        </div>
      </div>

      <Footer />

      {/* Guest info modal — full-width friendly on phones */}
      {guestModalListing && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900">Guest details</h2>
            <p className="text-sm text-gray-500 mt-1 break-words">
              Holding <span className="font-medium text-indigo-600">{guestModalListing.title}</span> for your dates.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor="guestName">Name</label>
                <input
                  id="guestName"
                  type="text"
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  className="w-full border rounded-lg px-3 py-3 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 min-h-[48px]"
                  placeholder="Jane Guest"
                  autoFocus
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor="guestEmail">Email</label>
                <input
                  id="guestEmail"
                  type="email"
                  inputMode="email"
                  value={guestEmail}
                  onChange={e => setGuestEmail(e.target.value)}
                  className="w-full border rounded-lg px-3 py-3 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 min-h-[48px]"
                  placeholder="jane@example.com"
                  autoComplete="email"
                />
              </div>
              {bookingError && (
                <p className="text-sm text-red-600">{bookingError}</p>
              )}
            </div>
            <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => { setGuestModalListing(null); setBookingError(null); }}
                className="min-h-[48px] px-4 py-3 text-sm rounded-lg border hover:bg-gray-50 touch-manipulation"
                disabled={bookingLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmBookNow}
                disabled={bookingLoading}
                className="min-h-[48px] px-4 py-3 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 touch-manipulation"
              >
                {bookingLoading ? 'Holding…' : 'Confirm hold'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Button — clear of home indicator / edges */}
      <button
        onClick={() => setChatOpen(true)}
        className="fixed bottom-5 right-4 sm:bottom-6 sm:right-6 bg-indigo-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-colors z-50 text-2xl touch-manipulation"
        aria-label="Open chat assistant"
      >
        💬
      </button>

      {/* Chat Drawer */}
      {chatOpen && (
        <ChatDrawer
          onClose={() => setChatOpen(false)}
          onAction={handleAgentAction}
          bookingId={booking?.id}
        />
      )}
    </div>
  );
}
