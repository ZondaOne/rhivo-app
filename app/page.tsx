import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden bg-white">
        {/* Animated Background Grid */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black_40%,transparent_100%)]" />
        </div>

        {/* Gradient Orbs */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-green-500/20 rounded-full blur-3xl" />

        {/* Content */}
        <div className="relative max-w-6xl mx-auto px-8 text-center">
          <h1 className="text-7xl md:text-8xl font-bold text-gray-900 mb-8 tracking-tight leading-[1.05]">
            Time is precious.
            <br />
            <span className="bg-gradient-to-r from-teal-600 via-green-600 to-teal-600 bg-clip-text text-transparent">
              Don't waste it scheduling.
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Rivo connects people who need appointments with businesses ready to serve them.
            No phone calls, no email chains, no hassle.
          </p>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
          <span className="text-sm text-gray-500 font-medium">Choose your path</span>
          <div className="w-12 h-12 rounded-full border-2 border-gray-300 flex items-center justify-center animate-bounce">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </section>

      {/* Who Are You Section */}
      <section className="min-h-screen flex items-center py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 md:px-8 w-full">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">What brings you here?</h2>
            <p className="text-lg md:text-xl text-gray-600">Choose the path that fits your needs</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 md:gap-8 max-w-6xl mx-auto">
            {/* Customer Path */}
            <Link href="/book" className="group">
              <div className="relative bg-white border-2 border-gray-200 rounded-3xl p-8 md:p-10 hover:border-teal-500 hover:shadow-2xl transition-all duration-300 h-full">
                <div className="absolute top-6 right-6 w-10 h-10 md:w-12 md:h-12 bg-teal-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>

                <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mb-5 md:mb-6">
                  <svg className="w-6 h-6 md:w-7 md:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                </div>

                <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">I want to book an appointment</h3>
                <p className="text-gray-600 leading-relaxed mb-6 text-sm md:text-base">
                  Looking for a service? Find available time slots, book instantly, and get confirmed.
                  Search by business name or explore what's nearby.
                </p>

                <div className="space-y-3 mb-8">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-gray-700">Browse services and real-time availability</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-gray-700">Instant confirmation and reminders</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-gray-700">Easy rescheduling and cancellation</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <span className="text-teal-600 font-semibold group-hover:text-teal-700 text-sm md:text-base">
                    Find a business →
                  </span>
                </div>
              </div>
            </Link>

            {/* Owner Path */}
            <Link href="/auth/login" className="group">
              <div className="relative bg-white border-2 border-gray-200 rounded-3xl p-8 md:p-10 hover:border-green-500 hover:shadow-2xl transition-all duration-300 h-full">
                <div className="absolute top-6 right-6 w-10 h-10 md:w-12 md:h-12 bg-green-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>

                <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-5 md:mb-6">
                  <svg className="w-6 h-6 md:w-7 md:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                  </svg>
                </div>

                <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">I run a business</h3>
                <p className="text-gray-600 leading-relaxed mb-6 text-sm md:text-base">
                  Manage your appointments, services, and customers from one place.
                  Your personalized booking page handles the rest.
                </p>

                <div className="space-y-3 mb-8">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-gray-700">Calendar view with drag-and-drop scheduling</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-gray-700">Custom booking page with your branding</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-gray-700">Automated notifications and reminders</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <span className="text-green-600 font-semibold group-hover:text-green-700 text-sm md:text-base">
                    Access dashboard →
                  </span>
                </div>
              </div>
            </Link>
          </div>

          {/* New Business CTA */}
          <div className="mt-12 md:mt-16 text-center">
            <p className="text-gray-600 mb-4 text-sm md:text-base">
              Don't have an account yet?
            </p>
            <Link
              href="/onboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-2xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all text-sm md:text-base"
            >
              <span>Register your business</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
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
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
