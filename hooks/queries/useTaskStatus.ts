"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { queryKeys } from "@/lib/query-keys";
import { emailAPI } from "@/lib/api";
import type { TaskStatusResponse } from "@/lib/schemas";

interface UseTaskStatusOptions {
  taskId: string | null;
  enabled?: boolean;
  onSuccess?: (data: TaskStatusResponse) => void;
  onComplete?: (emailId: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Poll task status with automatic stop when complete
 *
 * This hook implements conditional polling that stops automatically
 * when the task reaches SUCCESS or FAILURE state.
 *
 * Key features:
 * - Polls every 3 seconds while task is PENDING or STARTED
 * - Automatically stops polling when task completes
 * - Provides callbacks for success, completion, and error states
 * - Shows real-time progress with current step information
 *
 * @param options.taskId - Celery task ID to poll (null to disable)
 * @param options.enabled - Whether to enable polling (default: true)
 * @param options.onSuccess - Callback for each status update
 * @param options.onComplete - Callback when task succeeds (receives email_id)
 * @param options.onError - Callback when task fails
 *
 * @example
 * ```tsx
 * const { data: taskStatus, isLoading } = useTaskStatus({
 *   taskId: "abc-123",
 *   enabled: !!taskId,
 *   onComplete: (emailId) => {
 *     console.log("Email generated:", emailId);
 *     queryClient.invalidateQueries(queryKeys.emails.lists());
 *   },
 *   onError: (error) => {
 *     toast.error("Generation failed");
 *   },
 * });
 *
 * // Show current step in UI
 * {taskStatus?.result?.current_step && (
 *   <p>Step: {taskStatus.result.current_step}</p>
 * )}
 * ```
 */
export function useTaskStatus({
  taskId,
  enabled = true,
  onSuccess,
  onComplete,
  onError,
}: UseTaskStatusOptions) {
  const queryResult = useQuery({
    queryKey: queryKeys.tasks.status(taskId!),
    queryFn: () => emailAPI.getTaskStatus(taskId!),
    enabled: enabled && !!taskId,

    // Conditional polling - stops when task completes
    refetchInterval: (query) => {
      const status = query.state.data?.status;

      // Stop polling when complete or failed
      if (status === "SUCCESS" || status === "FAILURE") {
        return false;
      }

      // Continue polling every 3 seconds while PENDING or STARTED
      return 3000;
    },

    // Always consider data stale (forces refetch on interval)
    staleTime: 0,

    // Keep in cache for 1 minute after completion
    gcTime: 1 * 60 * 1000,

    // Don't retry on error - task might not exist yet or could be transient
    retry: false,
  });
  // Side-effect callbacks handled separately to keep options typed correctly

  // Invoke success/completion callbacks when fresh data arrives
  useEffect(() => {
    if (queryResult.isSuccess && queryResult.data) {
      // Generic success callback
      onSuccess?.(queryResult.data);

      // Completion callback for successful task
      if (
        queryResult.data.status === "SUCCESS" &&
        queryResult.data.result?.email_id
      ) {
        onComplete?.(queryResult.data.result.email_id);
      }
    }
  }, [queryResult.isSuccess, queryResult.data, onSuccess, onComplete]);

  // Invoke error callback
  useEffect(() => {
    if (queryResult.isError && queryResult.error) {
      onError?.(queryResult.error as Error);
    }
  }, [queryResult.isError, queryResult.error, onError]);

  return queryResult;
}

/**
 * Helper hook for displaying task progress in UI
 *
 * @example
 * ```tsx
 * function TaskProgress({ taskId }: { taskId: string }) {
 *   const { data: status } = useTaskStatus({ taskId });
 *
 *   if (!status) return null;
 *
 *   switch (status.status) {
 *     case 'PENDING':
 *       return <div>Task queued...</div>;
 *
 *     case 'STARTED':
 *       return (
 *         <div>
 *           <p>Generating email...</p>
 *           <p>Step: {status.result?.current_step}</p>
 *           <Progress timings={status.result?.step_timings} />
 *         </div>
 *       );
 *
 *     case 'SUCCESS':
 *       return <div>Email generated successfully! ✓</div>;
 *
 *     case 'FAILURE':
 *       const errorMsg = typeof status.error === 'string'
 *         ? status.error
 *         : status.error?.message;
 *       return <div>Failed: {errorMsg}</div>;
 *
 *     default:
 *       return null;
 *   }
 * }
 * ```
 */
