import { useMutation, useQueryClient } from "@tanstack/react-query";
import { emailAPI } from "@/lib/api";
import { EmailResponse } from "@/lib/schemas";
import { queryKeys } from "@/lib/query-keys";

interface UseEmailDiscardOptions {
  onSuccess?: (data: EmailResponse) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for discarding/restoring emails with optimistic updates
 */
export function useEmailDiscard(options?: UseEmailDiscardOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ emailId, displayed }: { emailId: string; displayed: boolean }) =>
      emailAPI.updateEmail(emailId, { displayed }),

    // Optimistic update: immediately update cache before server response
    onMutate: async ({ emailId, displayed }) => {
      // Cancel outgoing refetches (so they don't overwrite optimistic update)
      await queryClient.cancelQueries({ queryKey: queryKeys.emails.infiniteAll() });

      // Snapshot previous value for rollback
      const previousData = queryClient.getQueriesData({ queryKey: queryKeys.emails.infiniteAll() });

      // Optimistically update email in infinite query cache
      queryClient.setQueriesData<{
        pages: EmailResponse[][];
        pageParams: number[];
      }>({ queryKey: queryKeys.emails.infiniteAll() }, (old) => {
        if (!old) return old;

        return {
          ...old,
          pages: old.pages.map((page) =>
            page.map((email) =>
              email.id === emailId ? { ...email, displayed } : email
            )
          ),
        };
      });

      return { previousData };
    },

    // On error, rollback to previous data
    onError: (error, variables, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      options?.onError?.(error as Error);
    },

    // On success, invalidate to refetch and sync with server
    onSuccess: (data) => {
      // Invalidate infinite query to remove from list (if discarded)
      queryClient.invalidateQueries({ queryKey: queryKeys.emails.infiniteAll() });
      options?.onSuccess?.(data);
    },
  });
}
