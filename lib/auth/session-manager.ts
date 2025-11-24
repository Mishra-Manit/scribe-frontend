import { supabase } from "@/config/supabase";
import { CachedSession, JwtPayload } from "./session-types";
import { AuthenticationError } from "../api/errors";

/**
 * Promise-based mutex for serializing async operations
 */
class PromiseMutex {
  private locked = false;
  private waitQueue: Array<() => void> = [];

  /**
   * Execute function exclusively (wait for lock, then run)
   */
  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    // Wait for lock to be available
    while (this.locked) {
      await new Promise<void>((resolve) => this.waitQueue.push(resolve));
    }

    // Acquire lock
    this.locked = true;

    try {
      return await fn();
    } finally {
      // Release lock and notify next waiter
      this.locked = false;
      const next = this.waitQueue.shift();
      if (next) next();
    }
  }
}

/**
 * Session manager with in-memory caching and mutex-protected token retrieval
 *
 * Features:
 * - In-memory token cache with automatic expiry
 * - Mutex serialization prevents concurrent getSession() calls
 * - Promise deduplication for parallel requests
 * - Proactive token refresh before expiration
 */
class SessionManager {
  private cache: CachedSession | null = null;
  private mutex = new PromiseMutex();
  private refreshTimer: NodeJS.Timeout | null = null;
  private inFlightRequest: Promise<string> | null = null;

  // Configuration constants
  private readonly CACHE_BUFFER_MS = 5 * 60 * 1000; // 5 minutes buffer before expiry
  private readonly MIN_REFRESH_INTERVAL = 1 * 60 * 1000; // Minimum 1 minute between refreshes

  /**
   * Get authentication token (cached or fresh)
   *
   * Fast path: Returns cached token if valid
   * Slow path: Fetches new token with mutex protection
   *
   * @returns JWT access token
   * @throws {AuthenticationError} If no valid session exists
   */
  async getToken(): Promise<string> {
    // Fast path: return valid cached token
    if (this.isTokenValid()) {
      console.log("[SessionManager] Returning cached token (fast path)");
      return this.cache!.accessToken;
    }

    // Deduplication: return existing promise if request already in-flight
    if (this.inFlightRequest) {
      console.log(
        "[SessionManager] Request already in-flight, returning existing promise"
      );
      return this.inFlightRequest;
    }

    // Slow path: fetch new token with mutex protection
    console.log("[SessionManager] Fetching new token (slow path)");
    this.inFlightRequest = this.fetchToken({ forceRefresh: false });

    try {
      const token = await this.inFlightRequest;
      return token;
    } finally {
      this.inFlightRequest = null;
    }
  }

  /**
   * Fetch fresh token from Supabase with mutex protection
   *
   * Only one concurrent call to getSession() will be made,
   * even if multiple callers request tokens simultaneously
   */
  private async fetchToken({ forceRefresh }: { forceRefresh: boolean }): Promise<string> {
    return this.mutex.runExclusive(async () => {
      // Double-check: another call might have refreshed while waiting for mutex
      if (this.isTokenValid()) {
        console.log(
          "[SessionManager] Token refreshed while waiting for mutex, using cached"
        );
        return this.cache!.accessToken;
      }

      const now = Date.now();
      const withinBuffer = this.cache
        ? this.cache.expiresAt - now <= this.CACHE_BUFFER_MS
        : false;
      const shouldForce = forceRefresh || withinBuffer;

      if (withinBuffer && !forceRefresh) {
        console.log(
          "[SessionManager] Within buffer window, forcing refresh via refreshSession()"
        );
      }

      const apiName = shouldForce
        ? "supabase.auth.refreshSession()"
        : "supabase.auth.getSession()";
      console.log(`[SessionManager] Calling ${apiName}`);
      const startTime = Date.now();

      // Call Supabase (ONLY happens once due to mutex)
      const { data, error } = shouldForce
        ? await supabase.auth.refreshSession()
        : await supabase.auth.getSession();

      const elapsed = Date.now() - startTime;
      console.log(`[SessionManager] ${shouldForce ? "refreshSession" : "getSession"}() completed in ${elapsed}ms`);

      if (error) {
        console.error("[SessionManager] Session retrieval/refresh error:", error);
        throw new AuthenticationError(
          `Failed to get session: ${error.message}`
        );
      }

      if (!data.session) {
        console.error("[SessionManager] No session found");
        throw new AuthenticationError("No valid session");
      }

      // Parse JWT to extract expiration timestamp
      const payload = this.parseJwt(data.session.access_token);
      const expiresAt = (payload.exp || 0) * 1000; // Convert seconds to milliseconds

      const currentTime = Date.now();
      const timeUntilExpiry = expiresAt - currentTime;
      const expiresInMinutes = Math.floor(timeUntilExpiry / 60000);

      console.log(
        `[SessionManager] Token cached, expires in ${expiresInMinutes} minutes`
      );

      // Cache the session
      this.cache = {
        accessToken: data.session.access_token,
        expiresAt,
        refreshToken: data.session.refresh_token,
        session: data.session,
        cachedAt: currentTime,
      };

      // Schedule proactive refresh
      this.scheduleRefresh();

      return this.cache.accessToken;
    });
  }

  /**
   * Check if cached token is still valid
   *
   * Token is considered valid if:
   * 1. Cache exists
   * 2. Token hasn't expired
   * 3. Not within the buffer window before expiry
   */
  private isTokenValid(): boolean {
    if (!this.cache) {
      return false;
    }

    const now = Date.now();
    const timeUntilExpiry = this.cache.expiresAt - now;

    // Invalid if expired or within buffer window
    return timeUntilExpiry > this.CACHE_BUFFER_MS;
  }

  /**
   * Schedule proactive token refresh before expiration
   *
   * Refreshes 5 minutes before token expiry to prevent
   * authentication errors during active use
   */
  private scheduleRefresh(): void {
    // Clear existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    if (!this.cache) {
      return;
    }

    const now = Date.now();
    const timeUntilExpiry = this.cache.expiresAt - now;

    // Schedule refresh at: (expiry - buffer), but at least 1 minute from now
    const refreshIn = Math.max(
      timeUntilExpiry - this.CACHE_BUFFER_MS,
      this.MIN_REFRESH_INTERVAL
    );

    const refreshInMinutes = Math.floor(refreshIn / 60000);
    console.log(
      `[SessionManager] Proactive refresh scheduled in ${refreshInMinutes} minutes`
    );

    this.refreshTimer = setTimeout(() => {
      console.log("[SessionManager] Proactive refresh triggered");
      this.fetchToken({ forceRefresh: true }).catch((error) => {
        console.error("[SessionManager] Proactive refresh failed:", error);
      });
    }, refreshIn);
  }

  /**
   * Parse JWT to extract payload (including expiration)
   *
   * Note: This does NOT validate the signature, only decodes the payload
   * for expiration checking
   */
  private parseJwt(token: string): JwtPayload {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error("[SessionManager] Failed to parse JWT:", error);
      return {};
    }
  }

  /**
   * Clear cached session and cancel refresh timer
   *
   * Call this on logout or when session is invalidated
   */
  clearCache(): void {
    console.log("[SessionManager] Clearing session cache");
    this.cache = null;

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    this.inFlightRequest = null;
  }

  /**
   * Get current cache status (for debugging)
   */
  getCacheStatus(): {
    hasCachedToken: boolean;
    isValid: boolean;
    expiresInMinutes: number | null;
    cachedAgoMinutes: number | null;
  } {
    if (!this.cache) {
      return {
        hasCachedToken: false,
        isValid: false,
        expiresInMinutes: null,
        cachedAgoMinutes: null,
      };
    }

    const now = Date.now();
    const timeUntilExpiry = this.cache.expiresAt - now;
    const timeSinceCached = now - this.cache.cachedAt;

    return {
      hasCachedToken: true,
      isValid: this.isTokenValid(),
      expiresInMinutes: Math.floor(timeUntilExpiry / 60000),
      cachedAgoMinutes: Math.floor(timeSinceCached / 60000),
    };
  }
}

// Singleton instance
export const sessionManager = new SessionManager();
