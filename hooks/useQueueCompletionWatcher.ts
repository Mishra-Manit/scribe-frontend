"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { QueueItem } from "@/lib/api";

interface UseQueueCompletionWatcherOptions {
  queueItems: QueueItem[];
  enabled?: boolean;
}

/**
 * Invalidates email history and user profile queries when queue items complete.
 * Tracks completion state across renders to detect new completions.
 */
export function useQueueCompletionWatcher({
  queueItems,
  enabled = true,
}: UseQueueCompletionWatcherOptions): void {
  const queryClient = useQueryClient();

  // Track completed IDs across renders without causing re-renders
  const previouslyCompletedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || queueItems.length === 0) return;

    const currentlyCompletedIds = new Set(
      queueItems
        .filter((item) => item.status === "completed")
        .map((item) => item.id)
    );

    // Detect any newly completed items by comparing with previous render
    const hasNewlyCompletedItems = [...currentlyCompletedIds].some(
      (id) => !previouslyCompletedIds.current.has(id)
    );

    if (hasNewlyCompletedItems) {
      // Refresh email list to show newly generated emails
      queryClient.invalidateQueries({
        queryKey: queryKeys.emails.infiniteAll(),
      });

      // Update user profile to reflect updated generation_count
      queryClient.invalidateQueries({
        queryKey: queryKeys.user.profile(),
      });
    }

    previouslyCompletedIds.current = currentlyCompletedIds;
  }, [queueItems, enabled, queryClient]);
}
