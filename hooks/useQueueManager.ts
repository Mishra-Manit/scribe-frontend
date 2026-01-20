/**
 * Database-Backed Queue Manager
 *
 * Simplified queue management hook that uses the database as the source of truth.
 * Replaces the localStorage-based implementation with server-driven state.
 */

"use client";

import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queueAPI, type QueueItem, type BatchItem } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { toastService } from "@/lib/toast-service";
import logger from "@/utils/logger";
import { useQueueCompletionWatcher } from "./useQueueCompletionWatcher";

export interface QueueManagerState {
  // Queue data from server
  queueItems: QueueItem[];
  isLoading: boolean;

  // Computed stats
  pendingCount: number;
  processingCount: number;
  completedCount: number;
  failedCount: number;

  // Current processing item (if any)
  currentItem: QueueItem | null;

  // Actions
  submitBatch: (items: Array<{ name: string; interest: string }>, template: string) => Promise<void>;
  cancelItem: (id: string) => Promise<void>;
}

/**
 * Server-driven queue manager hook
 *
 * Features:
 * - Polls /api/queue/ every 2 seconds when items are pending/processing
 * - Database is the single source of truth
 * - No localStorage persistence needed
 * - Automatic cache invalidation on mutations
 */
export function useQueueManager(): QueueManagerState {
  const { user, supabaseReady } = useAuth();
  const queryClient = useQueryClient();

  // Poll queue status from server
  const {
    data: queueItems = [],
    isLoading,
  } = useQuery({
    queryKey: queryKeys.queue.items(),
    queryFn: ({ signal }) => queueAPI.getQueueItems({ signal }),
    enabled: !!user?.uid && supabaseReady,
    refetchInterval: (query) => {
      // Only poll if there are pending/processing items
      const items = query.state.data || [];
      const hasActive = items.some(
        (i) => i.status === "pending" || i.status === "processing"
      );
      return hasActive ? 2000 : false; // Poll every 2s if active, otherwise stop
    },
    staleTime: 1000, // Consider data fresh for 1 second
  });

  // Batch submission mutation
  const submitMutation = useMutation({
    mutationFn: async ({ items, template }: { items: BatchItem[], template: string }) => {
      if (!template) {
        throw new Error("Email template is required");
      }
      return queueAPI.submitBatch(items, template);
    },
    onSuccess: (data) => {
      logger.info(`[Queue] Submitted ${data.queue_item_ids.length} items`);
      toastService.success(`Added ${data.queue_item_ids.length} items to queue`);

      // Invalidate queue items to show new items
      queryClient.invalidateQueries({ queryKey: queryKeys.queue.items() });
    },
    onError: (error) => {
      logger.error("[Queue] Batch submission failed", { error });
      toastService.errorMessage("Failed to add items to queue");
    },
  });

  // Cancel item mutation
  const cancelMutation = useMutation({
    mutationFn: (id: string) => queueAPI.cancelItem(id),
    onSuccess: () => {
      logger.info("[Queue] Item cancelled");
      // Invalidate queue items to remove cancelled item
      queryClient.invalidateQueries({ queryKey: queryKeys.queue.items() });
    },
    onError: (error) => {
      logger.error("[Queue] Cancel failed", { error });
      toastService.errorMessage("Failed to cancel queue item");
    },
  });

  // Computed values from server data (single-pass optimization)
  const { pendingCount, processingCount, completedCount, failedCount, currentItem } = useMemo(() => {
    const counts = { pending: 0, processing: 0, completed: 0, failed: 0 };
    let current: QueueItem | null = null;

    for (const item of queueItems) {
      counts[item.status]++;
      if (item.status === "processing" && !current) {
        current = item;
      }
    }

    return {
      pendingCount: counts.pending,
      processingCount: counts.processing,
      completedCount: counts.completed,
      failedCount: counts.failed,
      currentItem: current,
    };
  }, [queueItems]);

  // Watch for newly completed items and invalidate relevant queries
  useQueueCompletionWatcher({ queueItems });

  return {
    queueItems,
    isLoading,
    pendingCount,
    processingCount,
    completedCount,
    failedCount,
    currentItem,

    submitBatch: async (items: Array<{ name: string; interest: string }>, template: string) => {
      if (!template) {
        toastService.errorMessage("Please set an email template first");
        return;
      }

      const batchItems: BatchItem[] = items.map((item) => ({
        recipient_name: item.name,
        recipient_interest: item.interest,
      }));

      await submitMutation.mutateAsync({ items: batchItems, template });
    },

    cancelItem: async (id: string) => {
      await cancelMutation.mutateAsync(id);
    },
  };
}
