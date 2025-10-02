import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-teal-50 via-green-50 to-teal-100">
      {/* Header */}
      <header className="border-b border-teal-200 bg-white/70 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-semibold text-teal-800">Rivo</div>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="text-teal-700 font-medium hover:text-teal-800 transition-colors">
              Sign in
            </Link>
            <Link href="/auth/signup" className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Premium Appointment
            <br />
            Management Made Simple
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Streamline your booking process with an elegant, organic platform designed for businesses that value simplicity and efficiency.
          </p>
        </div>

        <div className="flex items-center justify-center gap-4 mb-12">
          <Link href="/auth/signup" className="px-8 py-4 bg-teal-600 text-white text-lg rounded-xl font-semibold hover:bg-teal-700 shadow-lg hover:shadow-xl transition-all">
            Create Your Business Account
          </Link>
          <Link href="/dashboard" className="px-8 py-4 bg-white text-teal-700 text-lg rounded-xl font-semibold hover:bg-gray-50 shadow-md transition-all border-2 border-teal-200">
            View Dashboard Demo
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl shadow-sm p-8 border border-teal-100">
            <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Smart Calendar</h3>
            <p className="text-gray-600">
              Manage appointments with intuitive calendar views. Month, week, day, and list modes for complete flexibility.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-8 border border-green-100">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Secure Bookings</h3>
            <p className="text-gray-600">
              Prevent double-bookings with robust concurrency controls. Enterprise-grade security for peace of mind.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-8 border border-teal-100">
            <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Lightning Fast</h3>
            <p className="text-gray-600">
              Built with modern technology for instant performance. Your customers will love the seamless experience.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="bg-gradient-to-br from-teal-600 to-green-600 rounded-3xl p-12 shadow-2xl text-white">
          <h2 className="text-4xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-xl text-teal-50 mb-8">
            Join businesses using Rivo to manage their appointments with ease.
          </p>
          <Link href="/auth/signup" className="inline-block px-8 py-4 bg-white text-teal-700 text-lg rounded-xl font-semibold hover:bg-gray-50 shadow-lg hover:shadow-xl transition-all">
            Create Your Account Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-teal-200 bg-white/70 backdrop-blur-sm mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>© 2025 Rivo. Premium appointment management.</div>
            <div className="flex items-center gap-6">
              <Link href="/debug/api" className="hover:text-teal-700 transition-colors">API Debug</Link>
              <Link href="/dashboard" className="hover:text-teal-700 transition-colors">Dashboard</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
