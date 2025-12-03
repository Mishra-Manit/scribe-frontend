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

export async function middleware(request: NextRequest) {
  // Generate unique request ID for tracing
  const requestId = uuidv4();

  // Log incoming request
  logger.info('Middleware processing request', {
    requestId,
    path: request.nextUrl.pathname,
    method: request.method,
    hasAuthCookie: request.cookies.has('sb-access-token') ||
                   request.cookies.has('sb-sekufggxcfdeuamngppf-auth-token'),
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

  // CRITICAL: getUser() validates JWT server-side (prevents session spoofing)
  // Never use getSession() in middleware - it doesn't verify JWT signatures
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      logger.error('Auth validation failed', {
        requestId,
        error: error.message,
        errorName: error.name,
        errorStatus: error.status,
        path: request.nextUrl.pathname,
      });

      // Clear invalid session
      await supabase.auth.signOut();

      // Redirect to login if accessing protected routes
      if (request.nextUrl.pathname.startsWith('/dashboard')) {
        logger.info('Redirecting to login', {
          requestId,
          from: request.nextUrl.pathname,
        });
        const redirectUrl = new URL('/', request.url);

        return NextResponse.redirect(redirectUrl);
      }
    } else if (user) {
      logger.debug('User validated', {
        requestId,
        userId: user.id,
        userEmail: user.email,
        path: request.nextUrl.pathname,
      });
    } else {
      logger.debug('No user session', {
        requestId,
        path: request.nextUrl.pathname,
      });
    }

  } catch (error) {
    logger.error('Session validation error', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      path: request.nextUrl.pathname,
    });

    // Clear potentially corrupted session
    await supabase.auth.signOut();

    // Redirect to login if accessing protected routes
    if (request.nextUrl.pathname.startsWith('/dashboard')) {
      logger.info('Redirecting to login after error', {
        requestId,
        from: request.nextUrl.pathname,
      });
      const redirectUrl = new URL('/', request.url);
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
