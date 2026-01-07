'use client';

import { useQueueManager } from '@/hooks/useQueueManager';
import { UserInitError } from '@/components/UserInitError';
import { SHOW_SHUTDOWN_NOTICE } from '@/config/api';
import { redirect } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (SHOW_SHUTDOWN_NOTICE) {
    redirect('/');
  }

  useQueueManager();

  return (
    <>
      <UserInitError />
      {children}
    </>
  );
}
