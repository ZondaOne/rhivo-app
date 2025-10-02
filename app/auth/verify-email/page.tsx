"use client";

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'idle'|'pending'|'success'|'error'>('idle');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token');
      return;
    }

    async function verify() {
      setStatus('pending');
      try {
        const r = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Verification failed');
        setStatus('success');
        setMessage('Email verified. You can now sign in.');
      } catch (e: any) {
        setStatus('error');
        setMessage(e?.message || 'Verification failed');
      }
    }

    verify();
  }, [params]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-6 text-center">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Verify your email</h1>
        {status === 'pending' && <p className="text-gray-600">Verifying token…</p>}
        {status === 'success' && (
          <div className="text-green-700">
            {message}
            <div className="mt-4">
              <a href="/auth/login" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Go to Login</a>
            </div>
          </div>
        )}
        {status === 'error' && <p className="text-red-600">{message}</p>}
      </div>
    </div>
  );
}
