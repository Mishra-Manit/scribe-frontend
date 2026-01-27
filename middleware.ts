/**
 * Next.js Middleware - Automatic Token Refresh
 *
 * Runs on every request (except static assets) to refresh auth tokens.
 * This replaces client-side autoRefreshToken logic.
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { createLogger } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('Middleware');

// Extract project ID from Supabase URL for cookie detection
// URL format: https://<project-id>.supabase.co
function getSupabaseProjectId(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match ? match[1] : null;
}

const projectId = getSupabaseProjectId();

// Routes that require authentication
const PROTECTED_ROUTES = ['/dashboard'];

export async function middleware(request: NextRequest) {
  // Generate unique request ID for tracing
  const requestId = uuidv4();

  // Check for auth cookie (generic or project-specific)
  const hasAuthCookie = request.cookies.has('sb-access-token') ||
    (projectId ? request.cookies.has(`sb-${projectId}-auth-token`) : false);

  // Log incoming request
  logger.info('Middleware processing request', {
    requestId,
    path: request.nextUrl.pathname,
    method: request.method,
    hasAuthCookie,
    userAgent: request.headers.get('user-agent')?.substring(0, 50) || 'unknown',
  });

  let supabaseResponse = NextResponse.next({
    request,
  });

  // Add request ID to response headers for client-side access
  supabaseResponse.headers.set('X-Request-ID', requestId);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // CRITICAL: getClaims() validates JWT locally using published public keys
  // This prevents session spoofing WITHOUT network calls (unlike getUser)
  // Safe to trust because it cryptographically verifies JWT signatures
  const pathname = request.nextUrl.pathname;
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));

  try {
    const { data, error } = await supabase.auth.getClaims();

    if (error) {
      logger.warn('JWT validation failed', {
        requestId,
        error: error.message,
        path: pathname,
      });
      // Redirect to login if accessing protected route with invalid token
      if (isProtectedRoute) {
        logger.info('Redirecting unauthenticated user from protected route', {
          requestId,
          path: pathname,
        });
        const redirectUrl = new URL('/', request.url);
        redirectUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(redirectUrl);
      }
    } else if (data) {
      logger.debug('JWT validated', {
        requestId,
        sub: data.claims.sub, // User ID from JWT claims
        path: pathname,
      });
    } else {
      logger.debug('No JWT present', {
        requestId,
        path: pathname,
      });
      // Redirect to login if accessing protected route without token
      if (isProtectedRoute) {
        logger.info('Redirecting unauthenticated user from protected route', {
          requestId,
          path: pathname,
        });
        const redirectUrl = new URL('/', request.url);
        redirectUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(redirectUrl);
      }
    }

  } catch (error) {
    logger.error('JWT validation error', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      path: pathname,
    });
    // For protected routes, redirect on error rather than fail-open
    if (isProtectedRoute) {
      logger.info('Redirecting user due to JWT validation error', {
        requestId,
        path: pathname,
      });
      const redirectUrl = new URL('/', request.url);
      redirectUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  logger.debug('Middleware complete', {
    requestId,
    path: request.nextUrl.pathname,
  });

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Match all routes except static assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
