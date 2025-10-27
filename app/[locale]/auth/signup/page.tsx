"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from '@/i18n/routing';
import { Logo } from '@/components/Logo';
import { useTranslations, useLocale } from 'next-intl';

export default function SignupPage() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const { signupOwner } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setPending(true);
    try {
      const res = await signupOwner({ email, password, name, businessName, businessPhone, timezone });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('signup.signupFailed'));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-teal-50/30 to-white flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-2xl">
        {/* Back to home */}
        <Link
          href={`/${locale}`}
          className="inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6 sm:mb-8 group active:scale-95"
        >
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>{t('common.backToHome')}</span>
        </Link>

        <div className="bg-white/80 backdrop-blur-xl rounded-[20px] sm:rounded-[28px] shadow-2xl shadow-teal-500/10 p-6 sm:p-10 border border-gray-200/60">
          {/* Logo */}
          <div className="mb-6 sm:mb-8">
            <Logo size="sm" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1.5 sm:mb-2 tracking-tight">{t('signup.title')}</h1>
          <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">{t('signup.subtitle')}</p>

          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">{t('signup.ownerName')}</label>
              <input 
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm sm:text-base text-gray-900 placeholder-gray-400 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all outline-none" 
                value={name} 
                onChange={e=>setName(e.target.value)} 
                required 
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">{t('common.email')}</label>
              <input 
                type="email" 
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm sm:text-base text-gray-900 placeholder-gray-400 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all outline-none" 
                placeholder={t('common.emailPlaceholder')}
                value={email} 
                onChange={e=>setEmail(e.target.value)} 
                required 
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">{t('common.password')}</label>
              <input 
                type="password" 
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm sm:text-base text-gray-900 placeholder-gray-400 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all outline-none" 
                placeholder={t('common.passwordPlaceholder')}
                value={password} 
                onChange={e=>setPassword(e.target.value)} 
                required 
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">{t('signup.businessName')}</label>
              <input 
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm sm:text-base text-gray-900 placeholder-gray-400 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all outline-none" 
                value={businessName} 
                onChange={e=>setBusinessName(e.target.value)} 
                required 
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">{t('signup.businessPhone')}</label>
              <input 
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm sm:text-base text-gray-900 placeholder-gray-400 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all outline-none" 
                value={businessPhone} 
                onChange={e=>setBusinessPhone(e.target.value)} 
                placeholder={t('signup.phonePlaceholder')} 
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">{t('signup.timezone')}</label>
              <input 
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm sm:text-base text-gray-900 placeholder-gray-400 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all outline-none" 
                value={timezone} 
                onChange={e=>setTimezone(e.target.value)} 
              />
            </div>

            {error && (
              <div className="md:col-span-2 bg-red-50 border border-red-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3">
                <p className="text-xs sm:text-sm text-red-800 font-medium break-words">{error}</p>
              </div>
            )}

            <div className="md:col-span-2">
              <button 
                type="submit" 
                disabled={pending} 
                className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-teal-600 to-green-600 text-white text-sm sm:text-base rounded-xl font-semibold shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60"
              >
                {pending ? t('signup.creating') : t('signup.createButton')}
              </button>
            </div>
          </form>

          {result && (
            <div className="mt-6 sm:mt-8 p-4 sm:p-5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm">
              <div className="font-semibold text-gray-800 mb-2 sm:mb-3">{t('signup.accountCreated')}</div>
              <div className="text-gray-700 mb-2 sm:mb-3">{t('signup.verificationInstructions')}</div>
              <div className="break-all text-teal-700 bg-white p-2 sm:p-3 rounded-lg border border-teal-200 mb-3 sm:mb-4">{result.verificationUrl}</div>
              <div className="text-gray-700">
                {t('signup.afterVerifying')}{' '}
                <Link href={`/${locale}/auth/login`} className="text-teal-700 font-semibold hover:text-teal-800 transition-colors">
                  {t('signup.loginLink')}
                </Link>.
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-gray-200/60 text-center">
            <p className="text-xs sm:text-sm text-gray-600">
              {t('login.newToRivo')}{' '}
              <Link href={`/${locale}/auth/login`} className="text-teal-600 hover:text-teal-700 font-semibold transition-colors">
                {t('login.signInButton')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
