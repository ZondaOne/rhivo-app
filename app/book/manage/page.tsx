'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ManageBookingPage() {
  const [bookingId, setBookingId] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    if (!bookingId || !email) {
      setError('Please enter both your Booking ID and email address.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/booking/guest-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, email }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.manageUrl) {
          window.location.href = data.manageUrl;
        } else {
          setMessage(
            'Check your email for a link to manage your appointment.'
          );
          setBookingId('');
          setEmail('');
          setLoading(false);
        }
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
        setLoading(false);
      }
    } catch {
      setError('Unable to connect. Please check your connection and try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Simple header with back link */}
      <header className="border-b border-gray-200/60 py-6 px-8">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to home</span>
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow flex items-center justify-center px-8 py-16">
        <div className="max-w-xl w-full">
          {/* Heading */}
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight">
              Manage your booking
            </h1>
            <p className="text-xl text-gray-500 leading-relaxed">
              Enter your Booking ID and email to access your appointment.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label
                htmlFor="bookingId"
                className="block text-sm font-semibold text-gray-900 mb-3"
              >
                Booking ID
              </label>
              <input
                id="bookingId"
                type="text"
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value.toUpperCase())}
                placeholder="RIVO-XXX-XXX-XXX"
                className="w-full px-5 py-4 text-lg border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:border-gray-400 transition-all"
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-gray-900 mb-3"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-5 py-4 text-lg border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:border-gray-400 transition-all"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-4 bg-gradient-to-r from-teal-600 to-green-600 text-white text-lg rounded-2xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? 'Verifying...' : 'Access my booking'}
            </button>
          </form>

          {/* Status messages */}
          {message && (
            <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-sm text-green-800 text-center">{message}</p>
            </div>
          )}
          {error && (
            <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-800 text-center">{error}</p>
            </div>
          )}

          {/* Help text */}
          <div className="mt-12 pt-8 border-t border-gray-200/60">
            <p className="text-sm text-gray-500 text-center">
              Your Booking ID was provided when you made your reservation. Check your confirmation email if you cannot find it.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
