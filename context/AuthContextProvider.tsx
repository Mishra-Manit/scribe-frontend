"use client"
import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "../config/supabase";
import { api } from "../lib/api";
import { useAuthStore } from "@/stores/auth-store";

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

    // Verify Supabase is ready by testing getSession() works without timeout
    // This ensures cookies are available and middleware has set up session
    const verifySupabaseReady = async (): Promise<boolean> => {
      console.log('[Auth] 🔍 VERIFYING SUPABASE READY STATE...');
      const verifyStart = Date.now();

      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            console.log('[Auth] ⏱️  Verification timeout triggered after 2000ms');
            reject(new Error('Verification timeout'));
          }, 2000);
        });

        console.log('[Auth] 📡 Calling supabase.auth.getSession() for verification...');
        const { data, error } = await Promise.race([
          supabase.auth.getSession(),
          timeoutPromise
        ]) as Awaited<ReturnType<typeof supabase.auth.getSession>>;

        const verifyDuration = Date.now() - verifyStart;

        if (error) {
          console.warn(`[Auth] ❌ Supabase verification failed (${verifyDuration}ms):`, error);
          return false;
        }

        console.log(`[Auth] ✅ Supabase client verified ready (${verifyDuration}ms)`, {
          hasSession: !!data.session,
          hasToken: !!data.session?.access_token
        });
        return true;
      } catch (error) {
        const verifyDuration = Date.now() - verifyStart;
        console.warn(`[Auth] ❌ Supabase verification error (${verifyDuration}ms):`, error);
        return false;
      }
    };

    // Process session - unified function for both initial check and auth state changes
    const processSession = async (session: any, event: string) => {
      if (!mounted) return;

      // Sync session from cookies to Zustand store immediately
      useAuthStore.getState().setSession(session);

      console.log('╔═══════════════════════════════════════════════════════════╗');
      console.log('║ [Auth] 📋 PROCESSING SESSION                              ║');
      console.log('╚═══════════════════════════════════════════════════════════╝');
      console.log('[Auth] 🎯 Event:', event);
      console.log('[Auth] 📊 Session state:', {
        hasSession: !!session,
        hasToken: !!session?.access_token,
        tokenLength: session?.access_token?.length || 0,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
        hasInitialized: hasInitializedRef.current,
        timestamp: new Date().toISOString()
      });

      try {
        if (session?.access_token) {
          // Verify JWT locally using getClaims() - no server API call
          console.log('[Auth] 🔑 Getting claims from JWT...');
          const claimsStart = Date.now();
          
          // Add timeout protection for getClaims
          const claimsTimeout = new Promise<never>((_, reject) => {
            setTimeout(() => {
              console.log('[Auth] ⏱️  getClaims timeout after 5000ms');
              reject(new Error('getClaims timeout'));
            }, 5000);
          });
          
          let claims: Record<string, unknown> | null;
          let claimsError: Error | unknown | null;
          try {
            const result = await Promise.race([
              supabase.auth.getClaims(),
              claimsTimeout
            ]) as Awaited<ReturnType<typeof supabase.auth.getClaims>>;
            claims = result.data;
            claimsError = result.error;
          } catch (timeoutError) {
            console.error('[Auth] ❌ getClaims timed out:', timeoutError);
            claimsError = timeoutError;
            claims = null;
          }
          
          const claimsDuration = Date.now() - claimsStart;

          console.log(`[Auth] 📝 Claims result (${claimsDuration}ms):`, {
            hasError: !!claimsError,
            hasClaims: !!claims,
            error: claimsError instanceof Error ? claimsError.message : String(claimsError)
          });

          if (!claimsError && claims && session?.user) {
            // SET USER IMMEDIATELY - don't wait for backend
            if (mounted) {
              console.log('[Auth] ✅ Setting user state:', {
                uid: session.user.id,
                email: session.user.email,
                displayName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0]
              });
              setUser({
                uid: session.user.id,
                email: session.user.email,
                displayName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
                claims: claims,
              });
            }

            // CRITICAL: Initialize user in backend database
            // This creates the user record in the database if it doesn't exist
            // Must be called for EVERY new user, regardless of auth event type
            api.user.initUser(session.user.user_metadata?.full_name)
              .then(() => {
                console.log('[Auth] ✅ User verified/initialized in backend database');
                if (mounted) {
                  setUserInitError(null); // Clear any previous errors
                }
              })
              .catch((error) => {
                console.error('[Auth] ❌ Failed to initialize user in database:', error);
                // Set error state so UI can show appropriate message
                if (mounted) {
                  const errorMessage = error.status === 401 || error.status === 403
                    ? 'Failed to initialize your account. Please try logging out and back in.'
                    : error.message || 'Failed to initialize user account';
                  setUserInitError(errorMessage);
                }
              });
          } else {
            console.log('[Auth] ❌ No valid claims or user - clearing user state');
            useAuthStore.getState().clearSession();
            if (mounted) setUser(null);
          }
        } else {
          console.log('[Auth] ❌ No session/token - clearing user state');
          useAuthStore.getState().clearSession();
          if (mounted) setUser(null);
        }
      } catch (error) {
        console.error('[Auth] ❌ Error processing session:', error);
        useAuthStore.getState().clearSession();
        if (mounted) setUser(null);
      } finally {
        // CRITICAL: Always set loading to false after processing
        if (mounted) {
          console.log('[Auth] 🏁 Finalizing session processing...');
          setLoading(false);

          // Verify Supabase is ready after first session processing
          if (!hasInitializedRef.current) {
            console.log('[Auth] 🔍 First initialization - verifying Supabase ready...');
            const isReady = await verifySupabaseReady();
            setSupabaseReady(isReady);

            // If not ready on first attempt, retry after 500ms delay
            if (!isReady) {
              console.log('[Auth] ⚠️  Not ready - scheduling retry in 500ms...');
              setTimeout(async () => {
                if (mounted) {
                  const retryReady = await verifySupabaseReady();
                  setSupabaseReady(retryReady);
                  if (!retryReady) {
                    console.error('[Auth] ❌ Supabase failed to initialize after retry');
                  }
                }
              }, 500);
            }
          }

          hasInitializedRef.current = true;

          // Clear timeout since initialization succeeded
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }

          console.log('[Auth] ✅ Session processing complete:', {
            hasInitialized: hasInitializedRef.current,
            loading: false,
            supabaseReady
          });
          console.log('╔═══════════════════════════════════════════════════════════╗\n');
        }
      }
    };

    // SAFEGUARD: Force loading to false after 20 seconds
    timeoutRef.current = setTimeout(() => {
      if (mounted) {
        console.error('[Auth] CRITICAL: Auth timeout after 20 seconds', {
          hasInitialized: hasInitializedRef.current,
          hasUser: !!user,
          supabaseReady
        });
        setLoading(false);
        if (!hasInitializedRef.current) {
          console.error('[Auth] CRITICAL: Clearing user due to timeout - this indicates infrastructure issues');
          setUser(null);
        }
      }
    }, 20000);

    // Listen for auth state changes
    // Note: onAuthStateChange will automatically trigger with the current session when initialized
    console.log('[Auth] 🚀 AuthContextProvider initializing - setting up auth listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[Auth] 🔔 Auth state change event received: ${event}`);
        if (!mounted) {
          console.log('[Auth] ⚠️  Component unmounted - ignoring event');
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
    
    console.log('[Auth] 🔄 Retrying user initialization...');
    setUserInitError(null);
    
    try {
      const displayName = user.displayName || user.email?.split('@')[0];
      await api.user.initUser(displayName);
      console.log('[Auth] ✅ User initialization retry successful');
    } catch (error: any) {
      console.error('[Auth] ❌ User initialization retry failed:', error);
      const errorMessage = error.status === 401 || error.status === 403
        ? 'Failed to initialize your account. Please try logging out and back in.'
        : error.message || 'Failed to initialize user account';
      setUserInitError(errorMessage);
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
