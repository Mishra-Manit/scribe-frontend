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
  useQueueStore,
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
  const { user, loading: authLoading, supabaseReady } = useAuth();
  const queryClient = useQueryClient();

  // Queue state and actions
  const nextPending = useNextPending();
  const processingCount = useProcessingCount();
  const updateItemStatus = useUpdateItemStatus();
  const removeFromQueue = useRemoveFromQueue();
  const updateCurrentTaskStatus = useQueueStore((state) => state.updateCurrentTaskStatus);

  // Get email template from UI store
  const emailTemplate = useEmailTemplate();

  // Current processing state (component-level state, not persisted)
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);
  const [initGracePeriodComplete, setInitGracePeriodComplete] = useState(false);

  // On mount, check for an item that was processing during a page refresh
  useEffect(() => {
    // Prevent this from running on server-side render
    if (typeof window === 'undefined') return;
    
    // Don't process recovery if auth is still loading or Supabase not ready
    if (authLoading || !supabaseReady) {
      console.log('[Queue] Auth loading or Supabase not ready, delaying recovery check...', {
        authLoading,
        supabaseReady
      });
      return;
    }

    const queueState = useQueueStore.getState();
    const processingItem = queueState.queue.find(
      (item) => item.status === 'processing'
    );

    if (processingItem) {
      // If it has a task ID, we can re-attach to it and continue polling
      if (processingItem.taskId) {
        console.log(
          `[Queue] Re-attaching to processing item ${processingItem.id} with task ID ${processingItem.taskId}`
        );
        setCurrentItemId(processingItem.id);
        setCurrentTaskId(processingItem.taskId);
      } else {
        // If no task ID, it was interrupted before the API call succeeded.
        // Reset to pending so it can be picked up again.
        console.warn(
          `[Queue] Found processing item ${processingItem.id} without a task ID. Resetting to pending.`
        );
        updateItemStatus(processingItem.id, 'pending');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, supabaseReady]);

  // Add a grace period after auth completes to ensure full Supabase initialization
  // This prevents UI flashing and gives Supabase extra time to settle
  useEffect(() => {
    if (!authLoading && supabaseReady && !initGracePeriodComplete) {
      console.log('[Queue] Auth ready, starting 1-second grace period...');

      const timeoutId = setTimeout(() => {
        console.log('[Queue] Grace period complete, ready to process queue');
        setInitGracePeriodComplete(true);
      }, 1000); // 1 second grace period

      return () => clearTimeout(timeoutId);
    }
  }, [authLoading, supabaseReady, initGracePeriodComplete]);

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

  // Memoize callbacks to prevent unnecessary re-renders in useTaskStatus
  const handleTaskComplete = useCallback((emailId: string) => {
    console.log('=== [Queue] EMAIL GENERATION COMPLETED ===');
    console.log('[Queue] Email generated successfully:', emailId);
    console.log('[Queue] Current item ID:', currentItemId);
    console.log('[Queue] Current task ID:', currentTaskId);

    if (currentItemId) {
      console.log('[Queue] Updating item status to completed...');

      // Mark as completed
      updateItemStatus(currentItemId, "completed");

      console.log('[Queue] Item marked as completed, checking queue state...');
      const queueState = useQueueStore.getState();
      console.log('[Queue] Queue state after completion:', {
        totalItems: queueState.queue.length,
        pending: queueState.queue.filter(i => i.status === 'pending').length,
        processing: queueState.queue.filter(i => i.status === 'processing').length,
        completed: queueState.queue.filter(i => i.status === 'completed').length,
        failed: queueState.queue.filter(i => i.status === 'failed').length,
      });

      // Invalidate email list to show new email
      console.log('[Queue] Invalidating email queries...');
      queryClient.invalidateQueries({ queryKey: queryKeys.emails.lists() });

      // Remove from queue after short delay (so user sees "completed" status)
      console.log('[Queue] Scheduling item removal in 2 seconds...');
      setTimeout(() => {
        console.log('[Queue] Removing completed item from queue:', currentItemId);
        removeFromQueue(currentItemId);
        setCurrentItemId(null);
        setCurrentTaskId(null);
        console.log('[Queue] Cleanup complete, ready for next item');
        
        // Trigger processing of next item if any pending
        const nextItem = useQueueStore.getState().queue.find(item => item.status === 'pending');
        if (nextItem) {
          console.log('[Queue] Found next pending item after completion:', nextItem.name);
        }
      }, 2000);
    } else {
      console.error('[Queue] CRITICAL: onComplete called but currentItemId is null!');
    }
    console.log('=========================================');
  }, [currentItemId, currentTaskId, updateItemStatus, queryClient, removeFromQueue]);

  const handleTaskError = useCallback((error: Error) => {
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
  }, [currentItemId, currentTaskId, updateItemStatus, removeFromQueue]);

  // Poll task status when we have a task ID
  const { data: taskStatus } = useTaskStatus({
    taskId: currentTaskId,
    enabled: !!currentTaskId,
    onComplete: handleTaskComplete,
    onError: handleTaskError,
  });

  // Log task status changes for debugging and update store
  useEffect(() => {
    if (taskStatus) {
      console.log('[Queue] Task status updated:', {
        taskId: currentTaskId,
        status: taskStatus.status,
        result: taskStatus.result,
        currentStep: taskStatus.result?.current_step,
      });
      
      // Update Zustand store with current task status for UI components
      updateCurrentTaskStatus(taskStatus);
    } else if (!currentTaskId) {
      // Clear status only when no task is running (not during initial load)
      updateCurrentTaskStatus(null);
    }
  }, [taskStatus, currentTaskId, updateCurrentTaskStatus]);

  // Backup check: if we have a task ID and the status is SUCCESS, ensure we process it
  // This is a safety mechanism in case the onComplete callback doesn't fire
  useEffect(() => {
    if (
      currentTaskId &&
      currentItemId &&
      taskStatus?.status === "SUCCESS" &&
      taskStatus?.result?.email_id
    ) {
      console.log('[Queue] Backup check detected SUCCESS status', {
        taskId: currentTaskId,
        itemId: currentItemId,
        emailId: taskStatus.result.email_id,
      });

      // Check if item is still in "processing" state (callback didn't fire)
      const queueState = useQueueStore.getState();
      const item = queueState.queue.find(i => i.id === currentItemId);

      if (item && item.status === "processing") {
        console.warn('[Queue] Item still processing after SUCCESS - triggering manual completion');
        handleTaskComplete(taskStatus.result.email_id);
      } else if (item) {
        console.log('[Queue] Item status is already:', item.status);
      } else {
        console.log('[Queue] Item not found in queue (might have been removed)');
      }
    }
  }, [currentTaskId, currentItemId, taskStatus, handleTaskComplete]);

  // Process next item in queue
  const processNext = useCallback(() => {
    console.log('[Queue] processNext called', {
      currentItemId,
      processingCount,
      hasUser: !!user?.uid,
      authLoading,
      hasEmailTemplate: !!emailTemplate,
      hasNextPending: !!nextPending,
    });

    // Don't start if auth is still loading, Supabase not ready, or grace period not complete
    if (authLoading || !supabaseReady || !initGracePeriodComplete) {
      console.log('[Queue] Skipping - initialization not complete', {
        authLoading,
        supabaseReady,
        initGracePeriodComplete
      });
      return;
    }

    // Don't start if already processing something
    if (currentItemId || processingCount > 0) {
      console.log('[Queue] Skipping - already processing');
      return;
    }

    // Don't start if no user authenticated
    if (!user?.uid) {
      console.warn('[Queue] Skipping - no user authenticated');
      return;
    }

    // Don't start if no email template
    if (!emailTemplate || emailTemplate.trim().length === 0) {
      console.warn("[Queue] Skipping - no email template set");
      return;
    }

    // Get next pending item
    if (!nextPending) {
      console.log('[Queue] Skipping - no pending items');
      return;
    }

    console.log(`[Queue] ✓ All checks passed - Processing next item: ${nextPending.name}`);
    setCurrentItemId(nextPending.id);

    // Mark as processing immediately (before API call to prevent race conditions)
    updateItemStatus(nextPending.id, "processing");

    // Start generation
    console.log('[Queue] Calling generateEmail.mutate with:', {
      recipient_name: nextPending.name,
      recipient_interest: nextPending.interest,
    });
    generateEmail.mutate({
      email_template: emailTemplate,
      recipient_name: nextPending.name,
      recipient_interest: nextPending.interest,
    });
  }, [
    currentItemId,
    processingCount,
    user,
    authLoading,
    emailTemplate,
    nextPending,
    updateItemStatus,
    generateEmail,
  ]);

  // Watch for queue changes and process pending items
  // Subscribe to the entire queue to detect any changes
  const queue = useQueueStore((state) => state.queue);
  
  useEffect(() => {
    // Don't process if auth is still loading, Supabase not ready, or grace period not complete
    if (authLoading || !supabaseReady || !initGracePeriodComplete) {
      console.log('[Queue] Not ready to process queue...', {
        authLoading,
        supabaseReady,
        initGracePeriodComplete
      });
      return;
    }

    // Check if we should process the next item
    const shouldProcess =
      user?.uid &&
      supabaseReady &&
      initGracePeriodComplete &&
      emailTemplate &&
      emailTemplate.trim().length > 0 &&
      !currentItemId &&
      processingCount === 0 &&
      queue.some(item => item.status === 'pending');

    if (shouldProcess) {
      console.log('[Queue] Queue change detected with pending items - calling processNext', {
        queueLength: queue.length,
        pendingCount: queue.filter(item => item.status === 'pending').length,
        currentItemId,
        processingCount,
        authLoading
      });
      processNext();
    }
  }, [queue, user?.uid, emailTemplate, currentItemId, processingCount, processNext, authLoading, supabaseReady, initGracePeriodComplete]);

  // Log queue state every 5 seconds for debugging
  useEffect(() => {
    const intervalId = setInterval(() => {
      const currentQueue = useQueueStore.getState();
      console.log('=== QUEUE STATE (5-SECOND REFRESH) ===');
      console.log('Timestamp:', new Date().toISOString());
      console.log('Queue Items:', currentQueue.queue);
      console.log('Total in Queue:', currentQueue.queue.length);
      console.log('Pending:', currentQueue.queue.filter(item => item.status === 'pending').length);
      console.log('Processing:', currentQueue.queue.filter(item => item.status === 'processing').length);
      console.log('Completed:', currentQueue.queue.filter(item => item.status === 'completed').length);
      console.log('Failed:', currentQueue.queue.filter(item => item.status === 'failed').length);
      console.log('LocalStorage:', localStorage.getItem('scribe-queue-storage'));
      console.log('======================================');
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

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
