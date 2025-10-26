/**
 * Reusable toast notification hook
 * Provides a centralized way to show success, error, and info messages
 *
 * UX-002: Enhanced with retry functionality for recoverable errors
 */

import { useState, useCallback } from 'react';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  retryable?: boolean;
  onRetry?: () => void;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((
    message: string,
    type: Toast['type'] = 'info',
    duration = 5000,
    options?: { retryable?: boolean; onRetry?: () => void }
  ) => {
    const id = Math.random().toString(36).substring(7);
    const toast: Toast = {
      id,
      message,
      type,
      retryable: options?.retryable,
      onRetry: options?.onRetry,
    };
    setToasts((prev) => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const handleRetry = useCallback((id: string) => {
    const toast = toasts.find((t) => t.id === id);
    if (toast?.onRetry) {
      toast.onRetry();
      removeToast(id);
    }
  }, [toasts, removeToast]);

  return {
    toasts,
    showToast,
    removeToast,
    clearAllToasts,
    handleRetry,
  };
}
