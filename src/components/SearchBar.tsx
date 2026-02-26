'use client';
import { useState } from 'react';

interface Props {
  onSearch: (params: { city: string; startDate: string; endDate: string; guests: number }) => void;
  loading?: boolean;
}

export default function SearchBar({ onSearch, loading }: Props) {
  const [city, setCity] = useState('Miami');
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(fmt(today));
  const [endDate, setEndDate] = useState(fmt(nextWeek));
  const [guests, setGuests] = useState(2);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({ city, startDate, endDate, guests });
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-wrap">
      <input
        type="text"
        placeholder="City (Miami, Austin, Denver)"
        value={city}
        onChange={e => setCity(e.target.value)}
        className="border rounded-lg px-3 py-1.5 text-sm flex-1 min-w-32"
        list="cities"
      />
      <datalist id="cities">
        <option value="Miami" />
        <option value="Austin" />
        <option value="Denver" />
      </datalist>
      <input
        type="date"
        value={startDate}
        onChange={e => setStartDate(e.target.value)}
        className="border rounded-lg px-3 py-1.5 text-sm"
      />
      <span className="text-gray-400 text-sm">→</span>
      <input
        type="date"
        value={endDate}
        onChange={e => setEndDate(e.target.value)}
        className="border rounded-lg px-3 py-1.5 text-sm"
      />
      <input
        type="number"
        min={1}
        max={20}
        value={guests}
        onChange={e => setGuests(parseInt(e.target.value) || 1)}
        className="border rounded-lg px-3 py-1.5 text-sm w-20"
        placeholder="Guests"
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? 'Searching...' : 'Search'}
      </button>
    </form>
  );
}
