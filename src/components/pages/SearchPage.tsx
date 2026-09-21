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

      {/* Search Input Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            id="directory-search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search items by keywords, color, brand, or location..."
            className="w-full pl-10 pr-10 py-2.5 text-sm rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sort dropdown */}
        <div className="flex items-center space-x-2 shrink-0">
          <ArrowUpDown className="w-4 h-4 text-slate-400 hidden sm:block" />
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

      {/* Filter Chips Bar */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-b border-slate-200 dark:border-slate-800 pb-4">
        {/* Type Toggle */}
        <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-semibold">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1 rounded-lg transition-all ${
              typeFilter === 'all'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            All Types
          </button>
          <button
            onClick={() => setTypeFilter('lost')}
            className={`px-3 py-1 rounded-lg transition-all ${
              typeFilter === 'lost'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-rose-600'
            }`}
          >
            Lost
          </button>
          <button
            onClick={() => setTypeFilter('found')}
            className={`px-3 py-1 rounded-lg transition-all ${
              typeFilter === 'found'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'
            }`}
          >
            Found
          </button>
        </div>

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

        {/* Category Dropdown */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
        >
          <option value="all">Category: All Categories</option>
          {DEFAULT_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
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
              className="group cursor-pointer rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Image container */}
                <div className="h-48 bg-slate-100 dark:bg-slate-800 relative overflow-hidden flex items-center justify-center">
                  {item.imageUrls && item.imageUrls.length > 0 ? (
                    <img
                      src={item.imageUrls[0]}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="text-slate-400 flex flex-col items-center">
                      <FileQuestion className="w-10 h-10 stroke-1" />
                      <span className="text-[11px] mt-1 font-medium">No photograph attached</span>
                    </div>
                  )}

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 flex space-x-1.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider text-white shadow-sm ${
                        item.type === 'lost' ? 'bg-rose-600' : 'bg-emerald-600'
                      }`}
                    >
                      {item.type}
                    </span>
                    {item.status === 'returned' && (
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-slate-900 text-white shadow-sm">
                        Returned
                      </span>
                    )}
                    {item.status === 'claimed' && (
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-amber-500 text-white shadow-sm">
                        Claimed
                      </span>
                    )}
                  </div>

                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 backdrop-blur-sm shadow-xs">
                      {item.category}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h4 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Meta footer */}
              <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800/80 mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center space-x-1 truncate max-w-[60%]">
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  <span className="truncate">{item.locationName}</span>
                </div>
                <div className="flex items-center space-x-1 shrink-0">
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
