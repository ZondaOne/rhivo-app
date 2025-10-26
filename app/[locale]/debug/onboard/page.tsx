'use client';

import { useState, useEffect } from 'react';

interface OnboardingResponse {
  success: boolean;
  businessId?: string;
  subdomain?: string;
  temporaryPassword?: string;
  verificationUrl?: string;
  bookingPageUrl?: string;
  isExistingOwner?: boolean;
  businessCount?: number;
  errors?: string[];
  warnings?: string[];
}

interface Business {
  subdomain: string;
  name: string;
  id: string;
}

export default function OnboardDebugPage() {
  const [yamlFiles, setYamlFiles] = useState<string[]>([]);
  const [selectedYaml, setSelectedYaml] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('test@test.com');
  const [ownerName, setOwnerName] = useState('Test Owner');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<OnboardingResponse | null>(null);
  
  // Delete business state
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteResponse, setDeleteResponse] = useState<{success: boolean; message?: string; error?: string} | null>(null);

  // Load available YAML files
  useEffect(() => {
    fetch('/api/debug/list-yamls')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.files) {
          setYamlFiles(data.files);
          if (data.files.length > 0) {
            setSelectedYaml(data.files[0]);
          }
        }
      })
      .catch(err => console.error('Failed to load YAML files:', err));
      
    // Load existing businesses
    loadBusinesses();
  }, []);

  const loadBusinesses = async () => {
    try {
      const res = await fetch('/api/debug/check-db?table=businesses');
      const data = await res.json();
      if (data.success && data.data) {
        setBusinesses(data.data);
        if (data.data.length > 0) {
          setSelectedBusiness(data.data[0].subdomain);
        }
      }
    } catch (err) {
      console.error('Failed to load businesses:', err);
    }
  };

  const handleDelete = async () => {
    if (!selectedBusiness) {
      alert('Please select a business to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete business "${selectedBusiness}"? This will remove ALL data including users, services, appointments, etc. This action CANNOT be undone.`)) {
      return;
    }

    setDeleting(true);
    setDeleteResponse(null);

    try {
      const res = await fetch('/api/debug/clear-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain: selectedBusiness }),
      });

      const data = await res.json();
      setDeleteResponse(data);
      
      if (data.success) {
        // Reload businesses list
        await loadBusinesses();
      }
    } catch (err) {
      setDeleteResponse({
        success: false,
        error: 'Failed to connect to delete API: ' + (err instanceof Error ? err.message : 'Unknown error'),
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleOnboard = async () => {
    if (!selectedYaml || !ownerEmail) {
      alert('Please select a YAML file and enter an owner email');
      return;
    }

    setLoading(true);
    setResponse(null);

    try {
      const res = await fetch('/api/admin/onboard-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          yamlFilePath: selectedYaml,
          ownerEmail,
          ownerName: ownerName || undefined,
          sendWelcomeEmail: false,
        }),
      });

      const data = await res.json();
      setResponse(data);
    } catch (err) {
      setResponse({
        success: false,
        errors: ['Failed to connect to onboarding API: ' + (err instanceof Error ? err.message : 'Unknown error')],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Business Onboarding</h1>
          <p className="text-gray-600">Debug tool to onboard businesses from YAML configuration files</p>
        </div>

        {/* Delete Business Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-red-200 p-8 mb-6">
          <h2 className="text-2xl font-semibold text-red-900 mb-2">Delete Business</h2>
          <p className="text-gray-600 mb-6">Remove a business and all associated data (users, services, appointments, etc.)</p>

          <div className="space-y-6">
            {/* Business Selector */}
            <div>
              <label htmlFor="business" className="block text-sm font-semibold text-gray-900 mb-2">
                Select Business <span className="text-red-500">*</span>
              </label>
              <select
                id="business"
                value={selectedBusiness}
                onChange={(e) => setSelectedBusiness(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all text-gray-900 bg-white"
                disabled={deleting}
              >
                {businesses.length === 0 ? (
                  <option value="">No businesses found</option>
                ) : (
                  businesses.map((biz) => (
                    <option key={biz.id} value={biz.subdomain}>
                      {biz.name} ({biz.subdomain})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Delete Button */}
            <button
              onClick={handleDelete}
              disabled={deleting || businesses.length === 0}
              className={`w-full px-6 py-4 rounded-xl font-semibold text-white transition-all shadow-lg ${
                deleting || businesses.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700 hover:shadow-xl'
              }`}
            >
              {deleting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Deleting Business...
                </span>
              ) : (
                '🗑️ Delete Business'
              )}
            </button>

            {/* Warning */}
            <div className="bg-red-50 rounded-xl p-4 border border-red-200">
              <p className="text-sm text-red-800 font-semibold">⚠️ Warning: This action is permanent and cannot be undone!</p>
              <p className="text-sm text-red-700 mt-1">All data including users, services, appointments, reservations, and audit logs will be permanently deleted.</p>
            </div>
          </div>

          {/* Delete Response */}
          {deleteResponse && (
            <div className="mt-6">
              {deleteResponse.success ? (
                <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                  <h4 className="text-lg font-semibold text-green-900 mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Business Deleted Successfully
                  </h4>
                  <p className="text-sm text-green-800">{deleteResponse.message}</p>
                </div>
              ) : (
                <div className="bg-red-50 rounded-xl p-6 border border-red-200">
                  <h4 className="text-lg font-semibold text-red-900 mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Deletion Failed
                  </h4>
                  <p className="text-sm text-red-800">{deleteResponse.error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Onboarding Form */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Onboard New Business</h2>

          <div className="space-y-6">
            {/* YAML File Selector */}
            <div>
              <label htmlFor="yaml" className="block text-sm font-semibold text-gray-900 mb-2">
                YAML Configuration File <span className="text-red-500">*</span>
              </label>
              <select
                id="yaml"
                value={selectedYaml}
                onChange={(e) => setSelectedYaml(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-gray-900 bg-white"
                disabled={loading}
              >
                {yamlFiles.length === 0 ? (
                  <option value="">Loading YAML files...</option>
                ) : (
                  yamlFiles.map(file => (
                    <option key={file} value={file}>
                      {file.replace('config/tenants/', '')}
                    </option>
                  ))
                )}
              </select>
              <p className="text-sm text-gray-500 mt-2">
                YAML files are located in <code className="bg-gray-100 px-2 py-1 rounded">config/tenants/</code>
              </p>
            </div>

            {/* Owner Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                Owner Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400"
                placeholder="owner@business.com"
                disabled={loading}
              />
              <p className="text-sm text-gray-500 mt-2">
                This email will be used to create the owner account
              </p>
            </div>

            {/* Owner Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
                Owner Name <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                id="name"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400"
                placeholder="Business Owner"
                disabled={loading}
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                onClick={handleOnboard}
                disabled={loading || !selectedYaml || !ownerEmail}
                className="w-full px-6 py-4 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-xl font-semibold text-lg hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none flex items-center justify-center gap-3"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Onboarding Business...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Start Onboarding
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Response Display */}
        {response && (
          <div className={`rounded-2xl shadow-lg border p-8 ${
            response.success
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start gap-4 mb-6">
              {response.success ? (
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : (
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
              <div>
                <h3 className={`text-2xl font-bold mb-1 ${
                  response.success ? 'text-green-900' : 'text-red-900'
                }`}>
                  {response.success ? 'Onboarding Successful!' : 'Onboarding Failed'}
                </h3>
                <p className={response.success ? 'text-green-700' : 'text-red-700'}>
                  {response.success
                    ? 'Business has been successfully onboarded and is ready to accept bookings'
                    : 'There were errors during the onboarding process'
                  }
                </p>
              </div>
            </div>

            {/* Success Details */}
            {response.success && (
              <div className="space-y-6">
                {/* Owner Info */}
                {response.isExistingOwner && (
                  <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                    <h4 className="text-lg font-semibold text-blue-900 mb-2 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Existing Owner Account
                    </h4>
                    <p className="text-sm text-blue-800">
                      This business has been added to the existing owner account: <strong>{ownerEmail}</strong>
                    </p>
                    {response.businessCount && (
                      <p className="text-sm text-blue-800 mt-2">
                        This owner now manages <strong>{response.businessCount}</strong> business{response.businessCount > 1 ? 'es' : ''}.
                      </p>
                    )}
                    <p className="text-sm text-blue-700 mt-3">
                      No new credentials were generated. The owner can login with their existing password.
                    </p>
                  </div>
                )}

                {/* Credentials */}
                {!response.isExistingOwner && (
                <div className="bg-white rounded-xl p-6 border border-green-200">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Owner Credentials
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-medium text-gray-600 mb-1">Email</div>
                      <div className="font-mono text-gray-900 bg-gray-50 px-3 py-2 rounded border border-gray-200">
                        {ownerEmail}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-600 mb-1">Temporary Password</div>
                      <div className="font-mono text-lg font-bold text-teal-900 bg-teal-50 px-3 py-2 rounded border border-teal-200 flex items-center justify-between">
                        <span>{response.temporaryPassword}</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(response.temporaryPassword || '')}
                          className="ml-2 px-3 py-1 bg-teal-600 text-white rounded text-sm hover:bg-teal-700 transition-colors"
                        >
                          Copy
                        </button>
                      </div>
                      <p className="text-sm text-amber-700 mt-2 flex items-start gap-2">
                        <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>Owner must change this password on first login!</span>
                      </p>
                    </div>
                  </div>
                </div>
                )}

                {/* Business Details */}
                <div className="bg-white rounded-xl p-6 border border-green-200">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Business Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium text-gray-600 mb-1">Business ID</div>
                      <div className="font-mono text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded border border-gray-200">
                        {response.businessId}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-600 mb-1">Subdomain</div>
                      <div className="font-mono text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded border border-gray-200">
                        {response.subdomain}
                      </div>
                    </div>
                  </div>
                </div>

                {/* URLs */}
                <div className="bg-white rounded-xl p-6 border border-green-200">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Important URLs
                  </h4>
                  <div className="space-y-3">
                    {!response.isExistingOwner && response.verificationUrl && (
                    <div>
                      <div className="text-sm font-medium text-gray-600 mb-1">Email Verification Link</div>
                      <div className="flex items-center gap-2">
                        <a
                          href={response.verificationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 font-mono text-sm text-teal-700 bg-teal-50 px-3 py-2 rounded border border-teal-200 hover:bg-teal-100 transition-colors break-all"
                        >
                          {response.verificationUrl}
                        </a>
                        <button
                          onClick={() => navigator.clipboard.writeText(response.verificationUrl || '')}
                          className="px-3 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors flex-shrink-0"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                    )}
                    <div>
                      <div className="text-sm font-medium text-gray-600 mb-1">Booking Page</div>
                      <div className="flex items-center gap-2">
                        <a
                          href={response.bookingPageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 font-mono text-sm text-teal-700 bg-teal-50 px-3 py-2 rounded border border-teal-200 hover:bg-teal-100 transition-colors break-all"
                        >
                          {response.bookingPageUrl}
                        </a>
                        <button
                          onClick={() => navigator.clipboard.writeText(response.bookingPageUrl || '')}
                          className="px-3 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors flex-shrink-0"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-600 mb-1">Dashboard Login</div>
                      <div className="flex items-center gap-2">
                        <a
                          href="/auth/login"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 font-mono text-sm text-teal-700 bg-teal-50 px-3 py-2 rounded border border-teal-200 hover:bg-teal-100 transition-colors break-all"
                        >
                          {window.location.origin}/auth/login
                        </a>
                        <button
                          onClick={() => navigator.clipboard.writeText(window.location.origin + '/auth/login')}
                          className="px-3 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors flex-shrink-0"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Next Steps */}
                <div className="bg-teal-50 rounded-xl p-6 border border-teal-200">
                  <h4 className="text-lg font-semibold text-teal-900 mb-3">Next Steps</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-teal-800">
                    {response.isExistingOwner ? (
                      <>
                        <li>Login to your dashboard with your existing credentials</li>
                        <li>Switch to the new business from the business selector</li>
                        <li>Review business settings</li>
                        <li>Test the booking page</li>
                        <li>Share the booking URL with customers</li>
                      </>
                    ) : (
                      <>
                        <li>Click the email verification link above</li>
                        <li>Login with the owner email and temporary password</li>
                        <li>Change the password immediately</li>
                        <li>Review business settings in the dashboard</li>
                        <li>Test the booking page</li>
                        <li>Share the booking URL with customers</li>
                      </>
                    )}
                  </ol>
                </div>

                {/* Warnings */}
                {response.warnings && response.warnings.length > 0 && (
                  <div className="bg-amber-50 rounded-xl p-6 border border-amber-200">
                    <h4 className="text-lg font-semibold text-amber-900 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Warnings
                    </h4>
                    <ul className="space-y-1 text-sm text-amber-800">
                      {response.warnings.map((warning, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-amber-600 flex-shrink-0">•</span>
                          <span>{warning}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Error Details */}
            {!response.success && response.errors && response.errors.length > 0 && (
              <div className="bg-white rounded-xl p-6 border border-red-200">
                <h4 className="text-lg font-semibold text-red-900 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Errors
                </h4>
                <ul className="space-y-2">
                  {response.errors.map((error, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-red-800 bg-red-50 px-4 py-3 rounded-lg border border-red-100">
                      <span className="font-bold flex-shrink-0">{idx + 1}.</span>
                      <span className="flex-1 font-mono text-sm">{error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
