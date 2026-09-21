import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Compass,
  FileQuestion,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Bell,
  Layers,
  Search
} from 'lucide-react';
import { Item, Claim } from '../../types';
import { useAuth } from '../../lib/authContext';
import { getAllItemsFromFirestore, getUserClaimsFromFirestore } from '../../lib/firestoreService';
import { findPotentialMatches } from '../../lib/matchingEngine';

interface DashboardPageProps {
  navigate: (route: string, params?: Record<string, any>) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ navigate }) => {
  const { currentUser, profile } = useAuth();
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [myClaims, setMyClaims] = useState<Claim[]>([]);
  const [possibleMatches, setPossibleMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      if (!currentUser) return;
      setLoading(true);
      try {
        const [allItems, userClaims] = await Promise.all([
          getAllItemsFromFirestore(),
          getUserClaimsFromFirestore(currentUser.uid)
        ]);

        const userItems = allItems.filter(i => i.reportedBy === currentUser.uid);
        setMyItems(userItems);
        setMyClaims(userClaims);

        // Find matches for open lost items
        const openLost = userItems.filter(i => i.type === 'lost' && i.status === 'open');
        const matchesList: any[] = [];
        for (const lost of openLost) {
          const matches = findPotentialMatches(lost, allItems, 35);
          for (const m of matches.slice(0, 2)) {
            matchesList.push({
              targetItem: lost,
              candidateItem: m.candidateItem,
              score: m.score,
              reasons: m.reasons
            });
          }
        }
        setPossibleMatches(matchesList);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [currentUser]);

  const lostCount = myItems.filter(i => i.type === 'lost').length;
  const foundCount = myItems.filter(i => i.type === 'found').length;
  const returnedCount = myItems.filter(i => i.status === 'returned').length;
  const pendingClaimsCount = myClaims.filter(c => c.status === 'pending').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Student & Faculty Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-display mt-0.5">
            Welcome back, {profile?.name || currentUser?.displayName || 'Campus User'} 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track your lost property inquiries, incoming claim verifications, and recovery updates.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => navigate('report-lost')}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-md shadow-rose-600/20 flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Report Lost</span>
          </button>
          <button
            onClick={() => navigate('report-found')}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Report Found</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
            My Lost Reports
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-rose-600 font-display mt-1 block">
            {lostCount}
          </span>
          <button
            onClick={() => navigate('my-items', { filter: 'lost' })}
            className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:underline mt-2 inline-flex items-center space-x-1"
          >
            <span>View reports</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
            My Found Items
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-display mt-1 block">
            {foundCount}
          </span>
          <button
            onClick={() => navigate('my-items', { filter: 'found' })}
            className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:underline mt-2 inline-flex items-center space-x-1"
          >
            <span>View turn-ins</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
            Pending Claims
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-blue-600 font-display mt-1 block">
            {pendingClaimsCount}
          </span>
          <button
            onClick={() => navigate('claims')}
            className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:underline mt-2 inline-flex items-center space-x-1"
          >
            <span>Review claims</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
            Recovered / Returned
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100 font-display mt-1 block">
            {returnedCount}
          </span>
          <span className="text-[11px] text-slate-400 mt-2 block">Success recoveries</span>
        </div>
      </div>

      {/* AI Possible Matches Section */}
      {possibleMatches.length > 0 && (
        <section className="p-6 rounded-3xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 space-y-4">
          <div className="flex items-center space-x-2 text-blue-900 dark:text-blue-300">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-base font-display">
              AI-Detected Matches for Your Inquiries
            </h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 -mt-2">
            The matching algorithm detected potential matches for items you reported missing:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {possibleMatches.map(({ targetItem, candidateItem, score, reasons }, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                      Possible Match — {score}%
                    </span>
                    <span className="text-[11px] text-slate-400">{candidateItem.dateOfIncident}</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    {candidateItem.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {candidateItem.description}
                  </p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
                    {reasons[0]}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 truncate max-w-[120px]">
                    Your item: {targetItem.title}
                  </span>
                  <button
                    onClick={() => navigate('item-detail', { id: candidateItem.id })}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
                  >
                    View Match
                  </button>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-slate-500 italic">
            AI-generated possible match. Verify ownership before claiming.
          </p>
        </section>
      )}

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => navigate('my-items')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 shadow-sm cursor-pointer transition-all flex items-center justify-between"
        >
          <div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Manage My Listings</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Edit, close, or mark your reported items as returned
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400" />
        </div>

        <div
          onClick={() => navigate('claims')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 shadow-sm cursor-pointer transition-all flex items-center justify-between"
        >
          <div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Review Ownership Claims</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Compare verification answers and unlock secure handover chat
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400" />
        </div>

        <div
          onClick={() => navigate('search')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 shadow-sm cursor-pointer transition-all flex items-center justify-between"
        >
          <div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Browse Campus Directory</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Filter and search across all campus departments
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400" />
        </div>
      </div>
    </div>
  );
};
