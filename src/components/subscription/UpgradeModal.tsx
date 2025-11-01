'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: string;
  suggestedTier?: string;
  featureName?: string;
  message?: string;
}

export function UpgradeModal({
  isOpen,
  onClose,
  currentTier,
  suggestedTier = 'basic',
  featureName,
  message,
}: UpgradeModalProps) {
  const [emailSent, setEmailSent] = useState(false);
  const router = useRouter();

  if (!isOpen) return null;

  const tierPricing: Record<string, { name: string; price: string }> = {
    basic: { name: 'Professional', price: '€19/month' },
    pro: { name: 'Growth', price: '€49/month' },
    enterprise: { name: 'Enterprise', price: 'Custom pricing' },
  };

  const tier = tierPricing[suggestedTier] || tierPricing.basic;

  const handleContactSales = () => {
    // Mock: In production, this would send an email or create a lead
    setEmailSent(true);
    setTimeout(() => {
      setEmailSent(false);
      onClose();
    }, 2000);
  };

  const handleGoToCalendar = () => {
    router.push('/dashboard');
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-gray-200/60 shadow-2xl max-w-md w-full mx-4 p-8">
        {!emailSent ? (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Upgrade Required</h2>
              <p className="text-sm text-gray-500 mt-1">
                You're currently on the{' '}
                <span className="font-semibold capitalize">{currentTier}</span> plan
              </p>
            </div>

            <div className="mb-8">
              {message ? (
                <p className="text-gray-700">{message}</p>
              ) : (
                <p className="text-gray-700">
                  {featureName && (
                    <>
                      <span className="font-semibold">{featureName}</span> is available in the{' '}
                    </>
                  )}
                  <span className="font-semibold">{tier.name}</span> plan
                  {tier.price !== 'Custom pricing' && (
                    <> starting at <span className="font-semibold">{tier.price}</span></>
                  )}
                  .
                </p>
              )}
            </div>

            <div className="bg-gray-50 border border-gray-200/60 rounded-xl p-6 mb-8">
              <h3 className="font-semibold text-gray-900 mb-2">{tier.name} Plan</h3>
              <p className="text-gray-500 text-sm mb-4">
                {suggestedTier === 'basic' && 'Perfect for small businesses with up to 5 staff members'}
                {suggestedTier === 'pro' && 'Ideal for growing businesses with advanced needs'}
                {suggestedTier === 'enterprise' && 'Custom solution for large organizations'}
              </p>
              <div className="text-2xl font-bold text-gray-900">
                {tier.price}
                {tier.price !== 'Custom pricing' && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    or save 17% annually
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleContactSales}
                className="w-full px-6 py-3 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-2xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all"
              >
                Contact Sales Team
              </button>
              <button
                onClick={handleGoToCalendar}
                className="w-full px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-xl transition-all"
              >
                Go Back to Calendar
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-6">
              Questions? Email us at{' '}
              <a href="mailto:team@zonda.one" className="text-teal-600 hover:text-teal-700 transition-all">
                team@zonda.one
              </a>
            </p>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">
              We'll be in touch!
            </h3>
            <p className="text-sm text-gray-500">
              Our team will contact you shortly to discuss the {tier.name} plan.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
