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

// Clear invalid sessions on initialization
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'TOKEN_REFRESHED' && !session) {
      // Token refresh failed, clear the invalid session
      supabase.auth.signOut();
    }
  });

  // Handle initial session restoration errors
  supabase.auth.getSession().catch(() => {
    // If session restoration fails, clear it silently
    supabase.auth.signOut();
  });
}