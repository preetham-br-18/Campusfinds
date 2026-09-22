import React from 'react';
import {
  Compass,
  ShieldCheck,
  Sparkles,
  Heart,
  CheckCircle2,
  Lock,
  ArrowRight,
  HelpCircle
} from 'lucide-react';
import { APP_NAME, APP_TAGLINE, APP_DEVELOPER } from '../../lib/constants';

interface AboutPageProps {
  navigate: (route: string) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ navigate }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Hero */}
      <div className="text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl gradient-theme-bg text-white flex items-center justify-center mx-auto shadow-theme-glow font-bold text-2xl font-display">
          CF
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white font-display">
          About {APP_NAME}
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-300 max-w-xl mx-auto font-medium">
          {APP_TAGLINE}
        </p>
      </div>

      {/* Mission */}
      <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white font-display">
          Our Campus Mission
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Every semester, hundreds of laptops, ID cards, keys, earphones, and notebooks are misplaced across campus lecture halls, libraries, and laboratories. CampusFind replaces scattered bulletin board flyers and unverified social media posts with a structured, AI-enhanced platform designed specifically for college communities.
        </p>
      </div>

      {/* How it works */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white font-display text-center">
          How CampusFind Works
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 font-bold flex items-center justify-center text-sm">
              1
            </div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Report Property</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Upload photographs, select campus location, and add public descriptions. AI automatically assists with categorization and tags.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-theme-subtle text-theme-main font-bold flex items-center justify-center text-sm">
              2
            </div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">AI Similarity Matching</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Our matching algorithm scans across category, incident timing, keywords, and campus locations to notify you of potential matches.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 font-bold flex items-center justify-center text-sm">
              3
            </div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Verified Safe Handover</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Claimants verify ownership by answering questions about unique identifying features before secure handover chat is unlocked.
            </p>
          </div>
        </div>
      </div>

      {/* Trust & Safety Rules */}
      <div className="p-8 rounded-3xl bg-theme-subtle border border-theme-subtle space-y-4">
        <div className="flex items-center space-x-2 text-theme-main">
          <ShieldCheck className="w-6 h-6 text-theme-main" />
          <h3 className="font-bold text-lg font-display">Campus Safety Principles</h3>
        </div>
        <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed list-disc list-inside">
          <li><strong>Never exchange money:</strong> Returning lost property is a campus community service. CampusFind strictly prohibits finder reward extortion or ransom demands.</li>
          <li><strong>Always meet in public locations:</strong> Recommended handover locations include the College Security Office, Central Library Reception, and Main Gate Security Desk.</li>
          <li><strong>Protect sensitive credentials:</strong> Do not publicly post photos displaying sensitive student IDs, bank card numbers, or driver's license numbers.</li>
        </ul>
      </div>

      {/* Developer Credit Section (Discreet as specified in PRD Section 72 & 82) */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-800 text-center space-y-2">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          CampusFind platform architecture and full-stack implementation
        </p>
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Developed by {APP_DEVELOPER}
        </p>
      </div>
    </div>
  );
};
