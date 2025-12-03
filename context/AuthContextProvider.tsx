"use client"
import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "../config/supabase";
import { api } from "../lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { createLogger } from "@/utils/logger";
import { AUTH_ERRORS } from "@/constants/error-messages";
import { toastService } from "@/lib/toast-service";

const logger = createLogger('AuthContext');

interface User {
  uid: string;
  email: string | undefined;
  displayName: string;
  claims: Record<string, unknown>;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  supabaseReady: boolean;
  userInitError: string | null;
  logout: () => Promise<void>;
  retryUserInit: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthContextProvider');
  }
  return context;
}

export const AuthContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [supabaseReady, setSupabaseReady] = useState(false)
  const [userInitError, setUserInitError] = useState<string | null>(null)
  
  // Use ref to track initialization state so timeout can check current value
  const hasInitializedRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let mounted = true;

    // Process session - unified function for both initial check and auth state changes
    const processSession = async (session: any, event: string) => {
      if (!mounted) return;

      // Sync session from cookies to Zustand store immediately
      useAuthStore.getState().setSession(session);

      logger.info('Processing session', {
        event,
        hasSession: !!session,
        userId: session?.user?.id,
        userEmail: session?.user?.email
      });

      try {
        if (session?.user) {
          // Extract user data directly from session (no getClaims needed)
          const userData = {
            uid: session.user.id,
            email: session.user.email,
            displayName: session.user.user_metadata?.full_name ||
                         session.user.email?.split('@')[0] ||
                         'User',
            claims: session.user.user_metadata || {},
          };

          logger.info('User authenticated', {
            uid: userData.uid,
            email: userData.email
          });

          if (mounted) {
            setUser(userData);
          }

          // BLOCKING: Initialize user in backend database
          try {
            logger.info('Initializing user in backend database', { userId: userData.uid });
            await api.user.initUser(userData.displayName);
            logger.info('User initialized in backend database', { userId: userData.uid });

            if (mounted) {
              setUserInitError(null);
            }
          } catch (error: any) {
            logger.error(AUTH_ERRORS.USER_INIT_FAILED.dev, {
              userId: userData.uid,
              error: error instanceof Error ? error.message : 'Unknown error'
            });

            if (mounted) {
              const errorMessage = error.status === 401 || error.status === 403
                ? AUTH_ERRORS.USER_INIT_FORBIDDEN.user
                : error.message || AUTH_ERRORS.USER_INIT_FAILED.user;
              setUserInitError(errorMessage);
              toastService.errorMessage(errorMessage);
            }
          }
        } else {
          logger.info('No session - clearing user state');
          useAuthStore.getState().clearSession();
          if (mounted) {
            setUser(null);
            setUserInitError(null);
          }
        }
      } catch (error) {
        logger.error(AUTH_ERRORS.SESSION_PROCESSING_ERROR.dev, {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        useAuthStore.getState().clearSession();
        if (mounted) {
          setUser(null);
          setUserInitError(null);
        }
      } finally {
        // Set loading to false AFTER all processing complete
        if (mounted) {
          logger.debug('Session processing complete');
          setLoading(false);
          setSupabaseReady(true); // Always ready after session processed
          hasInitializedRef.current = true;

          // Clear any timeouts
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
        }
      }
    };

    // Listen for auth state changes
    // Note: onAuthStateChange will automatically trigger with the current session when initialized
    logger.info('Auth context initializing');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logger.debug('Auth state change', { event });
        if (!mounted) {
          logger.debug('Component unmounted - ignoring event');
          return;
        }

        // Process all auth events
        await processSession(session, event);
      }
    );

    return () => {
      mounted = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      subscription.unsubscribe();
    };
  }, []);

  // Retry user initialization (for error recovery)
  const retryUserInit = async () => {
    if (!user) return;

    logger.info('Retrying user initialization', { userId: user.uid });
    setUserInitError(null);

    try {
      const displayName = user.displayName || user.email?.split('@')[0];
      await api.user.initUser(displayName);
      logger.info('User initialization retry successful', { userId: user.uid });
    } catch (error: any) {
      logger.error('User initialization retry failed', {
        userId: user.uid,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      const errorMessage = error.status === 401 || error.status === 403
        ? AUTH_ERRORS.USER_INIT_FORBIDDEN.user
        : error.message || AUTH_ERRORS.USER_INIT_FAILED.user;
      setUserInitError(errorMessage);
      toastService.errorMessage(errorMessage);
    }
  };

  const logout = async () => {
    // Clear Zustand session store before signing out
    useAuthStore.getState().clearSession();
    await supabase.auth.signOut();
    setUser(null);
    setUserInitError(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, supabaseReady, userInitError, logout, retryUserInit }}>
      {children}
    </AuthContext.Provider>
  );
}
