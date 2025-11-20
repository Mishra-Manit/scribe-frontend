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
import type { TemplateType } from "@/lib/schemas";

interface UIState {
  // Email generation form state
  emailTemplate: string;
  setEmailTemplate: (template: string) => void;

  // Template type preference (persisted)
  defaultTemplateType: TemplateType;
  setDefaultTemplateType: (type: TemplateType) => void;

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
  emailTemplate: "",
  defaultTemplateType: "research" as TemplateType,
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
      setEmailTemplate: (template) => set({ emailTemplate: template }),
      setDefaultTemplateType: (type) => set({ defaultTemplateType: type }),
      setRecipientName: (name) => set({ recipientName: name }),
      setRecipientInterest: (interest) => set({ recipientInterest: interest }),
      setHoveredEmailId: (id) => set({ hoveredEmailId: id }),
      setCopiedEmailId: (id) => set({ copiedEmailId: id }),

      resetForm: () =>
        set({
          emailTemplate: "",
          recipientName: "",
          recipientInterest: "",
        }),

      reset: () => set(initialState),
    }),
    {
      name: "scribe-ui-storage", // localStorage key
      storage: createJSONStorage(() => localStorage),

      // Only persist these fields (not hover/copied state)
      partialize: (state) => ({
        emailTemplate: state.emailTemplate,
        defaultTemplateType: state.defaultTemplateType,
        recipientName: state.recipientName,
        recipientInterest: state.recipientInterest,
      }),
    }
  )
);

/**
 * Granular selectors for optimal re-render performance
 * Components only re-render when their specific slice changes
 */

// Email template selectors
export const useEmailTemplate = () =>
  useUIStore((state) => state.emailTemplate);
export const useSetEmailTemplate = () =>
  useUIStore((state) => state.setEmailTemplate);

// Template type selectors
export const useDefaultTemplateType = () =>
  useUIStore((state) => state.defaultTemplateType);
export const useSetDefaultTemplateType = () =>
  useUIStore((state) => state.setDefaultTemplateType);

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

/**
 * Usage Examples:
 *
 * 1. Basic usage:
 *    const template = useEmailTemplate();
 *    const setTemplate = useSetEmailTemplate();
 *
 * 2. Full store access:
 *    const { emailTemplate, setEmailTemplate, resetForm } = useUIStore();
 *
 * 3. Optimized component (only re-renders when template changes):
 *    function TemplateInput() {
 *      const template = useEmailTemplate();
 *      const setTemplate = useSetEmailTemplate();
 *      return <textarea value={template} onChange={(e) => setTemplate(e.target.value)} />;
 *    }
 */
