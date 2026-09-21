import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  Sparkles,
  MessageSquare,
  ShieldAlert,
  Volume2,
  CheckCheck,
  ExternalLink,
  Inbox
} from 'lucide-react';
import { AppNotification } from '../../types';
import { useAuth } from '../../lib/authContext';
import {
  getUserNotificationsFromFirestore,
  markNotificationAsReadInFirestore,
  markAllNotificationsAsReadInFirestore
} from '../../lib/firestoreService';

interface NotificationsPageProps {
  navigate: (route: string, params?: Record<string, any>) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ navigate }) => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadNotifications() {
      if (!currentUser) return;
      setLoading(true);
      try {
        const notifs = await getUserNotificationsFromFirestore(currentUser.uid);
        setNotifications(notifs);
      } catch (err) {
        console.error('Failed to load notifications:', err);
      } finally {
        setLoading(false);
      }
    }
    loadNotifications();
  }, [currentUser]);

  const handleMarkAllRead = async () => {
    if (!currentUser) return;
    try {
      await markAllNotificationsAsReadInFirestore(currentUser.uid);
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.isRead) {
      markNotificationAsReadInFirestore(notif.id);
      setNotifications(notifications.map(n => (n.id === notif.id ? { ...n, isRead: true } : n)));
    }

    if (notif.relatedClaimId) {
      navigate('claims');
    } else if (notif.relatedItemId) {
      navigate('item-detail', { id: notif.relatedItemId });
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'match_found':
        return <Sparkles className="w-5 h-5 text-blue-500" />;
      case 'claim_request':
        return <ShieldAlert className="w-5 h-5 text-amber-500" />;
      case 'claim_accepted':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'claim_rejected':
        return <ShieldAlert className="w-5 h-5 text-rose-500" />;
      case 'new_message':
        return <MessageSquare className="w-5 h-5 text-indigo-500" />;
      default:
        return <Volume2 className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-display">
            Notifications
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Stay updated on AI matches, claim requests, and campus alerts.
          </p>
        </div>

        {notifications.some(n => !n.isRead) && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm">
          Loading alerts...
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <Inbox className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">No notifications</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            You are all caught up! New match discoveries and claim events will notify you here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map(notif => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start space-x-3.5 ${
                notif.isRead
                  ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  : 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60 shadow-xs'
              }`}
            >
              <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 shrink-0">
                {getIcon(notif.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className={`text-sm font-semibold truncate ${
                    notif.isRead ? 'text-slate-900 dark:text-white' : 'text-blue-950 dark:text-blue-200 font-bold'
                  }`}>
                    {notif.title}
                  </h4>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {new Date(notif.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs mt-1 leading-relaxed text-slate-600 dark:text-slate-300">
                  {notif.message}
                </p>
              </div>

              {!notif.isRead && (
                <div className="w-2 h-2 rounded-full bg-blue-600 shrink-0 self-center" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
