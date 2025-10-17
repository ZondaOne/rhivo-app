"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function LoginPage() {
  const { login, user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await login({ email, password });
      // User object is now updated in auth context
      setPending(false);
    } catch (err: any) {
      setError(err?.message || 'Login failed');
      setPending(false);
    }
  }

  // Redirect after successful login based on user state
  if (isAuthenticated && user && !pending) {
    if (user.requires_password_change) {
      router.push('/auth/change-password');
    } else {
      router.push('/dashboard');
    }
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-teal-50/30 to-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* Premium background elements - matching landing page */}
      <div className="absolute inset-0">
        <div
          className="absolute top-1/4 left-1/3 w-[600px] h-[600px] bg-gradient-to-br from-teal-400/15 via-green-400/10 to-transparent rounded-full blur-3xl"
          style={{
            animation: 'float 20s ease-in-out infinite',
            animationDelay: '0s'
          }}
        />
        <div
          className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-gradient-to-tl from-green-400/10 via-teal-400/8 to-transparent rounded-full blur-3xl"
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
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-8 group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to home</span>
        </Link>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[28px] shadow-2xl shadow-teal-500/10 p-10 border border-gray-200/60">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/30">
              <span className="text-white font-bold text-xl">R</span>
            </div>
            <div>
              <h1
                className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-green-600 bg-clip-text text-transparent"
                style={{ fontFamily: 'Negan, sans-serif', letterSpacing: '0.01em' }}
              >
                rivo
              </h1>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Welcome back</h2>
            <p className="text-gray-600">Sign in to your business account</p>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all outline-none"
                placeholder="you@business.com"
                required
                autoFocus
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-gray-700">Password</label>
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium transition-colors"
                >
                  Forgot?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all outline-none"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm text-red-800 font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={pending || isLoading}
              className="group w-full px-6 py-4 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-xl font-semibold shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 relative overflow-hidden"
            >
              {!pending && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
              )}
              <span className="relative flex items-center justify-center gap-2">
                {pending ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign in</span>
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </span>
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200/60 text-center">
            <p className="text-sm text-gray-600">
              New to Rivo?{' '}
              <Link href="/onboard" className="text-teal-600 hover:text-teal-700 font-semibold transition-colors">
                Register your business
              </Link>
            </p>
          </div>
        </div>

        {/* Security badge */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>Secure authentication</span>
        </div>
      </div>

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
