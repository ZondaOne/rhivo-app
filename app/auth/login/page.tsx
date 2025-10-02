"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await login({ email, password });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Sign in</h1>
        <p className="text-gray-600 mb-6">Use your owner account credentials</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              required
            />
          </div>

          {error && (
            <div className="text-sm text-red-600">{error}</div>
          )}

          <button
            type="submit"
            disabled={pending || isLoading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 text-sm text-gray-600">
          Don’t have an account?{' '}
          <a className="text-teal-700 underline" href="/auth/signup">Create owner account</a>
        </div>
      </div>
    </div>
  );
}
