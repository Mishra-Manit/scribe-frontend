'use client';

import { useQueueManager } from '@/hooks/useQueueManager';

/**
 * Dashboard Layout Component
 *
 * This layout wraps all dashboard routes (/dashboard, /dashboard/generate, /dashboard/template)
 * and ensures the queue manager runs consistently across the entire dashboard section.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize queue manager once for all dashboard pages
  useQueueManager();

  return <>{children}</>;
}
