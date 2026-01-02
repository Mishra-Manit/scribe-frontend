/**
 * Infinite Email History Hook
 * Supports pagination with "Load More" functionality
 */

"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { emailAPI } from "@/lib/api";
import { EmailHistory } from "@/lib/schemas";
import { queryKeys } from "@/lib/query-keys";

const EMAILS_PER_PAGE = 100;

export function useInfiniteEmailHistory() {
  const { user, loading, userInitError } = useAuth();

  return useInfiniteQuery<EmailHistory>({
    queryKey: user?.uid ? queryKeys.emails.infinite(user.uid) : ['emails-infinite-disabled'],
    queryFn: ({ pageParam = 0 }) => {
      return emailAPI.getEmailHistory(EMAILS_PER_PAGE, pageParam as number);
    },
    getNextPageParam: (lastPage, allPages) => {
      // If the last page has fewer emails than the page size, we've reached the end
      if (lastPage.length < EMAILS_PER_PAGE) {
        return undefined;
      }
      // Calculate the next offset
      return allPages.length * EMAILS_PER_PAGE;
    },
    enabled: !!user?.uid && !loading && !userInitError,
    initialPageParam: 0,
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: true,
  });
}
