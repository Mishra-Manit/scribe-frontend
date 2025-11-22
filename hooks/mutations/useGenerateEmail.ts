"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { emailAPI, ApiError, NetworkError, ValidationError, AuthenticationError } from "@/lib/api";
import type { EmailGenerationData } from "@/lib/schemas";

interface UseGenerateEmailOptions {
  queueItemId?: string; // Optional queue item to track
  onSuccess?: (taskId: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Mutation for generating emails with queue integration
 *
 * This hook handles the email generation flow:
 * 1. Calls POST /api/email/generate
 * 2. Receives task_id for polling
 * 3. Updates queue item status if provided
 * 4. Provides callbacks for success/error handling
 *
 * The hook integrates with the queue store to track generation status,
 * but doesn't handle the actual task polling - use useTaskStatus for that.
 *
 * Features:
 * - Starts email generation task
 * - Updates queue item status (pending → processing → completed/failed)
 * - Returns task_id for polling with useTaskStatus
 * - Proper error handling with rollback
 *
 * @param options.queueItemId - Optional queue item ID to update status
 * @param options.onSuccess - Callback when task starts successfully (receives task_id)
 * @param options.onError - Callback when task fails to start
 *
 * @example
 * ```tsx
 * const generateEmail = useGenerateEmail({
 *   queueItemId: item.id,
 *   onSuccess: (taskId) => {
 *     console.log("Started generation:", taskId);
 *     // Now poll with useTaskStatus
 *   },
 *   onError: (error) => {
 *     toast.error("Failed to start generation");
 *   },
 * });
 *
 * // Trigger generation
 * generateEmail.mutate({
 *   email_template: template,
 *   recipient_name: "Dr. Smith",
 *   recipient_interest: "machine learning",
 *   template_type: "research",
 * });
 *
 * // Show loading state
 * {generateEmail.isPending && <Spinner />}
 * ```
 */
export function useGenerateEmail(options: UseGenerateEmailOptions = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: EmailGenerationData) => {
      console.log('[useGenerateEmail] mutationFn called with:', data);
      try {
        const result = await emailAPI.generateEmail(data);
        console.log('[useGenerateEmail] API call successful, result:', result);
        return result;
      } catch (error) {
        console.error('[useGenerateEmail] API call failed:', error);
        throw error;
      }
    },

    onMutate: (variables) => {
      console.log('[useGenerateEmail] onMutate called with:', variables);
    },

    // On success: Task started, got task_id back
    onSuccess: (response) => {
      console.log("[useGenerateEmail] onSuccess called");
      console.log("Email generation task started:", response.task_id);

      // Call custom onSuccess callback with task_id
      options.onSuccess?.(response.task_id);
    },

    // On error: Failed to start task
    onError: (error) => {
      console.error("[useGenerateEmail] onError called");
      console.error("Email generation failed to start:", error);

      // Provide user-friendly error messages based on error type
      if (error instanceof NetworkError) {
        console.error("[Generation] Network error - user may be offline");
      } else if (error instanceof ValidationError) {
        console.error("[Generation] Validation error:", error.getUserMessage());
      } else if (error instanceof AuthenticationError) {
        console.error("[Generation] Auth error - user needs to re-login");
      } else if (error instanceof ApiError) {
        console.error("[Generation] API error:", error.getUserMessage());
      }

      // Call custom onError callback
      options.onError?.(error as Error);
    },

    // On settled: Always invalidate email queries to ensure consistency
    onSettled: (data, error) => {
      console.log('[useGenerateEmail] onSettled called', { data, error });
      // Invalidate all email list queries to refresh after generation
      // This will be triggered again after task completion, but doesn't hurt
      queryClient.invalidateQueries({
        queryKey: queryKeys.emails.lists(),
      });
    },
  });
}

/**
 * Advanced usage with optimistic updates (optional)
 *
 * If you want instant UI feedback before the email is generated,
 * you can add optimistic updates in onMutate:
 *
 * @example
 * ```tsx
 * export function useGenerateEmailWithOptimisticUpdate() {
 *   const queryClient = useQueryClient();
 *   const { user } = useAuth();
 *
 *   return useMutation({
 *     mutationFn: emailAPI.generateEmail,
 *
 *     onMutate: async (variables) => {
 *       // Cancel outgoing queries
 *       await queryClient.cancelQueries({
 *         queryKey: queryKeys.emails.lists(),
 *       });
 *
 *       // Snapshot previous value
 *       const previousEmails = queryClient.getQueryData(
 *         queryKeys.emails.listByUser(user.uid, 20, 0)
 *       );
 *
 *       // Optimistically add "generating..." email
 *       queryClient.setQueryData(
 *         queryKeys.emails.listByUser(user.uid, 20, 0),
 *         (old: EmailResponse[] = []) => [
 *           {
 *             id: 'temp-' + Date.now(),
 *             recipient_name: variables.recipient_name,
 *             email_message: 'Generating email...',
 *             template_type: variables.template_type,
 *             created_at: new Date().toISOString(),
 *             // ... other fields
 *           },
 *           ...old,
 *         ]
 *       );
 *
 *       return { previousEmails };
 *     },
 *
 *     onError: (err, variables, context) => {
 *       // Rollback on error
 *       if (context?.previousEmails) {
 *         queryClient.setQueryData(
 *           queryKeys.emails.listByUser(user.uid, 20, 0),
 *           context.previousEmails
 *         );
 *       }
 *     },
 *   });
 * }
 * ```
 */
