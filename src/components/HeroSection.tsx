'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useEffect, useState } from 'react';
import { Boxes } from '@/components/ui/background-boxes';
import { CalendarPreview } from './hero/CalendarPreview';
import { pickRandomAvatars } from '@/lib/seed-avatars';
import OnboardingTutorial from '@/components/dashboard/OnboardingTutorial';

export function HeroSection() {
  const t = useTranslations('home.hero');
  const [mounted, setMounted] = useState(false);
  const [avatars, setAvatars] = useState<string[]>([]);
  const [showDemo, setShowDemo] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // pick a few random demo avatars on mount
    setAvatars(pickRandomAvatars(4));
  }, []);

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-white px-4 sm:px-6">
      {/* Background Boxes - Grid Pattern */}
      <Boxes className="absolute inset-0" />

      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/90 via-white/70 to-white/90 pointer-events-none" />

      {/* Main Content Container */}
      <div className="relative w-full max-w-7xl mx-auto py-12 sm:py-16 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 xl:gap-16 items-center">

          {/* Left Column - Text Content */}
          <div className={`space-y-8 transition-all duration-1000 ${
            mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
          }`}>
              {/* Eyebrow text - localized */}
              <div className={`transition-all duration-700 delay-100 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 text-teal-700 text-sm font-medium">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  {t('eyebrow')}
                </span>
              </div>

            {/* Headline - Large, bold, minimal */}
            <h1
              className={`text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.05] transition-all duration-700 delay-200 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <span className="text-gray-900 block">
                {t('title.before')}{' '}
              </span>
              <span className="bg-gradient-to-r from-teal-600 via-teal-500 to-green-600 bg-clip-text text-transparent">
                {t('title.accent')}
              </span>
              <span className="text-gray-900">
                {' '}{t('title.after')}
              </span>
            </h1>

            {/* Subheadline - OpenAI style clarity */}
            <p
              className={`text-lg sm:text-xl text-gray-600 font-normal max-w-xl leading-relaxed transition-all duration-700 delay-300 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              {t('subtitle')}
            </p>

            {/* CTA Buttons */}
            <div
              className={`flex flex-col sm:flex-row gap-4 transition-all duration-700 delay-400 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <Link
                href="/book"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-teal-600 to-teal-500 text-white rounded-2xl font-semibold text-base shadow-lg shadow-teal-500/20 hover:shadow-xl hover:shadow-teal-500/30 hover:scale-[1.02] transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                <span className="relative">{t('cta')}</span>
                <svg
                  className="w-5 h-5 relative group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>

              <Link
                href="#demo"
                onClick={(e) => {
                  e.preventDefault();
                  setShowDemo(true);
                }}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white border-2 border-gray-200 text-gray-900 rounded-2xl font-semibold text-base hover:border-teal-300 hover:bg-teal-50/50 transition-all duration-300"
              >
                <span>{t('watchDemo')}</span>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </Link>
            </div>

            {/* Social proof */}
            <div
              className={`flex items-center gap-6 pt-4 transition-all duration-700 delay-500 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <div className="flex -space-x-2">
                {avatars.map((src, idx) => (
                  <img
                    key={idx}
                    src={src}
                    alt={`avatar-${idx}`}
                    className="w-10 h-10 rounded-full border-2 border-white object-cover"
                  />
                ))}
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{t('socialProofAccent')}</span>{' '}
                {t('socialProof')}
              </div>
            </div>
          </div>

          {/* Right Column - Interactive Component Demos */}
          <div className={`relative transition-all duration-1000 delay-300 ${
            mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
          }`}>
            <div className="relative space-y-4 lg:space-y-6">
              {/* Calendar Preview */}
              <div className="transform hover:scale-[1.01] transition-all duration-500 hidden lg:block">
                <CalendarPreview />
              </div>
              {/* Floating accent elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-teal-400/20 to-green-400/20 rounded-full blur-3xl animate-pulse pointer-events-none" />
              <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-gradient-to-br from-teal-300/20 to-teal-500/20 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: '700ms' }} />
            </div>
          </div>
        </div>
      </div>
      {/* Demo modal (onboarding tutorial) */}
      <OnboardingTutorial open={showDemo} onClose={() => setShowDemo(false)} />
    </section>
  );
}
