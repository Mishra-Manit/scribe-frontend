'use client';

import { useQueueProcessor } from '@/hooks/queries/useQueueProcessor';

/**
 * Dashboard Layout Component
 *
 * This layout wraps all dashboard routes (/dashboard, /dashboard/generate, /dashboard/template)
 * and ensures the queue processor runs consistently across the entire dashboard section.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize queue processor once for all dashboard pages
  useQueueProcessor();

  return <>{children}</>;
}
