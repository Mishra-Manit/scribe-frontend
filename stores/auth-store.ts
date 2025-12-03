/**
 * Auth Store (Zustand)
 *
 * Stores authentication session with localStorage persistence.
 * Provides synchronous access to tokens without async calls.
 *
 * Key principles:
 * - Single source of truth: Supabase manages tokens
 * - This store caches the current session with localStorage
 * - Synchronous token access (no await needed)
 * - Updated via onAuthStateChange events
 * - Persists across page refreshes for instant auth restoration
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Session } from '@supabase/supabase-js';
import { createLogger } from '@/utils/logger';

const logger = createLogger('AuthStore');

interface AuthState {
  // Session snapshot (synced from Supabase)
  session: Session | null;

  // Actions
  setSession: (session: Session | null) => void;
  clearSession: () => void;

  // Synchronous token getter
  getToken: () => string | null;

  // Session validity checker
  isSessionValid: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,

      setSession: (session) => {
        logger.debug('Session updated', {
          hasToken: !!session?.access_token,
          expiresAt: session?.expires_at
        });
        set({ session });
      },

      clearSession: () => {
        logger.debug('Session cleared');
        set({ session: null });
      },

      /**
       * Get authentication token synchronously
       *
       * Returns the current access token from the cached session.
       * No async calls, no network requests - just instant access.
       *
       * @returns Access token if valid, null otherwise
       */
      getToken: () => {
        const { session } = get();

        if (!session?.access_token) {
          return null;
        }

        // Check if token is expired
        const expiresAt = session.expires_at;
        if (expiresAt && Date.now() / 1000 > expiresAt) {
          logger.warn('Token expired, refresh needed');
          return null;
        }

        return session.access_token;
      },

      /**
       * Check if session is valid (has token with > 1 minute remaining)
       */
      isSessionValid: () => {
        const { session } = get();
        if (!session) return false;

        const expiresAt = session.expires_at;
        if (!expiresAt) return true;

        // Valid if more than 1 minute remaining
        return Date.now() / 1000 < (expiresAt - 60);
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        session: state.session
      }),
    }
  )
);

// Granular selectors for optimal performance
export const useSession = () => useAuthStore((state) => state.session);
export const useSetSession = () => useAuthStore((state) => state.setSession);
export const useGetToken = () => useAuthStore((state) => state.getToken);
export const useIsSessionValid = () => useAuthStore((state) => state.isSessionValid);
