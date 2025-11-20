/**
 * Custom hook for fetching email history with React Query
 * This replaces manual polling and state management
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { emailAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContextProvider';

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
    queryFn: () => emailAPI.getEmailHistory(limit, offset),

    // Only run query if user is authenticated
    enabled: !!userId,

    // Data is considered "fresh" for 2 minutes
    staleTime: 2 * 60 * 1000,

    // Keep data in cache for 5 minutes after component unmounts
    gcTime: 5 * 60 * 1000,

    // Retry failed requests once
    retry: 1,

    // Don't refetch on window focus (reduces API calls)
    // Change to true if you want real-time updates
    refetchOnWindowFocus: false,

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
