/**
 * Toast notification container component
 * Renders toast notifications in a fixed position
 *
 * UX-002: Supports modal-aware z-index positioning
 */

import { Toast } from '@/hooks/useToast';

interface ToastContainerProps {
  toasts: Toast[];
  onRemove?: (id: string) => void;
  /** Set to true when used inside a modal to ensure proper z-index layering */
  inModal?: boolean;
}

export function ToastContainer({ toasts, onRemove, inModal = false }: ToastContainerProps) {
  // z-[9999] ensures toasts appear above everything, including modals (z-50)
  const zIndexClass = inModal ? 'z-[9999]' : 'z-50';

  return (
    <div className={`fixed top-4 right-4 ${zIndexClass} space-y-2 max-w-md pointer-events-none`}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-3 rounded-lg shadow-lg border text-sm font-medium animate-slide-in flex items-start gap-3 pointer-events-auto ${
            toast.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : toast.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : toast.type === 'warning'
              ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {toast.type === 'success' && (
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {toast.type === 'error' && (
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {toast.type === 'warning' && (
              <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            {toast.type === 'info' && (
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>

          {/* Message */}
          <div className="flex-1 text-sm leading-relaxed">
            {toast.message}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Retry button for retryable errors - UX-002 */}
            {toast.retryable && toast.onRetry && (
              <button
                onClick={() => toast.onRetry?.()}
                className={`text-xs font-semibold px-2 py-1 rounded transition-all ${
                  toast.type === 'error'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : toast.type === 'warning'
                    ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
                aria-label="Retry"
              >
                Retry
              </button>
            )}

            {/* Close button */}
            {onRemove && (
              <button
                onClick={() => onRemove(toast.id)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
