/**
 * Custom hook for fetching email history with React Query
 * This replaces manual polling and state management
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { emailAPI } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';

/**
 * Fetch user's email history with automatic caching
 *
 * Benefits over current approach:
 * - Automatic caching (no refetch if data is fresh)
 * - Smart refetching (only when tab refocused or data stale)
 * - Built-in loading/error states
 * - Request deduplication (if called twice, only 1 API call)
 */
export function useEmailHistory(limit = 20, offset = 0) {
  const { user } = useAuth();
  const userId = user?.uid;

  return useQuery({
    // Unique key for this query - used for caching
    queryKey: queryKeys.emails.listByUser(userId!, limit, offset),

    // Function that fetches the data
    // Pass signal for automatic cancellation when component unmounts
    queryFn: ({ signal }) => emailAPI.getEmailHistory(limit, offset, { signal }),

    // Only run query if user is authenticated
    enabled: !!userId,

    // Data is considered "fresh" for 5 minutes (reduces API calls by 60x vs 5-sec polling)
    staleTime: 5 * 60 * 1000,

    // Keep data in cache for 10 minutes after component unmounts
    gcTime: 10 * 60 * 1000,

    // Retry failed requests once
    retry: 1,

    // Refetch on window focus to show latest emails when user returns to tab
    refetchOnWindowFocus: true,

    // Transform data before returning (sort by date)
    select: (data) => {
      return [...data].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
  });
}

/**
 * Example usage in component:
 *
 * function DashboardPage() {
 *   const {
 *     data: emails,      // The email array
 *     isLoading,         // true while fetching
 *     isError,           // true if error occurred
 *     error,             // Error object
 *     refetch,           // Manual refetch function
 *   } = useEmailHistory();
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (isError) return <ErrorMessage error={error} />;
 *
 *   return <EmailTable emails={emails} />;
 * }
 */
