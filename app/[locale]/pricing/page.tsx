'use client';

import { getPricingTiers } from '@/lib/subscription/pricing-tiers';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { LandingHeader } from '@/components/LandingHeader';
import { HomeFooter } from '@/components/HomeFooter';

export default function PricingPage() {
  const tiers = getPricingTiers();
  const t = useTranslations('pricing');
  const tHome = useTranslations('home.pricing');

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <LandingHeader />

      {/* Pricing Hero Section */}
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
              <span>{tHome('label')}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight leading-[1.1]">
              {t('title')}
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              {t('subtitle')}
            </p>
            <div className="mt-8 inline-flex items-center gap-2 bg-white border border-teal-200/50 px-5 py-2 rounded-xl shadow-sm">
              <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-semibold text-gray-900">{t('annualSavings')}</span>
            </div>
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
                      {tHome('mostPopular')}
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
                      <div className="text-3xl font-bold text-gray-900">{tHome('customPricing')}</div>
                    ) : tier.priceMonthly === 0 ? (
                      <div className="text-5xl font-bold text-gray-900">{tHome('free')}</div>
                    ) : (
                      <>
                        <div className="flex items-baseline">
                          <span className="text-5xl font-bold text-gray-900">
                            €{tier.priceMonthly}
                          </span>
                          <span className="text-gray-500 ml-2 text-base">{tHome('perMonth')}</span>
                        </div>
                        <div className="text-sm text-gray-500 mt-2">
                          {tHome('orYearly', { price: tier.priceYearly })}
                        </div>
                      </>
                    )}
                  </div>

                  {/* CTA Button */}
                  {tier.id === 'free' ? (
                    <Link
                      href="/auth/onboard"
                      className="block w-full bg-gray-50 text-gray-900 py-3 px-6 rounded-xl font-semibold text-center hover:bg-gray-100 transition-all mb-8 border border-gray-200"
                    >
                      {tHome('getStarted')}
                    </Link>
                  ) : tier.id === 'enterprise' ? (
                    <a
                      href="mailto:team@zonda.one"
                      className="block w-full bg-gray-900 text-white py-3 px-6 rounded-xl font-semibold text-center hover:bg-gray-700 transition-all mb-8 shadow-sm"
                    >
                      {tHome('contactSales')}
                    </a>
                  ) : (
                    <a
                      href={`mailto:team@zonda.one?subject=${encodeURIComponent(tHome('upgradeSubject', { plan: tier.name }))}`}
                      className={`block w-full py-3 px-6 rounded-xl font-semibold text-center transition-all mb-8 ${
                        tier.id === 'basic'
                          ? 'bg-gradient-to-r from-teal-600 to-green-600 text-white hover:shadow-lg hover:scale-[1.02] shadow-md shadow-teal-500/25'
                          : 'bg-gray-900 text-white hover:bg-gray-700 shadow-sm'
                      }`}
                    >
                      {tHome('contactToUpgrade')}
                    </a>
                  )}

                  {/* Features List */}
                  <ul className="space-y-3 text-sm">
                    {tier.featureKeys.map((featureKey, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-700">{tHome(featureKey)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* Additional info */}
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-6">{tHome('noHiddenFees')}</p>
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-20 sm:py-32 bg-white px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-6 sm:p-12 shadow-sm">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 sm:mb-12 text-center tracking-tight">
              {t('comparison.title')}
            </h2>

            <div className="overflow-x-auto -mx-6 sm:mx-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200/60">
                    <th className="text-left py-4 px-4 font-semibold text-gray-900">{t('comparison.feature')}</th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-900">{t('comparison.tiers.starter')}</th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-900">{t('comparison.tiers.professional')}</th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-900">{t('comparison.tiers.growth')}</th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-900">{t('comparison.tiers.enterprise')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <ComparisonRow
                    feature={t('comparison.features.staffMembers')}
                    values={['1', '5', '15', t('comparison.unlimited')]}
                  />
                  <ComparisonRow
                    feature={t('comparison.features.locations')}
                    values={['1', '1', '3', t('comparison.unlimited')]}
                  />
                  <ComparisonRow
                    feature={t('comparison.features.bookings')}
                    values={[t('comparison.unlimited'), t('comparison.unlimited'), t('comparison.unlimited'), t('comparison.unlimited')]}
                  />
                  <ComparisonRow
                    feature={t('comparison.features.customBranding')}
                    values={[false, true, true, true]}
                  />
                  <ComparisonRow
                    feature={t('comparison.features.analytics')}
                    values={[t('comparison.analytics.none'), t('comparison.analytics.basic'), t('comparison.analytics.advanced'), t('comparison.analytics.advanced')]}
                  />
                  <ComparisonRow
                    feature={t('comparison.features.customerDatabase')}
                    values={[false, true, true, true]}
                  />
                  <ComparisonRow
                    feature={t('comparison.features.smsNotifications')}
                    values={[t('comparison.sms.none'), t('comparison.sms.basic'), t('comparison.sms.growth'), t('comparison.unlimited')]}
                  />
                  <ComparisonRow
                    feature={t('comparison.features.dataExport')}
                    values={[false, true, true, true]}
                  />
                  <ComparisonRow
                    feature={t('comparison.features.apiAccess')}
                    values={[false, false, true, true]}
                  />
                  <ComparisonRow
                    feature={t('comparison.features.support')}
                    values={[t('comparison.support.community'), t('comparison.support.email48'), t('comparison.support.email24'), t('comparison.support.phone4')]}
                  />
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 sm:py-32 bg-gradient-to-b from-white to-gray-50 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 sm:mb-12 text-center tracking-tight">
            {t('faq.title')}
          </h2>

          <div className="space-y-4">
            <FAQItem
              question={t('faq.q1.question')}
              answer={t('faq.q1.answer')}
            />
            <FAQItem
              question={t('faq.q2.question')}
              answer={t('faq.q2.answer')}
            />
            <FAQItem
              question={t('faq.q3.question')}
              answer={t('faq.q3.answer')}
            />
            <FAQItem
              question={t('faq.q4.question')}
              answer={t('faq.q4.answer')}
            />
            <FAQItem
              question={t('faq.q5.question')}
              answer={t('faq.q5.answer')}
            />
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-20 sm:py-32 bg-white px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center bg-white/80 backdrop-blur-sm border border-teal-200/50 rounded-2xl p-8 sm:p-16 shadow-md">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 tracking-tight">{t('cta.title')}</h2>
            <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              {t('cta.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/auth/signup"
                className="bg-gradient-to-r from-teal-600 to-green-600 text-white py-3 px-8 rounded-2xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all shadow-md shadow-teal-500/25"
              >
                {t('cta.startFree')}
              </Link>
              <a
                href="mailto:team@zonda.one"
                className="bg-gray-900 text-white py-3 px-8 rounded-2xl font-semibold hover:bg-gray-700 transition-all shadow-sm"
              >
                {t('cta.contactSales')}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <HomeFooter />
    </main>
  );
}

function ComparisonRow({
  feature,
  values,
}: {
  feature: string;
  values: (string | boolean)[];
}) {
  return (
    <tr className="hover:bg-teal-50/30 transition-all">
      <td className="py-4 px-4 font-medium text-gray-900">{feature}</td>
      {values.map((value, i) => (
        <td key={i} className="py-4 px-4 text-center">
          {typeof value === 'boolean' ? (
            value ? (
              <svg className="w-5 h-5 text-teal-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <span className="text-gray-300 text-xl">—</span>
            )
          ) : (
            <span className="text-gray-700 text-sm font-medium">{value}</span>
          )}
        </td>
      ))}
    </tr>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-xl p-6 hover:border-teal-200/50 hover:shadow-sm transition-all">
      <h3 className="font-semibold text-gray-900 mb-2 flex items-start gap-3">
        <svg className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{question}</span>
      </h3>
      <p className="text-gray-600 text-sm ml-8 leading-relaxed">{answer}</p>
    </div>
  );
}
