'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Logo } from '@/components/Logo';

export function HomeFooter() {
  const t = useTranslations('home.footer');
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200/60 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-8 sm:py-12">
        {/* Main Content */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-8">
          {/* Brand */}
          <div className="flex flex-col items-center sm:items-start gap-3">
            <Link href="/" className="inline-flex">
              <Logo size="sm" />
            </Link>
            <p className="text-sm text-gray-500">{t('tagline')}</p>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm" aria-label="Footer navigation">
            <Link 
              href="/book/manage" 
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              {t('manageBooking')}
            </Link>
            <Link 
              href="/dashboard" 
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              {t('businessLogin')}
            </Link>
            <span className="text-gray-300">•</span>
            <a 
              href="/privacy" 
              className="text-gray-500 hover:text-gray-900 transition-colors text-xs sm:text-sm"
            >
              {t('privacy')}
            </a>
            <a 
              href="/terms" 
              className="text-gray-500 hover:text-gray-900 transition-colors text-xs sm:text-sm"
            >
              {t('terms')}
            </a>
          </nav>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-6 border-t border-gray-200/60 text-center sm:text-left">
          <p className="text-xs text-gray-400">© {currentYear} Rivo</p>
        </div>
      </div>
    </footer>
  );
}
