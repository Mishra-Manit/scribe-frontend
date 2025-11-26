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
  logout: () => Promise<void>;
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
  
  // Use ref to track initialization state so timeout can check current value
  const hasInitializedRef = useRef(false);

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
          const { data: claims, error: claimsError } = await supabase.auth.getClaims();
          const claimsDuration = Date.now() - claimsStart;

          console.log(`[Auth] 📝 Claims result (${claimsDuration}ms):`, {
            hasError: !!claimsError,
            hasClaims: !!claims,
            error: claimsError?.message
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

            // BACKGROUND: Initialize user in backend (fire-and-forget)
            // Only initialize user on the FIRST actual sign-in event, not on page reloads
            const isActualSignIn = event === 'SIGNED_IN' && !hasInitializedRef.current;
            if (isActualSignIn) {
              api.user.initUser()
                .then(() => {
                  console.log('[Auth] ✅ User initialized in backend (background)');
                })
                .catch((error) => {
                  console.error('[Auth] ⚠️  Background user initialization failed:', error);
                  // Non-critical - user can still use the app
                });
            }
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
    const timeoutId = setTimeout(() => {
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

        // Skip if we're still processing the initial session
        if (!hasInitializedRef.current && event === 'SIGNED_IN') {
          console.log('[Auth] ⏭️  Skipping duplicate SIGNED_IN event during initialization');
          return;
        }

        await processSession(session, event);
      }
    );

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    // Clear Zustand session store before signing out
    useAuthStore.getState().clearSession();
    setUser(null);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, supabaseReady, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
