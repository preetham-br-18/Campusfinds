import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  SlidersHorizontal,
  MapPin,
  Calendar,
  Tag,
  ArrowUpDown,
  FileQuestion,
  X,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { Item, ItemType, ItemStatus } from '../../types';
import { getAllItemsFromFirestore, getCampusLocationsFromFirestore } from '../../lib/firestoreService';
import { DEFAULT_CATEGORIES } from '../../lib/constants';

interface SearchPageProps {
  navigate: (route: string, params?: Record<string, any>) => void;
  initialQuery?: string;
  initialType?: ItemType | 'all';
}

export const SearchPage: React.FC<SearchPageProps> = ({
  navigate,
  initialQuery = '',
  initialType = 'all'
}) => {
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [query, setQuery] = useState(initialQuery);
  const [typeFilter, setTypeFilter] = useState<ItemType | 'all'>(initialType);
  const [statusFilter, setStatusFilter] = useState<ItemStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'relevant'>('newest');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [itemsList, locsList] = await Promise.all([
          getAllItemsFromFirestore(),
          getCampusLocationsFromFirestore()
        ]);
        setItems(itemsList);
        setLocations(locsList);
      } catch (err) {
        console.error('Failed to load listings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredItems = useMemo(() => {
    let result = items.filter(item => !item.isDeleted);

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter(item => item.type === typeFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(item => item.status === statusFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter(item => item.category === categoryFilter);
    }

    // Location filter
    if (locationFilter !== 'all') {
      result = result.filter(
        item => item.locationId === locationFilter || item.locationName === locationFilter
      );
    }

    // Search query (case-insensitive across name, description, category, location)
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(item =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.locationName && item.locationName.toLowerCase().includes(q))
      );
    }

    // Sorting
    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sortBy === 'relevant' && query.trim()) {
      const q = query.toLowerCase();
      result.sort((a, b) => {
        const aTitle = a.title.toLowerCase().includes(q) ? 2 : 0;
        const bTitle = b.title.toLowerCase().includes(q) ? 2 : 0;
        return bTitle - aTitle;
      });
    }

    return result;
  }, [items, query, typeFilter, statusFilter, categoryFilter, locationFilter, sortBy]);

  const clearAllFilters = () => {
    setQuery('');
    setTypeFilter('all');
    setStatusFilter('all');
    setCategoryFilter('all');
    setLocationFilter('all');
    setSortBy('newest');
  };

  const hasActiveFilters =
    query.trim() !== '' ||
    typeFilter !== 'all' ||
    statusFilter !== 'all' ||
    categoryFilter !== 'all' ||
    locationFilter !== 'all';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header & Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-display">
          Campus Lost & Found Directory
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Search items reported lost or found across campus buildings and facilities
        </p>
      </div>

      {/* Search Input Bar & Mobile Filter Trigger */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            id="directory-search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search items by keywords, color, brand, or location..."
            className="w-full pl-10 pr-10 py-3 sm:py-2.5 text-base sm:text-sm rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Mobile Filter Button (visible on mobile screens) */}
        <div className="flex items-center space-x-2 sm:hidden">
          <button
            id="mobile-filter-open-btn"
            onClick={() => setMobileFilterOpen(true)}
            className="flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm font-semibold shadow-xs active:scale-98 touch-manipulation min-h-[46px]"
          >
            <SlidersHorizontal className="w-4 h-4 text-theme-main" />
            <span>Refine Filters</span>
            {(categoryFilter !== 'all' || locationFilter !== 'all' || statusFilter !== 'all') && (
              <span className="w-5 h-5 rounded-full bg-theme-main text-white text-[11px] font-bold flex items-center justify-center ml-1">
                {(categoryFilter !== 'all' ? 1 : 0) + (locationFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0)}
              </span>
            )}
          </button>

          <select
            id="mobile-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="py-3 px-3 text-xs font-semibold rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 min-h-[46px]"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="relevant">Relevant</option>
          </select>
        </div>

        {/* Desktop Sort dropdown */}
        <div className="hidden sm:flex items-center space-x-2 shrink-0">
          <ArrowUpDown className="w-4 h-4 text-slate-400" />
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2.5 text-xs font-semibold rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          >
            <option value="newest">Sort: Newest First</option>
            <option value="oldest">Sort: Oldest First</option>
            <option value="relevant">Sort: Most Relevant</option>
          </select>
        </div>
      </div>

      {/* Horizontal One-Tap Category Chips (Mobile-First scrollable row) */}
      <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1">
        {/* Quick Type segmented pills */}
        <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-semibold shrink-0">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all min-h-[32px] ${
              typeFilter === 'all'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            All Types
          </button>
          <button
            onClick={() => setTypeFilter('lost')}
            className={`px-3 py-1.5 rounded-lg transition-all min-h-[32px] ${
              typeFilter === 'lost'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-rose-600'
            }`}
          >
            Lost
          </button>
          <button
            onClick={() => setTypeFilter('found')}
            className={`px-3 py-1.5 rounded-lg transition-all min-h-[32px] ${
              typeFilter === 'found'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'
            }`}
          >
            Found
          </button>
        </div>

        {/* Category Pills */}
        <button
          onClick={() => setCategoryFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 min-h-[36px] ${
            categoryFilter === 'all'
              ? 'bg-theme-main text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          All Categories
        </button>
        {DEFAULT_CATEGORIES.map((cat) => {
          const isSelected = categoryFilter === cat;
          return (
            <button
              key={cat}
              onClick={() => setCategoryFilter(isSelected ? 'all' : cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 min-h-[36px] ${
                isSelected
                  ? 'bg-theme-main text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Desktop Filter Chips Bar (hidden on small mobile screens to keep UI clutter-free) */}
      <div className="hidden sm:flex flex-wrap items-center gap-2 pt-1 border-b border-slate-200 dark:border-slate-800 pb-4">
        {/* Status Dropdown */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
        >
          <option value="all">Status: All Statuses</option>
          <option value="open">Open (Active)</option>
          <option value="claimed">Claim In Progress</option>
          <option value="returned">Returned to Owner</option>
        </select>

        {/* Location Dropdown */}
        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
        >
          <option value="all">Location: All Campus Spots</option>
          {locations.map(loc => (
            <option key={loc.id} value={loc.id}>{loc.name}</option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline ml-auto"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Mobile Filter Bottom Sheet */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:hidden bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="fixed inset-0" onClick={() => setMobileFilterOpen(false)} />
          <div className="relative w-full bg-white dark:bg-slate-900 rounded-t-3xl p-6 border-t border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 pb-[max(1.75rem,env(safe-area-inset-bottom))] z-10 animate-in slide-in-from-bottom duration-200 max-h-[85vh] overflow-y-auto">
            {/* Grab handle */}
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto -mt-2 mb-2" />

            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                <SlidersHorizontal className="w-4 h-4 text-theme-main" />
                <span>Refine Directory</span>
              </h3>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 bg-slate-100 dark:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter controls */}
            <div className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Item Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'all', label: 'All Statuses' },
                    { id: 'open', label: 'Open / Active' },
                    { id: 'claimed', label: 'Claim In Progress' },
                    { id: 'returned', label: 'Returned to Owner' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStatusFilter(s.id as any)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                        statusFilter === s.id
                          ? 'border-theme-main bg-theme-subtle text-theme-main font-bold'
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Campus Location
                </label>
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="w-full px-3.5 py-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="all">All Campus Locations</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white min-h-[46px]"
                >
                  Reset All
                </button>
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="flex-1 py-3 px-4 rounded-xl gradient-theme-bg text-white text-xs font-bold shadow-theme-glow min-h-[46px]"
                >
                  Show Results ({filteredItems.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>
          Showing <strong className="text-slate-800 dark:text-slate-200">{filteredItems.length}</strong> items
        </span>
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm">
          Loading campus items...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
          <FileQuestion className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="font-bold text-base text-slate-900 dark:text-white">No matching items found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Try adjusting your search keywords or clearing some filters to see more results.
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="mt-4 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100"
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map(item => (
            <div
              key={item.id}
              onClick={() => navigate('item-detail', { id: item.id })}
              className="card-stylish group cursor-pointer rounded-2xl overflow-hidden flex flex-col justify-between"
            >
              <div>
                {/* Image container or styled SVG mesh */}
                <div className="h-48 bg-slate-100 dark:bg-slate-800/80 relative overflow-hidden flex items-center justify-center">
                  {item.imageUrls && item.imageUrls.length > 0 ? (
                    <img
                      src={item.imageUrls[0]}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800/70 dark:to-slate-900/90 text-slate-400 dark:text-slate-500">
                      <div className="w-12 h-12 rounded-xl bg-white/70 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center text-slate-500 dark:text-slate-400 mb-2 shadow-xs group-hover:scale-110 transition-transform">
                        <FileQuestion className="w-6 h-6 stroke-[1.5]" />
                      </div>
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{item.category}</span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Verification by Description</span>
                    </div>
                  )}

                  {/* Clean discreet status pill with subtle backdrop */}
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xs text-slate-800 dark:text-slate-200">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          item.status === 'returned'
                            ? 'bg-slate-400'
                            : item.status === 'claimed'
                            ? 'bg-amber-500'
                            : item.type === 'lost'
                            ? 'bg-rose-500 animate-pulse'
                            : 'bg-emerald-500 animate-pulse'
                        }`}
                      />
                      <span>
                        {item.status === 'returned'
                          ? 'Reunited'
                          : item.status === 'claimed'
                          ? 'Claim In Progress'
                          : item.type === 'lost'
                          ? 'Lost'
                          : 'Found'}
                      </span>
                    </span>
                  </div>

                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-black/40 text-white backdrop-blur-md">
                      {item.category}
                    </span>
                  </div>
                </div>

                {/* Info with unboxed metadata */}
                <div className="p-4">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{item.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">{item.locationName}</span>
                  </div>

                  <h4 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-theme-main transition-colors leading-snug">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Meta footer */}
              <div className="p-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center space-x-1 truncate max-w-[65%]">
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  <span className="truncate">{item.locationName}</span>
                </div>
                <div className="flex items-center space-x-1 shrink-0 font-mono tabular-nums">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{item.dateOfIncident}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
