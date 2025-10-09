"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CustomerLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState(''); // email or phone
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Important for cookies
        body: JSON.stringify({
          email: identifier, // API will detect if it's email or phone
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Check if user is actually a customer
      if (data.user.role !== 'customer') {
        setError('This login is for customers only. Business owners should use the owner login.');
        setPending(false);
        return;
      }

      // Store access token in localStorage
      if (data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken);
      }

      // Success - redirect to customer dashboard
      router.push('/customer/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-green-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">Welcome Back</h1>
        <p className="text-gray-600 mb-8">Sign in to view your bookings</p>

        <form onSubmit={onSubmit} className="space-y-5">
          {/* Email or Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email or Phone
            </label>
            <input
              type="text"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              required
              placeholder="your@email.com or +1234567890"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full px-4 py-3 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-lg font-medium hover:from-teal-700 hover:to-green-700 disabled:opacity-60 transition shadow-sm"
          >
            {pending ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/auth/forgot-password" className="text-sm text-teal-700 hover:underline">
            Forgot password?
          </Link>
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link href="/customer/signup" className="text-teal-700 font-medium hover:underline">
            Sign up
          </Link>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 text-center text-sm text-gray-500">
          Are you a business owner?{' '}
          <Link href="/auth/login" className="text-gray-700 hover:underline">
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
}
