import React, { useState, useEffect } from 'react';
import {
  Mail,
  Lock,
  User,
  Building2,
  Calendar,
  IdCard,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  GraduationCap,
  CheckCircle2,
  ShieldCheck,
  Search,
  Sparkles,
  Sun,
  Moon,
  LogIn,
  UserPlus
} from 'lucide-react';
import { useAuth, formatAuthError } from '../../lib/authContext';
import { useTheme } from '../../lib/themeContext';

interface AuthGatePageProps {
  navigate: (route: string, params?: Record<string, any>) => void;
  initialMode?: 'login' | 'register';
  intendedRoute?: string;
}

const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Information Technology',
  'Electronics & Communication',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Business Administration (MBA / BBA)',
  'Physics & Mathematics',
  'Architecture & Design',
  'Life Sciences & Biotechnology',
  'Other Campus Department'
];

const YEARS = [
  '1st Year (Freshman)',
  '2nd Year (Sophomore)',
  '3rd Year (Junior)',
  '4th Year (Senior)',
  'Postgraduate / Masters',
  'PhD / Research Scholar',
  'Faculty / Staff'
];

export const AuthGatePage: React.FC<AuthGatePageProps> = ({
  navigate,
  initialMode = 'login',
  intendedRoute
}) => {
  const { loginWithEmail, registerWithEmail, loginWithGoogle, currentUser, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  // Sign In state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Sign Up state
  const [name, setName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [year, setYear] = useState(YEARS[0]);
  const [studentId, setStudentId] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  // Shared state
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Sync mode if initialMode prop changes (e.g. from hash change)
  useEffect(() => {
    setMode(initialMode);
    setError(null);
  }, [initialMode]);

  // If already authenticated, redirect
  useEffect(() => {
    if (currentUser) {
      if (isAdmin) {
        navigate('admin');
      } else if (intendedRoute && intendedRoute !== 'login' && intendedRoute !== 'register') {
        navigate(intendedRoute);
      } else {
        navigate('dashboard');
      }
    }
  }, [currentUser, isAdmin, navigate, intendedRoute]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) {
      setError('Please provide your college email and password.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const result = await loginWithEmail(loginEmail, loginPassword);
      if (result.isAdmin) {
        navigate('admin');
      } else if (intendedRoute && intendedRoute !== 'login' && intendedRoute !== 'register') {
        navigate(intendedRoute);
      } else {
        navigate('dashboard');
      }
    } catch (err: any) {
      console.warn('Login error:', err);
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    const cleanEmail = registerEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.endsWith('@saividya.ac.in')) {
      setError('CampusFind is restricted to verified Sai Vidya Institute of Technology students and staff with a @saividya.ac.in account.');
      return;
    }
    if (registerPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (registerPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!studentId.trim()) {
      setError('Please enter your Student ID or Roll Number.');
      return;
    }

    setLoading(true);

    try {
      await registerWithEmail({
        name: name.trim(),
        email: cleanEmail,
        pass: registerPassword,
        department,
        year,
        studentId: studentId.trim()
      });

      navigate('verify-email');
    } catch (err: any) {
      console.warn('Registration error:', err);
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
      } else if (intendedRoute && intendedRoute !== 'login' && intendedRoute !== 'register') {
        navigate(intendedRoute);
      } else {
        navigate('dashboard');
      }
    } catch (err: any) {
      console.warn('Google sign-in error:', err);
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 transition-colors selection:bg-indigo-600 selection:text-white">
      {/* Top Bar with Brand & Theme Toggle */}
      <header className="w-full border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-sm">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white font-display">
                CampusFind
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Official Network
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Campus System Overview & Verification Credentials */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Campus Security Portal</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white font-display tracking-tight leading-tight">
                Sign in or register to access the campus network.
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                Access to lost & found listings, reporting tools, and claim verifications is strictly reserved for verified university students, faculty, and administrative staff.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="space-y-3.5 pt-2">
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-start space-x-3.5 shadow-xs">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Smart Campus Registry</h4>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Browse and search recovered electronics, notebooks, student cards, and belongings across all campus zones.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-start space-x-3.5 shadow-xs">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Verified Claim Protection</h4>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Multi-factor proof verification and student ID validation prevent unauthorized property handovers.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-start space-x-3.5 shadow-xs">
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Real-Time Match Alerts</h4>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Receive immediate notifications when an item matching your missing description is discovered.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Prominent Login & Sign Up Options */}
          <div className="lg:col-span-7">
            <div className="w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
              
              {/* Login vs. Sign Up Top Selector Tabs */}
              <div className="p-2 bg-slate-100/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex rounded-t-3xl">
                <button
                  id="tab-select-login"
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className={`flex-1 py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                    mode === 'login'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </button>

                <button
                  id="tab-select-register"
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                  className={`flex-1 py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                    mode === 'register'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account (Sign Up)</span>
                </button>
              </div>

              <div className="p-6 sm:p-8 space-y-6">
                {/* Error Banner */}
                {error && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start space-x-2.5 text-xs text-rose-700 dark:text-rose-300">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                    <span className="leading-relaxed">{error}</span>
                  </div>
                )}

                {/* SIGN IN VIEW */}
                {mode === 'login' && (
                  <div className="space-y-5 animate-in fade-in duration-150">
                    <div className="space-y-1">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white font-display">
                        Welcome back
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Enter your registered college email and password to access the platform.
                      </p>
                    </div>

                    <form onSubmit={handleLoginSubmit} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          College Email
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            id="authgate-login-email"
                            type="email"
                            required
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            placeholder="student@saividya.ac.in"
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors text-slate-900 dark:text-white"
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
                            id="authgate-forgot-password-btn"
                            onClick={() => navigate('forgot-password')}
                            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                          >
                            Forgot password?
                          </button>
                        </div>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            id="authgate-login-password"
                            type={showLoginPassword ? 'text' : 'password'}
                            required
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full pl-10 pr-11 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors text-slate-900 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => setShowLoginPassword(!showLoginPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                          >
                            {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        id="authgate-login-submit"
                        disabled={loading}
                        className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm flex items-center justify-center space-x-2 touch-manipulation cursor-pointer"
                      >
                        {loading ? (
                          <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <span>Sign In to Interface</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 font-medium">Or continue with</span>
                      </div>
                    </div>

                    {/* Google Sign In */}
                    <button
                      type="button"
                      id="authgate-google-signin"
                      onClick={handleGoogleSignIn}
                      disabled={loading}
                      className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-center justify-center space-x-2 cursor-pointer"
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

                    <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400">
                      Need a campus account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setMode('register');
                          setError(null);
                        }}
                        className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
                      >
                        Create student account
                      </button>
                    </div>
                  </div>
                )}

                {/* SIGN UP VIEW */}
                {mode === 'register' && (
                  <div className="space-y-5 animate-in fade-in duration-150">
                    <div className="space-y-1">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white font-display">
                        Create Student Account
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Join the verified network to report missing items and claim lost valuables.
                      </p>
                    </div>

                    <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/50 rounded-xl text-xs text-indigo-700 dark:text-indigo-300 flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span>Registrations automatically enroll with verified student privileges.</span>
                    </div>

                    <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                      {/* Full Name */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Full Name *
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            id="authgate-reg-name"
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="John Doe"
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>

                      {/* College Email */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          College Email *
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            id="authgate-reg-email"
                            type="email"
                            required
                            value={registerEmail}
                            onChange={(e) => setRegisterEmail(e.target.value)}
                            placeholder="preethambr.24aiml@saividya.ac.in"
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors text-slate-900 dark:text-white"
                          />
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Must be your official <span className="font-semibold text-indigo-600 dark:text-indigo-400">@saividya.ac.in</span> institutional email.
                        </p>
                      </div>

                      {/* Department & Year (Grid) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Department
                          </label>
                          <div className="relative">
                            <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <select
                              id="authgate-reg-department"
                              value={department}
                              onChange={(e) => setDepartment(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-white"
                            >
                              {DEPARTMENTS.map(d => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Year of Study
                          </label>
                          <div className="relative">
                            <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <select
                              id="authgate-reg-year"
                              value={year}
                              onChange={(e) => setYear(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-white"
                            >
                              {YEARS.map(y => (
                                <option key={y} value={y}>{y}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Student ID */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Student ID / Roll Number *
                        </label>
                        <div className="relative">
                          <IdCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            id="authgate-reg-studentid"
                            type="text"
                            required
                            value={studentId}
                            onChange={(e) => setStudentId(e.target.value)}
                            placeholder="e.g. 21CS042 or S10984"
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>

                      {/* Password & Confirm Password (Grid) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Password *
                          </label>
                          <div className="relative">
                            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                              id="authgate-reg-password"
                              type={showRegisterPassword ? 'text' : 'password'}
                              required
                              value={registerPassword}
                              onChange={(e) => setRegisterPassword(e.target.value)}
                              placeholder="Min 6 characters"
                              className="w-full pl-10 pr-10 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-white"
                            />
                            <button
                              type="button"
                              onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                              {showRegisterPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Confirm Password *
                          </label>
                          <div className="relative">
                            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                              id="authgate-reg-confirmpassword"
                              type={showRegisterPassword ? 'text' : 'password'}
                              required
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="Repeat password"
                              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-white"
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        id="authgate-register-submit"
                        disabled={loading}
                        className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm flex items-center justify-center space-x-2 touch-manipulation cursor-pointer mt-2"
                      >
                        {loading ? (
                          <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <span>Register & Access Network</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>

                    <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400">
                      Already have a campus account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setMode('login');
                          setError(null);
                        }}
                        className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
                      >
                        Sign in instead
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="w-full py-4 border-t border-slate-200 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} CampusFind. All campus property rights reserved.</span>
          <div className="flex items-center space-x-4">
            <button onClick={() => navigate('about')} className="hover:underline">About System</button>
            <button onClick={() => navigate('privacy')} className="hover:underline">Privacy</button>
            <button onClick={() => navigate('terms')} className="hover:underline">Terms</button>
          </div>
        </div>
      </footer>
    </div>
  );
};
