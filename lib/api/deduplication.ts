/**
 * Request deduplication cache
 *
 * Prevents duplicate requests from being sent simultaneously during
 * rapid re-renders or concurrent component mounts.
 *
 * Cache TTL is intentionally short (100ms) to catch duplicate renders
 * without causing stale data issues.
 */
export class RequestCache {
  private cache = new Map<string, Promise<unknown>>();
  private ttl: number;

  /**
   * Create a new request cache
   *
   * @param ttlMs - Time-to-live in milliseconds (default: 100ms)
   */
  constructor(ttlMs: number = 100) {
    this.ttl = ttlMs;
  }

  /**
   * Generate cache key from request parameters
   *
   * Format: "METHOD:endpoint:body"
   *
   * @example
   * getCacheKey('/api/email/', { method: 'GET' })
   * // Returns: "GET:/api/email/:"
   *
   * getCacheKey('/api/email/generate', { method: 'POST', body: '{"name":"John"}' })
   * // Returns: "POST:/api/email/generate:{"name":"John"}"
   */
  private getCacheKey(endpoint: string, options: RequestInit): string {
    const method = options.method || "GET";
    const body =
      options.body && typeof options.body === "string" ? options.body : "";
    return `${method}:${endpoint}:${body}`;
  }

  /**
   * Get cached request or create new one
   *
   * If an identical request is already in-flight, returns the existing promise.
   * Otherwise, creates a new request using the factory function.
   *
   * @param endpoint - API endpoint path
   * @param options - Fetch request options
   * @param factory - Function that creates the request promise
   * @returns Promise that resolves with the API response
   *
   * @example
   * const result = await cache.get(
   *   '/api/email/123',
   *   { method: 'GET' },
   *   () => fetch('/api/email/123').then(r => r.json())
   * );
   */
  async get<T>(
    endpoint: string,
    options: RequestInit,
    factory: () => Promise<T>
  ): Promise<T> {
    const key = this.getCacheKey(endpoint, options);

    // Return existing promise if found
    const existing = this.cache.get(key);
    if (existing) {
      return existing as Promise<T>;
    }

    // Create new promise
    const promise = factory().finally(() => {
      // Auto-remove from cache after TTL
      setTimeout(() => {
        this.cache.delete(key);
      }, this.ttl);
    });

    this.cache.set(key, promise);
    return promise;
  }

  // Clear all cached requests
  clear(): void {
    this.cache.clear();
  }

  // Get current cache size
  size(): number {
    return this.cache.size;
  }

  /**
   * Check if a specific request is cached
   *
   * @param endpoint - API endpoint path
   * @param options - Fetch request options
   * @returns True if request is currently cached
   */
  has(endpoint: string, options: RequestInit): boolean {
    const key = this.getCacheKey(endpoint, options);
    return this.cache.has(key);
  }
}
