"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function SignupPage() {
  const { signupOwner } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setPending(true);
    try {
      const res = await signupOwner({ email, password, name, businessName, businessPhone, timezone });
      setResult(res);
    } catch (err: any) {
      setError(err?.message || 'Signup failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow p-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Create owner account</h1>
        <p className="text-gray-600 mb-6">Sign up your business and owner user</p>

        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Owner name</label>
            <input className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" value={name} onChange={e=>setName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input type="email" className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" value={email} onChange={e=>setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input type="password" className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" value={password} onChange={e=>setPassword(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Business name</label>
            <input className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" value={businessName} onChange={e=>setBusinessName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Business phone</label>
            <input className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" value={businessPhone} onChange={e=>setBusinessPhone(e.target.value)} placeholder="+1…" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Timezone</label>
            <input className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" value={timezone} onChange={e=>setTimezone(e.target.value)} />
          </div>

          {error && <div className="md:col-span-2 text-sm text-red-600">{error}</div>}

          <div className="md:col-span-2">
            <button type="submit" disabled={pending} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-60">
              {pending ? 'Creating…' : 'Create account'}
            </button>
          </div>
        </form>

        {result && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm">
            <div className="font-medium text-gray-800 mb-2">Account created</div>
            <div className="text-gray-700 mb-2">For development, a verification URL is returned below. Open it to verify, then sign in:</div>
            <div className="break-all text-teal-700">{result.verificationUrl}</div>
            <div className="mt-3 text-gray-700">After verifying, go to <a href="/auth/login" className="text-teal-700 underline">Login</a>.</div>
          </div>
        )}
      </div>
    </div>
  );
}
