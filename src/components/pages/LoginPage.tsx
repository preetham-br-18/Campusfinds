import React, { useState } from 'react';
import { Mail, Lock, AlertCircle, ArrowRight, ShieldCheck, Eye, EyeOff, Sparkles, GraduationCap } from 'lucide-react';
import { useAuth, formatAuthError } from '../../lib/authContext';

interface LoginPageProps {
  navigate: (route: string, params?: Record<string, any>) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ navigate }) => {
  const { loginWithEmail, loginWithGoogle, currentUser, isAdmin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect based on role
  React.useEffect(() => {
    if (currentUser) {
      if (isAdmin) {
        navigate('admin');
      } else {
        navigate('dashboard');
      }
    }
  }, [currentUser, isAdmin, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both your college email and password.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const result = await loginWithEmail(email, password);
      // Requirement 4: If claims.admin === true, redirect to /admin, otherwise /student
      if (result.isAdmin) {
        navigate('admin');
      } else {
        navigate('student');
      }
    } catch (err: any) {
      console.warn('Login error:', err);
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await loginWithGoogle();
      if (result.isAdmin) {
        navigate('admin');
      } else {
        navigate('student');
      }
    } catch (err: any) {
      console.warn('Google sign-in error:', err);
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 relative">
      {/* Ambient background glow */}
      <div className="absolute inset-0 max-w-md mx-auto pointer-events-none opacity-40 dark:opacity-20 blur-3xl -z-10 bg-gradient-to-tr from-theme-main/30 to-indigo-500/20" />

      <div className="card-stylish w-full max-w-md rounded-2xl p-7 sm:p-9 space-y-6 shadow-xl backdrop-blur-md">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-theme-subtle text-theme-main mx-auto flex items-center justify-center border border-theme-subtle shadow-xs">
            <GraduationCap className="w-6 h-6 stroke-[1.75]" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white font-display tracking-tight">
            Sign In to CampusFind
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Access institutional lost & found registries and claim verifications.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 flex items-start space-x-2.5 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              College Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="login-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@campus.edu"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-theme-main/20 focus:border-theme-main transition-colors text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Password
              </label>
              <button
                type="button"
                id="forgot-password-link"
                onClick={() => navigate('forgot-password')}
                className="text-xs text-theme-main hover:underline font-medium"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="login-password-input"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-11 py-2.5 bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-theme-main/20 focus:border-theme-main transition-colors text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            id="login-submit-btn"
            disabled={loading}
            className="w-full py-2.5 px-4 gradient-theme-bg disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all shadow-theme-glow flex items-center justify-center space-x-2 touch-manipulation cursor-pointer active:scale-98"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200/80 dark:border-slate-800" />
          </div>
          <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
            <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 font-medium">Or continue with</span>
          </div>
        </div>

        {/* Google Sign-in */}
        <button
          type="button"
          id="google-signin-btn"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-2.5 px-4 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-center justify-center space-x-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Campus Google Account</span>
        </button>

        {/* Footer Link to Register */}
        <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400">
          New to CampusFind?{' '}
          <button
            id="switch-to-register-btn"
            onClick={() => navigate('register')}
            className="text-theme-main font-semibold hover:underline"
          >
            Create student account
          </button>
        </div>
      </div>
    </div>
  );
};
