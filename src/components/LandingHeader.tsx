'use client';

import { Logo } from '@/components/Logo';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';

export function LandingHeader() {
  const t = useTranslations('home.nav');
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Track scroll position for backdrop blur effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [mobileMenuOpen]);

  return (
    <>
      {/* Header - Following style guide: sticky, backdrop blur, subtle border */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/95 backdrop-blur-sm border-b border-gray-200/60'
            : 'bg-transparent'
        }`}
      >
        <nav className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-4 sm:py-5">
          <div className="flex items-center justify-between">
            {/* Logo - Left side */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
                <Logo size="sm" showText={true} className="!m-0 !p-0" />
              </Link>
            </div>

            {/* Desktop Navigation - Center/Right */}
            <div className="hidden md:flex items-center gap-8">
              {/* Navigation Links */}
              <div className="flex items-center gap-6">
                <button
                  onClick={() => {
                    document.querySelector('#how-it-works')?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                    });
                  }}
                  className="text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
                >
                  {t('howItWorks')}
                </button>
                <button
                  onClick={() => {
                    document.querySelector('#use-cases')?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                    });
                  }}
                  className="text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
                >
                  {t('useCases')}
                </button>
                <button
                  onClick={() => {
                    document.querySelector('#for-business')?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                    });
                  }}
                  className="text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
                >
                  {t('forBusiness')}
                </button>
              </div>

              {/* Language Switcher */}
              <LanguageSwitcher />

              {/* Login Link */}
              <Link
                href="/auth/login"
                className="text-sm font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-50 px-5 py-2 rounded-xl transition-all"
              >
                {t('login')}
              </Link>

              {/* Primary CTA - Following style guide */}
              <Link
                href="/book"
                className="px-6 py-3 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-2xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
              >
                {t('getStarted')}
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center gap-3">
              {/* Language Switcher on Mobile */}
              <LanguageSwitcher />

              {/* Animated Hamburger Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="w-10 h-10 flex flex-col items-center justify-center gap-1.5 rounded-xl hover:bg-gray-50 transition-all relative z-50"
                aria-label="Toggle menu"
              >
                {/* Top line */}
                <span
                  className={`w-6 h-0.5 bg-gray-700 rounded-full transition-all duration-300 ${
                    mobileMenuOpen ? 'rotate-45 translate-y-2' : ''
                  }`}
                />
                {/* Middle line */}
                <span
                  className={`w-6 h-0.5 bg-gray-700 rounded-full transition-all duration-300 ${
                    mobileMenuOpen ? 'opacity-0 scale-0' : ''
                  }`}
                />
                {/* Bottom line */}
                <span
                  className={`w-6 h-0.5 bg-gray-700 rounded-full transition-all duration-300 ${
                    mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''
                  }`}
                />
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile Menu - Enhanced with better animations */}
      <div
        className={`fixed inset-0 z-40 md:hidden transition-opacity duration-300 ${
          mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop with staggered fade */}
        <div
          className={`absolute inset-0 bg-gradient-to-b from-gray-900/60 to-gray-900/80 backdrop-blur-md transition-opacity duration-300 ${
            mobileMenuOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setMobileMenuOpen(false)}
        />

        {/* Menu Panel - Slide from right with bounce */}
        <div
          className={`absolute top-0 right-0 bottom-0 w-[85%] max-w-sm bg-white shadow-2xl transition-transform duration-500 ease-out ${
            mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="h-full overflow-y-auto">
            {/* Header with gradient accent */}
            <div className="relative bg-gradient-to-br from-teal-50 to-green-50 px-6 pt-20 pb-8 border-b border-gray-100">
              <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-white/80 to-transparent" />
              <h2 className="text-2xl font-bold text-gray-900 relative">{t('mobileMenu.title')}</h2>
              <p className="text-sm text-gray-600 mt-1 relative">{t('mobileMenu.subtitle')}</p>
            </div>

            <nav className="px-6 py-6">
              {/* Navigation Links with staggered animation */}
              <div className="space-y-1 mb-8">
                {[
                  { label: t('howItWorks'), id: '#how-it-works', delay: 'delay-75' },
                  { label: t('useCases'), id: '#use-cases', delay: 'delay-100' },
                  { label: t('forBusiness'), id: '#for-business', delay: 'delay-150' },
                ].map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      document.querySelector(item.id)?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                      });
                      setMobileMenuOpen(false);
                    }}
                    className={`group w-full text-left px-5 py-4 text-lg font-semibold text-gray-700 hover:text-gray-900 hover:bg-gradient-to-r hover:from-teal-50 hover:to-green-50 rounded-2xl transition-all duration-300 flex items-center justify-between ${
                      mobileMenuOpen ? `opacity-100 translate-x-0 ${item.delay}` : 'opacity-0 translate-x-4'
                    }`}
                    style={{ transitionDelay: mobileMenuOpen ? `${index * 50}ms` : '0ms' }}
                  >
                    <span>{item.label}</span>
                    <svg
                      className="w-5 h-5 text-gray-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>

              {/* Divider with gradient */}
              <div className="relative mb-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-4 text-xs text-gray-400 bg-white uppercase tracking-wider">
                    {t('mobileMenu.accountLabel')}
                  </span>
                </div>
              </div>

              {/* Action Buttons with staggered animation */}
              <div className="space-y-3">
                <Link
                  href="/auth/login"
                  className={`w-full text-center px-5 py-3.5 text-base font-semibold text-gray-700 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all duration-300 block ${
                    mobileMenuOpen ? 'opacity-100 translate-y-0 delay-200' : 'opacity-0 translate-y-4'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('login')}
                </Link>
                <Link
                  href="/book"
                  className={`group w-full text-center px-6 py-4 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-2xl font-semibold hover:shadow-xl hover:shadow-teal-500/30 hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2 ${
                    mobileMenuOpen ? 'opacity-100 translate-y-0 delay-300' : 'opacity-0 translate-y-4'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span>{t('getStarted')}</span>
                  <svg
                    className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>

              {/* Bottom decorative element */}
              <div className="mt-12 pt-8 border-t border-gray-100">
                <p className="text-xs text-center text-gray-400">
                  {t('mobileMenu.tagline')}
                </p>
              </div>
            </nav>
          </div>
        </div>
      </div>
    </>
  );
}
