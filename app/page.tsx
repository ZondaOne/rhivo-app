"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-green-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Rivo Debug Panel
          </h1>
          <p className="text-gray-600 mb-8">
            Development testing and navigation
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Dashboard */}
            <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-6 rounded-xl border-2 border-teal-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Owner Dashboard
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Calendar views, appointment management, notifications
              </p>
              <Link
                href="/dashboard"
                className="inline-block px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
              >
                Open Dashboard
              </Link>
            </div>

            {/* Auth */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border-2 border-blue-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Authentication
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Owner and customer auth flows
              </p>
              <div className="flex gap-2">
                <Link
                  href="/auth/login"
                  className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/auth/signup"
                  className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            </div>

            {/* API Testing */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border-2 border-green-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                API Endpoints
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Test API routes and responses
              </p>
              <Link
                href="/debug/api"
                className="inline-block px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                API Tester
              </Link>
            </div>

            {/* Database */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border-2 border-purple-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Database
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                View tables, seed data, run migrations
              </p>
              <Link
                href="/debug/database"
                className="inline-block px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                Database Tools
              </Link>
            </div>

            {/* Booking Flow */}
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-xl border-2 border-yellow-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Public Booking
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Test customer booking flow
              </p>
              <Link
                href="/book/demo-business"
                className="inline-block px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition-colors"
              >
                Test Booking
              </Link>
            </div>

            {/* Docs */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl border-2 border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Documentation
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Architecture, schemas, implementation notes
              </p>
              <div className="flex gap-2">
                <Link
                  href="/docs"
                  className="inline-block px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
                >
                  View Docs
                </Link>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8 p-6 bg-gray-50 rounded-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={() => {
                  fetch('/api/debug/seed-data', { method: 'POST' })
                    .then(r => r.json())
                    .then(d => alert(JSON.stringify(d, null, 2)))
                    .catch(e => alert('Error: ' + e.message));
                }}
                className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg font-medium hover:bg-gray-100 transition-colors text-sm"
              >
                Seed Test Data
              </button>
              <button
                onClick={() => {
                  fetch('/api/debug/clear-data', { method: 'POST' })
                    .then(r => r.json())
                    .then(d => alert(JSON.stringify(d, null, 2)))
                    .catch(e => alert('Error: ' + e.message));
                }}
                className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg font-medium hover:bg-gray-100 transition-colors text-sm"
              >
                Clear Test Data
              </button>
              <button
                onClick={() => {
                  fetch('/api/appointments')
                    .then(r => r.json())
                    .then(d => console.log('Appointments:', d))
                    .catch(e => console.error('Error:', e));
                  alert('Check console for appointments');
                }}
                className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg font-medium hover:bg-gray-100 transition-colors text-sm"
              >
                Log Appointments
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  sessionStorage.clear();
                  alert('Storage cleared');
                }}
                className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg font-medium hover:bg-gray-100 transition-colors text-sm"
              >
                Clear Storage
              </button>
            </div>
          </div>

          {/* System Info */}
          <div className="mt-8 p-6 bg-blue-50 rounded-xl border border-blue-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              System Info
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Environment:</span>
                <span className="ml-2 text-gray-600">Development</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Node Version:</span>
                <span className="ml-2 text-gray-600">{process.version}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Database:</span>
                <span className="ml-2 text-gray-600">NeonDB (Postgres)</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Auth:</span>
                <span className="ml-2 text-gray-600">JWT</span>
              </div>
            </div>
          </div>

          {/* Useful Links */}
          <div className="mt-8 p-6 bg-teal-50 rounded-xl border border-teal-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Useful Links
            </h3>
            <div className="flex flex-wrap gap-3 text-sm">
              <a
                href="https://nextjs.org/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-700 hover:text-teal-900 underline"
              >
                Next.js Docs
              </a>
              <span className="text-gray-400">•</span>
              <a
                href="https://tailwindcss.com/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-700 hover:text-teal-900 underline"
              >
                Tailwind Docs
              </a>
              <span className="text-gray-400">•</span>
              <a
                href="https://neon.tech/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-700 hover:text-teal-900 underline"
              >
                Neon Docs
              </a>
              <span className="text-gray-400">•</span>
              <a
                href="/api"
                className="text-teal-700 hover:text-teal-900 underline"
              >
                API Routes
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
