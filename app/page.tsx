'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-white via-teal-50/30 to-white">
        {/* Dynamic Background */}
        <div className="absolute inset-0">
          {/* Animated gradient orbs - softer, more organic */}
          <div className="absolute top-1/3 left-1/4 w-[700px] h-[700px] bg-gradient-to-br from-teal-300/25 via-green-300/20 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '12s' }} />
          <div className="absolute bottom-1/4 right-1/3 w-[600px] h-[600px] bg-gradient-to-tl from-green-300/20 via-teal-300/15 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '15s', animationDelay: '3s' }} />

          {/* Subtle grid texture */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:5rem_5rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,black_10%,transparent_100%)] opacity-30" />
        </div>

        {/* Content */}
        <div className="relative max-w-5xl mx-auto px-8 text-center">
          {/* Logo wordmark */}
          <div className="mb-16">
            <span
              className="text-[8rem] md:text-[10rem] bg-gradient-to-r from-teal-600 via-green-500 to-teal-600 bg-clip-text text-transparent"
              style={{ fontFamily: 'Negan, sans-serif', letterSpacing: '0.03em' }}
            >
              rivo
            </span>
          </div>

          {/* Headline - short, conversational */}
          <h1 className="text-6xl md:text-8xl font-bold mb-12 tracking-tight leading-[1.1] max-w-4xl mx-auto">
            <span className="text-gray-900">Your time is precious.</span>
            <br />
            <span className="bg-gradient-to-r from-teal-600 to-green-600 bg-clip-text text-transparent">
              Don't waste it scheduling.
            </span>
          </h1>

          {/* Simple tagline */}
          <p className="text-2xl md:text-3xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Book appointments instantly.
          </p>
        </div>

        {/* Interactive scroll button */}
        <button
          onClick={() => {
            document.querySelector('#choose-path')?.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });
          }}
          className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 cursor-pointer group hover:scale-105 transition-transform"
          aria-label="Scroll to content"
        >
          <span className="text-sm text-gray-500 font-medium group-hover:text-gray-700 transition-colors">Choose your path</span>
          <div className="w-12 h-12 rounded-full border-2 border-teal-500 bg-white flex items-center justify-center animate-bounce group-hover:bg-teal-50 group-hover:border-teal-600 transition-all shadow-lg">
            <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
      </section>

      {/* Who Are You Section */}
      <section id="choose-path" className="min-h-screen flex items-center py-32 bg-gray-50">
        <div className="max-w-6xl mx-auto px-8 w-full">

          {/* Section Header */}
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight">
              How can we help?
            </h2>
          </div>

          {/* Two Path Cards */}
          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto mb-16">

            {/* Customer Path */}
            <Link href="/book" className="group block h-full">
              <div className="relative bg-white border-2 border-gray-200 rounded-3xl p-8 md:p-10 hover:border-teal-500 transition-all duration-300 overflow-hidden h-full flex flex-col">

                {/* Subtle background accent */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-teal-500/5 rounded-full blur-3xl group-hover:bg-teal-500/10 transition-all" />

                {/* Icon - simple circle */}
                <div className="relative w-14 h-14 bg-teal-50 rounded-full flex items-center justify-center mb-6 group-hover:bg-teal-100 transition-colors">
                  <svg className="w-7 h-7 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                </div>

                {/* Title */}
                <h3 className="relative text-3xl font-bold text-gray-900 mb-4 tracking-tight">
                  Book an appointment
                </h3>

                {/* Description */}
                <p className="relative text-lg text-gray-600 leading-relaxed mb-8 flex-grow">
                  Find what you need, see what's available, and book instantly.
                </p>

                {/* CTA */}
                <div className="relative inline-flex items-center gap-2 text-teal-600 font-semibold group-hover:gap-3 transition-all">
                  <span>Get started</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </Link>

            {/* Owner Path */}
            <Link href="/auth/login" className="group block h-full">
              <div className="relative bg-white border-2 border-gray-200 rounded-3xl p-8 md:p-10 hover:border-green-500 transition-all duration-300 overflow-hidden h-full flex flex-col">

                {/* Subtle background accent */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-green-500/5 rounded-full blur-3xl group-hover:bg-green-500/10 transition-all" />

                {/* Icon - simple circle */}
                <div className="relative w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mb-6 group-hover:bg-green-100 transition-colors">
                  <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                  </svg>
                </div>

                {/* Title */}
                <h3 className="relative text-3xl font-bold text-gray-900 mb-4 tracking-tight">
                  Manage your business
                </h3>

                {/* Description */}
                <p className="relative text-lg text-gray-600 leading-relaxed mb-8 flex-grow">
                  Your calendar, customers, and bookings—all in one place.
                </p>

                {/* CTA */}
                <div className="relative inline-flex items-center gap-2 text-green-600 font-semibold group-hover:gap-3 transition-all">
                  <span>Go to dashboard</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </Link>
          </div>

          {/* New to Rivo? */}
          <div className="text-center">
            <p className="text-gray-500 mb-6 text-lg">
              New to Rivo?
            </p>
            <Link
              href="/onboard"
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-2xl font-semibold text-lg hover:shadow-xl hover:scale-[1.02] transition-all"
            >
              <span>Register your business</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>


      {/* Investment Pitch Section */}
      <section className="py-32 bg-gradient-to-b from-white via-gray-50 to-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-teal-300/20 via-green-300/15 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-to-tl from-green-300/15 via-teal-300/20 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-8 relative">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 border border-teal-200 rounded-full text-teal-700 font-semibold text-sm mb-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
              <span>For Investors</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight">
              See our investment pitch
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Explore our vision, business model, and growth strategy. Free forever core platform with premium AI assistants.
            </p>
          </div>

          {/* Pitch Deck Embed */}
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
            <div className="aspect-[16/9] w-full relative bg-gray-900">
              <iframe
                src="/pitch.html"
                className="absolute inset-0 w-full h-full"
                title="Rivo Investment Pitch"
                allow="fullscreen"
                sandbox="allow-scripts allow-same-origin allow-popups"
                style={{ border: 'none' }}
              />
              {/* Overlay hint for interaction */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium pointer-events-none opacity-80">
                Click inside and use arrow keys to navigate
              </div>
            </div>
            
            {/* Controls Bar */}
            <div className="px-8 py-6 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-600 font-medium">Interactive Presentation</span>
                </div>
                <span className="text-sm text-gray-400">Use arrow keys to navigate</span>
              </div>
              
              <div className="flex items-center gap-3">
                <a
                  href="/pitch.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                  </svg>
                  <span>Open in new tab</span>
                </a>
                <a
                  href="mailto:hello@rivo.app?subject=Investment Inquiry"
                  className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-lg font-semibold text-sm hover:shadow-lg hover:scale-[1.02] transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                  <span>Contact us</span>
                </a>
              </div>
            </div>
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-12">
            <div className="bg-white rounded-2xl p-6 border border-gray-200 text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-green-600 bg-clip-text text-transparent mb-2">
                €0
              </div>
              <div className="text-sm text-gray-600">Core Platform</div>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-200 text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-green-600 bg-clip-text text-transparent mb-2">
                €273K
              </div>
              <div className="text-sm text-gray-600">Target ARR (Year 1)</div>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-200 text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-green-600 bg-clip-text text-transparent mb-2">
                €400K
              </div>
              <div className="text-sm text-gray-600">Seed Round</div>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-200 text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-green-600 bg-clip-text text-transparent mb-2">
                AI First
              </div>
              <div className="text-sm text-gray-600">Chat + Voice Bots</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200/60 bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-green-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-sm">R</span>
              </div>
              <span>© 2025 Rivo</span>
            </div>
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="hover:text-gray-900 transition-colors">Dashboard</Link>
              <Link href="/debug/api" className="hover:text-gray-900 transition-colors">API</Link>
              <a href="/pitch.html" target="_blank" className="hover:text-gray-900 transition-colors">Investor Pitch</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
