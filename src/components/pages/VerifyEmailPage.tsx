import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle2, AlertCircle, RefreshCw, ArrowRight, ShieldCheck, LogOut } from 'lucide-react';
import { useAuth } from '../../lib/authContext';
import { auth } from '../../lib/firebase';

interface VerifyEmailPageProps {
  navigate: (route: string, params?: Record<string, any>) => void;
}

export const VerifyEmailPage: React.FC<VerifyEmailPageProps> = ({ navigate }) => {
  const { currentUser, isEmailVerified, sendVerificationEmail, reloadUser, logout, isAdmin } = useAuth();
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Auto-redirect if already verified
  useEffect(() => {
    if (isEmailVerified) {
      const timer = setTimeout(() => {
        if (isAdmin) {
          navigate('admin');
        } else {
          navigate('dashboard');
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isEmailVerified, isAdmin, navigate]);

  // Handle resend countdown
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError(null);
    setMessage(null);
    setResending(true);

    try {
      await sendVerificationEmail();
      setMessage('A new verification email has been sent to your address.');
      setCooldown(60);
    } catch (err: any) {
      console.warn('Resend verification error:', err);
      setError(err?.message || 'Could not send verification email. Please try again shortly.');
    } finally {
      setResending(false);
    }
  };

  const handleCheckStatus = async () => {
    setError(null);
    setMessage(null);
    setChecking(true);

    try {
      await reloadUser();
      const verified = auth.currentUser?.emailVerified ?? currentUser?.emailVerified;
      if (verified) {
        setMessage('Your email has been successfully verified!');
      } else {
        setError('Email not yet verified. Please click the link in your inbox and try again.');
      }
    } catch (err: any) {
      console.warn('Reload user error:', err);
      setError('Could not verify status. Please refresh the page.');
    } finally {
      setChecking(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <Mail className="w-12 h-12 text-slate-400 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Sign In Required</h2>
          <p className="text-xs text-slate-500">
            Please sign in to check your campus email verification status.
          </p>
          <button
            onClick={() => navigate('login')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl p-8 space-y-6 text-center">
        {isEmailVerified ? (
          <div className="space-y-4 animate-in fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center border border-emerald-200 dark:border-emerald-800 shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">
              Email Verified!
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Your college email <span className="font-semibold text-slate-700 dark:text-slate-200">{currentUser.email}</span> is confirmed. Redirecting to your dashboard...
            </p>
            <button
              onClick={() => navigate(isAdmin ? 'admin' : 'dashboard')}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center space-x-2"
            >
              <span>Continue to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center border border-indigo-200 dark:border-indigo-800/80 shadow-xs">
              <Mail className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">
                Verify Your Email
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                We have sent a verification link to{' '}
                <span className="font-semibold text-slate-800 dark:text-slate-200">{currentUser.email}</span>.
                Please check your inbox to activate full account capabilities.
              </p>
            </div>

            {message && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-center space-x-2 text-xs text-emerald-700 dark:text-emerald-300 text-left">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>{message}</span>
              </div>
            )}

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start space-x-2.5 text-xs text-rose-700 dark:text-rose-300 text-left">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-3 pt-2">
              <button
                type="button"
                id="check-verified-btn"
                onClick={handleCheckStatus}
                disabled={checking}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm flex items-center justify-center space-x-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
                <span>I've Verified My Email</span>
              </button>

              <button
                type="button"
                id="resend-verification-btn"
                onClick={handleResend}
                disabled={resending || cooldown > 0}
                className="w-full py-2 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                {resending ? 'Sending...' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Verification Email'}
              </button>

              <button
                type="button"
                onClick={() => navigate('dashboard')}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline"
              >
                Skip for now, go to Dashboard
              </button>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center space-x-4 text-xs text-slate-500">
              <button
                onClick={async () => {
                  await logout();
                  navigate('login');
                }}
                className="inline-flex items-center space-x-1.5 text-rose-600 dark:text-rose-400 hover:underline"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign in with different account</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
