"use client";

import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Validate environment variables
if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local'
  );
}

/**
 * Browser Supabase Client
 *
 * Uses createBrowserClient from @supabase/ssr for cookie-based sessions.
 * Token refresh is handled automatically by Supabase client (default behavior).
 * Auth state persisted in Zustand with localStorage for instant restoration.
 *
 * Configuration:
 * - autoRefreshToken: Automatically refreshes tokens ~5 minutes before expiry
 * - persistSession: Persists session in HTTP-only cookies
 * - detectSessionInUrl: Enables OAuth callback handling
 */
export const supabase = createBrowserClient(
  supabaseUrl,
  supabasePublishableKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);
