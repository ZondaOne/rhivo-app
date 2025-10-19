"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/Logo';
import { useTranslations, useLocale } from 'next-intl';

export default function ChangePasswordPage() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, accessToken } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const [isRequired, setIsRequired] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/${locale}/auth/login`);
    }
  }, [isAuthenticated, isLoading, router, locale]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setErrors([]);

    if (newPassword !== confirmPassword) {
      setError(t('changePassword.passwordsDoNotMatch'));
      return;
    }

    if (currentPassword === newPassword) {
      setError(t('changePassword.samePassword'));
      return;
    }

    setPending(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) {
          setErrors(data.errors);
        }
        throw new Error(data.error || t('changePassword.changeFailed'));
      }

      setIsRequired(data.wasRequired);
      setSuccess(true);

      // Redirect to dashboard after 2 seconds
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch (err: any) {
      setError(err?.message || t('changePassword.changeFailed'));
    } finally {
      setPending(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-teal-50/30 to-white flex items-center justify-center">
        <div className="text-sm sm:text-base text-gray-600">{t('common.loading')}</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
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
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-1.5 sm:mb-2">{t('changePassword.success.title')}</h1>
            <p className="text-sm sm:text-base text-gray-600 mb-5 sm:mb-6">
              {isRequired ? t('changePassword.success.messageRequired') : t('changePassword.success.messageOptional')}
            </p>
            <p className="text-xs sm:text-sm text-gray-500">
              {t('changePassword.success.redirecting')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-teal-50/30 to-white flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="bg-white/80 backdrop-blur-xl rounded-[20px] sm:rounded-[28px] shadow-2xl shadow-teal-500/10 p-6 sm:p-10 border border-gray-200/60">
          {/* Logo */}
          <div className="mb-6 sm:mb-8">
            <Logo size="sm" />
          </div>

          {user?.requires_password_change && (
            <div className="mb-4 sm:mb-5 p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs sm:text-sm text-amber-800 font-semibold mb-1">{t('changePassword.required.title')}</p>
              <p className="text-[10px] sm:text-xs text-amber-700">
                {t('changePassword.required.message')}
              </p>
            </div>
          )}

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1.5 sm:mb-2 tracking-tight">{t('changePassword.title')}</h1>
          <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
            {t('changePassword.subtitle')}
          </p>

          <form onSubmit={onSubmit} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">{t('changePassword.currentPassword')}</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm sm:text-base text-gray-900 placeholder-gray-400 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all outline-none"
                placeholder={t('common.passwordPlaceholder')}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">{t('changePassword.newPassword')}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm sm:text-base text-gray-900 placeholder-gray-400 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all outline-none"
                placeholder={t('common.passwordPlaceholder')}
                required
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">{t('changePassword.confirmPassword')}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm sm:text-base text-gray-900 placeholder-gray-400 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all outline-none"
                placeholder={t('common.passwordPlaceholder')}
                required
              />
            </div>

            {errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3">
                <p className="text-xs sm:text-sm font-semibold text-red-800 mb-1.5 sm:mb-2">{t('changePassword.validationTitle')}</p>
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
              <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">{t('changePassword.requirements.title')}</p>
              <ul className="list-disc list-inside space-y-0.5 sm:space-y-1 text-xs sm:text-sm text-gray-600">
                <li>{t('changePassword.requirements.minLength')}</li>
                <li>{t('changePassword.requirements.uppercase')}</li>
                <li>{t('changePassword.requirements.lowercase')}</li>
                <li>{t('changePassword.requirements.number')}</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-teal-600 text-white text-sm sm:text-base rounded-xl font-semibold hover:bg-teal-700 active:scale-95 disabled:opacity-60 transition-all"
            >
              {pending ? t('changePassword.changing') : t('changePassword.changeButton')}
            </button>
          </form>

          {!user?.requires_password_change && (
            <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-gray-200/60 text-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-xs sm:text-sm text-teal-600 hover:text-teal-700 font-semibold transition-colors"
              >
                {t('changePassword.cancelButton')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
