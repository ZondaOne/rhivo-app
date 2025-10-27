'use client';

import { AuthProvider } from '@/contexts/AuthContext';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthProvider>{children}</AuthProvider>;
}
