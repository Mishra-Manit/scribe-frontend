import { API_BASE_URL } from "@/config/api";
import { z } from "zod";
import logger from "@/utils/logger";
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
import { useAuthStore } from "@/stores/auth-store";

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
   * Get authentication token from Zustand store (SYNCHRONOUS)
   *
   * Returns the current access token from the cached session in Zustand.
   * No async calls, no network requests - instant token access.
   *
   * Supabase handles ALL token refresh logic via autoRefreshToken.
   * This method just retrieves the current token snapshot.
   *
   * @throws {AuthenticationError} If no valid session exists
   */
  getAuthToken(): string {
    const token = useAuthStore.getState().getToken();

    if (!token) {
      logger.error('[ApiClient] No valid auth token available');
      throw new AuthenticationError('No valid authentication token');
    }

    return token;
  }

  // Build request headers with authentication (SYNCHRONOUS)
  private buildHeaders(options: ApiRequestOptions): Headers {
    const headers = new Headers(options.headers);

    // Add Content-Type if not present and body exists
    if (options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    // Add Authorization header if not skipping auth
    if (!options.skipAuth) {
      const token = this.getAuthToken();
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
        // Build headers with authentication (synchronous - no await needed!)
        const headers = this.buildHeaders(options);

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
        logger.error("[API] Validation error:", error.issues);
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

// Export the getAuthToken method for external use
export const getAuthToken = () => apiClient.getAuthToken();
