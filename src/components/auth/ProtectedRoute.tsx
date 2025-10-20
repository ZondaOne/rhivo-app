'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/routing';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: 'owner' | 'customer' | 'staff';
  fallbackPath?: string;
}

/**
 * Client-side route protection component
 * Redirects users based on authentication state and role
 */
export function ProtectedRoute({
  children,
  requireRole,
  fallbackPath
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    // Not authenticated - redirect to appropriate login page
    if (!isAuthenticated) {
      if (requireRole === 'owner' || requireRole === 'staff') {
        router.push('/auth/login');
      } else if (requireRole === 'customer') {
        router.push('/customer/login');
      } else if (fallbackPath) {
        router.push(fallbackPath);
      } else {
        router.push('/auth/login');
      }
      return;
    }

    // Authenticated but wrong role - redirect based on actual role
    if (requireRole && user?.role !== requireRole) {
      // Owner trying to access customer routes
      if (user?.role === 'owner' && requireRole === 'customer') {
        router.push('/dashboard');
        return;
      }

      // Customer trying to access owner routes
      if (user?.role === 'customer' && (requireRole === 'owner' || requireRole === 'staff')) {
        router.push('/customer/dashboard');
        return;
      }

      // Staff trying to access customer routes
      if (user?.role === 'staff' && requireRole === 'customer') {
        router.push('/dashboard');
        return;
      }

      // Fallback for any other role mismatch
      if (fallbackPath) {
        router.push(fallbackPath);
      }
    }
  }, [isAuthenticated, isLoading, user, requireRole, router, fallbackPath]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-green-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - don't render (redirect happening)
  if (!isAuthenticated) {
    return null;
  }

  // Wrong role - don't render (redirect happening)
  if (requireRole && user?.role !== requireRole) {
    return null;
  }

  // Authenticated and correct role - render children
  return <>{children}</>;
}
