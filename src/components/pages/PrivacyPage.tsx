import React from 'react';
import { ArrowLeft, Shield } from 'lucide-react';
import { APP_NAME, APP_DEVELOPER } from '../../lib/constants';

export const PrivacyPage: React.FC<{ navigate: (route: string) => void }> = ({ navigate }) => {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <button
        onClick={() => navigate('home')}
        className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return Home</span>
      </button>

      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-display">
          Privacy Policy
        </h1>
        <p className="text-xs text-slate-400 mt-1">Effective Date: Academic Year 2026</p>
      </div>

      <div className="prose dark:prose-invert text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-4 leading-relaxed">
        <h3 className="font-bold text-base text-slate-900 dark:text-white">1. Information We Collect</h3>
        <p>
          {APP_NAME} collects student/faculty name, institutional email address, department, and academic year to authenticate campus users and verify property claims. Optional student IDs are kept strictly private and are never rendered on public listings.
        </p>

        <h3 className="font-bold text-base text-slate-900 dark:text-white">2. Item Listings & Photographs</h3>
        <p>
          Information submitted regarding lost and found items (titles, general descriptions, incident dates, and campus building locations) is visible to logged-in campus peers. Secret identifying details provided during reporting are protected and only used to verify rightful ownership.
        </p>

        <h3 className="font-bold text-base text-slate-900 dark:text-white">3. In-App Communication</h3>
        <p>
          Messages sent between verified claim parties are encrypted in transit and stored securely on Firestore to enable seamless handover without exchanging private personal phone numbers.
        </p>

        <h3 className="font-bold text-base text-slate-900 dark:text-white">4. Developer & Maintenance</h3>
        <p>
          {APP_NAME} was developed by {APP_DEVELOPER} for campus student utility and community property recovery.
        </p>
      </div>
    </div>
  );
};
