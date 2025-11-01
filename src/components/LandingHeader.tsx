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

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    setTimeout(() => {
      document.querySelector(id)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 100);
  };

  return (
    <>
      {/* Header - Fixed with proper z-index */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 h-16 sm:h-20 transition-colors duration-300 ${
          scrolled || mobileMenuOpen
            ? 'bg-white/95 backdrop-blur-sm border-b border-gray-200/60 shadow-sm'
            : 'bg-white/80 backdrop-blur-sm'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 h-full">
          <div className="flex items-center justify-between h-full">
            {/* Logo - Left side */}
            <div className="flex-shrink-0">
              <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
                <Logo size="sm" showText={true} className="!m-0 !p-0 h-8 sm:h-10" />
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6 lg:gap-8">
              {/* Navigation Links */}
              <div className="flex items-center gap-4 lg:gap-6">
                <button
                  onClick={() => scrollToSection('#how-it-works')}
                  className="text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
                >
                  {t('howItWorks')}
                </button>
                <button
                  onClick={() => scrollToSection('#use-cases')}
                  className="text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
                >
                  {t('useCases')}
                </button>
                <button
                  onClick={() => scrollToSection('#for-business')}
                  className="text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
                >
                  {t('forBusiness')}
                </button>
                <button
                  onClick={() => scrollToSection('#pricing')}
                  className="text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
                >
                  {t('pricing')}
                </button>
              </div>

              <LanguageSwitcher />

              <Link
                href="/auth/login"
                className="text-sm font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-50 px-4 lg:px-5 py-2 rounded-xl transition-all"
              >
                {t('login')}
              </Link>

              <Link
                href="/book"
                className="px-5 lg:px-6 py-2.5 lg:py-3 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-2xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all flex items-center gap-2 text-sm"
              >
                {t('getStarted')}
              </Link>
            </div>

            {/* Mobile Controls */}
            <div className="flex md:hidden items-center gap-2">
              <LanguageSwitcher />

              {/* Hamburger Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="relative w-11 h-11 flex flex-col items-center justify-center rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors"
                aria-label="Toggle menu"
                aria-expanded={mobileMenuOpen}
              >
                <div className="w-6 flex flex-col gap-1.5">
                  <span
                    className={`block w-full h-0.5 bg-gray-700 rounded-full transition-all duration-300 ${
                      mobileMenuOpen ? 'rotate-45 translate-y-2' : ''
                    }`}
                  />
                  <span
                    className={`block w-full h-0.5 bg-gray-700 rounded-full transition-all duration-300 ${
                      mobileMenuOpen ? 'opacity-0' : ''
                    }`}
                  />
                  <span
                    className={`block w-full h-0.5 bg-gray-700 rounded-full transition-all duration-300 ${
                      mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''
                    }`}
                  />
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Dropdown - Outside header, below it */}
      <div
        className={`fixed top-16 sm:top-20 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-lg transition-all duration-300 ease-in-out ${
          mobileMenuOpen 
            ? 'max-h-[400px] opacity-100' 
            : 'max-h-0 opacity-0 overflow-hidden'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="py-4 space-y-1">
            {/* Navigation Links */}
            <button
              onClick={() => scrollToSection('#how-it-works')}
              className="w-full text-left px-4 py-3 text-base font-semibold text-gray-700 hover:text-gray-900 hover:bg-gradient-to-r hover:from-teal-50 hover:to-green-50 rounded-xl transition-all"
            >
              {t('howItWorks')}
            </button>
            <button
              onClick={() => scrollToSection('#use-cases')}
              className="w-full text-left px-4 py-3 text-base font-semibold text-gray-700 hover:text-gray-900 hover:bg-gradient-to-r hover:from-teal-50 hover:to-green-50 rounded-xl transition-all"
            >
              {t('useCases')}
            </button>
            <button
              onClick={() => scrollToSection('#for-business')}
              className="w-full text-left px-4 py-3 text-base font-semibold text-gray-700 hover:text-gray-900 hover:bg-gradient-to-r hover:from-teal-50 hover:to-green-50 rounded-xl transition-all"
            >
              {t('forBusiness')}
            </button>
            <button
              onClick={() => scrollToSection('#pricing')}
              className="w-full text-left px-4 py-3 text-base font-semibold text-gray-700 hover:text-gray-900 hover:bg-gradient-to-r hover:from-teal-50 hover:to-green-50 rounded-xl transition-all"
            >
              {t('pricing')}
            </button>

            {/* Divider */}
            <div className="h-px bg-gray-200 my-2"></div>

            {/* Action Buttons */}
            <Link
              href="/auth/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-center px-5 py-3 text-base font-semibold text-gray-700 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all"
            >
              {t('login')}
            </Link>
            <Link
              href="/book"
              onClick={() => setMobileMenuOpen(false)}
              className="group flex items-center justify-center gap-2 w-full px-5 py-3.5 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all text-base"
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
        </div>
      </div>

      {/* Spacer to prevent content jump */}
      <div className="h-16 sm:h-20" />
    </>
  );
}
