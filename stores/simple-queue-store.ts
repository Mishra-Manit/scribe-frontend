/**
 * Simple Queue Store - Clean and minimal state management
 * This store only manages the queue items, no complex logic
 */

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface QueueItem {
  id: string;
  recipientName: string;
  recipientInterest: string;
  taskId?: string;
  status: "pending" | "processing" | "completed" | "failed";
  error?: string;
  createdAt: number;
}

export interface CurrentTaskStatus {
  status: "PENDING" | "STARTED" | "SUCCESS" | "FAILURE";
  result?: {
    current_step?: string;
    email_id?: string;
  };
  error?: string;
}

interface SimpleQueueStore {
  // Core state
  queue: QueueItem[];
  isProcessing: boolean;
  processingItemId: string | null;
  currentTaskStatus: CurrentTaskStatus | null;

  // Actions
  addItems: (items: Array<{name: string; interest: string}>) => void;
  startProcessing: (id: string, taskId: string) => void;
  completeItem: (id: string) => void;
  failItem: (id: string, error: string) => void;
  removeItem: (id: string) => void;
  clearQueue: () => void;
  setProcessing: (id: string | null) => void;
  setCurrentTaskStatus: (status: CurrentTaskStatus | null) => void;

  // Getters
  getNextPending: () => QueueItem | undefined;
  getProcessingItem: () => QueueItem | undefined;
}

export const useSimpleQueueStore = create<SimpleQueueStore>()(
  persist(
    (set, get) => ({
      queue: [],
      isProcessing: false,
      processingItemId: null,
      currentTaskStatus: null,

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
