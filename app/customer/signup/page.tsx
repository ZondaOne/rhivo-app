"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CustomerSignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    // Validation: at least email or phone required
    if (!email && !phone) {
      setError('Please provide at least an email or phone number');
      setPending(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/signup/customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email || undefined,
          phone: phone || undefined,
          password,
          name: name || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      // Auto-login after successful signup
      // Call login API
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: email || phone, // Use email if provided, else phone
          password,
        }),
      });

      const loginData = await loginResponse.json();

      if (loginResponse.ok && loginData.accessToken) {
        localStorage.setItem('accessToken', loginData.accessToken);
        router.push('/customer/dashboard');
      } else {
        // If auto-login fails, redirect to login page
        alert('Account created successfully! Please log in.');
        router.push('/customer/login');
      }
    } catch (err: any) {
      setError(err?.message || 'Signup failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-green-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">Create Account</h1>
        <p className="text-gray-600 mb-8">Sign up to track your bookings</p>

        <form onSubmit={onSubmit} className="space-y-5">
          {/* Email (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <input
              type="email"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>

          {/* Phone (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <input
              type="tel"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+1234567890"
            />
          </div>

          <p className="text-xs text-gray-500 -mt-2">
            Provide at least email or phone (or both)
          </p>

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
              minLength={8}
              placeholder="Min 8 characters"
            />
          </div>

          {/* Name (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <input
              type="text"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
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
            {pending ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/customer/login" className="text-teal-700 font-medium hover:underline">
            Sign in
          </Link>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 text-center text-sm text-gray-500">
          Are you a business owner?{' '}
          <Link href="/auth/signup" className="text-gray-700 hover:underline">
            Sign up here
          </Link>
        </div>
      </div>
    </div>
  );
}
