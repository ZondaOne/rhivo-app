'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useEffect, useState } from 'react';
import { Boxes } from '@/components/ui/background-boxes';

export function HeroSection() {
  const t = useTranslations('home.hero');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-white">
      {/* Background Boxes */}
      <Boxes className="absolute inset-0" />

      {/* Gradient overlay to soften the boxes */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/50 to-white/80 pointer-events-none" />

      {/* Content - with entrance animation */}
      <div
        className={`relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 text-center transition-all duration-1000 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* Headline - Apple-like: Clean, elegant, single focused message */}
        <div className="mb-6 sm:mb-8 space-y-1 sm:space-y-2">
          {/* Main headline - simple, clear, focused */}
          <h1
            className={`text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-semibold tracking-tight leading-[1.05] transition-all duration-700 delay-100 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <span className="text-gray-900">{t('title.line1')}</span>
          </h1>
          
          {/* Accent line - subtle gradient, not too bold */}
          <h2
            className={`text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-semibold tracking-tight leading-[1.05] transition-all duration-700 delay-150 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <span className="bg-gradient-to-r from-teal-600 to-green-500 bg-clip-text text-transparent">
              {t('title.line2')}
            </span>
          </h2>
        </div>

        {/* Subheadline - Apple's descriptive style */}
        <p
          className={`text-xl sm:text-2xl md:text-3xl text-gray-600 font-normal max-w-4xl mx-auto leading-snug mb-8 sm:mb-10 px-4 transition-all duration-700 delay-200 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {t('subtitle')}
        </p>

        {/* Simple note - understated */}
        <p
          className={`text-base sm:text-lg text-gray-500 max-w-2xl mx-auto mb-10 sm:mb-12 md:mb-14 transition-all duration-700 delay-250 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {t('subtitleNote')}
        </p>

        {/* Primary CTA - premium hover effect */}
        <div
          className={`flex justify-center transition-all duration-700 delay-300 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <Link
            href="/book"
            className="group inline-flex items-center gap-2 sm:gap-3 px-8 sm:px-10 py-4 sm:py-5 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-[20px] font-semibold text-base sm:text-lg shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30 hover:scale-[1.02] transition-all duration-300 relative overflow-hidden"
          >
            {/* Shimmer effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
            <span className="relative">{t('cta')}</span>
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 relative group-hover:translate-x-1 transition-transform"
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

      {/* Scroll indicator - premium animation */}
      {/* <button
        onClick={() => {
          document.querySelector('#how-it-works')?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }}
        className="absolute bottom-12 sm:bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 cursor-pointer group"
        aria-label={t('scroll')}
      >
        <span className="text-xs uppercase tracking-wider text-gray-400 font-medium group-hover:text-gray-600 transition-colors">
          {t('scroll')}
        </span>
        <div className="w-6 h-10 sm:w-8 sm:h-12 border-2 border-gray-300 rounded-full flex items-start justify-center p-2 group-hover:border-gray-400 transition-colors">
          <div className="w-1 h-1.5 sm:w-1.5 sm:h-2 bg-gray-400 rounded-full animate-bounce group-hover:bg-gray-600 transition-colors" />
        </div>
      </button> */}
    </section>
  );
}
