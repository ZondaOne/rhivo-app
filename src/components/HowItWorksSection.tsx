'use client';

import { useTranslations } from 'next-intl';

export function HowItWorksSection() {
  const t = useTranslations('home.howItWorks');

  const steps = [
    {
      number: 1,
      icon: (
        <svg className="w-8 h-8 sm:w-10 sm:h-10 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
      title: t('step1.title'),
      description: t('step1.description'),
      gradient: 'from-teal-500 to-green-500',
    },
    {
      number: 2,
      icon: (
        <svg className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: t('step2.title'),
      description: t('step2.description'),
      gradient: 'from-green-500 to-teal-500',
    },
    {
      number: 3,
      icon: (
        <svg className="w-8 h-8 sm:w-10 sm:h-10 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: t('step3.title'),
      description: t('step3.description'),
      gradient: 'from-teal-500 to-green-500',
    },
  ];

  return (
    <section id="how-it-works" className="py-16 sm:py-24 md:py-32 lg:py-40 bg-gradient-to-b from-white via-gray-50/40 to-white relative overflow-hidden">
      {/* Subtle background pattern - Responsive sizing */}
      <div className="absolute inset-0 opacity-40 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 left-1/4 w-[200px] h-[200px] sm:w-[300px] sm:h-[300px] md:w-[400px] md:h-[400px] bg-teal-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[200px] h-[200px] sm:w-[300px] sm:h-[300px] md:w-[400px] md:h-[400px] bg-green-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 relative">
        {/* Header - Improved responsive typography and spacing */}
        <div className="text-center mb-12 sm:mb-16 md:mb-20 lg:mb-24">
          <p className="text-xs sm:text-sm uppercase tracking-wider text-teal-600 font-semibold mb-3 sm:mb-4">
            {t('label')}
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 sm:mb-6 tracking-tight leading-tight px-4">
            {t('title')}
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto px-4 leading-relaxed">
            {t('subtitle')}
          </p>
        </div>

        {/* Steps - Enhanced responsive grid with better mobile layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-6 md:gap-8 max-w-6xl mx-auto">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className={`group relative bg-white rounded-3xl sm:rounded-[28px] p-6 sm:p-8 md:p-10 shadow-sm hover:shadow-2xl hover:shadow-teal-500/10 transition-all duration-500 border border-gray-100 hover:border-teal-200/50 hover:-translate-y-2 ${
                index === 2 ? 'sm:col-span-2 lg:col-span-1 sm:max-w-md sm:mx-auto lg:max-w-none' : ''
              }`}
            >
              {/* Step number badge - Responsive sizing */}
              <div 
                className={`absolute -top-2.5 -left-2.5 sm:-top-3 sm:-left-3 w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br ${step.gradient} rounded-full flex items-center justify-center text-white text-sm sm:text-base font-bold shadow-lg shadow-teal-500/30`}
                aria-label={`Step ${step.number}`}
              >
                {step.number}
              </div>

              {/* Icon container with gradient border effect - Responsive sizing */}
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-6 sm:mb-8">
                <div className={`absolute inset-0 bg-gradient-to-br ${step.gradient} rounded-2xl sm:rounded-[20px] opacity-10 group-hover:opacity-20 transition-opacity`} />
                <div className="relative w-full h-full bg-white rounded-2xl sm:rounded-[18px] flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                  {step.icon}
                </div>
              </div>

              {/* Content - Responsive typography */}
              <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-3 sm:mb-4 tracking-tight text-center">
                {step.title}
              </h3>
              <p className="text-gray-600 leading-relaxed text-center text-sm sm:text-base md:text-lg">
                {step.description}
              </p>

              {/* Subtle hover accent */}
              <div 
                className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${step.gradient} rounded-b-3xl sm:rounded-b-[28px] scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`}
                aria-hidden="true"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
