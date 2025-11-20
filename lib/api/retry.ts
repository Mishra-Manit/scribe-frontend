import {
  ApiError,
  NetworkError,
  TimeoutError,
  ServerError,
} from "./errors";

/**
 * Retry configuration options
 */
export interface RetryOptions {
  /**
   * Maximum number of retry attempts
   * @default 3
   */
  maxAttempts?: number;

  /**
   * Base delay in milliseconds (will be doubled each retry)
   * @default 1000
   */
  baseDelay?: number;

  /**
   * Maximum delay in milliseconds
   * @default 10000
   */
  maxDelay?: number;

  /**
   * Whether to add random jitter to prevent thundering herd
   * @default true
   */
  jitter?: boolean;

  /**
   * Custom function to determine if error should be retried
   */
  shouldRetry?: (error: unknown, attempt: number) => boolean;

  /**
   * Callback for each retry attempt
   */
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

const DEFAULT_RETRY_OPTIONS: Required<
  Omit<RetryOptions, "onRetry" | "shouldRetry">
> = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  jitter: true,
};

/**
 * Calculate exponential backoff delay with optional jitter
 *
 * Formula: delay = baseDelay * 2^(attempt - 1)
 * Jitter adds ±25% random variance to prevent thundering herd
 *
 * @example
 * calculateDelay(1, options) // ~1000ms
 * calculateDelay(2, options) // ~2000ms
 * calculateDelay(3, options) // ~4000ms
 * calculateDelay(4, options) // ~8000ms
 */
function calculateDelay(
  attempt: number,
  options: Required<Omit<RetryOptions, "onRetry" | "shouldRetry">>
): number {
  // Exponential: delay = baseDelay * 2^(attempt - 1)
  let delay = options.baseDelay * Math.pow(2, attempt - 1);

  // Cap at maxDelay
  delay = Math.min(delay, options.maxDelay);

  // Add jitter (±25% random variance)
  if (options.jitter) {
    const jitterAmount = delay * 0.25;
    delay = delay + (Math.random() * 2 * jitterAmount - jitterAmount);
  }

  return Math.floor(delay);
}

/**
 * Default retry logic: retry on network/server errors, not on client errors
 *
 * @param error - The error that occurred
 * @param _attempt - Current attempt number (1-indexed, unused in default logic)
 * @returns Whether to retry the request
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function defaultShouldRetry(error: unknown, _attempt: number): boolean {
  // Retry on network/timeout errors
  if (error instanceof NetworkError || error instanceof TimeoutError) {
    return true;
  }

  // Retry on server errors (500-599)
  if (error instanceof ServerError) {
    return true;
  }

  // Retry on ApiError if retryable flag is set
  if (error instanceof ApiError && error.retryable) {
    return true;
  }

  // Don't retry on client errors (auth, validation, etc.)
  return false;
}

/**
 * Execute a function with retry logic and exponential backoff
 *
 * @example
 * const result = await withRetry(
 *   () => fetch('/api/data'),
 *   { maxAttempts: 3, baseDelay: 1000 }
 * );
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  const shouldRetry = options.shouldRetry || defaultShouldRetry;

  let lastError: unknown;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      const willRetry = attempt < opts.maxAttempts && shouldRetry(error, attempt);

      if (!willRetry) {
        throw error;
      }

      // Calculate delay
      const delay = calculateDelay(attempt, opts);

      // Call onRetry callback
      options.onRetry?.(error, attempt, delay);

      // Log retry attempt in development
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `[API Retry] Attempt ${attempt}/${opts.maxAttempts} failed. Retrying in ${delay}ms...`,
          error
        );
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // All retries exhausted
  throw lastError;
}

/**
 * Fetch wrapper with timeout support
 *
 * @param input - Request URL or Request object
 * @param init - Request options with optional timeout
 * @returns Response promise
 *
 * @example
 * const response = await fetchWithTimeout('/api/data', { timeout: 5000 });
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = 30000, ...fetchInit } = init;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(input, {
      ...fetchInit,
      signal: init.signal
        ? // Merge signals if provided
          mergeAbortSignals([init.signal, controller.signal])
        : controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    // Check if error is due to timeout
    if (error instanceof Error && error.name === "AbortError") {
      // Check if it was our timeout or the provided signal
      if (!init.signal?.aborted) {
        throw new TimeoutError(`Request timed out after ${timeout}ms`, timeout);
      }
    }

    throw error;
  }
}

/**
 * Merge multiple AbortSignals into one
 *
 * Useful when combining React Query's signal with timeout signal.
 * If any signal aborts, the merged signal aborts.
 *
 * @param signals - Array of AbortSignals to merge
 * @returns Merged AbortSignal
 */
function mergeAbortSignals(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      break;
    }

    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  return controller.signal;
}
