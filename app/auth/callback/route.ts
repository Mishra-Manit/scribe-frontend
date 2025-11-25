import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

// OAuth callback handler for Supabase authentication
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // Use NEXT_PUBLIC_SITE_URL if available, otherwise fallback to request origin
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin;
  const baseUrl = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl;

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, errorDescription);
    return NextResponse.redirect(
      `${baseUrl}/?error=${encodeURIComponent(error)}`
    );
  }

  // Exchange code for session
  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Exchange the code for a session
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Error exchanging code for session:', exchangeError);
      return NextResponse.redirect(
        `${baseUrl}/?error=${encodeURIComponent('auth_failed')}`
      );
    }

    // Successfully authenticated - redirect to dashboard
    return NextResponse.redirect(`${baseUrl}/dashboard`);
  }

  // No code provided, redirect to home
  return NextResponse.redirect(`${baseUrl}/`);
}
