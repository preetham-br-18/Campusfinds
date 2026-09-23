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
  Search,
  Mail,
  AlertTriangle
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

  if (!currentUser) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
            <Compass className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white font-display">
            Student Dashboard Access
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Please sign in with your campus credentials to track your items, view incoming claims, and check automatic item matches.
          </p>
          <div className="space-y-2 pt-2">
            <button
              onClick={() => navigate('login')}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('register')}
              className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-colors"
            >
              Create Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  const lostCount = myItems.filter(i => i.type === 'lost').length;
  const foundCount = myItems.filter(i => i.type === 'found').length;
  const returnedCount = myItems.filter(i => i.status === 'returned').length;
  const pendingClaimsCount = myClaims.filter(c => c.status === 'pending').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Email verification reminder banner if not verified */}
      {!currentUser.emailVerified && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-200">
          <div className="flex items-center space-x-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              Your college email <strong className="font-semibold">{currentUser.email}</strong> is not yet verified. Please verify your address to ensure item recovery alerts reach you.
            </span>
          </div>
          <button
            onClick={() => navigate('verify-email')}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl shrink-0 transition-colors"
          >
            Verify Email
          </button>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="card-stylish flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-2xl">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-theme-main">
            Student & Faculty Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-display tracking-tight mt-0.5">
            Welcome back, {profile?.name || currentUser?.displayName || 'Campus Student'} 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track your lost property inquiries, incoming claim verifications, and recovery updates.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0">
          <button
            onClick={() => navigate('report-lost')}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-sm active:scale-98 transition-all flex items-center space-x-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Report Lost</span>
          </button>
          <button
            onClick={() => navigate('report-found')}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm active:scale-98 transition-all flex items-center space-x-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Report Found</span>
          </button>
        </div>
      </div>

      {/* Metrics Row - Tabular numerals and card-stylish */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="card-stylish p-4 rounded-xl">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
            My Lost Reports
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 font-mono tabular-nums mt-1 block">
            {lostCount}
          </span>
          <button
            onClick={() => navigate('my-items', { filter: 'lost' })}
            className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:text-theme-main transition-colors mt-2 inline-flex items-center space-x-1"
          >
            <span>View reports</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="card-stylish p-4 rounded-xl">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
            My Found Items
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-1 block">
            {foundCount}
          </span>
          <button
            onClick={() => navigate('my-items', { filter: 'found' })}
            className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:text-theme-main transition-colors mt-2 inline-flex items-center space-x-1"
          >
            <span>View turn-ins</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="card-stylish p-4 rounded-xl">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
            Pending Claims
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-theme-main font-mono tabular-nums mt-1 block">
            {pendingClaimsCount}
          </span>
          <button
            onClick={() => navigate('claims')}
            className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:text-theme-main transition-colors mt-2 inline-flex items-center space-x-1"
          >
            <span>Review claims</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="card-stylish p-4 rounded-xl">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
            Recovered / Reunited
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100 font-mono tabular-nums mt-1 block">
            {returnedCount}
          </span>
          <span className="text-[11px] text-slate-400 mt-2 block">Successful outcomes</span>
        </div>
      </div>

      {/* AI Possible Matches Section */}
      {possibleMatches.length > 0 && (
        <section className="p-6 rounded-3xl bg-theme-subtle/30 border border-theme-subtle space-y-4">
          <div className="flex items-center space-x-2 text-theme-main">
            <Sparkles className="w-5 h-5 text-theme-main" />
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
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-theme-subtle text-theme-main">
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
                    className="px-3 py-1 btn-theme rounded-lg text-xs font-semibold"
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
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-theme-main shadow-sm cursor-pointer transition-all flex items-center justify-between"
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
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-theme-main shadow-sm cursor-pointer transition-all flex items-center justify-between"
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
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-theme-main shadow-sm cursor-pointer transition-all flex items-center justify-between"
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
