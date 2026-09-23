import React, { useState, useEffect } from 'react';
import {
  FolderLock,
  Plus,
  Trash2,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Calendar,
  FileQuestion,
  Search
} from 'lucide-react';
import { Item, ItemType, ItemStatus } from '../../types';
import { useAuth } from '../../lib/authContext';
import {
  getAllItemsFromFirestore,
  softDeleteItemInFirestore,
  markItemReturnedInFirestore
} from '../../lib/firestoreService';

interface MyItemsPageProps {
  navigate: (route: string, params?: Record<string, any>) => void;
  initialFilter?: string;
}

export const MyItemsPage: React.FC<MyItemsPageProps> = ({
  navigate,
  initialFilter = 'all'
}) => {
  const { currentUser } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState<'all' | 'lost' | 'found' | 'pending' | 'returned'>(
    (initialFilter as any) || 'all'
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadItems() {
      if (!currentUser) return;
      setLoading(true);
      try {
        const all = await getAllItemsFromFirestore(false, false);
        setItems(all.filter(i => (i.reportedBy === currentUser.uid || i.createdBy === currentUser.uid)));
      } catch (err) {
        console.error('Failed to load user items:', err);
      } finally {
        setLoading(false);
      }
    }
    loadItems();
  }, [currentUser]);

  const handleDelete = async (itemId: string) => {
    if (!window.confirm('Are you sure you want to remove this listing?')) return;
    try {
      await softDeleteItemInFirestore(itemId);
      setItems(items.filter(i => i.id !== itemId));
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  const handleMarkReturned = async (itemId: string) => {
    if (!window.confirm('Mark this item as returned to its owner?')) return;
    try {
      await markItemReturnedInFirestore(itemId, undefined, currentUser?.displayName || 'Owner');
      setItems(items.map(i => (i.id === itemId ? { ...i, status: 'returned' } : i)));
    } catch (err) {
      console.error('Failed to mark returned:', err);
    }
  };

  const filteredItems = items.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'returned') return item.status === 'returned' || item.status === 'resolved';
    if (filter === 'pending') return item.status === 'pending';
    return item.type === filter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-display">
            My Campus Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your reported lost and found items, update custody, or close listings.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate('report-lost')}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-sm flex items-center space-x-1"
          >
            <Plus className="w-4 h-4" />
            <span>Report Lost</span>
          </button>
          <button
            onClick={() => navigate('report-found')}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm flex items-center space-x-1"
          >
            <Plus className="w-4 h-4" />
            <span>Report Found</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 w-fit text-xs font-semibold">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            filter === 'all'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          All ({items.length})
        </button>
        <button
          onClick={() => setFilter('lost')}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            filter === 'lost'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Lost ({items.filter(i => i.type === 'lost').length})
        </button>
        <button
          onClick={() => setFilter('found')}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            filter === 'found'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Found ({items.filter(i => i.type === 'found').length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            filter === 'pending'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Pending Verification ({items.filter(i => i.status === 'pending').length})
        </button>
        <button
          onClick={() => setFilter('returned')}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            filter === 'returned'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Returned / Resolved ({items.filter(i => i.status === 'returned' || i.status === 'resolved').length})
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm">
          Loading your listings...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <FolderLock className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">No listings in this category</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            When you report a lost item or submit a found recovery, it will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map(item => (
            <div
              key={item.id}
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="h-44 bg-slate-100 dark:bg-slate-800 relative flex items-center justify-center">
                  {item.imageUrls && item.imageUrls.length > 0 ? (
                    <img
                      src={item.imageUrls[0]}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FileQuestion className="w-10 h-10 text-slate-400" />
                  )}

                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider text-white shadow-sm ${
                        item.type === 'lost' ? 'bg-rose-600' : 'bg-emerald-600'
                      }`}
                    >
                      {item.type}
                    </span>
                    {item.status === 'pending' && (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-white shadow-sm">
                        Pending Verification
                      </span>
                    )}
                    {item.status === 'approved' && (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white shadow-sm">
                        Live & Approved
                      </span>
                    )}
                    {item.status === 'rejected' && (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-rose-600 text-white shadow-sm">
                        Rejected
                      </span>
                    )}
                    {item.status === 'suspicious' && (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-purple-600 text-white shadow-sm">
                        Under Review
                      </span>
                    )}
                    {(item.status === 'returned' || item.status === 'resolved') && (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-slate-900 text-white shadow-sm">
                        Resolved
                      </span>
                    )}
                  </div>

                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200">
                      {item.category}
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <h4 className="font-bold text-base text-slate-900 dark:text-white">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {item.description}
                  </p>

                  {/* Moderation Status Feedback Banners */}
                  {item.status === 'pending' && (
                    <div className="mt-2.5 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                      Under verification: Campus administrators verify all reports to prevent spam before making them public.
                    </div>
                  )}

                  {item.status === 'rejected' && (
                    <div className="mt-2.5 px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-[11px] text-rose-800 dark:text-rose-300 font-medium">
                      Report rejected: {item.rejectionReason || 'Insufficient verification details provided.'}
                    </div>
                  )}

                  {item.duplicateWarning && (
                    <div className="mt-2 px-2 py-1 rounded bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 text-[10px] text-orange-700 dark:text-orange-300 font-medium">
                      {item.duplicateWarning}
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[120px]">{item.locationName}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{item.dateOfIncident}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Actions */}
              <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800/80 mt-3 flex items-center justify-between gap-2">
                <button
                  onClick={() => navigate('item-detail', { id: item.id })}
                  className="text-xs font-semibold text-theme-main hover:underline flex items-center space-x-1"
                >
                  <span>View Details</span>
                  <ExternalLink className="w-3 h-3" />
                </button>

                <div className="flex items-center space-x-1">
                  {item.status !== 'returned' && (
                    <button
                      onClick={() => handleMarkReturned(item.id)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100 transition-colors"
                      title="Mark as returned"
                    >
                      Mark Returned
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                    title="Delete listing"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
