"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link, useRouter } from '@/i18n/routing';
import { Logo } from '@/components/Logo';
import { useTranslations, useLocale } from 'next-intl';

export default function ResetPasswordPage() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!token) {
      setError(t('resetPassword.invalidToken'));
    }
  }, [token, t]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setErrors([]);

    if (newPassword !== confirmPassword) {
      setError(t('resetPassword.passwordsDoNotMatch'));
      return;
    }

    setPending(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) {
          setErrors(data.errors);
        }
        throw new Error(data.error || t('resetPassword.resetFailed'));
      }

      setSuccess(true);
      setTimeout(() => router.push('/auth/login'), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('resetPassword.resetFailed'));
    } finally {
      setPending(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-teal-50/30 to-white flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-[20px] sm:rounded-[28px] shadow-2xl shadow-teal-500/10 p-6 sm:p-10 border border-gray-200/60">
          <div className="text-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-1.5 sm:mb-2">{t('resetPassword.success.title')}</h1>
            <p className="text-sm sm:text-base text-gray-600 mb-5 sm:mb-6">
              {t('resetPassword.success.message')}
            </p>
            <p className="text-xs sm:text-sm text-gray-500">
              {t('resetPassword.success.redirecting')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-teal-50/30 to-white flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        {/* Back to login */}
        <Link
          href={`/${locale}/auth/login`}
          className="inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6 sm:mb-8 group active:scale-95"
        >
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>{t('resetPassword.backToLogin')}</span>
        </Link>

        <div className="bg-white/80 backdrop-blur-xl rounded-[20px] sm:rounded-[28px] shadow-2xl shadow-teal-500/10 p-6 sm:p-10 border border-gray-200/60">
          {/* Logo */}
          <div className="mb-6 sm:mb-8">
            <Logo size="sm" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1.5 sm:mb-2 tracking-tight">{t('resetPassword.title')}</h1>
          <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
            {t('resetPassword.subtitle')}
          </p>

          <form onSubmit={onSubmit} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">{t('resetPassword.newPassword')}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm sm:text-base text-gray-900 placeholder-gray-400 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all outline-none"
                placeholder={t('common.passwordPlaceholder')}
                required
                autoFocus
                disabled={!token || pending}
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">{t('resetPassword.confirmPassword')}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm sm:text-base text-gray-900 placeholder-gray-400 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all outline-none"
                placeholder={t('common.passwordPlaceholder')}
                required
                disabled={!token || pending}
              />
            </div>

            {errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3">
                <p className="text-xs sm:text-sm font-semibold text-red-800 mb-1.5 sm:mb-2">{t('resetPassword.validationTitle')}</p>
                <ul className="list-disc list-inside space-y-0.5 sm:space-y-1 text-xs sm:text-sm text-red-700">
                  {errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3">
                <p className="text-xs sm:text-sm text-red-800 font-medium break-words">{error}</p>
              </div>
            )}

            <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3">
              <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">{t('resetPassword.requirements.title')}</p>
              <ul className="list-disc list-inside space-y-0.5 sm:space-y-1 text-xs sm:text-sm text-gray-600">
                <li>{t('resetPassword.requirements.minLength')}</li>
                <li>{t('resetPassword.requirements.uppercase')}</li>
                <li>{t('resetPassword.requirements.lowercase')}</li>
                <li>{t('resetPassword.requirements.number')}</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={!token || pending}
              className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-teal-600 text-white text-sm sm:text-base rounded-xl font-semibold hover:bg-teal-700 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {pending ? t('resetPassword.resetting') : t('resetPassword.resetButton')}
            </button>
          </form>

          <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-gray-200/60 text-center text-xs sm:text-sm text-gray-600">
            {t('resetPassword.rememberPassword')}{' '}
            <Link href={`/${locale}/auth/login`} className="text-teal-600 hover:text-teal-700 font-semibold transition-colors">
              {t('resetPassword.backToLogin')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
