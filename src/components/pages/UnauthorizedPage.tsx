import React from 'react';
import { ShieldAlert, ArrowLeft, LayoutDashboard, LogOut, Lock, ExternalLink } from 'lucide-react';
import { useAuth } from '../../lib/authContext';

interface UnauthorizedPageProps {
  navigate: (route: string, params?: Record<string, any>) => void;
}

export const UnauthorizedPage: React.FC<UnauthorizedPageProps> = ({ navigate }) => {
  const { currentUser, profile, logout } = useAuth();

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-8 space-y-6 text-center">
        {/* Shield Icon */}
        <div className="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center border border-rose-200 dark:border-rose-900/60 shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-100/70 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-[11px] font-bold tracking-wider uppercase">
            <Lock className="w-3 h-3" />
            <span>403 Forbidden • Access Denied</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display pt-2">
            Administrator Authorization Required
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            The requested administration console and moderation controls are restricted exclusively to campus faculty and authorized security staff.
          </p>
        </div>

        {/* User Role Card */}
        {currentUser && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-left space-y-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Current Authenticated Session
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  {profile?.name || currentUser.displayName || 'Campus User'}
                </div>
                <div className="text-xs text-slate-500">
                  {currentUser.email}
                </div>
              </div>
              <div className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-100/70 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                Role: {profile?.role || 'student'}
              </div>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
              Your account lacks the <code className="px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px]">{`{ admin: true }`}</code> Firebase Custom Claim.
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            id="unauthorized-dashboard-btn"
            onClick={() => navigate('dashboard')}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm flex items-center justify-center space-x-2"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Return to Student Dashboard</span>
          </button>

          <button
            type="button"
            id="unauthorized-switch-account-btn"
            onClick={async () => {
              await logout();
              navigate('login');
            }}
            className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-xl transition-colors flex items-center justify-center space-x-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign In with Campus Admin Account</span>
          </button>
        </div>

        {/* Help text */}
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Need campus admin access? Refer to the project's <span className="font-mono text-indigo-500">ADMIN_SETUP_GUIDE.md</span> or contact the systems administrator.
        </p>
      </div>
    </div>
  );
};
