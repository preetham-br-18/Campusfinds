import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Compass,
  Sparkles,
  MapPin,
  Calendar,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileQuestion,
  TrendingUp,
  Inbox,
  Volume2
} from 'lucide-react';
import { Item, SystemSettings } from '../../types';
import { getAllItemsFromFirestore, getCampusStatisticsFromFirestore, getSystemSettingsFromFirestore } from '../../lib/firestoreService';
import { findPotentialMatches } from '../../lib/matchingEngine';
import { useAuth } from '../../lib/authContext';

interface HomePageProps {
  navigate: (route: string, params?: Record<string, any>) => void;
  openAuthModal: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ navigate, openAuthModal }) => {
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [recentItems, setRecentItems] = useState<Item[]>([]);
  const [stats, setStats] = useState({
    totalReported: 0,
    totalReturned: 0,
    activeListings: 0
  });
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [userPossibleMatches, setUserPossibleMatches] = useState<{
    lostItem: Item;
    match: Item;
    score: number;
    reasons: string[];
  }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHomeData() {
      setLoading(true);
      try {
        const [items, statsData, sysSettings] = await Promise.all([
          getAllItemsFromFirestore(),
          getCampusStatisticsFromFirestore(),
          getSystemSettingsFromFirestore()
        ]);

        setRecentItems(items.slice(0, 6));
        setStats({
          totalReported: statsData.totalReported,
          totalReturned: statsData.totalReturned,
          activeListings: statsData.activeListings
        });
        setSettings(sysSettings);

        // Calculate potential matches for current user
        if (currentUser) {
          const userLostItems = items.filter(
            i => i.reportedBy === currentUser.uid && i.type === 'lost' && i.status === 'open'
          );
          const matchesList: any[] = [];
          for (const lost of userLostItems) {
            const matches = findPotentialMatches(lost, items, 40);
            if (matches.length > 0) {
              matchesList.push({
                lostItem: lost,
                match: matches[0].candidateItem,
                score: matches[0].score,
                reasons: matches[0].reasons
              });
            }
          }
          setUserPossibleMatches(matchesList);
        }
      } catch (err) {
        console.error('Failed to load home data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadHomeData();
  }, [currentUser]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate('search', { query: searchQuery.trim() });
    } else {
      navigate('search');
    }
  };

  return (
    <div className="space-y-12 pb-12">
      {/* Official Admin Announcement Banner if configured */}
      {settings?.announcementActive && settings.announcementText && (
        <div className="bg-theme-main text-white px-4 py-2.5 shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-center space-x-2 text-xs md:text-sm font-medium">
            <Volume2 className="w-4 h-4 shrink-0" />
            <span>{settings.announcementText}</span>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 pt-6 md:pt-12 text-center max-w-5xl mx-auto">
        {/* Subtle Editorial Kicker */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs font-semibold mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-theme-main animate-pulse" />
          <span className="text-slate-700 dark:text-slate-300">University Belongings & Lost Asset Registry</span>
        </div>

        {/* Display Headline with balanced wrapping */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white font-display leading-[1.08] max-w-4xl mx-auto text-balance">
          Lost it? <span className="text-theme-main">Find it.</span><br className="hidden sm:inline" />
          {' '}Found it? <span className="text-emerald-600 dark:text-emerald-400">Return it.</span>
        </h1>

        <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed text-balance">
          The verified campus network connecting students, faculty, and staff with lost property across lecture theatres, libraries, student quads, and labs.
        </p>

        {/* Floating Search Console */}
        <form onSubmit={handleSearchSubmit} className="mt-8 max-w-2xl mx-auto">
          <div className="glass-panel relative flex items-center shadow-xl shadow-slate-200/50 dark:shadow-black/50 rounded-2xl p-2 transition-all focus-within:ring-2 focus-within:ring-theme-main">
            <Search className="w-5 h-5 text-slate-400 ml-3 shrink-0" />
            <input
              id="hero-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by keywords (e.g. MacBook Pro, Blue Hydro Flask, Dorm Keys, Wallet)..."
              className="w-full px-3 py-2.5 text-sm sm:text-base text-slate-900 dark:text-white bg-transparent focus:outline-none placeholder-slate-400 dark:placeholder-slate-500"
            />
            <button
              id="hero-search-submit-btn"
              type="submit"
              className="px-5 py-2.5 btn-theme text-white text-sm font-semibold rounded-xl transition-all shrink-0 active:scale-98"
            >
              Search
            </button>
          </div>

          {/* Quick Search Chips */}
          <div className="mt-3 flex items-center justify-center flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium text-slate-400 dark:text-slate-500">Popular:</span>
            {['AirPods', 'Water Bottle', 'Student ID', 'Car Keys', 'Calculators', 'Backpack'].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => navigate('search', { query: tag })}
                className="hover:text-theme-main transition-colors underline-offset-2 hover:underline"
              >
                {tag}
              </button>
            ))}
          </div>
        </form>

        {/* Primary CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <button
            id="hero-lost-btn"
            onClick={() => navigate('report-lost')}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm shadow-md hover:shadow-lg active:scale-98 transition-all flex items-center justify-center space-x-2"
          >
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span>I Lost Something</span>
          </button>

          <button
            id="hero-found-btn"
            onClick={() => navigate('report-found')}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md hover:shadow-lg active:scale-98 transition-all flex items-center justify-center space-x-2"
          >
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span>I Found Something</span>
          </button>

          <button
            onClick={() => navigate('search')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-sm transition-all"
          >
            Browse Registry
          </button>
        </div>
      </section>

      {/* Quick Navigation Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
          <button
            onClick={() => navigate('report-lost')}
            className="card-stylish p-4 rounded-xl text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <Plus className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
              Report Lost
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Publish missing belongings</p>
          </button>

          <button
            onClick={() => navigate('report-found')}
            className="card-stylish p-4 rounded-xl text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              Report Found
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Register a discovered item</p>
          </button>

          <button
            onClick={() => navigate('search', { type: 'lost' })}
            className="card-stylish p-4 rounded-xl text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-theme-subtle text-theme-main flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <Search className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-theme-main transition-colors">
              Browse Lost
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Search reported missing</p>
          </button>

          <button
            onClick={() => navigate('search', { type: 'found' })}
            className="card-stylish p-4 rounded-xl text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <Compass className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-theme-main transition-colors">
              Browse Found
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Check unclaimed recoveries</p>
          </button>
        </div>
      </section>

      {/* Potential Matches for User */}
      {currentUser && userPossibleMatches.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-theme-subtle shadow-sm">
            <div className="flex items-center space-x-2 text-theme-main mb-2">
              <Sparkles className="w-4 h-4" />
              <h3 className="font-bold text-base font-display">
                Automated Match Alerts
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Our intelligent similarity engine matched your reported lost items with recent campus recoveries:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {userPossibleMatches.map(({ lostItem, match, score, reasons }) => (
                <div
                  key={match.id}
                  className="card-stylish p-4 rounded-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                      <span className="font-semibold text-theme-main font-mono tabular-nums">{score}% match similarity</span>
                      <span className="font-mono tabular-nums">{match.dateOfIncident}</span>
                    </div>
                    <h5 className="font-bold text-sm text-slate-900 dark:text-white">{match.title}</h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {match.description}
                    </p>
                    <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      {reasons[0]}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-400 truncate max-w-[55%]">For: {lostItem.title}</span>
                    <button
                      onClick={() => navigate('item-detail', { id: match.id })}
                      className="px-3 py-1 btn-theme rounded-lg text-xs font-semibold"
                    >
                      Verify Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-3">
              Automated match estimate. Please verify specific markings or serial details before filing a claim.
            </p>
          </div>
        </section>
      )}

      {/* Real Campus Statistics - Tabular Numerals & High Density Math */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-slate-900 text-white p-6 sm:p-8 relative overflow-hidden border border-slate-800 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <span className="text-xs font-semibold tracking-wider uppercase text-theme-main">
                Campus Recovery Registry
              </span>
              <h3 className="text-2xl font-bold font-display mt-1">Live Campus Activity</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time counts verified by campus security and student recoveries
              </p>
            </div>
            {stats.totalReported > 0 && (
              <div className="text-left sm:text-right">
                <span className="text-xs text-slate-400 uppercase tracking-wider block">Recovery Success Rate</span>
                <span className="text-2xl font-extrabold text-emerald-400 font-mono tabular-nums">
                  {Math.min(100, Math.round((stats.totalReturned / Math.max(1, stats.totalReported)) * 100))}%
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block mb-1">
                Items Reported
              </span>
              <span className="text-3xl sm:text-4xl font-extrabold text-white font-mono tabular-nums">
                {stats.totalReported.toLocaleString()}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block mb-1">
                Items Reunited
              </span>
              <span className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-mono tabular-nums">
                {stats.totalReturned.toLocaleString()}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block mb-1">
                Active Listings
              </span>
              <span className="text-3xl sm:text-4xl font-extrabold text-theme-main font-mono tabular-nums">
                {stats.activeListings.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Items Section - Zero-Pill & Metadata Discipline */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white font-display">Recent Items</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Latest lost and found reports across campus quads and buildings</p>
          </div>
          <button
            onClick={() => navigate('search')}
            className="text-xs font-semibold text-theme-main hover:underline flex items-center space-x-1"
          >
            <span>View All Listings</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentItems.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900">
            <Inbox className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No items have been reported yet.</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Be the first to report an item on campus.</p>
            <div className="mt-4 flex justify-center space-x-3">
              <button
                onClick={() => navigate('report-lost')}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 text-white"
              >
                Report Lost Item
              </button>
              <button
                onClick={() => navigate('report-found')}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 text-white"
              >
                Report Found Item
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentItems.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate('item-detail', { id: item.id })}
                className="card-stylish group cursor-pointer rounded-2xl overflow-hidden flex flex-col"
              >
                {/* Image or Styled Fallback Mesh */}
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
                            : item.type === 'lost'
                            ? 'bg-rose-500 animate-pulse'
                            : 'bg-emerald-500 animate-pulse'
                        }`}
                      />
                      <span>
                        {item.status === 'returned'
                          ? 'Reunited'
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

                {/* Content with Zero-Pill & Unboxed Metadata */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Unboxed inline metadata */}
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

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
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
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Trust & Safety Section - Clean Editorial Flow */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="card-stylish rounded-2xl p-6 sm:p-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-theme-subtle text-theme-main flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display">
                Campus Recovery & Verification Protocol
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official safety measures to safeguard property and personal privacy
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <div className="space-y-1.5">
              <h5 className="font-bold text-slate-900 dark:text-white text-sm">01. Privacy First</h5>
              <p>
                Never publish sensitive personal details such as complete student ID numbers, full credit card numbers, passwords, or device access codes on public listings.
              </p>
            </div>
            <div className="space-y-1.5">
              <h5 className="font-bold text-slate-900 dark:text-white text-sm">02. Specific Verification</h5>
              <p>
                Always verify ownership by asking about distinguishing traits (device lock screen photos, custom scratches, stickers, or serial numbers) before releasing property.
              </p>
            </div>
            <div className="space-y-1.5">
              <h5 className="font-bold text-slate-900 dark:text-white text-sm">03. Official Handover Points</h5>
              <p>
                Exchange items strictly at public, staffed campus facilities such as Campus Security reception, the Central Library Information Desk, or the Student Union.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
