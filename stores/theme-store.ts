/**
 * Theme Store (Zustand)
 * Manages dark/light mode with localStorage persistence and system preference detection
 */

"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Theme = "light" | "dark" | "system";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  
  // Hydration state (Next.js SSR protection)
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "system",
      _hasHydrated: false,
      
      setTheme: (theme) => set({ theme }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: "scribe-theme-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ theme: state.theme }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

// Granular selectors
export const useTheme = () => useThemeStore((state) => state.theme);
export const useSetTheme = () => useThemeStore((state) => state.setTheme);
export const useThemeHasHydrated = () => useThemeStore((state) => state._hasHydrated);
