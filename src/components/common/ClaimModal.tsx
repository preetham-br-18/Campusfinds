import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle2, HelpCircle, Lock } from 'lucide-react';
import { Item } from '../../types';
import { createClaimInFirestore } from '../../lib/firestoreService';
import { useAuth } from '../../lib/authContext';

interface ClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item | null;
  onClaimSubmitted: (claimId: string) => void;
}

export const ClaimModal: React.FC<ClaimModalProps> = ({
  isOpen,
  onClose,
  item,
  onClaimSubmitted
}) => {
  const { currentUser, profile } = useAuth();
  const [verificationAnswer, setVerificationAnswer] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setError('You must be signed in to submit a claim request.');
      return;
    }
    if (currentUser.uid === item.reportedBy) {
      setError('You cannot submit an ownership claim on an item you reported yourself.');
      return;
    }
    if (!verificationAnswer.trim()) {
      setError('Please provide a unique identifying feature to verify ownership.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const claimId = await createClaimInFirestore({
        itemId: item.id,
        itemTitle: item.title,
        itemType: item.type,
        itemImage: item.imageUrls?.[0] || '',
        claimantId: currentUser.uid,
        claimantName: profile?.name || currentUser.displayName || 'Campus User',
        claimantEmail: currentUser.email || '',
        ownerId: item.reportedBy,
        ownerName: item.reporterName || 'Item Finder',
        verificationAnswer: verificationAnswer.trim(),
        additionalDetails: additionalDetails.trim(),
        status: 'pending'
      });

      onClaimSubmitted(claimId);
      onClose();
    } catch (err: any) {
      console.error('Failed to submit claim:', err);
      setError(err.message || 'Failed to submit claim. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 overflow-hidden max-h-[90vh] overflow-y-auto">
        <button
          id="close-claim-modal-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white font-display">
              {item.type === 'found' ? 'Claim Ownership of Found Item' : 'Report Found Matching Item'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Item: <span className="font-medium text-slate-700 dark:text-slate-200">{item.title}</span>
            </p>
          </div>
        </div>

        {/* Security / Verification Rule Box */}
        <div className="mb-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-300 text-xs space-y-1">
          <div className="flex items-center space-x-1.5 font-semibold">
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Ownership Verification Required</span>
          </div>
          <p className="text-amber-800 dark:text-amber-400 leading-relaxed">
            To prevent false claims and protect students' property, you must describe distinctive characteristics that only the rightful owner would know (e.g., specific scratches, lock screen wallpaper, inside contents, serial number suffix, keychain initials, etc.).
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Unique Identifying Feature *</span>
              <span className="text-[11px] font-normal text-slate-500">e.g. "Small scratch on the bottom left corner"</span>
            </label>
            <textarea
              id="claim-verification-input"
              required
              rows={3}
              value={verificationAnswer}
              onChange={(e) => setVerificationAnswer(e.target.value)}
              placeholder="Describe one or more specific details that prove ownership (markings, stickers, secret pockets, serial number fragment, etc.)"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Additional Notes (Optional)
            </label>
            <input
              type="text"
              value={additionalDetails}
              onChange={(e) => setAdditionalDetails(e.target.value)}
              placeholder="e.g. When and where you last remember holding it"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <p className="font-semibold text-slate-800 dark:text-slate-200">What happens after you submit:</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>The finder or campus administrator will review your verification answer.</li>
              <li>Once accepted, private in-app chat is unlocked to arrange secure campus handover.</li>
              <li>Official handover points (Security Office, Central Reception) are strongly recommended.</li>
            </ol>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              id="submit-claim-request-btn"
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white shadow-md shadow-blue-500/20 flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Submitting...' : 'Submit Claim for Review'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
