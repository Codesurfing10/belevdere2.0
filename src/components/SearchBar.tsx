'use client';
import { useState } from 'react';

const DEMO_CITIES = ['Miami', 'Austin', 'Denver', 'Scottsdale', 'Nashville'] as const;

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

  const runSearch = (nextCity: string = city) => {
    onSearch({ city: nextCity, startDate, endDate, guests });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch();
  };

  const handleCityChip = (c: string) => {
    setCity(c);
    runSearch(c);
  };

  return (
    <div className="space-y-1.5">
      <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-wrap">
        <input
          type="text"
          placeholder="Try Miami, Austin, Denver, Scottsdale, or Nashville"
          value={city}
          onChange={e => setCity(e.target.value)}
          className="border rounded-lg px-3 py-1.5 text-sm flex-1 min-w-32"
          list="cities"
          aria-label="City"
        />
        <datalist id="cities">
          {DEMO_CITIES.map(c => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <input
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          className="border rounded-lg px-3 py-1.5 text-sm"
          aria-label="Check-in"
        />
        <span className="text-gray-400 text-sm">→</span>
        <input
          type="date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          className="border rounded-lg px-3 py-1.5 text-sm"
          aria-label="Check-out"
        />
        <input
          type="number"
          min={1}
          max={20}
          value={guests}
          onChange={e => setGuests(parseInt(e.target.value) || 1)}
          className="border rounded-lg px-3 py-1.5 text-sm w-20"
          placeholder="Guests"
          aria-label="Guests"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>
      <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
        <span>Try these cities:</span>
        {DEMO_CITIES.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => handleCityChip(c)}
            disabled={loading}
            className={`rounded-full px-2.5 py-0.5 border transition-colors ${
              city === c
                ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                : 'bg-white border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
            }`}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
