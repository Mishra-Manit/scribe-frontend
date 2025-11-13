"use client"
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../config/supabase";

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
    // Listen for auth state changes - Supabase manages session internally
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.access_token) {
        try {
          // Verify JWT locally using getClaims() - no server API call
          const { data: claims, error: claimsError } = await supabase.auth.getClaims();
          
          if (claimsError || !claims) {
            // Token invalid or expired
            setUser(null);
          } else if (session?.user) {
            // Token verified locally, set user
            setUser({
              uid: session.user.id,
              email: session.user.email,
              displayName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
              claims: claims, // Verified claims from local verification
            })
          }
        } catch (error) {
          console.error('JWT verification error:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    setUser(null);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {loading ? null : children}
    </AuthContext.Provider>
  );
}
