'use client';

import { useState } from 'react';
import { getPricingTiers } from '@/lib/subscription/pricing-tiers';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { PricingContactModal } from '@/components/PricingContactModal';

export function PricingPreview() {
  const tiers = getPricingTiers();
  const t = useTranslations('home.pricing');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{ id: string; name: string } | null>(null);

  const handleContactClick = (planId: string, planName: string) => {
    setSelectedPlan({ id: planId, name: planName });
    setModalOpen(true);
  };

  return (
    <section id="pricing" className="py-20 sm:py-32 md:py-40 bg-white relative overflow-hidden px-4 sm:px-6">
      {/* Subtle background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-teal-500/5 via-green-500/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          {/* Label */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-50 to-green-50 border border-teal-200/50 rounded-full text-teal-700 font-semibold text-sm mb-6">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{t('label')}</span>
          </div>

          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight leading-[1.1]">
            {t('title')}
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            {t('subtitle')}
          </p>
        </div>

        {/* Pricing Cards Grid - Show 3 main tiers */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
          {tiers.slice(0, 3).map((tier, idx) => (
            <div
              key={tier.id}
              className={`bg-white rounded-2xl border transition-all hover:shadow-lg ${
                tier.id === 'basic'
                  ? 'border-teal-200 relative shadow-md ring-2 ring-teal-100 scale-105'
                  : 'border-gray-200/60 hover:border-teal-200/50'
              }`}
            >
              {tier.id === 'basic' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-teal-600 to-green-600 text-white px-4 py-1.5 rounded-full text-xs font-semibold shadow-md">
                    {t('mostPopular')}
                  </span>
                </div>
              )}

              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4 tracking-tight">
                  {tier.name}
                </h3>

                {/* Price */}
                <div className="mb-6">
                  {tier.priceMonthly === 0 ? (
                    <div className="text-4xl font-bold text-gray-900">{t('free')}</div>
                  ) : (
                    <div className="flex items-baseline">
                      <span className="text-4xl font-bold text-gray-900">
                        €{tier.priceMonthly}
                      </span>
                      <span className="text-gray-500 ml-2 text-sm">{t('perMonth')}</span>
                    </div>
                  )}
                </div>

                {/* Key Features - Show top 4 */}
                <ul className="space-y-2.5 text-sm mb-6">
                  {tier.featureKeys.slice(0, 4).map((featureKey, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700">{t(featureKey)}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {tier.id === 'free' ? (
                  <Link
                    href="/auth/signup"
                    className="block w-full text-center py-2.5 px-4 bg-gray-50 text-gray-900 rounded-xl font-semibold hover:bg-gray-100 transition-all border border-gray-200 text-sm"
                  >
                    {t('getStarted')}
                  </Link>
                ) : (
                  <button
                    onClick={() => handleContactClick(tier.id, tier.name)}
                    className={`block w-full text-center py-2.5 px-4 rounded-xl font-semibold transition-all text-sm ${
                      tier.id === 'basic'
                        ? 'bg-gradient-to-r from-teal-600 to-green-600 text-white hover:shadow-lg hover:scale-[1.02]'
                        : 'bg-gray-900 text-white hover:bg-gray-700'
                    }`}
                  >
                    {t('contactUs')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* CTA to full pricing page */}
        <div className="text-center">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 text-teal-600 font-semibold hover:text-teal-700 transition-all text-sm group"
          >
            <span>{t('viewDetails')}</span>
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <p className="text-xs text-gray-500 mt-4">{t('noHiddenFees')}</p>
        </div>
      </div>

      {/* Pricing Contact Modal */}
      {selectedPlan && (
        <PricingContactModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          planId={selectedPlan.id}
          planName={selectedPlan.name}
        />
      )}
    </section>
  );
}
