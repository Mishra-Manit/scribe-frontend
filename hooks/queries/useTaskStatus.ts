"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
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
 * - Polls every 5 seconds while task is PENDING or STARTED
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
  // Log hook initialization for debugging
  console.log('[useTaskStatus] Hook initialized', {
    taskId,
    enabled,
    hasOnComplete: !!onComplete,
    hasOnSuccess: !!onSuccess,
    hasOnError: !!onError,
  });

  // Use refs to store latest callbacks to avoid dependency issues
  const onSuccessRef = useRef(onSuccess);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);

  // Keep refs up to date with latest callbacks
  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
  }, [onSuccess, onComplete, onError]);

  const queryResult = useQuery({
    queryKey: queryKeys.tasks.status(taskId!),
    // Pass signal for automatic cancellation when component unmounts
    queryFn: ({ signal }) => emailAPI.getTaskStatus(taskId!, { signal }),
    enabled: enabled && !!taskId,

    // Conditional polling - stops when task completes
    refetchInterval: (query) => {
      const status = query.state.data?.status;

      console.log('[useTaskStatus] Polling interval check', {
        taskId: taskId,
        status: status,
        fullData: query.state.data,
        willContinuePolling: status !== "SUCCESS" && status !== "FAILURE",
      });

      // Stop polling when complete or failed
      if (status === "SUCCESS" || status === "FAILURE") {
        console.log('[useTaskStatus] STOPPING POLLING', {
          taskId,
          status,
          data: query.state.data
        });
        return false;
      }

      // Continue polling every 5 seconds while PENDING or STARTED
      return 5000;
    },

    // Always consider data stale (forces refetch on interval)
    staleTime: 0,

    // Keep in cache for 1 minute after completion
    gcTime: 1 * 60 * 1000,

    // Don't retry on error - task might not exist yet or could be transient
    retry: false,
  });

  // Success callback - fires on EVERY successful fetch (including polling)
  // Using dataUpdatedAt in deps ensures this fires on every new poll result
  useEffect(() => {
    if (queryResult.isSuccess && queryResult.data) {
      console.log('[useTaskStatus] Query success - calling callbacks', {
        taskId: taskId,
        status: queryResult.data?.status,
        hasEmailId: !!queryResult.data?.result?.email_id,
        emailId: queryResult.data?.result?.email_id,
        dataUpdatedAt: queryResult.dataUpdatedAt,
      });

      // Generic success callback - fires on every successful poll
      if (onSuccessRef.current) {
        console.log('[useTaskStatus] Calling onSuccess callback', {
          taskId: taskId,
          data: queryResult.data
        });
        onSuccessRef.current(queryResult.data);
      }

      // Completion callback - only fires when task succeeds with email_id
      if (queryResult.data.status === "SUCCESS" && queryResult.data.result?.email_id) {
        console.log('[useTaskStatus] Calling onComplete callback', {
          taskId: taskId,
          emailId: queryResult.data.result.email_id,
          hasCallback: !!onCompleteRef.current,
        });

        if (onCompleteRef.current) {
          onCompleteRef.current(queryResult.data.result.email_id);
          console.log('[useTaskStatus] onComplete callback executed', {
            taskId: taskId,
            emailId: queryResult.data.result.email_id,
          });
        } else {
          console.warn('[useTaskStatus] onComplete callback is undefined!', {
            taskId: taskId,
          });
        }
      } else {
        console.log('[useTaskStatus] Conditions not met for onComplete', {
          taskId: taskId,
          status: queryResult.data.status,
          hasEmailId: !!queryResult.data?.result?.email_id,
          result: queryResult.data.result,
        });
      }
    }
  }, [queryResult.isSuccess, queryResult.data, taskId, queryResult.dataUpdatedAt]);

  // Invoke error callback
  useEffect(() => {
    console.log('[useTaskStatus] Error useEffect triggered', {
      taskId: taskId,
      isError: queryResult.isError,
      hasError: !!queryResult.error,
      error: queryResult.error,
    });

    if (queryResult.isError && queryResult.error) {
      console.error('[useTaskStatus] Calling onError callback', {
        taskId: taskId,
        error: queryResult.error,
      });
      onErrorRef.current?.(queryResult.error as Error);
    }
  }, [queryResult.isError, queryResult.error, taskId]);

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
