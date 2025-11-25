/**
 * Browser Supabase Client for Client Components
 * Uses cookies instead of localStorage for session storage
 */

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}

// Export singleton for client-side use
export const supabase = createClient();
