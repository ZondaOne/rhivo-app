"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/Logo';
import { useTranslations, useLocale } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { EmailVerificationModal } from '@/components/auth/EmailVerificationModal';

export default function LoginPage() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const { login, user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await login({ email, password });
      // User object is now updated in auth context
      // Role check and redirect will happen in the useEffect below
      setPending(false);
    } catch (err) {
      setPending(false);

      // Check if error is due to unverified email
      const errorMessage = err instanceof Error ? err.message : '';
      const errorObj = err as { requiresVerification?: boolean };
      if (errorMessage.includes('verify your email') || errorObj?.requiresVerification) {
        setUnverifiedEmail(email);
        setShowVerificationModal(true);
        setError(null); // Clear error since we're showing modal
      } else {
        setError(errorMessage || t('login.loginFailed'));
      }
    }
  }

  // Redirect after successful login based on user state and role
  useEffect(() => {
    if (isAuthenticated && user && !pending && !isLoading) {
      // Check if user is customer - they should use customer login
      if (user.role === 'customer') {
        setError(t('login.customerLoginError'));
        // Log them out
        setTimeout(() => {
          router.push('/customer/login');
        }, 2000);
        return;
      }

      // Owner or staff - redirect appropriately
      if (user.requires_password_change) {
        router.push('/auth/change-password');
      } else {
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, user, pending, isLoading, router, t, locale]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-teal-50/30 to-white flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Premium background elements - matching landing page */}
      <div className="absolute inset-0">
        <div
          className="absolute top-1/4 left-1/3 w-[400px] h-[400px] sm:w-[600px] sm:h-[600px] bg-gradient-to-br from-teal-400/15 via-green-400/10 to-transparent rounded-full blur-3xl"
          style={{
            animation: 'float 20s ease-in-out infinite',
            animationDelay: '0s'
          }}
        />
        <div
          className="absolute bottom-1/3 right-1/4 w-[350px] h-[350px] sm:w-[500px] sm:h-[500px] bg-gradient-to-tl from-green-400/10 via-teal-400/8 to-transparent rounded-full blur-3xl"
          style={{
            animation: 'float 25s ease-in-out infinite',
            animationDelay: '5s'
          }}
        />
      </div>

      {/* Content */}
      <div className={`w-full max-w-md relative transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Back to home */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6 sm:mb-8 group active:scale-95"
        >
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>{t('common.backToHome')}</span>
        </Link>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[20px] sm:rounded-[28px] shadow-2xl shadow-teal-500/10 p-6 sm:p-10 border border-gray-200/60">
          {/* Logo */}
          <div className="mb-6 sm:mb-8">
            <Logo size="sm" />
          </div>

          {/* Heading */}
          <div className="mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1.5 sm:mb-2 tracking-tight">{t('login.title')}</h2>
            <p className="text-sm sm:text-base text-gray-600">{t('login.subtitle')}</p>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">{t('common.email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm sm:text-base text-gray-900 placeholder-gray-400 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all outline-none"
                placeholder={t('common.emailPlaceholder')}
                required
                autoFocus
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700">{t('common.password')}</label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs sm:text-sm text-teal-600 hover:text-teal-700 font-medium transition-colors active:scale-95"
                >
                  {t('login.forgotPassword')}
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm sm:text-base text-gray-900 placeholder-gray-400 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all outline-none"
                placeholder={t('common.passwordPlaceholder')}
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 flex items-start gap-2 sm:gap-3">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-xs sm:text-sm text-red-800 font-medium break-words">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={pending || isLoading}
              className="group w-full px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-xl text-sm sm:text-base font-semibold shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 relative overflow-hidden"
            >
              {!pending && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
              )}
              <span className="relative flex items-center justify-center gap-1.5 sm:gap-2">
                {pending ? (
                  <>
                    <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>{t('login.signingIn')}</span>
                  </>
                ) : (
                  <>
                    <span>{t('login.signInButton')}</span>
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </span>
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-gray-200/60 text-center">
            <p className="text-xs sm:text-sm text-gray-600">
              {t('login.newToRivo')}{' '}
              <Link href="/onboard" className="text-teal-600 hover:text-teal-700 font-semibold transition-colors">
                {t('login.registerBusiness')}
              </Link>
            </p>
          </div>
        </div>

        {/* Security badge */}
        <div className="mt-5 sm:mt-6 flex items-center justify-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-gray-500">
          <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>{t('common.secureAuth')}</span>
        </div>
      </div>

      {/* Email Verification Modal */}
      <EmailVerificationModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        email={unverifiedEmail}
        onResend={async () => {
          const response = await fetch('/api/auth/resend-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: unverifiedEmail }),
          });

          if (!response.ok) {
            throw new Error('Failed to resend verification email');
          }
        }}
      />

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
      `}</style>
    </div>
  );
}
