import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { APP_NAME, APP_DEVELOPER } from '../../lib/constants';

export const TermsPage: React.FC<{ navigate: (route: string) => void }> = ({ navigate }) => {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <button
        onClick={() => navigate('home')}
        className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-theme-main"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return Home</span>
      </button>

      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-display">
          Terms of Use
        </h1>
        <p className="text-xs text-slate-400 mt-1">Campus Community Standards</p>
      </div>

      <div className="prose dark:prose-invert text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-4 leading-relaxed">
        <h3 className="font-bold text-base text-slate-900 dark:text-white">1. Community Integrity</h3>
        <p>
          {APP_NAME} is intended exclusively for bona fide students, staff, and faculty to report and recover lost personal belongings. Submitting fraudulent claims, fake listings, abusive harassment, or commercial spam will result in immediate suspension and notification to campus disciplinary authorities.
        </p>

        <h3 className="font-bold text-base text-slate-900 dark:text-white">2. No Finder Ransom</h3>
        <p>
          Demanding monetary compensation or ransoms to return lost property violates campus honor codes. Property recovered on university grounds should be turned over to the rightful owner or deposited at the Campus Security Office.
        </p>

        <h3 className="font-bold text-base text-slate-900 dark:text-white">3. Handover Safety</h3>
        <p>
          Users agree to follow campus safety guidance and conduct property handovers in public, staffed campus locations such as Security Desks or Department Receptions.
        </p>
      </div>
    </div>
  );
};
