"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link, useRouter } from '@/i18n/routing';
import { Logo } from '@/components/Logo';
import { useTranslations, useLocale } from 'next-intl';

export default function VerifyEmailPage() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<'idle'|'pending'|'success'|'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(3);

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setStatus('error');
      setMessage(t('verifyEmail.missingToken'));
      return;
    }

    async function verify() {
      setStatus('pending');
      try {
        const r = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || t('verifyEmail.failed'));
        setStatus('success');
        setMessage(t('verifyEmail.success'));
      } catch (e: any) {
        setStatus('error');
        setMessage(e?.message || t('verifyEmail.failed'));
      }
    }

    verify();
  }, [params, t]);

  // Auto-redirect to login after successful verification
  useEffect(() => {
    if (status === 'success') {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            router.push('/auth/login');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [status, router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-teal-50/30 to-white flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-[20px] sm:rounded-[28px] shadow-2xl shadow-teal-500/10 p-6 sm:p-10 border border-gray-200/60 text-center">
        {/* Logo */}
        <div className="mb-6 sm:mb-8">
          <Logo size="sm" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6 tracking-tight">{t('verifyEmail.title')}</h1>
        
        {status === 'pending' && (
          <div className="flex flex-col items-center gap-3 sm:gap-4">
            <svg className="animate-spin h-8 w-8 sm:h-10 sm:w-10 text-teal-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-sm sm:text-base text-gray-600">{t('verifyEmail.verifying')}</p>
          </div>
        )}
        
        {status === 'success' && (
          <div>
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm sm:text-base text-green-700 font-medium mb-2">
              {message}
            </p>
            <p className="text-xs sm:text-sm text-gray-600 mb-6 sm:mb-8">
              Redirecting to login in {countdown} second{countdown !== 1 ? 's' : ''}...
            </p>
            <Link
              href="/auth/login"
              className="inline-block px-5 sm:px-6 py-2.5 sm:py-3 bg-teal-600 text-white text-sm sm:text-base rounded-xl font-semibold hover:bg-teal-700 active:scale-95 transition-all"
            >
              {t('verifyEmail.goToLogin')} Now
            </Link>
          </div>
        )}
        
        {status === 'error' && (
          <div>
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-sm sm:text-base text-red-600 font-medium mb-6 sm:mb-8 break-words">
              {message}
            </p>
            <Link
              href="/auth/login"
              className="inline-block px-5 sm:px-6 py-2.5 sm:py-3 bg-gray-600 text-white text-sm sm:text-base rounded-xl font-semibold hover:bg-gray-700 active:scale-95 transition-all"
            >
              {t('verifyEmail.goToLogin')}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
