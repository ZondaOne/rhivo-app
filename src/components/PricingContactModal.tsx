'use client';

import { useState, FormEvent } from 'react';
import { useTranslations } from 'next-intl';

interface PricingContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  planName: string;
}

export function PricingContactModal({ isOpen, onClose, planId, planName }: PricingContactModalProps) {
  const t = useTranslations('pricingModal');
  const [email, setEmail] = useState('');
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error' | 'duplicate'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [duplicateInfo, setDuplicateInfo] = useState<{ planName: string; daysAgo: number } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const response = await fetch('/api/pricing-inquiry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          planId,
          planName,
          newsletterSubscribed: newsletterOptIn,
        }),
      });

      const data = await response.json();

      // Handle duplicate inquiry
      if (response.status === 409 && data.error === 'duplicate_inquiry') {
        setSubmitStatus('duplicate');
        setDuplicateInfo({
          planName: data.existingInquiry.planName,
          daysAgo: data.existingInquiry.daysAgo,
        });
        setIsSubmitting(false);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit inquiry');
      }

      setSubmitStatus('success');
      setEmail('');
      setNewsletterOptIn(false);

      // Close modal after 2 seconds on success
      setTimeout(() => {
        onClose();
        setSubmitStatus('idle');
      }, 2000);
    } catch (error) {
      setSubmitStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setEmail('');
      setNewsletterOptIn(false);
      setSubmitStatus('idle');
      setErrorMessage('');
      setDuplicateInfo(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full relative overflow-hidden">
        {/* Background gradient decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-teal-500/10 via-green-500/5 to-transparent rounded-full blur-3xl -z-0" />

        <div className="relative z-10 p-8">
          {/* Close button */}
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Header */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-teal-50 to-green-50 border border-teal-200/50 rounded-full text-teal-700 font-semibold text-xs mb-4">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>{planName}</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('title')}</h2>
            <p className="text-gray-600 text-sm leading-relaxed">{t('subtitle')}</p>
          </div>

          {/* Success Message */}
          {submitStatus === 'success' && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
              <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div className="text-sm text-green-800">
                <p className="font-semibold">{t('successTitle')}</p>
                <p className="text-green-700 mt-1">{t('successMessage')}</p>
              </div>
            </div>
          )}

          {/* Duplicate Inquiry Message */}
          {submitStatus === 'duplicate' && duplicateInfo && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-amber-900">
                <p className="font-semibold">{t('duplicateTitle')}</p>
                <p className="text-amber-800 mt-1">
                  {duplicateInfo.daysAgo === 0
                    ? t('duplicateMessageToday', { planName: duplicateInfo.planName })
                    : t('duplicateMessage', { planName: duplicateInfo.planName, days: duplicateInfo.daysAgo })
                  }
                </p>
                <p className="text-amber-700 mt-2 text-xs">{t('duplicateNote')}</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {submitStatus === 'error' && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-red-800">
                <p className="font-semibold">{t('errorTitle')}</p>
                <p className="text-red-700 mt-1">{errorMessage || t('errorMessage')}</p>
              </div>
            </div>
          )}

          {/* Form */}
          {submitStatus !== 'success' && submitStatus !== 'duplicate' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                  {t('emailLabel')}
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                  placeholder={t('emailPlaceholder')}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* Newsletter Checkbox */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="newsletter"
                  checked={newsletterOptIn}
                  onChange={(e) => setNewsletterOptIn(e.target.checked)}
                  disabled={isSubmitting}
                  className="mt-1 w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <label htmlFor="newsletter" className="text-sm text-gray-700 leading-relaxed cursor-pointer select-none">
                  {t('newsletterLabel')}
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !email}
                className="w-full bg-gradient-to-r from-teal-600 to-green-600 text-white py-3 px-6 rounded-xl font-semibold text-center hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none shadow-md shadow-teal-500/25"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t('submitting')}
                  </span>
                ) : (
                  t('submitButton')
                )}
              </button>

              {/* Privacy note */}
              <p className="text-xs text-gray-500 text-center leading-relaxed">
                {t('privacyNote')}
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
