-/**
 * Email Generation Queue Store (Zustand)
 * Manages the queue of emails to be generated with localStorage persistence
 *
 * This store handles queue state only. The actual generation logic
 * will be handled by React Query mutations in Phase 2.
 */

"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { TemplateType } from "@/lib/schemas";

/**
 * Queue item status
 */
export type QueueItemStatus = "pending" | "processing" | "completed" | "failed";

/**
 * Queue item interface
 */
export interface QueueItem {
  id: string;
  name: string;
  interest: string;
  template_type: TemplateType;
  status: QueueItemStatus;
  taskId?: string; // Celery task ID when processing
  error?: string; // Error message if failed
  createdAt: number; // Timestamp
}

interface QueueState {
  // Queue state
  queue: QueueItem[];

  // Actions
  addToQueue: (items: Omit<QueueItem, "id" | "status" | "createdAt">[]) => void;
  removeFromQueue: (id: string) => void;
  updateItemStatus: (
    id: string,
    status: QueueItemStatus,
    taskId?: string,
    error?: string
  ) => void;
  clearQueue: () => void;
  clearCompleted: () => void;

  // Selectors (computed values)
  getNextPending: () => QueueItem | undefined;
  getPendingCount: () => number;
  getProcessingCount: () => number;
  getCompletedCount: () => number;
  getFailedCount: () => number;
}

export const useQueueStore = create<QueueState>()(
  persist(
    (set, get) => ({
      // Initial state
      queue: [],

      // Add items to queue
      addToQueue: (items) =>
        set((state) => ({
          queue: [
            ...state.queue,
            ...items.map((item) => ({
              ...item,
              id: `${item.name}-${Date.now()}-${Math.random()}`,
              status: "pending" as const,
              createdAt: Date.now(),
            })),
          ],
        })),

      // Remove item from queue
      removeFromQueue: (id) =>
        set((state) => ({
          queue: state.queue.filter((item) => item.id !== id),
        })),

      // Update item status
      updateItemStatus: (id, status, taskId, error) =>
        set((state) => ({
          queue: state.queue.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status,
                  ...(taskId && { taskId }),
                  ...(error && { error }),
                }
              : item
          ),
        })),

      // Clear entire queue
      clearQueue: () => set({ queue: [] }),

      // Clear only completed items
      clearCompleted: () =>
        set((state) => ({
          queue: state.queue.filter((item) => item.status !== "completed"),
        })),

      // Get next pending item
      getNextPending: () => {
        const state = get();
        return state.queue.find((item) => item.status === "pending");
      },

      // Get pending count
      getPendingCount: () => {
        const state = get();
        return state.queue.filter((item) => item.status === "pending").length;
      },

      // Get processing count
      getProcessingCount: () => {
        const state = get();
        return state.queue.filter((item) => item.status === "processing").length;
      },

      // Get completed count
      getCompletedCount: () => {
        const state = get();
        return state.queue.filter((item) => item.status === "completed").length;
      },

      // Get failed count
      getFailedCount: () => {
        const state = get();
        return state.queue.filter((item) => item.status === "failed").length;
      },
    }),
    {
      name: "scribe-queue-storage", // localStorage key
      storage: createJSONStorage(() => localStorage),
    }
  )
);

/**
 * Granular selectors for optimal re-render performance
 */

export const useQueue = () => useQueueStore((state) => state.queue);
export const useAddToQueue = () => useQueueStore((state) => state.addToQueue);
export const useRemoveFromQueue = () =>
  useQueueStore((state) => state.removeFromQueue);
export const useUpdateItemStatus = () =>
  useQueueStore((state) => state.updateItemStatus);
export const useClearQueue = () => useQueueStore((state) => state.clearQueue);
export const useClearCompleted = () =>
  useQueueStore((state) => state.clearCompleted);

export const useNextPending = () =>
  useQueueStore((state) => state.getNextPending());
export const usePendingCount = () =>
  useQueueStore((state) => state.getPendingCount());
export const useProcessingCount = () =>
  useQueueStore((state) => state.getProcessingCount());
export const useCompletedCount = () =>
  useQueueStore((state) => state.getCompletedCount());
export const useFailedCount = () =>
  useQueueStore((state) => state.getFailedCount());

/**
 * Usage Examples:
 *
 * 1. Add items to queue:
 *    const addToQueue = useAddToQueue();
 *    addToQueue([{
 *      name: "Dr. Jane Smith",
 *      interest: "machine learning",
 *      template_type: "research"
 *    }]);
 *
 * 2. Update item status when processing:
 *    const updateStatus = useUpdateItemStatus();
 *    updateStatus(itemId, "processing", taskId);
 *
 * 3. Get pending count for UI:
 *    const pendingCount = usePendingCount();
 *    return <Badge>{pendingCount} pending</Badge>;
 *
 * 4. Process queue with React Query (Phase 2):
 *    const nextItem = useNextPending();
 *    const generateEmail = useGenerateEmail();
 *
 *    if (nextItem && !isGenerating) {
 *      generateEmail.mutate({
 *        email_template: template,
 *        recipient_name: nextItem.name,
 *        recipient_interest: nextItem.interest,
 *        template_type: nextItem.template_type,
 *      });
 *    }
 */
