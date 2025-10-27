'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState, useRef } from 'react';

export function UseCasesSection() {
  const t = useTranslations('home.useCases');
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  return (
    <section
      id="use-cases"
      ref={sectionRef}
      className="py-20 sm:py-32 md:py-40 bg-white relative"
    >

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
        {/* Header - Typography-driven hierarchy */}
        <div className="text-center mb-16 sm:mb-20 md:mb-24">
          <p className="text-sm uppercase tracking-wider text-teal-600 font-semibold mb-4">
            {t('label')}
          </p>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight">
            {t('title')}
          </h2>
          <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {/* Grid Layout - Clean and spacious */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Customer Use Case - Phone */}
          <div
            className={`group bg-white rounded-2xl border border-gray-200/60 overflow-hidden transition-all ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: '100ms' }}
          >
            {/* Content */}
            <div className="p-8 sm:p-10">
              {/* Icon Badge - Minimal gradient usage */}
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-teal-500 to-green-500 rounded-2xl mb-6">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
                  />
                </svg>
              </div>

              {/* Text Content - Typography hierarchy */}
              <h3 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">
                {t('customer.title')}
              </h3>
              <p className="text-gray-500 text-base leading-relaxed mb-8">
                {t('customer.description')}
              </p>

              {/* Image Container - Clean with subtle shadow */}
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 shadow-sm">
                <img
                  src="/phone.png"
                  alt={t('customer.imageAlt')}
                  className="w-full h-full object-cover object-center"
                />
              </div>

              {/* Feature tags - Simplified */}
              <div className="flex flex-wrap gap-2 mt-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700">
                  <svg className="w-3.5 h-3.5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t('customer.feature1')}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700">
                  <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t('customer.feature2')}
                </span>
              </div>
            </div>
          </div>

          {/* Business Owner Use Case - Tablet */}
          <div
            className={`group bg-white rounded-2xl border border-gray-200/60 overflow-hidden transition-all ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: '200ms' }}
          >
            {/* Content */}
            <div className="p-8 sm:p-10">
              {/* Icon Badge - Minimal gradient usage */}
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-teal-500 to-green-500 rounded-2xl mb-6">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6"
                  />
                </svg>
              </div>

              {/* Text Content - Typography hierarchy */}
              <h3 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">
                {t('business.title')}
              </h3>
              <p className="text-gray-500 text-base leading-relaxed mb-8">
                {t('business.description')}
              </p>

              {/* Image Container - Clean with subtle shadow */}
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 shadow-sm">
                <img
                  src="/tablet.png"
                  alt={t('business.imageAlt')}
                  className="w-full h-full object-cover object-center"
                />
              </div>

              {/* Feature tags - Simplified */}
              <div className="flex flex-wrap gap-2 mt-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700">
                  <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                  {t('business.feature1')}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700">
                  <svg className="w-3.5 h-3.5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                  {t('business.feature2')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
