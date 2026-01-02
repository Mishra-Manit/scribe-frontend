/**
 * Simple Queue Manager - The single hook that manages everything
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useSimpleQueueStore } from "@/stores/simple-queue-store";
import { useEmailTemplate } from "@/stores/ui-store";
import { emailAPI, type TaskStatusResponse } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import logger from "@/utils/logger";
import { QUEUE_ERRORS } from "@/constants/error-messages";
import { toastService } from "@/lib/toast-service";

interface QueueManagerState {
  // Current processing state
  currentTaskId: string | null;
  currentTaskStatus: TaskStatusResponse | null;
  isProcessing: boolean;
  
  // Queue stats
  pendingCount: number;
  completedCount: number;
  failedCount: number;
  
  // Actions
  addToQueue: (items: Array<{name: string; interest: string}>) => void;
  clearQueue: () => void;
}

/**
 * The main queue manager hook
 * This is the single source of truth for queue management
 */
export function useQueueManager(): QueueManagerState {
  const { user, supabaseReady } = useAuth();
  const queryClient = useQueryClient();
  const emailTemplate = useEmailTemplate();
  
  // Store actions and state
  const {
    queue,
    isProcessing,
    addItems,
    startProcessing,
    completeItem,
    failItem,
    removeItem,
    clearQueue,
    setProcessing,
    setCurrentTaskStatus,
    getNextPending,
    getProcessingItem,
    incrementSessionCompleted,
    incrementSessionFailed,
    checkAndResetDaily,
    sessionCompletedCount,
    sessionFailedCount,
  } = useSimpleQueueStore();

  // Local state for current processing
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const processingRef = useRef(false);
  const processingLockRef = useRef<Promise<void> | null>(null);

  // Check and reset daily counters if needed
  checkAndResetDaily();

  // Calculate queue stats
  const pendingCount = queue.filter(item => item.status === "pending").length;
  
  // Poll task status when we have a task ID
  const { data: taskStatus } = useQuery({
    queryKey: currentTaskId ? queryKeys.tasks.status(currentTaskId) : ['task-disabled'],
    queryFn: () => emailAPI.getTaskStatus(currentTaskId!),
    enabled: !!currentTaskId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Stop polling when complete
      if (status === "SUCCESS" || status === "FAILURE") {
        return false;
      }
      return 2000; // Poll every 2 seconds
    },
  });
  
  // Process next item in queue
  const processNextItem = async () => {
    // MUTEX LOCK: If another call is already processing, return immediately
    if (processingLockRef.current) {
      logger.debug("[Queue] Processing lock held, skipping duplicate call");
      return;
    }

    // Double-check processing state
    if (isProcessing || processingRef.current) {
      logger.debug("[Queue] Already processing, skipping");
      return;
    }

    // Check prerequisites
    if (!user?.uid || !emailTemplate || !supabaseReady) {
      logger.debug("[Queue] Prerequisites not met");
      return;
    }

    // Get next pending item
    const nextItem = getNextPending();
    if (!nextItem) {
      logger.debug("[Queue] No pending items");
      return;
    }

    logger.info(`[Queue] Starting processing for: ${nextItem.recipientName}`);

    // Create and acquire lock
    const lockPromise = (async () => {
      // Set processing state atomically
      setProcessing(nextItem.id);
      processingRef.current = true;

      try {
        // Start email generation
        const response = await emailAPI.generateEmail({
          email_template: emailTemplate,
          recipient_name: nextItem.recipientName,
          recipient_interest: nextItem.recipientInterest,
        });

        // Update queue item with task ID
        startProcessing(nextItem.id, response.task_id);
        setCurrentTaskId(response.task_id);
        logger.info(`[Queue] Started task ${response.task_id} for ${nextItem.recipientName}`);

      } catch (error) {
        logger.error(QUEUE_ERRORS.GENERATION_START_FAILED.dev, {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        failItem(nextItem.id, error instanceof Error ? error.message : QUEUE_ERRORS.UNKNOWN_ERROR.dev);
        incrementSessionFailed();
        toastService.error(QUEUE_ERRORS.GENERATION_FAILED);

        // Clear processing state
        setProcessing(null);
        processingRef.current = false;
        setCurrentTaskStatus(null);

        // Try next item after delay
        setTimeout(() => {
          processingLockRef.current = null; // Release lock
          processNextItem();
        }, 1000);
      }
    })();

    processingLockRef.current = lockPromise;
    await lockPromise;
    processingLockRef.current = null;
  };
  
  // Update store with task status for display components
  useEffect(() => {
    if (taskStatus) {
      setCurrentTaskStatus(taskStatus);
    }
  }, [taskStatus, setCurrentTaskStatus]);

  // Handle task completion/failure
  useEffect(() => {
    if (!taskStatus || !currentTaskId) return;

    const processingItem = getProcessingItem();
    if (!processingItem) return;

    if (taskStatus.status === "SUCCESS" && taskStatus.result?.email_id) {
      logger.info(`[Queue] Task ${currentTaskId} completed successfully for ${processingItem.recipientName}`);

      // Mark as completed and increment session counter
      completeItem(processingItem.id);
      incrementSessionCompleted();

      // Invalidate email history queries to show new email
      queryClient.invalidateQueries({
        queryKey: queryKeys.emails.infiniteAll()  // Invalidates all infinite queries
      });

      // Invalidate user profile to update generation_count
      queryClient.invalidateQueries({
        queryKey: queryKeys.user.profile()
      });

      // Remove from queue after delay
      setTimeout(() => {
        removeItem(processingItem.id);
      }, 2000);

      // Reset state
      setCurrentTaskId(null);
      setProcessing(null);
      processingRef.current = false;
      setCurrentTaskStatus(null);

      // CRITICAL: Use setTimeout to ensure state updates complete before next processing
      // This prevents the auto-start effect from firing prematurely
      setTimeout(() => {
        processingLockRef.current = null; // Release lock
        logger.debug("[Queue] Processing next item after success");
        processNextItem(); // Process next item
      }, 500);

    } else if (taskStatus.status === "FAILURE") {
      logger.info(QUEUE_ERRORS.TASK_FAILED.dev, {
        taskId: currentTaskId,
        recipientName: processingItem.recipientName,
        error: taskStatus.error
      });

      // Mark as failed and increment session counter
      const errorMessage = typeof taskStatus.error === 'string'
        ? taskStatus.error
        : taskStatus.error?.message || QUEUE_ERRORS.TASK_FAILED.dev;
      failItem(processingItem.id, errorMessage);
      incrementSessionFailed();
      toastService.error(QUEUE_ERRORS.GENERATION_FAILED);

      // Remove from queue after delay
      setTimeout(() => {
        removeItem(processingItem.id);
      }, 3000);

      // Reset state
      setCurrentTaskId(null);
      setProcessing(null);
      processingRef.current = false;
      setCurrentTaskStatus(null);

      // CRITICAL: Same pattern for failures
      setTimeout(() => {
        processingLockRef.current = null; // Release lock
        logger.debug("[Queue] Processing next item after failure");
        processNextItem();
      }, 1000);
    }
  }, [taskStatus, currentTaskId]);

  // Recovery: Check for stuck processing items on mount
  useEffect(() => {
    const processingItem = getProcessingItem();
    if (processingItem && processingItem.taskId) {
      // Resume polling for existing task
      logger.info(`[Queue] Resuming task ${processingItem.taskId} on mount`);
      setCurrentTaskId(processingItem.taskId);
      setProcessing(processingItem.id);
      processingRef.current = true;
    } else if (processingItem) {
      // No task ID means it was interrupted - reset to pending
      logger.debug("[Queue] Found interrupted processing item, resetting");
      failItem(processingItem.id, QUEUE_ERRORS.TASK_INTERRUPTED.dev);
      setProcessing(null);
      processingRef.current = false;
    }
  }, []); // Run only on mount

  // Auto-start: Start processing when prerequisites are met and items are pending
  // The mutex lock in processNextItem prevents duplicate calls
  useEffect(() => {
    if (user?.uid && emailTemplate && supabaseReady && pendingCount > 0 && !isProcessing) {
      logger.debug("[Queue] Prerequisites met, starting processing");
      setTimeout(() => processNextItem(), 100);
    }
  }, [user?.uid, emailTemplate, supabaseReady, pendingCount, isProcessing]);

  return {
    currentTaskId,
    currentTaskStatus: taskStatus || null,
    isProcessing,
    pendingCount,
    completedCount: sessionCompletedCount,
    failedCount: sessionFailedCount,
    addToQueue: (items: Array<{name: string; interest: string}>) => {
      logger.info(`[Queue] Adding ${items.length} items to queue`);
      addItems(items);
      // Trigger processing after items are added
      setTimeout(() => processNextItem(), 100);
    },
    clearQueue,
  };
}
