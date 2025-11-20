import type { RetryOptions } from "./retry";

/**
 * Extended request options for API client
 *
 * Extends standard RequestInit with additional features:
 * - Request cancellation via AbortSignal
 * - Configurable timeout
 * - Retry logic configuration
 * - Authentication bypass
 * - Request deduplication
 */
export interface ApiRequestOptions extends Omit<RequestInit, "signal"> {
  /**
   * AbortSignal for request cancellation
   *
   * Usually provided by React Query automatically:
   * ```typescript
   * queryFn: ({ signal }) => api.getEmail(id, { signal })
   * ```
   */
  signal?: AbortSignal;

  /**
   * Request timeout in milliseconds
   *
   * @default 60000 (60 seconds)
   *
   * @example
   * // Fast-fail for quick operations
   * api.getEmail(id, { timeout: 5000 })
   *
   * // Long timeout for heavy operations
   * api.generateEmail(data, { timeout: 60000 })
   */
  timeout?: number;

  /**
   * Retry configuration
   *
   * Set to `false` to disable retries completely.
   * Provide RetryOptions object to customize retry behavior.
   *
   * @default false (disabled - React Query handles query retries)
   *
   * @example
   * // Enable retry with custom config
   * api.generateEmail(data, {
   *   retry: {
   *     maxAttempts: 3,
   *     baseDelay: 1000,
   *     onRetry: (err, attempt) => console.log(`Retry ${attempt}`)
   *   }
   * })
   *
   * // Disable retry
   * api.getEmail(id, { retry: false })
   */
  retry?: RetryOptions | false;

  /**
   * Skip authentication header
   *
   * Use for public endpoints that don't require auth.
   *
   * @default false
   *
   * @example
   * // Public health check endpoint
   * api.request('/health', { skipAuth: true })
   */
  skipAuth?: boolean;

  /**
   * Enable request deduplication
   *
   * When enabled, identical concurrent requests return the same promise.
   * Useful for preventing duplicate renders from triggering duplicate API calls.
   *
   * @default true for GET requests, false for others
   *
   * @example
   * // Disable deduplication for a specific GET request
   * api.getEmail(id, { deduplicate: false })
   *
   * // Enable deduplication for a POST request
   * api.createEmail(data, { deduplicate: true })
   */
  deduplicate?: boolean;
}
