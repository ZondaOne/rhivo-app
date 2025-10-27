"use client";

import { useState } from 'react';
import Link from 'next/link';

export default function OnboardBusinessPage() {
  const [yamlPath, setYamlPath] = useState('config/tenants/wellness-spa.yaml');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    businessId?: string;
    subdomain?: string;
    temporaryPassword?: string;
    verificationUrl?: string;
    bookingPageUrl?: string;
    warnings?: string[];
    errors?: string[];
  } | null>(null);

  const availableConfigs = [
    'config/tenants/wellness-spa.yaml',
    'config/tenants/example-salon.yaml',
  ];

  async function handleOnboard() {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/onboard-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          yamlFilePath: yamlPath,
          ownerEmail,
          ownerName: ownerName || undefined,
          sendWelcomeEmail: true,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Business Onboarding</h1>
          <p className="text-gray-600 mb-8">
            Create a complete business setup from a YAML configuration file
          </p>

          <div className="space-y-6">
            {/* YAML Config Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                YAML Configuration File
              </label>
              <select
                value={yamlPath}
                onChange={(e) => setYamlPath(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {availableConfigs.map((config) => (
                  <option key={config} value={config}>
                    {config}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-1">
                Select a pre-configured YAML file or enter a custom path
              </p>
            </div>

            {/* Custom Path */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or enter custom path
              </label>
              <input
                type="text"
                value={yamlPath}
                onChange={(e) => setYamlPath(e.target.value)}
                placeholder="config/tenants/my-business.yaml"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Owner Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Owner Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="owner@business.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Owner Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Owner Name (Optional)
              </label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={handleOnboard}
              disabled={loading || !ownerEmail}
              className="w-full px-6 py-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating Business...' : 'Onboard Business'}
            </button>
          </div>

          {/* Result Display */}
          {result && (
            <div className="mt-8">
              {result.success ? (
                <div className="bg-green-50 border-2 border-green-500 rounded-xl p-6">
                  <h2 className="text-xl font-bold text-green-900 mb-4 flex items-center gap-2">
                    <span className="text-2xl">✅</span>
                    Business Created Successfully!
                  </h2>

                  <div className="space-y-4">
                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <h3 className="font-semibold text-gray-900 mb-2">Business Details</h3>
                      <div className="text-sm space-y-1">
                        <div><span className="text-gray-600">ID:</span> <code className="font-mono bg-gray-100 px-2 py-1 rounded">{result.businessId}</code></div>
                        <div><span className="text-gray-600">Subdomain:</span> <code className="font-mono bg-gray-100 px-2 py-1 rounded">{result.subdomain}</code></div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <h3 className="font-semibold text-gray-900 mb-2">Owner Credentials</h3>
                      <div className="text-sm space-y-1">
                        <div><span className="text-gray-600">Email:</span> <code className="font-mono bg-gray-100 px-2 py-1 rounded">{ownerEmail}</code></div>
                        <div><span className="text-gray-600">Temporary Password:</span> <code className="font-mono bg-red-100 px-2 py-1 rounded text-red-700">{result.temporaryPassword}</code></div>
                        <p className="text-xs text-red-600 mt-2">⚠️ Owner must change password on first login!</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <h3 className="font-semibold text-gray-900 mb-2">Important URLs</h3>
                      <div className="text-sm space-y-2">
                        <div>
                          <span className="text-gray-600 block mb-1">Email Verification:</span>
                          <a href={result.verificationUrl} target="_blank" className="text-indigo-600 hover:text-indigo-700 underline break-all">
                            {result.verificationUrl}
                          </a>
                        </div>
                        <div>
                          <span className="text-gray-600 block mb-1">Booking Page:</span>
                          <a href={result.bookingPageUrl} target="_blank" className="text-indigo-600 hover:text-indigo-700 underline break-all">
                            {result.bookingPageUrl}
                          </a>
                        </div>
                        <div>
                          <span className="text-gray-600 block mb-1">Owner Dashboard:</span>
                          <Link href="/auth/login" className="text-indigo-600 hover:text-indigo-700 underline">
                            Login to Dashboard
                          </Link>
                        </div>
                      </div>
                    </div>

                    {result.warnings && result.warnings.length > 0 && (
                      <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
                        <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Warnings</h3>
                        <ul className="text-sm text-yellow-800 space-y-1">
                          {result.warnings.map((warning: string, i: number) => (
                            <li key={i}>• {warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="bg-blue-50 border border-blue-300 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-900 mb-2">📝 Next Steps</h3>
                      <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                        <li>Click the verification link above</li>
                        <li>Login with the temporary password</li>
                        <li>Change password immediately</li>
                        <li>Test the booking page</li>
                        <li>Share booking URL with customers</li>
                      </ol>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border-2 border-red-500 rounded-xl p-6">
                  <h2 className="text-xl font-bold text-red-900 mb-4 flex items-center gap-2">
                    <span className="text-2xl">❌</span>
                    Onboarding Failed
                  </h2>
                  <div className="space-y-2">
                    {result.errors?.map((error: string, i: number) => (
                      <div key={i} className="bg-white rounded-lg p-3 border border-red-200">
                        <p className="text-sm text-red-800">• {error}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Info Box */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">ℹ️ What this does</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✓ Creates business record in database</li>
              <li>✓ Creates owner account with temporary password</li>
              <li>✓ Imports all categories and services from YAML</li>
              <li>✓ Sets up availability schedule</li>
              <li>✓ Links YAML config to business</li>
              <li>✓ Activates booking page immediately</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
