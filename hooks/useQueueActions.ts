/**
 * Queue Actions Hook
 *
 * Lightweight hook for components that need to interact with the queue
 * without managing the processing logic.
 *
 * Follows Single Responsibility Principle:
 * - This hook: Provides actions to add/clear queue items
 * - useQueueManager: Handles background processing (used in layout only)
 */

"use client";

import { useSimpleQueueStore } from "@/stores/simple-queue-store";

interface QueueActions {
  addToQueue: (items: Array<{ name: string; interest: string }>) => void;
  clearQueue: () => void;
}

/**
 * Hook for components that need to add items to the queue
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { addToQueue } = useQueueActions();
 *
 *   const handleGenerate = () => {
 *     addToQueue([{ name: "Dr. Smith", interest: "AI" }]);
 *   };
 * }
 * ```
 */
export function useQueueActions(): QueueActions {
  const addItems = useSimpleQueueStore((state) => state.addItems);
  const clearQueue = useSimpleQueueStore((state) => state.clearQueue);

  return {
    addToQueue: addItems,
    clearQueue,
  };
}
