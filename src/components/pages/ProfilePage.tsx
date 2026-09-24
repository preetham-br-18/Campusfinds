import React, { useState } from 'react';
import {
  User,
  Mail,
  Building2,
  GraduationCap,
  Shield,
  CheckCircle2,
  AlertCircle,
  Save,
  Lock,
  Sun,
  Moon
} from 'lucide-react';
import { useAuth } from '../../lib/authContext';
import { useTheme } from '../../lib/themeContext';
import { CAMPUS_DEPARTMENTS } from '../../lib/constants';

export const ProfilePage: React.FC = () => {
  const { currentUser, profile, updateUserProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState(profile?.name || currentUser?.displayName || '');
  const [department, setDepartment] = useState(profile?.department || '');
  const [year, setYear] = useState(profile?.year || '');
  const [college, setCollege] = useState(profile?.college || '');
  const [studentId, setStudentId] = useState(profile?.studentId || '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await updateUserProfile({
        name: name.trim(),
        department: department.trim(),
        year: year.trim(),
        college: college.trim(),
        studentId: studentId.trim()
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setError(err.message || 'Error updating profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-display">
          Profile & Account Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your verified campus details and personal preferences.
        </p>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Profile updated successfully!</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 shadow-sm">
        {/* User Identity Header */}
        <div className="flex items-center space-x-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="w-14 h-14 rounded-2xl bg-theme-subtle text-theme-main font-bold text-xl flex items-center justify-center shadow-inner">
            {(name || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">{name || 'Campus Member'}</h3>
            <p className="text-xs text-slate-400">{currentUser?.email}</p>
            <div className="mt-1 inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-theme-subtle text-theme-main border border-theme-subtle">
              <Shield className="w-3 h-3 mr-0.5" />
              <span>Role: {profile?.role || 'student'}</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
            Full Name *
          </label>
          <div className="relative">
            <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pl-10 pr-3 py-3 sm:py-2.5 text-base sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-theme-main min-h-[46px]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
            Campus Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="email"
              disabled
              value={currentUser?.email || ''}
              className="w-full pl-10 pr-3 py-3 sm:py-2.5 text-base sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50 text-slate-500 cursor-not-allowed min-h-[46px]"
            />
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Email address is verified through your campus authentication provider.
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Department
            </label>
            <div className="relative">
              <GraduationCap className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full pl-10 pr-3 py-3 sm:py-2.5 text-base sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[46px]"
              >
                <option value="">Select Department</option>
                {CAMPUS_DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
                {department && !CAMPUS_DEPARTMENTS.includes(department) && (
                  <option value={department}>{department}</option>
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Year / Semester
            </label>
            <input
              type="text"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="e.g. 3rd Year"
              className="w-full px-3.5 py-3 sm:py-2.5 text-base sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[46px]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
            College / Institution Name
          </label>
          <div className="relative">
            <Building2 className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={college}
              onChange={(e) => setCollege(e.target.value)}
              placeholder="e.g. Main Campus Engineering College"
              className="w-full pl-10 pr-3 py-3 sm:py-2.5 text-base sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[46px]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
            Student / Staff ID (Optional)
          </label>
          <input
            type="text"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="e.g. 1RV21CS099"
            className="w-full px-3.5 py-3 sm:py-2.5 text-base sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[46px]"
          />
          <span className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1">
            <Lock className="w-3 h-3 text-theme-main" />
            <span>Kept strictly confidential. Never shown on public lost or found listings.</span>
          </span>
        </div>

        {/* Theme & Display Mode Section */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Sun className="w-4 h-4 text-theme-main" />
              <span>Display Theme</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Choose your preferred display mode for daytime or night-time campus browsing.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              id="profile-theme-light-btn"
              onClick={() => setTheme('light')}
              className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-xl border text-xs font-semibold transition-all touch-manipulation ${
                theme === 'light'
                  ? 'border-slate-900 bg-white text-slate-900 shadow-sm ring-1 ring-slate-900'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sun className="w-4 h-4 text-amber-500" />
              <span>Light Mode</span>
            </button>
            <button
              type="button"
              id="profile-theme-dark-btn"
              onClick={() => setTheme('dark')}
              className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-xl border text-xs font-semibold transition-all touch-manipulation ${
                theme === 'dark'
                  ? 'border-white bg-slate-900 text-white shadow-sm ring-1 ring-white/20'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Moon className="w-4 h-4 text-blue-400" />
              <span>Dark Mode</span>
            </button>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            id="save-profile-btn"
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto py-3.5 sm:py-2.5 px-7 gradient-theme-bg hover:opacity-90 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-theme-glow flex items-center justify-center space-x-2 transition-all active:scale-[0.98] min-h-[46px] touch-manipulation"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving changes...' : 'Save Profile'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
