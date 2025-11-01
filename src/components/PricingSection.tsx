'use client';

import { useState } from 'react';
import { getPricingTiers } from '@/lib/subscription/pricing-tiers';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { PricingContactModal } from '@/components/PricingContactModal';

export function PricingSection() {
  const tiers = getPricingTiers();
  const t = useTranslations('pricing');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{ id: string; name: string } | null>(null);

  const handleContactClick = (planId: string, planName: string) => {
    setSelectedPlan({ id: planId, name: planName });
    setModalOpen(true);
  };

  return (
    <section className="py-20 sm:py-32 md:py-40 bg-gradient-to-b from-white to-gray-50 relative overflow-hidden px-4 sm:px-6">
      {/* Premium background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-0 w-[600px] h-[600px] bg-gradient-to-br from-teal-500/10 via-green-500/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-green-500/10 via-teal-500/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative">
        {/* Header */}
        <div className="text-center mb-16 sm:mb-20">
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

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`bg-white/80 backdrop-blur-sm rounded-2xl border transition-all hover:shadow-lg ${
                tier.id === 'basic'
                  ? 'border-teal-200 relative shadow-md ring-2 ring-teal-100'
                  : 'border-gray-200/60 hover:border-teal-200/50'
              }`}
            >
              {tier.id === 'basic' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-teal-600 to-green-600 text-white px-4 py-1.5 rounded-full text-sm font-semibold shadow-md">
                    {t('mostPopular')}
                  </span>
                </div>
              )}

              <div className="p-6 sm:p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 tracking-tight">
                  {tier.name}
                </h3>

                {/* Price */}
                <div className="mb-8">
                  {tier.id === 'enterprise' ? (
                    <div className="text-3xl font-bold text-gray-900">{t('customPricing')}</div>
                  ) : tier.priceMonthly === 0 ? (
                    <div className="text-5xl font-bold text-gray-900">{t('free')}</div>
                  ) : (
                    <>
                      <div className="flex items-baseline">
                        <span className="text-5xl font-bold text-gray-900">
                          €{tier.priceMonthly}
                        </span>
                        <span className="text-gray-500 ml-2 text-base">{t('perMonth')}</span>
                      </div>
                      <div className="text-sm text-gray-500 mt-2">
                        {t('orYearly', { price: tier.priceYearly })}
                      </div>
                    </>
                  )}
                </div>

                {/* CTA Button */}
                {tier.id === 'free' ? (
                  <Link
                    href="/auth/signup"
                    className="block w-full bg-gray-50 text-gray-900 py-3 px-6 rounded-xl font-semibold text-center hover:bg-gray-100 transition-all mb-8 border border-gray-200"
                  >
                    {t('getStarted')}
                  </Link>
                ) : tier.id === 'enterprise' ? (
                  <button
                    onClick={() => handleContactClick(tier.id, tier.name)}
                    className="block w-full bg-gray-900 text-white py-3 px-6 rounded-xl font-semibold text-center hover:bg-gray-700 transition-all mb-8 shadow-sm"
                  >
                    {t('contactSales')}
                  </button>
                ) : (
                  <button
                    onClick={() => handleContactClick(tier.id, tier.name)}
                    className={`block w-full py-3 px-6 rounded-xl font-semibold text-center transition-all mb-8 ${
                      tier.id === 'basic'
                        ? 'bg-gradient-to-r from-teal-600 to-green-600 text-white hover:shadow-lg hover:scale-[1.02] shadow-md shadow-teal-500/25'
                        : 'bg-gray-900 text-white hover:bg-gray-700 shadow-sm'
                    }`}
                  >
                    {t('contactToUpgrade')}
                  </button>
                )}

                {/* Features List */}
                <ul className="space-y-3 text-sm">
                  {tier.featureKeys.map((featureKey, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700">{t(featureKey)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Additional info */}
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-6">{t('noHiddenFees')}</p>
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
  