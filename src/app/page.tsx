'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import SearchBar from '@/components/SearchBar';
import ListingsPanel from '@/components/ListingsPanel';
import ManagersPanel from '@/components/ManagersPanel';
import InventoryPanel from '@/components/InventoryPanel';
import CartPanel from '@/components/CartPanel';
import ChatDrawer from '@/components/ChatDrawer';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

type TabType = 'listings' | 'managers' | 'breakfast' | 'dinner' | 'toiletries' | 'food' | 'equipment';

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
    <div className="min-h-screen bg-gray-50">
      {/* Demo banner */}
      <div className="bg-amber-400 text-amber-950 text-center text-sm font-medium px-4 py-2">
        Public demo — seed data for Miami, Austin, Denver. No real bookings.
      </div>

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <h1 className="text-2xl font-bold text-indigo-600">🏠 Belevdere</h1>
          <div className="flex-1">
            <SearchBar onSearch={handleSearch} loading={loading} />
          </div>
          {booking && (
            <div className="text-sm text-gray-600 shrink-0">
              📋 <span className="font-medium text-green-600">{selectedListing?.title}</span>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {bookingError && !guestModalListing && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {bookingError}
          </div>
        )}
        <div className="flex gap-4">
          {/* Left: Map + Content */}
          <div className="flex-1 min-w-0">
            {/* Map */}
            <div className="rounded-xl overflow-hidden shadow-md mb-4" style={{ height: '400px' }}>
              <MapView
                listings={listings}
                center={center}
                onSelectListing={setSelectedListing}
                selectedListing={selectedListing}
              />
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-md">
              <div className="flex border-b overflow-x-auto">
                {(['listings', 'managers', ...inventoryTabs] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-3 text-sm font-medium capitalize whitespace-nowrap border-b-2 transition-colors ${activeTab === tab ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
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
              <div className="p-4">
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

          {/* Right: Cart */}
          <div className="w-80 shrink-0">
            <CartPanel
              booking={booking}
              listing={selectedListing}
              cartItems={cartItems}
              order={order}
              onCheckout={handleCheckout}
              checkoutStatus={checkoutStatus}
              checkoutMessage={checkoutMessage}
              demoCheckout={demoCheckout}
            />
          </div>
        </div>
      </div>

      {/* Guest info modal */}
      {guestModalListing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5">
            <h2 className="text-lg font-bold text-gray-900">Guest details</h2>
            <p className="text-sm text-gray-500 mt-1">
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
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="Jane Guest"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor="guestEmail">Email</label>
                <input
                  id="guestEmail"
                  type="email"
                  value={guestEmail}
                  onChange={e => setGuestEmail(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="jane@example.com"
                />
              </div>
              {bookingError && (
                <p className="text-sm text-red-600">{bookingError}</p>
              )}
            </div>
            <div className="mt-5 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setGuestModalListing(null); setBookingError(null); }}
                className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50"
                disabled={bookingLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmBookNow}
                disabled={bookingLoading}
                className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {bookingLoading ? 'Holding…' : 'Confirm hold'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Button */}
      <button
        onClick={() => setChatOpen(true)}
        className="fixed bottom-6 right-6 bg-indigo-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-colors z-50 text-2xl"
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
