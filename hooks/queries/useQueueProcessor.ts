"use client";

import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGenerateEmail } from "@/hooks/mutations/useGenerateEmail";
import { useTaskStatus } from "@/hooks/queries/useTaskStatus";
import { useAuth } from "@/hooks/use-auth";
import {
  useNextPending,
  useUpdateItemStatus,
  useRemoveFromQueue,
  useProcessingCount,
} from "@/stores/queue-store";
import { useEmailTemplate } from "@/stores/ui-store";
import { queryKeys } from "@/lib/query-keys";

/**
 * Automatically processes the email generation queue
 *
 * This hook replaces the 76 lines of complex logic from EmailGenerationProvider
 * with a clean, React Query-based approach.
 *
 * How it works:
 * 1. Watches for pending items in queue (via Zustand)
 * 2. Starts generation for next pending item (one at a time)
 * 3. Polls task status until complete (with useTaskStatus)
 * 4. Invalidates email list cache on success
 * 5. Removes completed/failed items from queue after delay
 *
 * Key features:
 * - Sequential processing (one email at a time)
 * - Automatic cache invalidation when emails complete
 * - Real-time status updates (PENDING → STARTED → SUCCESS/FAILURE)
 * - Proper error handling without blocking the queue
 * - Persists state across page refreshes (localStorage via Zustand)
 *
 * Usage:
 * Simply call this hook once in your app (e.g., in dashboard layout or main dashboard page).
 * It runs in the background and processes the queue automatically.
 *
 * @example
 * ```tsx
 * function DashboardPage() {
 *   // Start queue processor
 *   const { currentTaskId, currentTaskStatus, isProcessing } = useQueueProcessor();
 *
 *   return (
 *     <div>
 *       {isProcessing && (
 *         <div>
 *           Processing email... Step: {currentTaskStatus?.result?.current_step}
 *         </div>
 *       )}
 *       <EmailHistory />
 *     </div>
 *   );
 * }
 * ```
 */
export function useQueueProcessor() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Queue state and actions
  const nextPending = useNextPending();
  const processingCount = useProcessingCount();
  const updateItemStatus = useUpdateItemStatus();
  const removeFromQueue = useRemoveFromQueue();

  // Get email template from UI store
  const emailTemplate = useEmailTemplate();

  // Current processing state (component-level state, not persisted)
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);

  // Generate email mutation
  const generateEmail = useGenerateEmail({
    queueItemId: currentItemId ?? undefined,
    onSuccess: (taskId) => {
      console.log(`[Queue] Started generation for item ${currentItemId}, task: ${taskId}`);

      // Update queue item with task ID
      if (currentItemId) {
        updateItemStatus(currentItemId, "processing", taskId);
      }

      // Store task ID for polling
      setCurrentTaskId(taskId);
    },
    onError: (error) => {
      console.error(`[Queue] Generation failed for item ${currentItemId}:`, error);

      // Mark as failed and remove from queue
      if (currentItemId) {
        updateItemStatus(currentItemId, "failed", undefined, error.message);

        // Remove failed item after 3 seconds (so user sees error)
        setTimeout(() => {
          removeFromQueue(currentItemId);
          setCurrentItemId(null);
          setCurrentTaskId(null);
        }, 3000);
      }
    },
  });

  // Poll task status when we have a task ID
  const { data: taskStatus } = useTaskStatus({
    taskId: currentTaskId,
    enabled: !!currentTaskId,
    onComplete: (emailId) => {
      console.log(`[Queue] Email generated successfully: ${emailId}`);

      if (currentItemId) {
        // Mark as completed
        updateItemStatus(currentItemId, "completed");

        // Invalidate email list to show new email
        queryClient.invalidateQueries({ queryKey: queryKeys.emails.lists() });

        // Remove from queue after short delay (so user sees "completed" status)
        setTimeout(() => {
          removeFromQueue(currentItemId);
          setCurrentItemId(null);
          setCurrentTaskId(null);
        }, 2000);
      }
    },
    onError: (error) => {
      console.error(`[Queue] Task polling failed for ${currentTaskId}:`, error);

      if (currentItemId) {
        updateItemStatus(currentItemId, "failed", undefined, error.message);

        // Remove failed item after 3 seconds
        setTimeout(() => {
          removeFromQueue(currentItemId);
          setCurrentItemId(null);
          setCurrentTaskId(null);
        }, 3000);
      }
    },
  });

  // Process next item in queue
  const processNext = useCallback(() => {
    // Don't start if already processing something
    if (currentItemId || processingCount > 0) {
      return;
    }

    // Don't start if no user authenticated
    if (!user?.uid) {
      return;
    }

    // Don't start if no email template
    if (!emailTemplate || emailTemplate.trim().length === 0) {
      console.warn("[Queue] No email template set, skipping queue processing");
      return;
    }

    // Get next pending item
    if (!nextPending) {
      return;
    }

    console.log(`[Queue] Processing next item: ${nextPending.name}`);
    setCurrentItemId(nextPending.id);

    // Start generation
    generateEmail.mutate({
      email_template: emailTemplate,
      recipient_name: nextPending.name,
      recipient_interest: nextPending.interest,
      template_type: nextPending.template_type,
    });
  }, [
    currentItemId,
    processingCount,
    user,
    emailTemplate,
    nextPending,
    generateEmail,
  ]);

  // Watch for new pending items and process them
  useEffect(() => {
    processNext();
  }, [processNext]);

  return {
    /**
     * Current Celery task ID being polled (null if not processing)
     */
    currentTaskId,

    /**
     * Current task status with real-time updates
     * Contains: status, current_step, step_status, step_timings
     */
    currentTaskStatus: taskStatus,

    /**
     * Whether queue processor is currently processing an item
     */
    isProcessing: !!currentItemId,

    /**
     * Current item being processed (for debugging)
     */
    currentItemId,
  };
}

/**
 * Example usage in dashboard:
 *
 * ```tsx
 * function DashboardPage() {
 *   const {
 *     currentTaskStatus,
 *     isProcessing
 *   } = useQueueProcessor();
 *
 *   const pendingCount = usePendingCount();
 *   const processingCount = useProcessingCount();
 *
 *   return (
 *     <div>
 *       <Card>
 *         <CardTitle>Queue Status</CardTitle>
 *         <CardContent>
 *           {isProcessing ? (
 *             <>
 *               <p>Generating email...</p>
 *               {currentTaskStatus?.result?.current_step && (
 *                 <p className="text-sm text-gray-600">
 *                   Step: {currentTaskStatus.result.current_step.replace(/_/g, ' ')}
 *                 </p>
 *               )}
 *             </>
 *           ) : pendingCount > 0 ? (
 *             <p>{pendingCount} emails waiting</p>
 *           ) : (
 *             <p className="text-green-600">Queue is empty ✓</p>
 *           )}
 *         </CardContent>
 *       </Card>
 *     </div>
 *   );
 * }
 * ```
 */
