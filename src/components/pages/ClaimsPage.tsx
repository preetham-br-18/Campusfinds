import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  MessageSquare,
  Clock,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  HelpCircle,
  Layers,
  Inbox
} from 'lucide-react';
import { Claim } from '../../types';
import { useAuth } from '../../lib/authContext';
import {
  getUserClaimsFromFirestore,
  updateClaimInFirestore,
  markItemReturnedInFirestore,
  createNotificationInFirestore
} from '../../lib/firestoreService';

interface ClaimsPageProps {
  navigate: (route: string, params?: Record<string, any>) => void;
}

export const ClaimsPage: React.FC<ClaimsPageProps> = ({ navigate }) => {
  const { currentUser, profile } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    async function loadClaims() {
      if (!currentUser) return;
      setLoading(true);
      try {
        const userClaims = await getUserClaimsFromFirestore(currentUser.uid);
        setClaims(userClaims);
      } catch (err) {
        console.error('Failed to load claims:', err);
      } finally {
        setLoading(false);
      }
    }
    loadClaims();
  }, [currentUser]);

  const handleAcceptClaim = async (claim: Claim) => {
    if (!window.confirm(`Accept ownership claim from ${claim.claimantName}? This will unlock private handover messaging.`)) return;
    setActionLoading(claim.id);
    try {
      await updateClaimInFirestore(claim.id, {
        status: 'accepted',
        reviewedAt: new Date().toISOString()
      });

      // Notify claimant
      await createNotificationInFirestore({
        userId: claim.claimantId,
        type: 'claim_accepted',
        title: 'Claim Accepted!',
        message: `Your ownership claim for "${claim.itemTitle}" was accepted. You can now chat securely to arrange pickup.`,
        relatedItemId: claim.itemId,
        relatedClaimId: claim.id
      });

      setClaims(claims.map(c => (c.id === claim.id ? { ...c, status: 'accepted' } : c)));
    } catch (err) {
      console.error('Failed to accept claim:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectClaim = async (claim: Claim) => {
    const reason = window.prompt('Optional reason for rejection (e.g., verification details do not match item markings):');
    if (reason === null) return; // user cancelled

    setActionLoading(claim.id);
    try {
      await updateClaimInFirestore(claim.id, {
        status: 'rejected',
        rejectionReason: reason || 'Identifying features did not match the item.',
        reviewedAt: new Date().toISOString()
      });

      // Notify claimant
      await createNotificationInFirestore({
        userId: claim.claimantId,
        type: 'claim_rejected',
        title: 'Claim Not Verified',
        message: `Your claim for "${claim.itemTitle}" could not be verified by the finder.`,
        relatedItemId: claim.itemId,
        relatedClaimId: claim.id
      });

      setClaims(claims.map(c => (c.id === claim.id ? { ...c, status: 'rejected' } : c)));
    } catch (err) {
      console.error('Failed to reject claim:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkHandoverComplete = async (claim: Claim) => {
    if (!window.confirm('Confirm that the item has been safely returned and handed over to the claimant?')) return;
    setActionLoading(claim.id);
    try {
      await markItemReturnedInFirestore(claim.itemId, claim.id, profile?.name || 'Finder');
      setClaims(claims.map(c => (c.id === claim.id ? { ...c, status: 'completed' } : c)));
    } catch (err) {
      console.error('Failed to complete claim:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const incomingClaims = claims.filter(c => c.ownerId === currentUser?.uid);
  const outgoingClaims = claims.filter(c => c.claimantId === currentUser?.uid);
  const currentList = activeTab === 'incoming' ? incomingClaims : outgoingClaims;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-display">
          Ownership Claim Requests
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Review verification answers, accept legitimate owners, and coordinate safe handovers.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 w-fit text-xs font-semibold">
        <button
          id="tab-incoming-claims"
          onClick={() => setActiveTab('incoming')}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeTab === 'incoming'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Claims on My Items ({incomingClaims.length})
        </button>
        <button
          id="tab-outgoing-claims"
          onClick={() => setActiveTab('outgoing')}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeTab === 'outgoing'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Claims I Submitted ({outgoingClaims.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm">
          Loading verification requests...
        </div>
      ) : currentList.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <Inbox className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">No claims to display</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {activeTab === 'incoming'
              ? 'When other students submit claims for items you found, they will appear here.'
              : 'Items you have claimed will appear here with verification status.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {currentList.map(claim => (
            <div
              key={claim.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Item:
                  </span>
                  <h4 className="font-bold text-base text-slate-900 dark:text-white">
                    {claim.itemTitle}
                  </h4>
                </div>

                {/* Status Badge */}
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider self-start sm:self-auto ${
                    claim.status === 'pending'
                      ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900'
                      : claim.status === 'accepted'
                      ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900'
                      : claim.status === 'completed'
                      ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
                      : 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900'
                  }`}
                >
                  {claim.status === 'completed' ? 'Item Returned' : claim.status}
                </span>
              </div>

              {/* Claimant & Verification Q&A */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span>
                    Claimant: <strong className="text-slate-800 dark:text-slate-200">{claim.claimantName}</strong>
                  </span>
                  <span>Submitted: {new Date(claim.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    Verification Answer (Identifying Features Provided):
                  </span>
                  <p className="text-slate-800 dark:text-slate-200 text-sm font-medium italic">
                    "{claim.verificationAnswer}"
                  </p>
                  {claim.additionalDetails && (
                    <p className="text-slate-500 text-[11px] pt-1">
                      Notes: {claim.additionalDetails}
                    </p>
                  )}
                </div>

                {claim.rejectionReason && (
                  <p className="text-rose-600 dark:text-rose-400 text-xs">
                    Rejection note: {claim.rejectionReason}
                  </p>
                )}
              </div>

              {/* Action Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  onClick={() => navigate('item-detail', { id: claim.itemId })}
                  className="text-xs font-semibold text-theme-main hover:underline flex items-center space-x-1"
                >
                  <span>View Original Listing</span>
                  <ExternalLink className="w-3 h-3" />
                </button>

                <div className="flex items-center space-x-2">
                  {/* Chat button if accepted */}
                  {claim.status === 'accepted' && (
                    <button
                      id={`open-chat-${claim.id}`}
                      onClick={() => navigate('messages', { claimId: claim.id })}
                      className="px-4 py-2 rounded-xl btn-theme font-semibold text-xs flex items-center space-x-1.5"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Open Handover Chat</span>
                    </button>
                  )}

                  {/* Mark completed if accepted */}
                  {claim.status === 'accepted' && activeTab === 'incoming' && (
                    <button
                      onClick={() => handleMarkHandoverComplete(claim)}
                      disabled={actionLoading === claim.id}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm flex items-center space-x-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Mark Returned</span>
                    </button>
                  )}

                  {/* Accept / Reject actions if pending & incoming */}
                  {claim.status === 'pending' && activeTab === 'incoming' && (
                    <>
                      <button
                        onClick={() => handleRejectClaim(claim)}
                        disabled={actionLoading === claim.id}
                        className="px-3.5 py-2 rounded-xl border border-rose-300 dark:border-rose-900 text-rose-600 dark:text-rose-400 font-semibold text-xs hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      >
                        Reject Claim
                      </button>
                      <button
                        id={`accept-claim-btn-${claim.id}`}
                        onClick={() => handleAcceptClaim(claim)}
                        disabled={actionLoading === claim.id}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm flex items-center space-x-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Accept Claim & Unlock Chat</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
