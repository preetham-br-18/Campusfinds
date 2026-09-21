import React from 'react';
import { ShieldCheck, Heart } from 'lucide-react';
import { APP_NAME, APP_TAGLINE, APP_DEVELOPER } from '../../lib/constants';

interface FooterProps {
  navigate: (route: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ navigate }) => {
  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 transition-colors mt-auto pb-20 md:pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand & Tagline */}
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start space-x-2">
              <span className="font-bold text-lg text-slate-900 dark:text-white font-display">
                {APP_NAME}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-medium">
                Campus Portal
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {APP_TAGLINE}
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-600 dark:text-slate-400 font-medium">
            <button
              onClick={() => navigate('about')}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              About
            </button>
            <button
              onClick={() => navigate('about')}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Safety Guidelines
            </button>
            <button
              onClick={() => navigate('privacy')}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => navigate('terms')}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Terms of Use
            </button>
          </div>

          {/* Copyright & Discreet Developer Credit */}
          <div className="text-center md:text-right text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <p>© 2026 {APP_NAME}. All rights reserved.</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Developed by <span className="text-slate-600 dark:text-slate-300 font-medium">{APP_DEVELOPER}</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
