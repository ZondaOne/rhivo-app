'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Premium gradient background - subtle, organic */}
        <div className="absolute inset-0 bg-gradient-to-b from-white via-teal-50/30 to-white" />

        {/* Animated ambient orbs - Apple-style */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute top-1/4 left-1/3 w-[600px] h-[600px] bg-gradient-to-br from-teal-400/20 via-green-400/15 to-transparent rounded-full blur-3xl transition-all duration-[3000ms] ease-in-out"
            style={{
              animation: 'float 20s ease-in-out infinite',
              animationDelay: '0s'
            }}
          />
          <div
            className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-gradient-to-tl from-green-400/15 via-teal-400/10 to-transparent rounded-full blur-3xl transition-all duration-[3000ms] ease-in-out"
            style={{
              animation: 'float 25s ease-in-out infinite',
              animationDelay: '5s'
            }}
          />
          <div
            className="absolute top-1/2 right-1/3 w-[400px] h-[400px] bg-gradient-to-br from-teal-300/10 to-transparent rounded-full blur-3xl"
            style={{
              animation: 'float 30s ease-in-out infinite',
              animationDelay: '10s'
            }}
          />
        </div>

        {/* Content - with entrance animation */}
        <div className={`relative max-w-6xl mx-auto px-8 text-center transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Logo wordmark - premium */}
          <div className="mb-16">
            <h1
              className="text-[7rem] md:text-[9rem] bg-gradient-to-r from-teal-600 via-green-500 to-teal-600 bg-clip-text text-transparent transition-all duration-700"
              style={{
                fontFamily: 'Negan, sans-serif',
                letterSpacing: '0.01em',
                backgroundSize: '200% auto',
                animation: 'shimmer 8s ease-in-out infinite'
              }}
            >
              rivo
            </h1>
          </div>

          {/* Headline - with stagger animation */}
          <div className="mb-12 space-y-3">
            <h2
              className={`text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] max-w-4xl mx-auto transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            >
              <span className="text-gray-900">Book appointments</span>
            </h2>
            <h2
              className={`text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] max-w-4xl mx-auto transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            >
              <span className="bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 bg-clip-text text-transparent">
                without the back-and-forth.
              </span>
            </h2>
          </div>

          {/* Explanation - fade in */}
          <p
            className={`text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto leading-relaxed mb-16 transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            See what's available. Pick a time. You're done.
            <br className="hidden md:block" />
            <span className="text-gray-500">It really is that simple.</span>
          </p>

          {/* Primary CTA - premium hover effect */}
          <div className={`transition-all duration-700 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <Link
              href="/book"
              className="group inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-[20px] font-semibold text-lg shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30 hover:scale-[1.02] transition-all duration-300 relative overflow-hidden"
            >
              {/* Shimmer effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
              <span className="relative">Find a business</span>
              <svg className="w-5 h-5 relative group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Scroll indicator - premium animation */}
        <button
          onClick={() => {
            document.querySelector('#how-it-works')?.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });
          }}
          className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 cursor-pointer group"
          aria-label="Scroll to learn more"
        >
          <span className="text-xs uppercase tracking-wider text-gray-400 font-medium group-hover:text-gray-600 transition-colors">Scroll</span>
          <div className="w-8 h-12 border-2 border-gray-300 rounded-full flex items-start justify-center p-2 group-hover:border-gray-400 transition-colors">
            <div className="w-1.5 h-2 bg-gray-400 rounded-full animate-bounce group-hover:bg-gray-600 transition-colors" />
          </div>
        </button>

        <style jsx>{`
          @keyframes float {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(30px, -30px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
          }
          @keyframes shimmer {
            0%, 100% { background-position: 0% center; }
            50% { background-position: 100% center; }
          }
        `}</style>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-40 bg-gradient-to-b from-white via-gray-50/40 to-white relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-40">
          <div className="absolute top-0 left-1/4 w-[300px] h-[300px] bg-teal-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-green-500/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-8 relative">
          <div className="text-center mb-24">
            <p className="text-sm uppercase tracking-wider text-teal-600 font-semibold mb-4">Simple by design</p>
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight leading-[1.1]">
              How it works
            </h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">
              Three steps. That's it.
            </p>
          </div>

          {/* Steps - Premium cards with hover effects */}
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Step 1 */}
            <div className="group relative bg-white rounded-[28px] p-10 shadow-sm hover:shadow-2xl hover:shadow-teal-500/10 transition-all duration-500 border border-gray-100 hover:border-teal-200/50 hover:-translate-y-2">
              {/* Step number badge */}
              <div className="absolute -top-3 -left-3 w-10 h-10 bg-gradient-to-br from-teal-500 to-green-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-teal-500/30">
                1
              </div>

              {/* Icon container with gradient border effect */}
              <div className="relative w-20 h-20 mx-auto mb-8">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-green-500 rounded-[20px] opacity-10 group-hover:opacity-20 transition-opacity" />
                <div className="relative w-full h-full bg-white rounded-[18px] flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                  <svg className="w-10 h-10 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              <h3 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight text-center">Find</h3>
              <p className="text-gray-600 leading-relaxed text-center text-lg">
                Browse businesses near you or search for exactly what you need.
              </p>

              {/* Subtle hover accent */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-green-500 rounded-b-[28px] scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
            </div>

            {/* Step 2 */}
            <div className="group relative bg-white rounded-[28px] p-10 shadow-sm hover:shadow-2xl hover:shadow-green-500/10 transition-all duration-500 border border-gray-100 hover:border-green-200/50 hover:-translate-y-2">
              {/* Step number badge */}
              <div className="absolute -top-3 -left-3 w-10 h-10 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-green-500/30">
                2
              </div>

              {/* Icon container */}
              <div className="relative w-20 h-20 mx-auto mb-8">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-teal-500 rounded-[20px] opacity-10 group-hover:opacity-20 transition-opacity" />
                <div className="relative w-full h-full bg-white rounded-[18px] flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                  <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>

              <h3 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight text-center">Pick</h3>
              <p className="text-gray-600 leading-relaxed text-center text-lg">
                See available times in real-time. Choose what works for you.
              </p>

              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-teal-500 rounded-b-[28px] scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
            </div>

            {/* Step 3 */}
            <div className="group relative bg-white rounded-[28px] p-10 shadow-sm hover:shadow-2xl hover:shadow-teal-500/10 transition-all duration-500 border border-gray-100 hover:border-teal-200/50 hover:-translate-y-2">
              {/* Step number badge */}
              <div className="absolute -top-3 -left-3 w-10 h-10 bg-gradient-to-br from-teal-500 to-green-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-teal-500/30">
                3
              </div>

              {/* Icon container */}
              <div className="relative w-20 h-20 mx-auto mb-8">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-green-500 rounded-[20px] opacity-10 group-hover:opacity-20 transition-opacity" />
                <div className="relative w-full h-full bg-white rounded-[18px] flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                  <svg className="w-10 h-10 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>

              <h3 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight text-center">Done</h3>
              <p className="text-gray-600 leading-relaxed text-center text-lg">
                Confirm your booking. Get instant confirmation. That's it.
              </p>

              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-green-500 rounded-b-[28px] scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
            </div>
          </div>
        </div>
      </section>

      {/* For Business Owners Section */}
      <section className="py-40 bg-gradient-to-b from-white to-gray-50 relative overflow-hidden">
        {/* Premium background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-0 w-[600px] h-[600px] bg-gradient-to-br from-teal-500/10 via-green-500/5 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-green-500/10 via-teal-500/5 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto px-8 text-center relative">
          {/* Label */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-50 to-green-50 border border-teal-200/50 rounded-full text-teal-700 font-semibold text-sm mb-8">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
            </svg>
            <span>For Business Owners</span>
          </div>

          {/* Headline */}
          <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-8 tracking-tight leading-[1.1]">
            Run a business?
            <br />
            <span className="bg-gradient-to-r from-teal-600 to-green-600 bg-clip-text text-transparent">
              We've got you covered.
            </span>
          </h2>

          {/* Features grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-16 max-w-4xl mx-auto">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/60 shadow-sm">
              <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">24/7 Booking</h3>
              <p className="text-sm text-gray-600">Accept appointments while you sleep</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/60 shadow-sm">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Less Phone Time</h3>
              <p className="text-sm text-gray-600">Customers book themselves online</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/60 shadow-sm">
              <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Simple Dashboard</h3>
              <p className="text-sm text-gray-600">Everything in one clean interface</p>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/login"
              className="group inline-flex items-center gap-2 px-8 py-4 bg-white border-2 border-gray-200 text-gray-900 rounded-[20px] font-semibold hover:border-gray-300 hover:bg-gray-50 transition-all shadow-sm hover:shadow-md"
            >
              <span>Sign in</span>
              <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="/onboard"
              className="group inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-[20px] font-semibold shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30 hover:scale-[1.02] transition-all relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
              <span className="relative">Get started free</span>
              <svg className="w-5 h-5 relative group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>

          {/* Trust signal */}
          <p className="text-sm text-gray-500 mt-8">
            No credit card required • Set up in minutes
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200/60 bg-gradient-to-b from-white to-gray-50/50 py-16">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Brand */}
            <div className="flex flex-col items-center md:items-start gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-green-500 rounded-xl flex items-center justify-center shadow-sm">
                  <span className="text-white font-bold">R</span>
                </div>
                <span className="text-2xl font-bold text-gray-900 tracking-tight" style={{ fontFamily: 'Negan, sans-serif' }}>rivo</span>
              </div>
              <p className="text-sm text-gray-500">Keep it simple.</p>
            </div>

            {/* Links */}
            <div className="flex flex-col md:flex-row items-center gap-8 text-sm">
              <Link href="/book/manage" className="text-gray-600 hover:text-gray-900 transition-colors font-medium">
                Manage Booking
              </Link>
              <Link href="/customer/dashboard" className="text-gray-600 hover:text-gray-900 transition-colors font-medium">
                My Appointments
              </Link>
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 transition-colors font-medium">
                Business Login
              </Link>
              <Link href="/investors" className="text-gray-600 hover:text-gray-900 transition-colors font-medium">
                Investors
              </Link>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-12 pt-8 border-t border-gray-200/60 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-400">
            <p>© 2025 Rivo. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-gray-600 transition-colors">Privacy</a>
              <a href="#" className="hover:text-gray-600 transition-colors">Terms</a>
              <a href="mailto:hello@rivo.app" className="hover:text-gray-600 transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
