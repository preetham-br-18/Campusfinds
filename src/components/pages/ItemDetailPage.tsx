import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Calendar,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Flag,
  Share2,
  Trash2,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  Lock,
  User,
  ExternalLink,
  Layers,
  FileQuestion
} from 'lucide-react';
import { Item } from '../../types';
import { useAuth } from '../../lib/authContext';
import {
  getItemByIdFromFirestore,
  getAllItemsFromFirestore,
  markItemReturnedInFirestore,
  softDeleteItemInFirestore
} from '../../lib/firestoreService';
import { findPotentialMatches, MatchScoreResult } from '../../lib/matchingEngine';
import { ClaimModal } from '../common/ClaimModal';
import { ReportAbuseModal } from '../common/ReportAbuseModal';

interface ItemDetailPageProps {
  itemId: string;
  navigate: (route: string, params?: Record<string, any>) => void;
  openAuthModal: () => void;
}

export const ItemDetailPage: React.FC<ItemDetailPageProps> = ({
  itemId,
  navigate,
  openAuthModal
}) => {
  const { currentUser, isAdmin } = useAuth();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [potentialMatches, setPotentialMatches] = useState<MatchScoreResult[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Modals
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [isAbuseModalOpen, setIsAbuseModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadItem() {
      setLoading(true);
      try {
        const found = await getItemByIdFromFirestore(itemId);
        setItem(found);
        if (found) {
          const allItems = await getAllItemsFromFirestore();
          const matches = findPotentialMatches(found, allItems, 35);
          setPotentialMatches(matches);
        }
      } catch (err) {
        console.error('Failed to load item:', err);
      } finally {
        setLoading(false);
      }
    }
    loadItem();
  }, [itemId]);

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleMarkReturned = async () => {
    if (!item) return;
    if (!window.confirm('Confirm that this item has been returned to its rightful owner?')) return;
    try {
      await markItemReturnedInFirestore(item.id, undefined, currentUser?.displayName || 'User');
      setItem({ ...item, status: 'returned' });
      setActionMessage('Item marked as successfully returned!');
    } catch (err) {
      console.error('Error marking returned:', err);
    }
  };

  const handleDeleteItem = async () => {
    if (!item) return;
    if (!window.confirm('Are you sure you want to remove this listing?')) return;
    try {
      await softDeleteItemInFirestore(item.id);
      navigate('home');
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-slate-400 text-sm">
        Loading item information...
      </div>
    );
  }

  if (!item) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Listing not found</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          This item listing may have been closed, deleted, or expired.
        </p>
        <button
          onClick={() => navigate('search')}
          className="px-4 py-2 text-xs font-semibold rounded-xl btn-theme"
        >
          Browse Directory
        </button>
      </div>
    );
  }

  const isOwner = currentUser && (currentUser.uid === item.reportedBy || isAdmin);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button with generous touch target */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('search')}
          className="inline-flex items-center space-x-2 py-2 px-3 -ml-3 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-theme-main hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors touch-manipulation min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Directory</span>
        </button>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={handleShare}
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all touch-manipulation"
            title="Share item"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsAbuseModalOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all touch-manipulation"
            title="Report inappropriate listing"
          >
            <Flag className="w-4 h-4" />
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Main Grid: Gallery + Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Photos Gallery */}
        <div className="space-y-3">
          <div className="h-80 sm:h-96 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 flex items-center justify-center relative">
            {item.imageUrls && item.imageUrls.length > 0 ? (
              <img
                src={item.imageUrls[activeImageIndex]}
                alt={item.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain bg-slate-950/5 dark:bg-slate-950/40"
              />
            ) : (
              <div className="text-slate-400 flex flex-col items-center">
                <FileQuestion className="w-16 h-16 stroke-1" />
                <span className="text-xs font-medium mt-2">No photograph provided</span>
              </div>
            )}

            <div className="absolute top-3 left-3 flex space-x-2">
              <span
                className={`px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider text-white shadow-sm ${
                  item.type === 'lost' ? 'bg-rose-600' : 'bg-emerald-600'
                }`}
              >
                {item.type}
              </span>
              {item.status === 'returned' && (
                <span className="px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-900 text-white shadow-sm">
                  Returned
                </span>
              )}
            </div>
          </div>

          {/* Thumbnails */}
          {item.imageUrls && item.imageUrls.length > 1 && (
            <div className="flex space-x-2 overflow-x-auto pb-1">
              {item.imageUrls.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImageIndex(i)}
                  className={`h-16 w-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                    activeImageIndex === i
                      ? 'border-theme-main scale-95'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={url} alt="thumbnail" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Item Information */}
        <div className="flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                {item.category}
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleShare}
                  className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs flex items-center space-x-1"
                  title="Share item link"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">{copiedLink ? 'Copied!' : 'Share'}</span>
                </button>
                <button
                  onClick={() => setIsAbuseModalOpen(true)}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-600 transition-colors text-xs flex items-center space-x-1"
                  title="Report listing"
                >
                  <Flag className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-display">
              {item.title}
            </h1>

            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs">
              <div className="space-y-1">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Campus Location</span>
                <p className="font-bold text-slate-900 dark:text-white flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-500" />
                  <span>{item.locationName}</span>
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Incident Date</span>
                <p className="font-bold text-slate-900 dark:text-white flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-500" />
                  <span>{item.dateOfIncident}</span>
                </p>
              </div>
              {item.timeOfIncident && (
                <div className="space-y-1">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Approx. Time</span>
                  <p className="font-bold text-slate-900 dark:text-white flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    <span>{item.timeOfIncident}</span>
                  </p>
                </div>
              )}
              {item.currentPossession && (
                <div className="space-y-1">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Current Custody</span>
                  <p className="font-bold text-slate-900 dark:text-white truncate">
                    {item.currentPossession}
                  </p>
                </div>
              )}
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Description
              </h4>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {item.description}
              </p>
            </div>

            {/* Privacy Protection Notice */}
            <div className="p-3 rounded-xl bg-theme-subtle border border-theme-subtle text-xs text-theme-main flex items-start space-x-2">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-theme-main" />
              <span>
                Sensitive identifying details (serial numbers, hidden markings) are kept protected to ensure accurate ownership verification during claims.
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            {isOwner ? (
              <div className="flex flex-wrap gap-2">
                {item.status !== 'returned' && (
                  <button
                    id="mark-returned-btn"
                    onClick={handleMarkReturned}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Mark as Returned</span>
                  </button>
                )}
                <button
                  onClick={() => navigate('claims')}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  View Claims on this Item
                </button>
                <button
                  onClick={handleDeleteItem}
                  className="p-2.5 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  title="Delete listing"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : item.status === 'returned' ? (
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">
                This item has already been claimed and returned to its owner.
              </div>
            ) : (
              <button
                id="claim-ownership-btn"
                onClick={() => {
                  if (!currentUser) openAuthModal();
                  else setIsClaimModalOpen(true);
                }}
                className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white shadow-lg transition-all flex items-center justify-center space-x-2 ${
                  item.type === 'found'
                    ? 'btn-theme'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>
                  {item.type === 'found' ? 'I Think This Is Mine (Submit Claim)' : 'I Found This Item (Contact Owner)'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* AI Possible Matches Section (PRD Section 22-26) */}
      {potentialMatches.length > 0 && (
        <section className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 text-slate-900 dark:text-white">
            <Sparkles className="w-5 h-5 text-theme-main" />
            <h3 className="font-bold text-lg font-display">
              Possible Matching {item.type === 'lost' ? 'Found' : 'Lost'} Listings
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">
            AI-calculated similarity across category, keywords, incident location, and timestamp proximity.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {potentialMatches.slice(0, 3).map(({ candidateItem, score, reasons }) => (
              <div
                key={candidateItem.id}
                onClick={() => navigate('item-detail', { id: candidateItem.id })}
                className="cursor-pointer p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-theme-main shadow-sm hover:shadow transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-theme-subtle text-theme-main">
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

                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-theme-main font-semibold">
                  <span>View Details</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-slate-400 italic">
            AI-generated possible match. Verify ownership before claiming.
          </p>
        </section>
      )}

      {/* Mobile Sticky Floating Action Bar */}
      <div className="md:hidden fixed bottom-16 left-0 right-0 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-30 shadow-lg">
        {isOwner ? (
          <div className="flex space-x-2">
            {item.status !== 'returned' && (
              <button
                id="mobile-sticky-returned-btn"
                onClick={handleMarkReturned}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 active:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center justify-center space-x-1.5 touch-manipulation min-h-[46px]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark Returned</span>
              </button>
            )}
            <button
              onClick={() => navigate('claims')}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs active:bg-slate-100 dark:active:bg-slate-800 touch-manipulation min-h-[46px]"
            >
              View Claims
            </button>
          </div>
        ) : item.status === 'returned' ? (
          <div className="py-2 text-center text-xs font-semibold text-slate-500">
            This item has been returned to its owner.
          </div>
        ) : (
          <button
            id="mobile-sticky-claim-btn"
            onClick={() => {
              if (!currentUser) openAuthModal();
              else setIsClaimModalOpen(true);
            }}
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white shadow-md flex items-center justify-center space-x-2 active:scale-98 transition-all touch-manipulation min-h-[48px] ${
              item.type === 'found'
                ? 'btn-theme'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>
              {item.type === 'found' ? 'I Think This Is Mine (Submit Claim)' : 'I Found This Item (Contact Finder)'}
            </span>
          </button>
        )}
      </div>

      {/* Claim Modal */}
      <ClaimModal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        item={item}
        onClaimSubmitted={(claimId) => {
          setActionMessage('Claim submitted! The finder will review your verification details.');
          navigate('claims');
        }}
      />

      {/* Report Abuse Modal */}
      <ReportAbuseModal
        isOpen={isAbuseModalOpen}
        onClose={() => setIsAbuseModalOpen(false)}
        targetType="item"
        targetId={item.id}
        targetTitle={item.title}
      />
    </div>
  );
};
