/**
 * Read-only Queue State Hook
 *
 * Use this hook when you only need to READ queue state for display purposes.
 * This hook does NOT trigger any processing logic.
 *
 * For adding items to the queue, use useQueueActions.
 * For processing the queue, use useQueueManager (only in DashboardLayout).
 */

"use client";

import { useSimpleQueueStore, type CurrentTaskStatus } from "@/stores/simple-queue-store";

interface QueueState {
  // Queue stats
  pendingCount: number;
  completedCount: number;
  failedCount: number;
  isProcessing: boolean;
  processingItemId: string | null;
  currentTaskStatus: CurrentTaskStatus | null;
}

/**
 * Read-only hook for accessing queue state
 * Safe to use in any component without triggering processing logic
 */
export function useQueueState(): QueueState {
  const queue = useSimpleQueueStore(state => state.queue);
  const isProcessing = useSimpleQueueStore(state => state.isProcessing);
  const processingItemId = useSimpleQueueStore(state => state.processingItemId);
  const currentTaskStatus = useSimpleQueueStore(state => state.currentTaskStatus);

  // Calculate queue stats
  const pendingCount = queue.filter(item => item.status === "pending").length;
  const completedCount = queue.filter(item => item.status === "completed").length;
  const failedCount = queue.filter(item => item.status === "failed").length;

  return {
    pendingCount,
    completedCount,
    failedCount,
    isProcessing,
    processingItemId,
    currentTaskStatus,
  };
}
