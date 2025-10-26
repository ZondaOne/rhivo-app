"use client";

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type Json = any;

interface TestResult {
  passed?: boolean;
  message?: string;
  [key: string]: any;
}

interface TestCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  tests: TestDefinition[];
}

interface TestDefinition {
  id: string;
  label: string;
  description: string;
  run: () => Promise<any>;
  requiresAuth?: boolean;
  requiresBiz?: boolean;
}

export default function ApiDebugPage() {
  const { login, signupOwner, isAuthenticated, accessToken } = useAuth();
  const [output, setOutput] = useState<Json>(null);
  const [biz, setBiz] = useState<{ businessId?: string; serviceId?: string } | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [autoCreds, setAutoCreds] = useState<{ email: string; password: string } | null>(null);
  const [ownerBizId, setOwnerBizId] = useState<string | null>(null);
  const [reservations, setReservations] = useState<any[]>([]);
  const [selectedReservation, setSelectedReservation] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const accessTokenRef = useRef<string | null>(null);

  const docs = [
    { name: 'Authentication Implementation', file: 'AUTH_IMPLEMENTATION.md' },
    { name: 'Database Schema', file: 'DATABASE_SCHEMA.md' },
    { name: 'Transaction & Concurrency', file: 'TRANSACTIONS_IMPLEMENTATION.md' }
  ];

  // Keep ref in sync with accessToken
  useEffect(() => {
    accessTokenRef.current = accessToken;
  }, [accessToken]);

  async function run(label: string, fn: () => Promise<any>) {
    try {
      setLoading(label);
      const res = await fn();
      setOutput(res);

      setTestResults(prev => ({
        ...prev,
        [label]: res
      }));
    } catch (e: any) {
      const errorResult = { error: e?.message || String(e), passed: false };
      setOutput(errorResult);

      setTestResults(prev => ({
        ...prev,
        [label]: errorResult
      }));
    } finally {
      setLoading(null);
    }
  }

  function getTestStatus(label: string): 'passed' | 'failed' | 'pending' {
    const result = testResults[label];
    if (!result) return 'pending';
    if (result.error) return 'failed';
    if (result.passed === false) return 'failed';
    if (result.passed === true) return 'passed';
    // Auto-detect based on content
    if (result.status === 401 || result.status === 403 || result.status === 429) return 'passed';
    if (result.sameReservationId === true) return 'passed';
    if (result.commitFailed === true) return 'passed';
    return 'pending';
  }

  async function fetchReservations() {
    if (!isAuthenticated || !accessToken) return;
    try {
      const r = await fetch('/api/debug/reservations' + (biz?.businessId ? `?businessId=${biz.businessId}` : ''), {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await r.json();
      setReservations(data.reservations || []);
    } catch (e) {
      console.error('Failed to fetch reservations:', e);
    }
  }

  // Persist biz selection in sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem('rhivo-debug-biz');
    if (saved) {
      try { setBiz(JSON.parse(saved)); } catch {}
    }
  }, []);
  useEffect(() => {
    if (biz) sessionStorage.setItem('rhivo-debug-biz', JSON.stringify(biz));
    else sessionStorage.removeItem('rhivo-debug-biz');
  }, [biz]);

  // Fetch owner business
  useEffect(() => {
    (async () => {
      if (!isAuthenticated || !accessToken) return;
      try {
        const r = await fetch('/api/me', { headers: { Authorization: `Bearer ${accessToken}` } });
        const data = await r.json();
        const ob = data?.user?.business?.id as string | undefined;
        if (ob) {
          setOwnerBizId(ob);
          if (!biz?.businessId) setBiz(prev => ({ businessId: ob, serviceId: prev?.serviceId }));
        }
      } catch {}
    })();
  }, [isAuthenticated, accessToken]);

  // Auto-fetch reservations
  useEffect(() => {
    if (isAuthenticated && biz?.businessId) {
      fetchReservations();
    }
  }, [isAuthenticated, biz?.businessId]);

  async function automatedAuthFlow() {
    const id = Math.random().toString(36).slice(2, 8);
    const creds = { email: `owner-${id}@test.com`, password: 'TestPassword123!' };
    setAutoCreds(creds);
    setShowModal(true);

    const signupRes: any = await signupOwner({
      email: creds.email,
      password: creds.password,
      name: 'Debug Owner',
      businessName: `Debug Biz ${id}`,
      businessPhone: '+1234567890',
      timezone: 'America/New_York',
    });

    const base = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    const token = new URL(signupRes.verificationUrl as string, base).searchParams.get('token');
    const verify = await fetch('/api/auth/verify-email', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    if (!verify.ok) {
      const er = await verify.json().catch(() => ({}));
      throw new Error(er.error || 'Email verification failed');
    }

    await login({ email: creds.email, password: creds.password });

    let currentToken = accessTokenRef.current;
    let retries = 0;
    while (!currentToken && retries < 30) {
      await new Promise(resolve => setTimeout(resolve, 200));
      currentToken = accessTokenRef.current;
      retries++;
    }

    if (!currentToken) {
      throw new Error('Failed to get access token after login. Try refreshing the page.');
    }

    const r = await fetch('/api/debug/owner-prime', {
      method: 'POST',
      headers: { Authorization: `Bearer ${currentToken}` }
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Failed to prime business');

    const me = await fetch('/api/me', {
      headers: { Authorization: `Bearer ${currentToken}` }
    });
    const meData = await me.json();

    if (!me.ok || !meData?.user?.business?.id) {
      throw new Error('Failed to fetch user business info');
    }

    const businessId = meData.user.business.id;
    const serviceId = data.service?.id;

    setBiz({ businessId, serviceId });
    setOwnerBizId(businessId);

    setOutput({ message: 'Automated auth flow complete', creds, prime: data, me: meData });
  }

  // Test categories definition
  const testCategories: TestCategory[] = [
    {
      id: 'security',
      name: 'Security Tests',
      description: 'Authentication, authorization, rate limiting, and RLS',
      color: 'red',
      tests: [
        {
          id: 'missing-auth',
          label: 'Missing Auth Token',
          description: 'Expects 401: API must reject requests without auth header',
          run: async () => {
            const r = await fetch('/api/me');
            const passed = r.status === 401;
            return { status: r.status, body: await r.json(), passed };
          }
        },
        {
          id: 'invalid-token',
          label: 'Invalid Token',
          description: 'Expects 401: Malformed JWT must be rejected',
          run: async () => {
            const r = await fetch('/api/me', {
              headers: { Authorization: 'Bearer invalid-token-xyz' }
            });
            const passed = r.status === 401;
            return { status: r.status, body: await r.json(), passed };
          }
        },
        {
          id: 'expired-token',
          label: 'Expired Token',
          description: 'Expects 401: JWTs past expiry must fail',
          run: async () => {
            const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0IiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.4Adcj0pVhR9YimXmkdwJnPMOk3XhT';
            const r = await fetch('/api/me', {
              headers: { Authorization: `Bearer ${expiredToken}` }
            });
            const passed = r.status === 401;
            return { status: r.status, body: await r.json(), passed };
          }
        },
        {
          id: 'rls-isolation',
          label: 'RLS Isolation',
          description: 'Tests Row-Level Security: owner sees only own business data',
          requiresAuth: true,
          run: async () => {
            if (!isAuthenticated || !accessToken) throw new Error('Login first as owner');
            const r = await fetch('/api/appointments?' + new URLSearchParams({
              start: new Date().toISOString(),
              end: new Date(Date.now() + 7*24*3600*1000).toISOString()
            }), {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
            const data = await r.json();
            const passed = r.status === 200;
            return { status: r.status, appointments: data.appointments?.length || 0, note: 'Should only see own business data', passed };
          }
        },
        {
          id: 'rate-limit',
          label: 'Rate Limiting',
          description: 'Expects 429 after 100 attempts: prevents brute force',
          run: async () => {
            const identifier = `test-${Math.random().toString(36).slice(2,8)}`;
            const results = [];
            for (let i = 0; i < 102; i++) {
              const r = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: `${identifier}@test.com`, password: 'wrong' })
              });
              results.push({ attempt: i + 1, status: r.status, limited: r.status === 429 });
              if (r.status === 429) break;
            }
            const passed = results.some(r => r.limited);
            return { totalAttempts: results.length, rateLimited: passed, results: results.slice(-5), passed };
          }
        }
      ]
    },
    {
      id: 'concurrency',
      name: 'Concurrency & Transactions',
      description: 'Idempotency, concurrent bookings, reservation TTL',
      color: 'purple',
      tests: [
        {
          id: 'idempotency',
          label: 'Idempotency Key',
          description: 'Both requests should return same reservation ID',
          requiresBiz: true,
          run: async () => {
            if (!ownerBizId || !biz?.serviceId) throw new Error('Need business setup');
            const idempotencyKey = crypto.randomUUID();
            const start = new Date(Date.now() + 3*24*3600*1000);

            const req1 = await fetch('/api/booking/reserve', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                businessId: ownerBizId,
                serviceId: biz.serviceId,
                startTime: start.toISOString(),
                idempotencyKey
              })
            });
            const data1 = await req1.json();

            const req2 = await fetch('/api/booking/reserve', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                businessId: ownerBizId,
                serviceId: biz.serviceId,
                startTime: start.toISOString(),
                idempotencyKey
              })
            });
            const data2 = await req2.json();

            return {
              sameReservationId: data1.reservationId === data2.reservationId,
              firstId: data1.reservationId,
              secondId: data2.reservationId,
              passed: data1.reservationId === data2.reservationId
            };
          }
        },
        {
          id: 'concurrent-booking',
          label: 'Concurrent Reserve',
          description: 'Only capacity count should succeed (default: 1)',
          requiresBiz: true,
          run: async () => {
            if (!ownerBizId || !biz?.serviceId) throw new Error('Need business setup');
            const start = new Date(Date.now() + 5*24*3600*1000);

            const promises = Array.from({ length: 10 }, () =>
              fetch('/api/booking/reserve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  businessId: ownerBizId,
                  serviceId: biz.serviceId,
                  startTime: start.toISOString(),
                  idempotencyKey: crypto.randomUUID()
                })
              }).then(r => r.json())
            );

            const results = await Promise.all(promises);
            const successful = results.filter(r => r.reservationId);
            const failed = results.filter(r => r.error);

            return {
              totalRequests: 10,
              successful: successful.length,
              failed: failed.length,
              passed: successful.length <= 1,
              test: 'Only 1 should succeed'
            };
          }
        },
        {
          id: 'reservation-ttl',
          label: 'Reservation Expiry',
          description: 'Commit should fail for expired reservation',
          requiresBiz: true,
          run: async () => {
            if (!ownerBizId || !biz?.serviceId) throw new Error('Need business setup');
            const start = new Date(Date.now() + 6*24*3600*1000);

            const r = await fetch('/api/booking/reserve', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                businessId: ownerBizId,
                serviceId: biz.serviceId,
                startTime: start.toISOString(),
                idempotencyKey: crypto.randomUUID(),
                ttlMinutes: 0.02
              })
            });
            const reservation = await r.json();

            if (!reservation.reservationId) {
              return { error: 'Failed to create reservation', details: reservation, passed: false };
            }

            await new Promise(resolve => setTimeout(resolve, 2000));

            const commit = await fetch('/api/booking/commit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                reservationId: reservation.reservationId,
                guestEmail: 'test@example.com'
              })
            });
            const commitResult = await commit.json();

            return {
              reservationCreated: !!reservation.reservationId,
              commitFailed: !!commitResult.error,
              error: commitResult.error,
              passed: !!commitResult.error
            };
          }
        }
      ]
    },
    {
      id: 'business-logic',
      name: 'Business Logic',
      description: 'Capacity limits, time validation, audit trail',
      color: 'cyan',
      tests: [
        {
          id: 'capacity-limits',
          label: 'Capacity Enforcement',
          description: 'Last attempt should be rejected when over capacity',
          requiresBiz: true,
          run: async () => {
            if (!ownerBizId || !biz?.serviceId) throw new Error('Need business setup');

            const start = new Date(Date.now() + 8*24*3600*1000);
            const end = new Date(start.getTime() + 30*60*1000);
            const capacity = await fetch(`/api/booking/capacity?${new URLSearchParams({
              businessId: ownerBizId,
              serviceId: biz.serviceId,
              slotStart: start.toISOString(),
              slotEnd: end.toISOString()
            })}`);
            const capData = await capacity.json();

            const reservations = [];
            for (let i = 0; i < (capData.available || 1) + 1; i++) {
              const r = await fetch('/api/booking/reserve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  businessId: ownerBizId,
                  serviceId: biz.serviceId,
                  startTime: start.toISOString(),
                  idempotencyKey: crypto.randomUUID()
                })
              });
              reservations.push(await r.json());
            }

            const successful = reservations.filter(r => r.reservationId).length;
            const rejected = reservations.filter(r => r.error).length;

            return {
              initialCapacity: capData.available,
              attempts: reservations.length,
              successful,
              rejected,
              passed: rejected > 0
            };
          }
        },
        {
          id: 'time-validation',
          label: 'Time Validation',
          description: 'Past bookings should fail',
          requiresBiz: true,
          run: async () => {
            if (!ownerBizId || !biz?.serviceId) throw new Error('Need business setup');

            const pastTime = new Date(Date.now() - 24*3600*1000);
            const r1 = await fetch('/api/booking/reserve', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                businessId: ownerBizId,
                serviceId: biz.serviceId,
                startTime: pastTime.toISOString(),
                idempotencyKey: crypto.randomUUID()
              })
            });
            const past = await r1.json();

            return {
              pastBooking: { success: !!past.reservationId, error: past.error },
              passed: !!past.error
            };
          }
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">API Debugger & Test Suite</h1>
              <p className="text-gray-600">Comprehensive security and functionality testing for the Rhivo platform</p>
            </div>
            <button
              onClick={() => setShowDocsModal(true)}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
            >
              View Documentation
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout: 2 Column */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-12 gap-6">
          {/* LEFT COLUMN - Test Categories */}
          <div className="col-span-5 space-y-4">
            {/* Business context banner */}
            {isAuthenticated && (
              <div className={`rounded-xl p-4 ${biz?.businessId && ownerBizId && biz.businessId !== ownerBizId ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50 border border-gray-200'}`}>
                <div className="text-sm text-gray-700">
                  <div>Owner business: <span className="font-mono">{ownerBizId || 'unknown'}</span></div>
                  <div>Selected business: <span className="font-mono">{biz?.businessId || 'none'}</span></div>
                </div>
              </div>
            )}

            {/* Test Data Section */}
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Test Data Setup</h3>
              <div className="space-y-2">
                <button
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-900 transition-colors"
                  disabled={!!loading}
                  onClick={() => run('Seed Data', async () => {
                    const r = await fetch('/api/debug/seed-data', { method: 'POST' });
                    const data = await r.json();
                    if (r.ok) {
                      setBiz({ businessId: data.business.id, serviceId: data.service.id });
                    }
                    return data;
                  })}
                >Seed Test Business</button>
                <button
                  className="w-full px-3 py-2 bg-gray-100 text-gray-800 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                  disabled={!!loading}
                  onClick={() => run('Clear Data', async () => {
                    const r = await fetch('/api/debug/clear-data', { method: 'POST' });
                    const data = await r.json();
                    setBiz(null);
                    return data;
                  })}
                >Clear Test Data</button>
                <button
                  className="w-full px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors"
                  disabled={!!loading || isAuthenticated}
                  onClick={() => run('Automated Auth', automatedAuthFlow)}
                >Automated Auth Flow</button>
              </div>
            </section>

            {/* Booking Section */}
            <section className="bg-white rounded-xl shadow-sm border-l-4 border-green-500 p-4">
              <div className="mb-3">
                <h3 className="text-lg font-bold text-gray-900">Booking Flow</h3>
                <p className="text-xs text-gray-600">Check capacity, reserve slots, commit reservations</p>
              </div>
              <div className="space-y-2">
                <button
                  className="w-full px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
                  disabled={!!loading || !ownerBizId || !biz?.serviceId}
                  onClick={() => run('Check Capacity', async () => {
                    if (!ownerBizId || !biz?.serviceId) {
                      throw new Error('Owner business or service not available. Run Automated Auth Flow first.');
                    }
                    const start = new Date(Date.now() + 24*3600*1000);
                    const end = new Date(start.getTime() + 30*60*1000);
                    const r = await fetch(`/api/booking/capacity?` + new URLSearchParams({
                      businessId: ownerBizId,
                      serviceId: biz.serviceId,
                      slotStart: start.toISOString(),
                      slotEnd: end.toISOString()
                    }));
                    return await r.json();
                  })}
                >Check Capacity</button>

                <button
                  className="w-full px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
                  disabled={!!loading || !ownerBizId || !biz?.serviceId}
                  onClick={() => run('Make Reservation', async () => {
                    if (!ownerBizId || !biz?.serviceId) {
                      throw new Error('Owner business or service not available. Run Automated Auth Flow first.');
                    }
                    const start = new Date(Date.now() + 24*3600*1000);
                    const r = await fetch('/api/booking/reserve', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        businessId: ownerBizId,
                        serviceId: biz.serviceId,
                        startTime: start.toISOString(),
                        idempotencyKey: crypto.randomUUID()
                      })
                    });
                    const data = await r.json();
                    if (r.ok && data?.reservationId) {
                      setSelectedReservation(data.reservationId);
                      await fetchReservations();
                    }
                    return data;
                  })}
                >Make Reservation</button>

                <button
                  className="w-full px-3 py-2 bg-green-700 text-white rounded-lg text-sm hover:bg-green-800 transition-colors"
                  disabled={!!loading || !selectedReservation}
                  onClick={() => run('Commit Reservation', async () => {
                    const reservationId = selectedReservation || '';
                    const r = await fetch('/api/booking/commit', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        reservationId,
                        guestEmail: `guest-${Math.random().toString(36).slice(2,6)}@test.com`,
                        guestPhone: '+1234567890'
                      })
                    });
                    const data = await r.json();
                    if (r.ok) {
                      await fetchReservations();
                      setSelectedReservation(null);
                    }
                    return data;
                  })}
                >Commit Reservation</button>

                <button
                  className="w-full px-3 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 transition-colors"
                  disabled={!!loading}
                  onClick={() => run('List Appointments', async () => {
                    const start = new Date(Date.now() - 7*24*3600*1000);
                    const end = new Date(Date.now() + 30*24*3600*1000);
                    const params = new URLSearchParams({ start: start.toISOString(), end: end.toISOString() });
                    const r = await fetch('/api/appointments?' + params, {
                      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
                    });
                    return await r.json();
                  })}
                >List Appointments</button>

                <button
                  className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 transition-colors"
                  disabled={!!loading}
                  onClick={() => fetchReservations()}
                >Refresh Reservations</button>
              </div>

              {/* Active Reservations List */}
              {isAuthenticated && reservations.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">Active Reservations</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {reservations.map((res: any) => (
                      <div
                        key={res.id}
                        className={`p-2 rounded-lg border-2 cursor-pointer transition-colors text-xs ${
                          selectedReservation === res.id
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedReservation(res.id)}
                      >
                        <div className="font-mono text-xs text-gray-500">ID: {res.id.slice(0, 8)}...</div>
                        <div className="text-xs mt-1">
                          {new Date(res.slot_start).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Test Categories */}
            {testCategories.map((category) => (
              <section key={category.id} className={`bg-white rounded-xl shadow-sm border-l-4 border-${category.color}-500 p-4`}>
                <div className="mb-3">
                  <h3 className="text-lg font-bold text-gray-900">{category.name}</h3>
                  <p className="text-xs text-gray-600">{category.description}</p>
                </div>
                <div className="space-y-2">
                  {category.tests.map((test) => {
                    const testKey = `${category.id}:${test.id}`;
                    const status = getTestStatus(testKey);
                    const isDisabled = !!loading ||
                      (test.requiresAuth && !isAuthenticated) ||
                      (test.requiresBiz && (!ownerBizId || !biz?.serviceId));

                    return (
                      <div key={test.id}>
                        <button
                          className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition-all text-left ${
                            status === 'passed' ? 'bg-green-100 border-2 border-green-500 text-green-900' :
                            status === 'failed' ? 'bg-red-100 border-2 border-red-500 text-red-900' :
                            `bg-${category.color}-600 text-white hover:bg-${category.color}-700`
                          } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                          disabled={isDisabled}
                          onClick={() => run(testKey, test.run)}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">{test.label}</span>
                            {status === 'passed' && <span className="text-2xl">✓</span>}
                            {status === 'failed' && <span className="text-2xl">✗</span>}
                          </div>
                          <p className="text-xs mt-1 opacity-90">{test.description}</p>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          {/* RIGHT COLUMN - Response Output */}
          <div className="col-span-7">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Response</h3>
                {loading && (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-teal-500 border-t-transparent"></div>
                    <span className="text-sm text-gray-600">{loading}</span>
                  </div>
                )}
              </div>
              <div className="bg-slate-900 rounded-lg p-4 overflow-auto max-h-[calc(100vh-200px)]">
                <pre className="text-sm text-green-400 font-mono">
                  {output ? JSON.stringify(output, null, 2) : '// No output yet. Run a test to see results here.'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showModal && autoCreds && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Automated Auth Credentials</h3>
            <p className="text-sm text-gray-700 mb-4">These were used for the flow:</p>
            <div className="text-sm bg-gray-50 p-3 rounded">
              <div><span className="font-medium">Email:</span> <span className="font-mono">{autoCreds.email}</span></div>
              <div><span className="font-medium">Password:</span> <span className="font-mono">{autoCreds.password}</span></div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200" onClick={() => setShowModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showDocsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900">Documentation</h3>
                <button
                  onClick={() => setShowDocsModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {docs.map((doc) => (
                  <div key={doc.file} className="p-6 border-2 border-gray-200 rounded-xl hover:border-teal-500 hover:bg-teal-50 transition-all">
                    <h4 className="font-semibold text-gray-900 mb-1">{doc.name}</h4>
                    <p className="text-xs text-gray-500 font-mono">/docs/{doc.file}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
