"use client"
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../config/supabase";
import { api } from "../lib/api";

interface User {
  uid: string;
  email: string | undefined;
  displayName: string;
  claims: Record<string, unknown>;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
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

  useEffect(() => {
    let mounted = true;
    let hasInitialized = false;

    // Process session - unified function for both initial check and auth state changes
    const processSession = async (session: any, event: string) => {
      if (!mounted) return;

      // Debug logging (development only)
      if (process.env.NODE_ENV === 'development') {
        console.log('[Auth] Processing session:', {
          event,
          hasSession: !!session,
          hasToken: !!session?.access_token,
          userId: session?.user?.id,
          hasInitialized,
        });
      }

      try {
        if (session?.access_token) {
          // Verify JWT locally using getClaims() - no server API call
          const { data: claims, error: claimsError } = await supabase.auth.getClaims();

          if (process.env.NODE_ENV === 'development') {
            console.log('[Auth] Claims result:', { hasError: !!claimsError, hasClaims: !!claims });
          }

          if (!claimsError && claims && session?.user) {
            // Only initialize user on the FIRST actual sign-in event, not on page reloads
            const isActualSignIn = event === 'SIGNED_IN' && !hasInitialized;

            if (isActualSignIn) {
              try {
                console.log('🔄 Initializing user in backend database...');
                await api.user.initUser();
                console.log('✅ User initialized in backend database');
              } catch (error) {
                console.error('⚠️  User initialization failed (might already exist):', error);
                // Continue anyway - endpoint is idempotent
              }
            }

            if (mounted) {
              setUser({
                uid: session.user.id,
                email: session.user.email,
                displayName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
                claims: claims,
              });
            }
          } else {
            if (mounted) setUser(null);
          }
        } else {
          if (mounted) setUser(null);
        }
      } catch (error) {
        console.error('[Auth] Error processing session:', error);
        if (mounted) setUser(null);
      } finally {
        // CRITICAL: Always set loading to false after processing
        if (mounted) {
          setLoading(false);
          hasInitialized = true;
          if (process.env.NODE_ENV === 'development') {
            console.log('[Auth] Loading complete');
          }
        }
      }
    };

    // SAFEGUARD: Force loading to false after 10 seconds
    const timeoutId = setTimeout(() => {
      if (mounted) {
        console.warn('[Auth] Loading timeout - forcing loading state to false');
        setLoading(false);
        if (!hasInitialized) {
          setUser(null);
        }
      }
    }, 10000);

    // Check initial session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      processSession(session, 'INITIAL_SESSION');
    }).catch((error) => {
      console.error('[Auth] getSession error:', error);
      if (mounted) setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        // Skip if we're still processing the initial session
        if (!hasInitialized && event === 'SIGNED_IN') {
          if (process.env.NODE_ENV === 'development') {
            console.log('[Auth] Skipping duplicate SIGNED_IN event during initialization');
          }
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
    setUser(null);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
