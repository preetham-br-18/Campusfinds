import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  ShieldCheck,
  MapPin,
  CheckCircle2,
  ArrowLeft,
  Lock,
  Flag,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { Claim, ChatMessage, CampusLocation } from '../../types';
import { useAuth } from '../../lib/authContext';
import {
  getAllClaimsFromFirestore,
  subscribeToClaimMessages,
  sendChatMessageInFirestore,
  markItemReturnedInFirestore,
  getCampusLocationsFromFirestore
} from '../../lib/firestoreService';
import { ReportAbuseModal } from '../common/ReportAbuseModal';
import { DEFAULT_HANDOVER_LOCATIONS } from '../../lib/constants';

interface MessagesPageProps {
  claimId: string;
  navigate: (route: string, params?: Record<string, any>) => void;
}

export const MessagesPage: React.FC<MessagesPageProps> = ({ claimId, navigate }) => {
  const { currentUser, profile } = useAuth();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [isAbuseModalOpen, setIsAbuseModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadClaim() {
      const claims = await getAllClaimsFromFirestore();
      const found = claims.find(c => c.id === claimId);
      if (found) setClaim(found);
    }
    loadClaim();

    const unsubscribe = subscribeToClaimMessages(claimId, (msgs) => {
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    return () => unsubscribe();
  }, [claimId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !currentUser || !claim) return;

    const text = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      await sendChatMessageInFirestore(
        claim.id,
        currentUser.uid,
        profile?.name || currentUser.displayName || 'Campus Peer',
        text
      );
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleMarkReturned = async () => {
    if (!claim) return;
    if (!window.confirm('Confirm that the handover is completed and the item is returned?')) return;
    try {
      await markItemReturnedInFirestore(claim.itemId, claim.id, profile?.name || 'Finder');
      setClaim({ ...claim, status: 'completed' });
    } catch (err) {
      console.error('Failed to mark returned:', err);
    }
  };

  if (!claim) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center text-slate-400 text-sm">
        Loading conversation...
      </div>
    );
  }

  const isOwner = currentUser?.uid === claim.ownerId;
  const otherPartyName = isOwner ? claim.claimantName : claim.ownerName;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => navigate('claims')}
          className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Claims</span>
        </button>

        <div className="flex items-center space-x-2">
          {claim.status !== 'completed' && isOwner && (
            <button
              onClick={handleMarkReturned}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center space-x-1 shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mark as Returned</span>
            </button>
          )}

          <button
            onClick={() => setIsAbuseModalOpen(true)}
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
            title="Report conversation"
          >
            <Flag className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Safety Notice & Handover Recommendations Banner (PRD Section 21) */}
      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-300 space-y-2">
        <div className="flex items-center space-x-2 font-bold">
          <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>Campus Safety Notice: Official Handover Locations</span>
        </div>
        <p className="leading-relaxed">
          For your safety, never arrange pickups in secluded places or off-campus. Always meet at campus-approved spots:
        </p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {DEFAULT_HANDOVER_LOCATIONS.map((spot, i) => (
            <span
              key={i}
              className="inline-flex items-center px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 text-[11px] font-medium text-amber-900 dark:text-amber-200"
            >
              <MapPin className="w-3 h-3 mr-1 text-amber-600" />
              {spot}
            </span>
          ))}
        </div>
      </div>

      {/* Item info header */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
        <div>
          <span className="text-slate-400">Regarding item:</span>
          <h4 className="font-bold text-slate-900 dark:text-white text-sm">{claim.itemTitle}</h4>
        </div>
        <div className="text-right">
          <span className="text-slate-400">Communicating with:</span>
          <p className="font-bold text-slate-900 dark:text-white">{otherPartyName}</p>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="h-96 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-4 overflow-y-auto space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 text-xs space-y-1">
            <Lock className="w-6 h-6 stroke-1 text-slate-400" />
            <p className="font-semibold text-slate-600 dark:text-slate-300">Secure In-App Chat Unlocked</p>
            <p>Send a message to agree on a convenient campus handover time.</p>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.senderId === currentUser?.uid;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <span className="text-[10px] text-slate-400 mb-0.5 px-1">
                  {isMe ? 'You' : msg.senderName}
                </span>
                <div
                  className={`max-w-sm sm:max-w-md px-3.5 py-2 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    isMe
                      ? 'bg-theme-main text-white rounded-br-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-bl-xs'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[9px] text-slate-400 mt-0.5 px-1">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          id="chat-message-input"
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Message ${otherPartyName} to coordinate handover...`}
          className="flex-1 px-4 py-2.5 text-sm rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-theme-main shadow-sm"
        />
        <button
          id="send-message-btn"
          type="submit"
          disabled={sending || !inputText.trim()}
          className="px-5 py-2.5 btn-theme disabled:opacity-50 rounded-2xl font-semibold text-xs flex items-center space-x-1 transition-all"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Send</span>
        </button>
      </form>

      {/* Report Modal */}
      <ReportAbuseModal
        isOpen={isAbuseModalOpen}
        onClose={() => setIsAbuseModalOpen(false)}
        targetType="conversation"
        targetId={claim.id}
        targetTitle={`Chat on ${claim.itemTitle}`}
      />
    </div>
  );
};
