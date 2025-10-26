'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Logo } from '@/components/Logo';

export function HomeFooter() {
  const t = useTranslations('home.footer');
  const currentYear = new Date().getFullYear();

  return (
    <>
      {/* Font definition for ZONDA */}
      <style jsx>{`
        @font-face {
          font-family: 'AwareBold';
          src: url('/AwareBold.ttf') format('truetype');
          font-display: swap;
        }
      `}</style>

      <footer className="relative bg-white border-t border-gray-200/60">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8 sm:py-10">
          {/* Single Row Layout */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            {/* Left: Logo */}
            <div className="flex-shrink-0">
              <Link href="/" className="inline-flex hover:opacity-80 transition-opacity">
                <Logo size="sm" />
              </Link>
            </div>

            {/* Center: Navigation Links */}
            <nav className="flex flex-wrap items-center justify-center gap-6 sm:gap-8" aria-label="Footer navigation">
              <Link
                href="/book/manage"
                className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
              >
                {t('manageBooking')}
              </Link>
              <Link
                href="/dashboard"
                className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
              >
                {t('businessLogin')}
              </Link>
              <a
                href="/privacy"
                className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
              >
                {t('privacy')}
              </a>
              <a
                href="/terms"
                className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
              >
                {t('terms')}
              </a>
            </nav>

            {/* Right: Made by ZONDA & Copyright */}
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
              <p className="text-xs text-gray-500">
                © {currentYear} Rhivo
              </p>
              <span className="hidden sm:inline text-gray-300">•</span>
              <a
                href="https://www.zonda.one"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 hover:opacity-80 transition-all"
              >
                <span className="text-xs text-gray-500">{t('madeBy')}</span>
                <span
                  className="text-base font-bold bg-gradient-to-r from-teal-600 to-green-600 bg-clip-text text-transparent group-hover:from-teal-700 group-hover:to-green-700 transition-all"
                  style={{ fontFamily: 'AwareBold, sans-serif' }}
                >
                  ZONDA
                </span>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
