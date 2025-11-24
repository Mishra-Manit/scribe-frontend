/**
 * Auth Store (Zustand)
 *
 * Stores authentication session snapshot for synchronous access.
 * DOES NOT handle token refresh - that's Supabase's job via autoRefreshToken.
 *
 * This store mirrors Supabase's auth state and provides instant
 * access to tokens without async calls.
 *
 * Key principles:
 * - Single source of truth: Supabase manages tokens
 * - This store just caches the current session
 * - Synchronous token access (no await needed)
 * - Updated via onAuthStateChange events
 */

import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';

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

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,

  setSession: (session) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[AuthStore] Session updated:', {
        hasToken: !!session?.access_token,
        expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
      });
    }
    set({ session });
  },

  clearSession: () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[AuthStore] Session cleared');
    }
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

    // Optional: Check if token is expired
    const expiresAt = session.expires_at;
    if (expiresAt && Date.now() / 1000 > expiresAt) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[AuthStore] Token expired, Supabase should refresh automatically');
      }
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

    // Consider valid if more than 1 minute remaining
    return Date.now() / 1000 < (expiresAt - 60);
  },
}));

// Granular selectors for optimal performance
export const useSession = () => useAuthStore((state) => state.session);
export const useSetSession = () => useAuthStore((state) => state.setSession);
export const useGetToken = () => useAuthStore((state) => state.getToken);
export const useIsSessionValid = () => useAuthStore((state) => state.isSessionValid);
