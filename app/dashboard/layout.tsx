'use client';

import { useQueueManager } from '@/hooks/useQueueManager';
import { UserInitError } from '@/components/UserInitError';
import { WelcomeScreen } from '@/components/WelcomeScreen';
import { SHOW_SHUTDOWN_NOTICE } from '@/config/api';
import { redirect } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useAuth } from '@/hooks/use-auth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (SHOW_SHUTDOWN_NOTICE) {
    redirect('/');
  }

  useQueueManager();

  const { user, supabaseReady } = useAuth();

  const { data: userProfile } = useQuery({
    queryKey: queryKeys.user.profile(),
    queryFn: ({ signal }) => api.template.getUserProfile({ signal }),
    enabled: !!user?.uid && supabaseReady,
    staleTime: 30000,
  });

  const showWelcome = userProfile?.onboarded === false;

  return (
    <>
      <UserInitError />
      <WelcomeScreen isOpen={showWelcome} />
      {children}
    </>
  );
}
