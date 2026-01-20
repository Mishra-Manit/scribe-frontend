/**
 * UI State Store (Zustand)
 * Manages client-side UI state with localStorage persistence
 *
 * Use this for:
 * - Form inputs and temporary data
 * - UI preferences (theme, layout, etc.)
 * - Transient state that doesn't need to sync with server
 */

"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface UIState {
  // Hydration state (Next.js SSR protection)
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;

  // Recipient form fields
  recipientName: string;
  setRecipientName: (name: string) => void;

  recipientInterest: string;
  setRecipientInterest: (interest: string) => void;

  // UI interaction state (not persisted)
  hoveredEmailId: string | null;
  setHoveredEmailId: (id: string | null) => void;

  copiedEmailId: string | null;
  setCopiedEmailId: (id: string | null) => void;

  // Reset all form state
  resetForm: () => void;

  // Reset all UI state
  reset: () => void;
}

const initialState = {
  _hasHydrated: false,
  recipientName: "",
  recipientInterest: "",
  hoveredEmailId: null,
  copiedEmailId: null,
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Initial state
      ...initialState,

      // Actions
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      setRecipientName: (name) => set({ recipientName: name }),
      setRecipientInterest: (interest) => set({ recipientInterest: interest }),
      setHoveredEmailId: (id) => set({ hoveredEmailId: id }),
      setCopiedEmailId: (id) => set({ copiedEmailId: id }),

      resetForm: () =>
        set({
          recipientName: "",
          recipientInterest: "",
        }),

      reset: () => set(initialState),
    }),
    {
      name: "scribe-ui-storage", // localStorage key
      storage: createJSONStorage(() => localStorage),

      // Only persist these fields (not hover/copied state or hydration flag)
      partialize: (state) => ({
        recipientName: state.recipientName,
        recipientInterest: state.recipientInterest,
      }),

      // Mark as hydrated after rehydration completes (Next.js SSR protection)
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

/**
 * Granular selectors for optimal re-render performance
 * Components only re-render when their specific slice changes
 */

// Recipient selectors
export const useRecipientName = () => useUIStore((state) => state.recipientName);
export const useSetRecipientName = () =>
  useUIStore((state) => state.setRecipientName);

export const useRecipientInterest = () =>
  useUIStore((state) => state.recipientInterest);
export const useSetRecipientInterest = () =>
  useUIStore((state) => state.setRecipientInterest);

// Hover/copied selectors
export const useHoveredEmailId = () =>
  useUIStore((state) => state.hoveredEmailId);
export const useSetHoveredEmailId = () =>
  useUIStore((state) => state.setHoveredEmailId);

export const useCopiedEmailId = () =>
  useUIStore((state) => state.copiedEmailId);
export const useSetCopiedEmailId = () =>
  useUIStore((state) => state.setCopiedEmailId);

// Form reset selectors
export const useResetForm = () => useUIStore((state) => state.resetForm);

// Hydration selector (Next.js SSR protection)
export const useHasHydrated = () => useUIStore((state) => state._hasHydrated);

/**
 * Usage Examples:
 *
 * 1. Basic usage:
 *    const recipientName = useRecipientName();
 *    const setRecipientName = useSetRecipientName();
 *
 * 2. Full store access:
 *    const { recipientName, setRecipientName, resetForm } = useUIStore();
 *
 * 3. Optimized component (only re-renders when recipientName changes):
 *    function RecipientInput() {
 *      const name = useRecipientName();
 *      const setName = useSetRecipientName();
 *      return <input value={name} onChange={(e) => setName(e.target.value)} />;
 *    }
 */
