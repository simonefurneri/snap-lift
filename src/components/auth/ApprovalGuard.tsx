'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';
import { PendingApprovalScreen } from './PendingApprovalScreen';

const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
  '/privacy',
  '/terms',
  '/offline',
];

export function ApprovalGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const pathname = usePathname();

  const isPublicPath = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  // If initial auth is still loading, or user is on a public page, or user is not logged in:
  if (loading || isPublicPath || !user) {
    return <>{children}</>;
  }

  // If user is logged in, profile has loaded, and account is NOT approved:
  if (profile && profile.is_approved === false) {
    return <PendingApprovalScreen />;
  }

  return <>{children}</>;
}
