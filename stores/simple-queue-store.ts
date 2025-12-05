/**
 * Simple Queue Store - Clean and minimal state management
 * This store only manages the queue items, no complex logic
 */

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { type TaskStatusResponse } from "@/lib/schemas";

export interface QueueItem {
  id: string;
  recipientName: string;
  recipientInterest: string;
  taskId?: string;
  status: "pending" | "processing" | "completed" | "failed";
  error?: string;
  createdAt: number;
}

// Re-export TaskStatusResponse as CurrentTaskStatus for backwards compatibility
export type CurrentTaskStatus = TaskStatusResponse;

interface SimpleQueueStore {
  // Core state
  queue: QueueItem[];
  isProcessing: boolean;
  processingItemId: string | null;
  currentTaskStatus: CurrentTaskStatus | null;

  // Daily session tracking
  sessionCompletedCount: number;
  sessionFailedCount: number;
  lastResetDate: string; // ISO date string (YYYY-MM-DD)

  // Actions
  addItems: (items: Array<{name: string; interest: string}>) => void;
  startProcessing: (id: string, taskId: string) => void;
  completeItem: (id: string) => void;
  failItem: (id: string, error: string) => void;
  removeItem: (id: string) => void;
  clearQueue: () => void;
  setProcessing: (id: string | null) => void;
  setCurrentTaskStatus: (status: CurrentTaskStatus | null) => void;
  checkAndResetDaily: () => void;
  incrementSessionCompleted: () => void;
  incrementSessionFailed: () => void;

  // Getters
  getNextPending: () => QueueItem | undefined;
  getProcessingItem: () => QueueItem | undefined;
}

// Helper to get today's date as YYYY-MM-DD
const getTodayDate = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

export const useSimpleQueueStore = create<SimpleQueueStore>()(
  persist(
    (set, get) => ({
      queue: [],
      isProcessing: false,
      processingItemId: null,
      currentTaskStatus: null,

      // Daily session tracking - initialized to today
      sessionCompletedCount: 0,
      sessionFailedCount: 0,
      lastResetDate: getTodayDate(),

      addItems: (items) => {
        const newItems: QueueItem[] = items.map(item => ({
          id: `${Date.now()}-${Math.random()}`,
          recipientName: item.name,
          recipientInterest: item.interest,
          status: "pending",
          createdAt: Date.now(),
        }));

        set(state => ({ queue: [...state.queue, ...newItems] }));
      },
      
      startProcessing: (id, taskId) => {
        set(state => ({
          queue: state.queue.map(item => 
            item.id === id 
              ? { ...item, status: "processing", taskId }
              : item
          ),
        }));
      },
      
      completeItem: (id) => {
        set(state => ({
          queue: state.queue.map(item =>
            item.id === id
              ? { ...item, status: "completed" }
              : item
          ),
        }));
      },
      
      failItem: (id, error) => {
        set(state => ({
          queue: state.queue.map(item =>
            item.id === id
              ? { ...item, status: "failed", error }
              : item
          ),
        }));
      },
      
      removeItem: (id) => {
        set(state => ({
          queue: state.queue.filter(item => item.id !== id),
        }));
      },
      
      clearQueue: () => {
        set({ queue: [] });
      },

      setProcessing: (id) => {
        set({
          isProcessing: id !== null,
          processingItemId: id,
        });
      },

      setCurrentTaskStatus: (status) => {
        set({ currentTaskStatus: status });
      },

      checkAndResetDaily: () => {
        const today = getTodayDate();
        const lastReset = get().lastResetDate;

        // If it's a new day, reset the session counters
        if (today !== lastReset) {
          set({
            sessionCompletedCount: 0,
            sessionFailedCount: 0,
            lastResetDate: today,
          });
        }
      },

      incrementSessionCompleted: () => {
        // Check if we need to reset first
        get().checkAndResetDaily();

        set(state => ({
          sessionCompletedCount: state.sessionCompletedCount + 1,
        }));
      },

      incrementSessionFailed: () => {
        // Check if we need to reset first
        get().checkAndResetDaily();

        set(state => ({
          sessionFailedCount: state.sessionFailedCount + 1,
        }));
      },

      getNextPending: () => {
        return get().queue.find(item => item.status === "pending");
      },

      getProcessingItem: () => {
        return get().queue.find(item => item.status === "processing");
      },
    }),
    {
      name: "simple-queue-storage",
    }
  )
);
