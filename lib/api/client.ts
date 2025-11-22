import { supabase } from "@/config/supabase";
import { API_BASE_URL } from "@/config/api";
import { z } from "zod";
import {
  ApiError,
  NetworkError,
  AuthenticationError,
  ValidationError,
  ServerError,
  AbortError,
  RateLimitError,
} from "./errors";
import { withRetry, fetchWithTimeout } from "./retry";
import { RequestCache } from "./deduplication";
import type { ApiRequestOptions } from "./types";

/**
 * Modern API client with production-grade enhancements
 *
 * Features:
 * - Request cancellation via AbortController
 * - Retry logic with exponential backoff
 * - Request deduplication
 * - Custom error classes for granular error handling
 * - Runtime validation with Zod
 * - Configurable timeouts
 * - JWT authentication via Supabase
 *
 * @example
 * // Basic usage
 * const data = await apiClient.request('/api/email/123');
 *
 * @example
 * // With React Query (automatic cancellation)
 * useQuery({
 *   queryKey: ['email', id],
 *   queryFn: ({ signal }) => apiClient.request(`/api/email/${id}`, { signal })
 * })
 *
 * @example
 * // With retry and custom timeout
 * const data = await apiClient.request('/api/email/generate', {
 *   method: 'POST',
 *   body: JSON.stringify(emailData),
 *   timeout: 60000,
 *   retry: { maxAttempts: 3 }
 * })
 */
export class ApiClient {
  private requestCache: RequestCache;

  constructor() {
    this.requestCache = new RequestCache(100); // 100ms TTL for deduplication
  }

  /**
   * Get authentication token from Supabase session with retry logic
   *
   * Handles transient failures during Supabase initialization by retrying
   * with progressive timeouts and exponential backoff.
   *
   * Strategy:
   * - Attempt 1: 2s timeout (fast path for normal cases)
   * - Attempt 2: 5s timeout (handles slow initialization)
   * - Attempt 3: 10s timeout (final attempt for edge cases)
   * - Backoff: 500ms, 1000ms between attempts
   *
   * @throws {AuthenticationError} If no valid session exists after retries
   */
  private async getAuthToken(): Promise<string> {
    console.log('[ApiClient] Attempting to get auth token...');

    const maxAttempts = 3;
    const baseDelay = 500; // Start with 500ms

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Progressive timeout: 2s, 5s, 10s
        const timeout = attempt === 1 ? 2000 : attempt === 2 ? 5000 : 10000;

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Auth token retrieval timeout (attempt ${attempt}/${maxAttempts}, ${timeout}ms)`)), timeout);
        });

        const getSessionPromise = supabase.auth.getSession();

        const {
          data: { session },
          error,
        } = await Promise.race([getSessionPromise, timeoutPromise]) as Awaited<typeof getSessionPromise>;

        console.log('[ApiClient] getSession returned', {
          attempt,
          hasSession: !!session,
          error
        });

        if (error || !session?.access_token) {
          console.error('[ApiClient] Auth error or no token:', { error, hasSession: !!session });

          // Don't retry on definitive auth failures
          if (error && error.message?.includes('not authenticated')) {
            throw new AuthenticationError("No authentication token available");
          }

          // Retry on timeout or missing session
          if (attempt < maxAttempts) {
            const delay = baseDelay * Math.pow(2, attempt - 1);
            console.warn(`[ApiClient] Retry ${attempt}/${maxAttempts} after ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }

          throw new AuthenticationError("No authentication token available");
        }

        console.log(`[ApiClient] Auth token retrieved successfully on attempt ${attempt}`);
        return session.access_token;
      } catch (error) {
        console.error(`[ApiClient] Failed to get auth token (attempt ${attempt}/${maxAttempts}):`, error);

        // If it's our custom AuthenticationError, don't retry
        if (error instanceof AuthenticationError) {
          throw error;
        }

        // If it's the last attempt, throw
        if (attempt === maxAttempts) {
          throw error;
        }

        // Otherwise retry with backoff
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.warn(`[ApiClient] Retrying after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Should never reach here
    throw new AuthenticationError("Failed to get auth token after retries");
  }

  // Build request headers with authentication
  private async buildHeaders(options: ApiRequestOptions): Promise<Headers> {
    const headers = new Headers(options.headers);

    // Add Content-Type if not present and body exists
    if (options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    // Add Authorization header if not skipping auth
    if (!options.skipAuth) {
      const token = await this.getAuthToken();
      headers.set("Authorization", `Bearer ${token}`);
    }

    return headers;
  }

  /**
   * Handle HTTP response and convert to appropriate error types
   *
   * @throws {RateLimitError} For 429 responses
   * @throws {AuthenticationError} For 401/403 responses
   * @throws {ValidationError} For 400 responses
   * @throws {ServerError} For 500-599 responses
   * @throws {ApiError} For other non-OK responses
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = parseInt(
        response.headers.get("Retry-After") || "60",
        10
      );
      throw new RateLimitError(retryAfter);
    }

    // Handle authentication errors
    if (response.status === 401 || response.status === 403) {
      const errorData = await response.json().catch(() => ({}));
      throw new AuthenticationError(
        errorData.message || errorData.detail || "Authentication failed",
        response.status
      );
    }

    // Handle validation errors
    if (response.status === 400) {
      const errorData = await response.json().catch(() => ({}));
      throw new ValidationError(
        errorData.message || errorData.detail || "Validation failed"
      );
    }

    // Handle server errors
    if (response.status >= 500) {
      const errorData = await response.json().catch(() => ({}));
      throw new ServerError(
        errorData.message ||
          errorData.detail ||
          `Server error: ${response.statusText}`,
        response.status
      );
    }

    // Handle other non-OK responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message ||
          errorData.detail ||
          `Request failed: ${response.statusText}`,
        response.status
      );
    }

    // Parse successful response
    return response.json();
  }

  /**
   * Core request method with all enhancements
   *
   * @param endpoint - API endpoint path (e.g., '/api/email/123')
   * @param options - Request options including retry, timeout, signal, etc.
   * @returns Promise resolving to the response data
   */
  async request<T>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    const {
      retry,
      timeout = 60000, // 60 second default timeout
      deduplicate = (options.method || "GET") === "GET", // Auto-dedupe GET requests
      ...fetchOptions
    } = options;

    // Request factory (called by retry logic or deduplication cache)
    const makeRequest = async (): Promise<T> => {
      try {
        // Build headers with authentication
        const headers = await this.buildHeaders(options);

        // Make request with timeout
        const response = await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, {
          ...fetchOptions,
          headers,
          timeout,
        });

        // Handle response and errors
        return this.handleResponse<T>(response);
      } catch (error) {
        // Convert native errors to our custom error types
        if (error instanceof TypeError && error.message.includes("fetch")) {
          throw new NetworkError(
            "Network request failed. Please check your connection."
          );
        }

        if (error instanceof Error && error.name === "AbortError") {
          throw new AbortError("Request was cancelled");
        }

        // Re-throw if already our error type
        if (error instanceof ApiError) {
          throw error;
        }

        // Unknown error
        throw new ApiError(
          error instanceof Error ? error.message : "Unknown error occurred",
          0
        );
      }
    };

    // Apply deduplication if enabled
    const dedupedRequest = deduplicate
      ? () => this.requestCache.get(endpoint, fetchOptions, makeRequest)
      : makeRequest;

    // Apply retry logic if enabled
    if (retry !== false) {
      return withRetry(dedupedRequest, retry || {});
    }

    return dedupedRequest();
  }

  /**
   * Request with runtime Zod validation
   *
   * Validates API response against provided schema at runtime.
   * Useful for catching API contract changes early.
   *
   * @param endpoint - API endpoint path
   * @param schema - Zod schema for response validation
   * @param options - Request options
   * @returns Promise resolving to validated response data
   *
   * @throws {ValidationError} If response doesn't match schema
   *
   * @example
   * const email = await apiClient.requestWithValidation(
   *   '/api/email/123',
   *   EmailResponseSchema,
   *   { signal }
   * );
   * // email is typed as EmailResponse and validated at runtime
   */
  async requestWithValidation<T>(
    endpoint: string,
    schema: z.ZodSchema<T>,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    try {
      const data = await this.request<unknown>(endpoint, options);
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("[API] Validation error:", error.issues);
        throw new ValidationError(
          `Invalid API response format: ${error.issues
            .map((e) => e.message)
            .join(", ")}`,
          error.issues
        );
      }
      throw error;
    }
  }

  // Cancel all active cached requests
  cancelAll(): void {
    this.requestCache.clear();
  }

  // Get cache statistics for debugging
  getCacheSize(): number {
    return this.requestCache.size();
  }
}

// Singleton API client instance
export const apiClient = new ApiClient();
