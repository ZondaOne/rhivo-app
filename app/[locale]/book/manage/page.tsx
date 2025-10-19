'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

export default function ManageBookingPage() {
  const t = useTranslations('manageBooking.landing');
  const [bookingId, setBookingId] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    if (!bookingId || !email) {
      setError(t('validationError'));
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/booking/guest-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, email }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.manageUrl) {
          window.location.href = data.manageUrl;
        } else {
          setMessage(t('successMessage'));
          setBookingId('');
          setEmail('');
          setLoading(false);
        }
      } else {
        setError(data.error || t('genericError'));
        setLoading(false);
      }
    } catch {
      setError(t('connectionError'));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Simple header with back link */}
      <header className="border-b border-gray-200/60 py-4 sm:py-6 px-4 sm:px-8">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>{t('backToHome')}</span>
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="max-w-xl w-full">
          {/* Heading */}
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-4 sm:mb-6 tracking-tight">
              {t('title')}
            </h1>
            <p className="text-lg sm:text-xl text-gray-500 leading-relaxed">
              {t('subtitle')}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
            <div>
              <label
                htmlFor="bookingId"
                className="block text-sm font-semibold text-gray-900 mb-3"
              >
                {t('bookingIdLabel')}
              </label>
              <input
                id="bookingId"
                type="text"
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value.toUpperCase())}
                placeholder={t('bookingIdPlaceholder')}
                className="w-full px-4 sm:px-5 py-3 sm:py-4 text-base sm:text-lg border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:border-gray-400 transition-all"
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-gray-900 mb-3"
              >
                {t('emailLabel')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('emailPlaceholder')}
                className="w-full px-4 sm:px-5 py-3 sm:py-4 text-base sm:text-lg border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:border-gray-400 transition-all"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 sm:py-4 bg-gradient-to-r from-teal-600 to-green-600 text-white text-base sm:text-lg rounded-2xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? t('submitting') : t('submitButton')}
            </button>
          </form>

          {/* Status messages */}
          {message && (
            <div className="mt-6 sm:mt-8 p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-sm sm:text-base text-green-800 text-center">{message}</p>
            </div>
          )}
          {error && (
            <div className="mt-6 sm:mt-8 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm sm:text-base text-red-800 text-center">{error}</p>
            </div>
          )}

          {/* Help text */}
          <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-gray-200/60">
            <p className="text-sm sm:text-base text-gray-500 text-center">
              {t('helpText')}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
