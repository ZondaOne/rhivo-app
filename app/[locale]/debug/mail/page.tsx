'use client';

import { useState } from 'react';

type EmailTemplate =
  | 'appointment_confirmed'
  | 'appointment_cancelled'
  | 'appointment_rescheduled'
  | 'appointment_reminder'
  | 'email_verification';

export default function DebugMailPage() {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate>('appointment_confirmed');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSendEmail = async () => {
    if (!recipientEmail) {
      setResult({ success: false, message: 'Please enter a recipient email' });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const response = await fetch('/api/debug/send-test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail,
          templateType: selectedTemplate,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({ success: true, message: data.message || 'Email sent successfully!' });
      } else {
        setResult({ success: false, message: data.error || 'Failed to send email' });
      }
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Network error occurred'
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-6">Email Testing Tool</h1>

          <div className="space-y-4">
            {/* Recipient Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Recipient Email
              </label>
              <input
                id="email"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="test@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Template Selection */}
            <div>
              <label htmlFor="template" className="block text-sm font-medium text-gray-700 mb-2">
                Email Template
              </label>
              <select
                id="template"
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value as EmailTemplate)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="appointment_confirmed">Booking Confirmation</option>
                <option value="appointment_cancelled">Cancellation Confirmation</option>
                <option value="appointment_rescheduled">Reschedule Confirmation</option>
                <option value="appointment_reminder">Appointment Reminder</option>
                <option value="email_verification">Email Verification</option>
              </select>
            </div>

            {/* Template Description */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-1">Template Details</h3>
              <p className="text-sm text-blue-800">
                {selectedTemplate === 'appointment_confirmed' &&
                  'Sends a booking confirmation email with appointment details, cancellation and reschedule links.'}
                {selectedTemplate === 'appointment_cancelled' &&
                  'Sends a cancellation confirmation email with rebooking link.'}
                {selectedTemplate === 'appointment_rescheduled' &&
                  'Sends a reschedule confirmation showing old and new appointment times.'}
                {selectedTemplate === 'appointment_reminder' &&
                  'Sends a reminder email for upcoming appointment (typically 24h before).'}
                {selectedTemplate === 'email_verification' &&
                  'Sends an email verification link for new user accounts.'}
              </p>
            </div>

            {/* Send Button */}
            <button
              onClick={handleSendEmail}
              disabled={sending || !recipientEmail}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? 'Sending...' : 'Send Test Email'}
            </button>

            {/* Result Message */}
            {result && (
              <div
                className={`rounded-md p-4 ${
                  result.success
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                <p
                  className={`text-sm font-medium ${
                    result.success ? 'text-green-800' : 'text-red-800'
                  }`}
                >
                  {result.success ? '✓ Success' : '✗ Error'}
                </p>
                <p
                  className={`text-sm mt-1 ${
                    result.success ? 'text-green-700' : 'text-red-700'
                  }`}
                >
                  {result.message}
                </p>
              </div>
            )}
          </div>

          {/* Debug Info */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Debug Information</h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• This page is for local testing only</li>
              <li>• Emails are sent using Resend API</li>
              <li>• All emails use mock data for testing</li>
              <li>• Check your email inbox and spam folder</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
