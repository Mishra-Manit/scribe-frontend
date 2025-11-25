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
 * Now uses cookie-based session storage via @supabase/ssr.
 * Middleware handles automatic token refresh.
 */
export const supabase = createBrowserClient(
  supabaseUrl,
  supabasePublishableKey
);
