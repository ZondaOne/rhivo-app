"use client";

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type Json = any;

export default function ApiDebugPage() {
  const { login, logout, signupOwner, refreshAuth, user, isAuthenticated, accessToken } = useAuth();
  const [output, setOutput] = useState<Json>(null);
  const [biz, setBiz] = useState<{ businessId?: string; serviceId?: string } | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [autoCreds, setAutoCreds] = useState<{ email: string; password: string } | null>(null);
  const [ownerBizId, setOwnerBizId] = useState<string | null>(null);
  const [lastReservationId, setLastReservationId] = useState<string | null>(null);
  const [reservations, setReservations] = useState<any[]>([]);
  const [selectedReservation, setSelectedReservation] = useState<string | null>(null);
  const accessTokenRef = useRef<string | null>(null);

  // Keep ref in sync with accessToken
  useEffect(() => {
    accessTokenRef.current = accessToken;
  }, [accessToken]);

  async function run(label: string, fn: () => Promise<any>) {
    try {
      setLoading(label);
      const res = await fn();
      setOutput(res);
    } catch (e: any) {
      setOutput({ error: e?.message || String(e) });
    } finally {
      setLoading(null);
    }
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

  // Persist biz selection in sessionStorage so session is maintained across the debug page and dashboard
  useEffect(() => {
    const saved = sessionStorage.getItem('rivo-debug-biz');
    if (saved) {
      try { setBiz(JSON.parse(saved)); } catch {}
    }
  }, []);
  useEffect(() => {
    if (biz) sessionStorage.setItem('rivo-debug-biz', JSON.stringify(biz));
    else sessionStorage.removeItem('rivo-debug-biz');
  }, [biz]);

  // If authenticated, fetch owner business; if no selected business, default to owner's business
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

  // Auto-fetch reservations when authenticated or biz changes
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

    // 1) Signup
    const signupRes: any = await signupOwner({
      email: creds.email,
      password: creds.password,
      name: 'Debug Owner',
      businessName: `Debug Biz ${id}`,
      businessPhone: '+1234567890',
      timezone: 'America/New_York',
    });

    // 2) Verify
  // Accept absolute or relative verification URLs
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

    // 3) Login
    await login({ email: creds.email, password: creds.password });

    // 4) Wait for auth state to update and poll for token
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

    // 5) Prime owner business
    const r = await fetch('/api/debug/owner-prime', {
      method: 'POST',
      headers: { Authorization: `Bearer ${currentToken}` }
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Failed to prime business');

    // 6) Fetch business id from /api/me
    const me = await fetch('/api/me', {
      headers: { Authorization: `Bearer ${currentToken}` }
    });
    const meData = await me.json();

    if (!me.ok || !meData?.user?.business?.id) {
      throw new Error('Failed to fetch user business info');
    }

    // 7) Set business and service IDs
    const businessId = meData.user.business.id;
    const serviceId = data.service?.id;

    // Set both biz and ownerBizId explicitly
    setBiz({ businessId, serviceId });
    setOwnerBizId(businessId);

    setOutput({ message: 'Automated auth flow complete', creds, prime: data, me: meData });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-green-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow p-6">
          <h1 className="text-2xl font-semibold text-gray-900">API Debugger</h1>
          <p className="text-gray-600">Quickly test core endpoints with live feedback.</p>
        </div>

        {/* Business context banner */}
        {isAuthenticated && (
          <div className={`rounded-xl p-4 ${biz?.businessId && ownerBizId && biz.businessId !== ownerBizId ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50 border border-gray-200'} `}>
            <div className="text-sm text-gray-700">
              <div>Owner business: <span className="font-mono">{ownerBizId || 'unknown'}</span></div>
              <div>Selected business: <span className="font-mono">{biz?.businessId || 'none selected'}</span></div>
              {biz?.businessId && ownerBizId && biz.businessId !== ownerBizId && (
                <div className="mt-1 text-yellow-700">Warning: Bookings made for another business won’t appear in your Appointments list.</div>
              )}
            </div>
          </div>
        )}

        {/* Test Data */}
        <section className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Test Data</h2>
            <div className="text-sm text-gray-600">
              {biz?.businessId ? (
                <span>
                  Business: <span className="font-mono">{biz.businessId}</span>
                  {biz.serviceId && <>
                    <span className="mx-2">•</span>
                    Service: <span className="font-mono">{biz.serviceId}</span>
                  </>}
                </span>
              ) : (
                <span>No test data seeded</span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="px-3 py-2 bg-gray-800 text-white rounded-lg text-sm"
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
              className="px-3 py-2 bg-gray-100 text-gray-800 rounded-lg text-sm"
              disabled={!!loading}
              onClick={() => run('Clear Data', async () => {
                const r = await fetch('/api/debug/clear-data', { method: 'POST' });
                const data = await r.json();
                setBiz(null);
                return data;
              })}
            >Clear Test Data</button>
          </div>
        </section>

        {/* Auth */}
        <section className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Authentication</h2>
            <div className="text-sm text-gray-600">
              {isAuthenticated ? (
                <span>Signed in as {user?.email} ({user?.role})</span>
              ) : (
                <span>Not signed in</span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isAuthenticated && (
              <button
                className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm"
                disabled={!!loading}
                onClick={() => run('Automated Auth', automatedAuthFlow)}
              >Automated Auth Flow</button>
            )}
            <button
              className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm"
              disabled={!!loading}
              onClick={() => run('Owner Signup', async () => {
                const id = Math.random().toString(36).slice(2, 8);
                return await signupOwner({
                  email: `test-${id}@test.com`,
                  password: 'TestPassword123!',
                  name: 'Debug Owner',
                  businessName: `Test Biz ${id}`,
                  businessPhone: '+1234567890',
                  timezone: 'America/New_York',
                });
              })}
            >Owner Signup</button>

            <button
              className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm"
              disabled={!!loading}
              onClick={() => run('Login', async () => {
                // Use the last signup email if available from output; else prompt
                const email = (output?.user?.email as string) || prompt('Email to login?') || '';
                const password = 'TestPassword123!';
                await login({ email, password });
                return { message: 'Logged in', email };
              })}
            >Login</button>

            <button
              className="px-3 py-2 bg-gray-700 text-white rounded-lg text-sm"
              disabled={!!loading}
              onClick={() => run('Refresh', async () => {
                await refreshAuth();
                return { message: 'Token refreshed' };
              })}
            >Refresh</button>

            {isAuthenticated && (
              <button
                className="px-3 py-2 bg-gray-100 text-gray-800 rounded-lg text-sm"
                disabled={!!loading}
                onClick={() => run('Logout', async () => {
                  await logout();
                  return { message: 'Logged out' };
                })}
              >Logout</button>
            )}
          </div>
        </section>

        {/* Booking */}
        <section className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Booking</h2>
          {(!ownerBizId || !biz?.serviceId) && isAuthenticated && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              <div className="font-semibold mb-1">Booking buttons disabled:</div>
              <div>• Owner Business ID: {ownerBizId ? '✓' : '✗ Missing'}</div>
              <div>• Service ID: {biz?.serviceId ? '✓' : '✗ Missing'}</div>
              <div className="mt-2">→ Run "Automated Auth Flow" to set up test data</div>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm"
              disabled={!!loading || !ownerBizId || !biz?.serviceId}
              onClick={() => run('Capacity', async () => {
                if (!ownerBizId || !biz?.serviceId) {
                  throw new Error('Owner business or service not available. Run Automated Auth Flow first.');
                }
                const start = new Date(Date.now() + 24*3600*1000);
                const end = new Date(start.getTime() + 30*60*1000);
                const r = await fetch(`/api/booking/capacity?` + new URLSearchParams({
                  businessId: ownerBizId, // Use owner's business ID
                  serviceId: biz.serviceId,
                  slotStart: start.toISOString(),
                  slotEnd: end.toISOString()
                }));
                return await r.json();
              })}
            >Check Capacity</button>

            <button
              className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm"
              disabled={!!loading || !ownerBizId || !biz?.serviceId}
              onClick={() => run('Reserve', async () => {
                if (!ownerBizId || !biz?.serviceId) {
                  throw new Error('Owner business or service not available. Run Automated Auth Flow first.');
                }
                const start = new Date(Date.now() + 24*3600*1000);
                const r = await fetch('/api/booking/reserve', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    businessId: ownerBizId, // Use owner's business ID
                    serviceId: biz.serviceId,
                    startTime: start.toISOString(),
                    idempotencyKey: crypto.randomUUID()
                  })
                });
                const data = await r.json();
                if (r.ok && data?.reservationId) {
                  setLastReservationId(data.reservationId);
                  setSelectedReservation(data.reservationId);
                  await fetchReservations();
                }
                return data;
              })}
            >Reserve Slot</button>

            <button
              className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm"
              disabled={!!loading || !selectedReservation}
              onClick={() => run('Commit', async () => {
                const reservationId = selectedReservation || '';
                const r = await fetch('/api/booking/commit', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    reservationId,
                    guestEmail: `debug-${Math.random().toString(36).slice(2,6)}@test.com`,
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
            >Commit Selected Reservation</button>

            <button
              className="px-3 py-2 bg-gray-600 text-white rounded-lg text-sm"
              disabled={!!loading}
              onClick={() => fetchReservations()}
            >Refresh Reservations</button>
          </div>

          {/* Active Reservations List */}
          {isAuthenticated && reservations.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Active Reservations</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {reservations.map((res: any) => (
                  <div
                    key={res.id}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedReservation === res.id
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedReservation(res.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="text-sm">
                        <div className="font-mono text-xs text-gray-500">ID: {res.id.slice(0, 8)}...</div>
                        <div className="mt-1">
                          <span className="font-medium">Start:</span> {new Date(res.slot_start).toLocaleString()}
                        </div>
                        <div>
                          <span className="font-medium">End:</span> {new Date(res.slot_end).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-xs text-right">
                        <div className="text-gray-500">Expires:</div>
                        <div className={new Date(res.expires_at) < new Date(Date.now() + 5*60*1000) ? 'text-red-600 font-medium' : 'text-gray-700'}>
                          {new Date(res.expires_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Click a reservation to select it, then click "Commit Selected Reservation"
              </div>
            </div>
          )}
        </section>

        {/* Appointments */}
        <section className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Appointments</h2>
          <div className="flex flex-wrap gap-2">
            <button
              className="px-3 py-2 bg-teal-600 text-white rounded-lg text-sm"
              disabled={!!loading}
              onClick={() => run('List Appointments', async () => {
                const start = new Date(Date.now() - 7*24*3600*1000); // Start from 7 days ago
                const end = new Date(Date.now() + 30*24*3600*1000);
                const params = new URLSearchParams({ start: start.toISOString(), end: end.toISOString() });
                const r = await fetch('/api/appointments?' + params, {
                  headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
                });
                return await r.json();
              })}
            >List Appointments</button>

            <button
              className="px-3 py-2 bg-teal-600 text-white rounded-lg text-sm"
              disabled={!!loading}
              onClick={() => run('Create Manual', async () => {
                const service_id = biz?.serviceId || prompt('service_id?') || '';
                const start = new Date(Date.now() + 24*3600*1000);
                const r = await fetch('/api/appointments/manual', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
                  },
                  body: JSON.stringify({
                    service_id,
                    customer_name: 'Debug Customer',
                    customer_email: `debug-${Math.random().toString(36).slice(2,6)}@test.com`,
                    start_time: start.toISOString(),
                    duration: 30,
                    status: 'confirmed'
                  })
                });
                const data = await r.json();
                if (r.ok && data?.reservationId) setLastReservationId(data.reservationId);
                return data;
              })}
            >Create Manual</button>

            {lastReservationId && (
              <button
                className="px-3 py-2 bg-green-700 text-white rounded-lg text-sm"
                disabled={!!loading}
                onClick={() => run('Commit Last Reservation', async () => {
                  const r = await fetch('/api/booking/commit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reservationId: lastReservationId, guestEmail: `debug-${Math.random().toString(36).slice(2,6)}@test.com` })
                  });
                  return await r.json();
                })}
              >Commit Last Reservation</button>
            )}

            {isAuthenticated && (
              <>
                <button
                  className="px-3 py-2 bg-gray-700 text-white rounded-lg text-sm"
                  disabled={!!loading}
                  onClick={() => run('List Active Reservations', async () => {
                    const r = await fetch('/api/debug/reservations' + (biz?.businessId ? `?businessId=${biz.businessId}` : ''), {
                      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
                    });
                    return await r.json();
                  })}
                >List Active Reservations</button>
                <button
                  className="px-3 py-2 bg-purple-700 text-white rounded-lg text-sm"
                  disabled={!!loading}
                  onClick={() => run('Debug All Appointments', async () => {
                    const r = await fetch('/api/debug/all-appointments', {
                      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
                    });
                    return await r.json();
                  })}
                >Debug All Appointments</button>
              </>
            )}
            <button
              className="px-3 py-2 bg-teal-600 text-white rounded-lg text-sm"
              disabled={!!loading}
              onClick={() => run('Add Appointment', async () => {
                if (!biz?.serviceId) throw new Error('Service ID not available. Seed or run Automated Auth first.');
                const start = new Date(Date.now() + 2*24*3600*1000);
                const r = await fetch('/api/appointments/manual', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
                  },
                  body: JSON.stringify({
                    service_id: biz.serviceId,
                    customer_name: 'Flow Test',
                    customer_email: `flow-${Math.random().toString(36).slice(2,6)}@test.com`,
                    start_time: start.toISOString(),
                    duration: 30,
                    status: 'confirmed'
                  })
                });
                return await r.json();
              })}
            >Add Appointment</button>
          </div>
        </section>

        {/* Notifications & Audit */}
        <section className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Notifications & Audit</h2>
          <div className="flex flex-wrap gap-2">
            <button
              className="px-3 py-2 bg-fuchsia-600 text-white rounded-lg text-sm"
              disabled={!!loading}
              onClick={() => run('List Notifications', async () => {
                const r = await fetch('/api/notifications', { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined });
                return await r.json();
              })}
            >List Notifications</button>

            <button
              className="px-3 py-2 bg-fuchsia-600 text-white rounded-lg text-sm"
              disabled={!!loading}
              onClick={() => run('Send Notification', async () => {
                const appointmentId = prompt('appointmentId? (from created appointment)') || '';
                const type = (prompt('type? email|sms') || 'email').toLowerCase();
                const template = (prompt('template? confirmation|reminder|cancellation|reschedule') || 'confirmation').toLowerCase();
                const r = await fetch('/api/notifications/send', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
                  },
                  body: JSON.stringify({ appointmentId, type, template })
                });
                return await r.json();
              })}
            >Send Notification</button>

            <button
              className="px-3 py-2 bg-slate-700 text-white rounded-lg text-sm"
              disabled={!!loading}
              onClick={() => run('Audit Logs', async () => {
                const businessId = biz?.businessId || undefined;
                const q = new URLSearchParams();
                if (businessId) q.set('businessId', businessId);
                const r = await fetch('/api/audit-logs' + (q.toString() ? `?${q.toString()}` : ''), { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined });
                return await r.json();
              })}
            >List Audit Logs</button>
          </div>
        </section>

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
                <button className="px-3 py-2 bg-gray-100 rounded-lg" onClick={() => setShowModal(false)}>Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Output */}
        <section className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900">Response</h2>
            {loading && <span className="text-sm text-gray-500">Running: {loading}…</span>}
          </div>
          <pre className="text-sm bg-gray-50 p-4 rounded-lg overflow-auto max-h-[360px]">
            {output ? JSON.stringify(output, null, 2) : 'No output yet'}
          </pre>
        </section>
      </div>
    </div>
  );
}
