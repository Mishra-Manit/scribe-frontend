import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Handle session restoration errors gracefully
if (typeof window !== 'undefined') {
  supabase.auth.getSession().catch((error) => {
    console.error('[Supabase] Session restoration error:', error);
    // Don't auto-sign out - let AuthContextProvider handle auth state
  });
}