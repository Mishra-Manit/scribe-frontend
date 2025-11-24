import { Session } from "@supabase/supabase-js";

/**
 * Cached session data with expiration tracking
 */
export interface CachedSession {
  /** JWT access token */
  accessToken: string;
  /** Token expiration timestamp (Unix ms) */
  expiresAt: number;
  /** Refresh token for session renewal */
  refreshToken: string;
  /** Full Supabase session object */
  session: Session;
  /** Timestamp when session was cached (Unix ms) */
  cachedAt: number;
}

/**
 * JWT payload structure for parsing expiration
 */
export interface JwtPayload {
  exp?: number;
  iat?: number;
  sub?: string;
  [key: string]: unknown;
}
