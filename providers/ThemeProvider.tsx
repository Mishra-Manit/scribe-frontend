"use client";

import { useEffect } from "react";
import { useTheme, useThemeHasHydrated } from "@/stores/theme-store";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const hasHydrated = useThemeHasHydrated();

  useEffect(() => {
    if (!hasHydrated) return;

    const root = document.documentElement;
    
    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };

    if (theme === "system") {
      // Listen for system preference changes
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      applyTheme(mediaQuery.matches);

      const handleChange = (e: MediaQueryListEvent) => {
        applyTheme(e.matches);
      };

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    } else {
      applyTheme(theme === "dark");
    }
  }, [theme, hasHydrated]);

  // Prevent flash of unstyled content by applying theme immediately on mount
  useEffect(() => {
    // This runs once on initial mount to prevent flash
    const savedTheme = localStorage.getItem("scribe-theme-storage");
    if (savedTheme) {
      try {
        const parsed = JSON.parse(savedTheme);
        const themeValue = parsed.state?.theme;
        
        if (themeValue === "dark") {
          document.documentElement.classList.add("dark");
        } else if (themeValue === "system") {
          const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
          if (prefersDark) {
            document.documentElement.classList.add("dark");
          }
        }
      } catch {
        // Ignore parsing errors
      }
    }
  }, []);

  return <>{children}</>;
}
