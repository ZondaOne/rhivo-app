'use client';

import Link from 'next/link';

export default function InvestorsPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200/60 bg-white/95 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-8 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-green-500 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            <span className="text-2xl font-bold text-gray-900 tracking-tight">rivo</span>
          </Link>
          <Link
            href="/"
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Back to home
          </Link>
        </div>
      </header>

      {/* Main Content */}
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
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight">
              Investment Opportunity
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Explore our vision, business model, and growth strategy.
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
            <div className="px-8 py-6 bg-gray-50 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-600 font-medium">Interactive Presentation</span>
                </div>
                <span className="text-sm text-gray-400 hidden md:block">Use arrow keys to navigate</span>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href="/pitch.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-sm transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                  </svg>
                  <span>Open in new tab</span>
                </a>
                <a
                  href="mailto:hello@rivo.app?subject=Investment Inquiry"
                  className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:scale-[1.02] transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                  <span>Contact us</span>
                </a>
              </div>
            </div>
          </div>

          {/* Contact CTA */}
          <div className="text-center mt-16">
            <p className="text-gray-600 mb-6">
              Interested in learning more about this opportunity?
            </p>
            <a
              href="mailto:hello@rivo.app?subject=Investment Inquiry"
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-2xl font-semibold text-lg hover:shadow-lg hover:scale-[1.02] transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
              <span>Get in touch</span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200/60 bg-white py-12">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-green-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-sm">R</span>
              </div>
              <span>© 2025 Rivo. Keep it simple.</span>
            </div>
            <div className="flex items-center gap-8">
              <Link href="/" className="hover:text-gray-900 transition-colors">Home</Link>
              <Link href="/book" className="hover:text-gray-900 transition-colors">Find a Business</Link>
              <Link href="/onboard" className="hover:text-gray-900 transition-colors">For Businesses</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
