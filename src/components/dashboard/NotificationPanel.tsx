'use client';

import { useState, useEffect } from 'react';

interface Notification {
  id: string;
  appointment_id: string;
  type: 'email' | 'sms';
  recipient: string;
  status: 'pending' | 'sent' | 'failed' | 'retrying';
  subject?: string;
  message: string;
  sent_at?: string;
  error_message?: string;
  retry_count: number;
  created_at: string;
}

export function NotificationPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'sent' | 'failed'>('all');

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  async function loadNotifications() {
    try {
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  }

  async function retryNotification(notificationId: string) {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/retry`, {
        method: 'POST',
      });

      if (response.ok) {
        await loadNotifications();
      } else {
        alert('Failed to retry notification');
      }
    } catch (error) {
      console.error('Failed to retry notification:', error);
      alert('Failed to retry notification');
    }
  }

  async function sendCustomNotification(appointmentId: string, type: 'email' | 'sms', message: string) {
    try {
      const response = await fetch('/api/notifications/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId, type, message }),
      });

      if (response.ok) {
        await loadNotifications();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to send notification');
      }
    } catch (error) {
      console.error('Failed to send notification:', error);
      alert('Failed to send notification');
    }
  }

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'all') return true;
    return notif.status === filter;
  });

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    sent: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    retrying: 'bg-blue-100 text-blue-800',
  };

  const typeIcons = {
    email: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    sms: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="text-gray-500">Loading notifications...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-gray-900">Notifications</h2>

          <button
            onClick={() => loadNotifications()}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'pending' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('sent')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'sent' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Sent
          </button>
          <button
            onClick={() => setFilter('failed')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'failed' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Failed
          </button>
        </div>
      </div>

      <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
        {filteredNotifications.map((notif) => (
          <div key={notif.id} className="p-6 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex gap-3 flex-1">
                <div className="text-gray-500 mt-1">
                  {typeIcons[notif.type]}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[notif.status]}`}>
                      {notif.status}
                    </span>
                    <span className="text-xs text-gray-500 uppercase font-medium">
                      {notif.type}
                    </span>
                  </div>

                  <div className="text-sm text-gray-900 font-medium mb-1">
                    To: {notif.recipient}
                  </div>

                  {notif.subject && (
                    <div className="text-sm text-gray-700 font-medium mb-1">
                      Subject: {notif.subject}
                    </div>
                  )}

                  <div className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {notif.message}
                  </div>

                  <div className="text-xs text-gray-500">
                    Created: {new Date(notif.created_at).toLocaleString()}
                    {notif.sent_at && (
                      <> • Sent: {new Date(notif.sent_at).toLocaleString()}</>
                    )}
                    {notif.retry_count > 0 && (
                      <> • Retries: {notif.retry_count}</>
                    )}
                  </div>

                  {notif.error_message && (
                    <div className="mt-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
                      Error: {notif.error_message}
                    </div>
                  )}
                </div>
              </div>

              {notif.status === 'failed' && (
                <button
                  onClick={() => retryNotification(notif.id)}
                  className="ml-4 px-3 py-1 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        ))}

        {filteredNotifications.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            No notifications found
          </div>
        )}
      </div>
    </div>
  );
}

export function QuickNotifyButton({ appointmentId, customerEmail, customerPhone }: { appointmentId: string; customerEmail?: string; customerPhone?: string }) {
  const [showMenu, setShowMenu] = useState(false);

  async function sendNotification(type: 'email' | 'sms', template: string) {
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId, type, template }),
      });

      if (response.ok) {
        alert('Notification sent successfully');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to send notification');
      }
    } catch (error) {
      console.error('Failed to send notification:', error);
      alert('Failed to send notification');
    }
    setShowMenu(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="p-2 text-gray-500 hover:bg-teal-50 hover:text-teal-600 rounded-lg transition-colors"
        title="Send notification"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
          <div className="p-2">
            {customerEmail && (
              <>
                <button
                  onClick={() => sendNotification('email', 'reminder')}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 rounded-lg transition-colors text-sm"
                >
                  Email: Reminder
                </button>
                <button
                  onClick={() => sendNotification('email', 'confirmation')}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 rounded-lg transition-colors text-sm"
                >
                  Email: Confirmation
                </button>
              </>
            )}
            {customerPhone && (
              <>
                <button
                  onClick={() => sendNotification('sms', 'reminder')}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 rounded-lg transition-colors text-sm"
                >
                  SMS: Reminder
                </button>
                <button
                  onClick={() => sendNotification('sms', 'confirmation')}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 rounded-lg transition-colors text-sm"
                >
                  SMS: Confirmation
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}