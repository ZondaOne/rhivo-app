'use client';

import { useState, useEffect } from 'react';

interface AuditLogEntry {
  id: string;
  appointment_id: string;
  action: 'created' | 'updated' | 'cancelled' | 'completed' | 'rescheduled';
  actor_type: 'owner' | 'customer' | 'system';
  actor_id?: string;
  actor_name?: string;
  changes?: Record<string, { old: any; new: any }>;
  metadata?: Record<string, any>;
  created_at: string;
}

interface AuditTrailProps {
  appointmentId?: string;
  limit?: number;
}

export function AuditTrail({ appointmentId, limit = 50 }: AuditTrailProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadLogs();
  }, [appointmentId]);

  async function loadLogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: limit.toString() });
      if (appointmentId) {
        params.append('appointmentId', appointmentId);
      }

      const response = await fetch(`/api/audit-logs?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleExpanded(logId: string) {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  }

  const actionColors = {
    created: 'bg-green-100 text-green-800',
    updated: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800',
    completed: 'bg-teal-100 text-teal-800',
    rescheduled: 'bg-yellow-100 text-yellow-800',
  };

  const actionIcons = {
    created: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
    updated: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    cancelled: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    completed: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    rescheduled: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="text-gray-500">Loading audit trail...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-semibold text-gray-900">Audit Trail</h2>
        <p className="text-sm text-gray-500 mt-1">
          Complete history of all appointment changes
        </p>
      </div>

      <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
        {logs.map((log) => {
          const isExpanded = expandedLogs.has(log.id);
          const hasChanges = log.changes && Object.keys(log.changes).length > 0;

          return (
            <div key={log.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-lg ${actionColors[log.action]}`}>
                  {actionIcons[log.action]}
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${actionColors[log.action]}`}>
                          {log.action}
                        </span>
                        <span className="text-sm text-gray-500">
                          by {log.actor_name || log.actor_type}
                        </span>
                      </div>

                      <div className="text-xs text-gray-500">
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </div>

                    {hasChanges && (
                      <button
                        onClick={() => toggleExpanded(log.id)}
                        className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
                      >
                        {isExpanded ? 'Hide' : 'Show'} details
                        <svg
                          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {isExpanded && hasChanges && (
                    <div className="mt-3 bg-gray-50 rounded-lg p-4 space-y-2">
                      {Object.entries(log.changes!).map(([field, change]) => (
                        <div key={field} className="text-sm">
                          <div className="font-medium text-gray-700 mb-1">
                            {formatFieldName(field)}:
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <div className="flex-1 bg-red-50 text-red-800 px-3 py-2 rounded">
                              <span className="font-medium">Old:</span> {formatValue(change.old)}
                            </div>
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                            <div className="flex-1 bg-green-50 text-green-800 px-3 py-2 rounded">
                              <span className="font-medium">New:</span> {formatValue(change.new)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {log.metadata && Object.keys(log.metadata).length > 0 && isExpanded && (
                    <div className="mt-3 text-xs text-gray-500">
                      <div className="font-medium mb-1">Additional Info:</div>
                      <pre className="bg-gray-50 rounded p-2 overflow-x-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {logs.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            No audit logs found
          </div>
        )}
      </div>
    </div>
  );
}

function formatFieldName(field: string): string {
  return field
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return 'None';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
    return new Date(value).toLocaleString();
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}