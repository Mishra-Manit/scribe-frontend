import { z } from "zod";
import { API_ERRORS, AUTH_ERRORS } from "@/constants/error-messages";

/**
 * Base API error class with retry information and user-friendly messages
 *
 * All API errors extend this class to provide consistent error handling
 * across the application.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly retryable: boolean = false,
    public readonly retryAfter?: number
  ) {
    super(message);
    this.name = "ApiError";
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  /**
   * Get user-friendly error message for display in UI
   */
  getUserMessage(): string {
    if (this.status >= 500) {
      return API_ERRORS.SERVER_ERROR.user;
    }
    if (this.status === 429) {
      return `Too many requests. Please wait ${this.retryAfter || 60} seconds and try again.`;
    }
    return this.message || API_ERRORS.UNKNOWN.user;
  }
}

/**
 * Network errors (fetch failed, no response received)
 *
 * Indicates user may be offline or experiencing connectivity issues.
 * These errors are retryable as they're often transient.
 */
export class NetworkError extends ApiError {
  constructor(message: string = API_ERRORS.NETWORK.dev) {
    super(message, 0, "NETWORK_ERROR", true);
    this.name = "NetworkError";
    Object.setPrototypeOf(this, NetworkError.prototype);
  }

  getUserMessage(): string {
    return API_ERRORS.NETWORK.user;
  }
}

/**
 * Authentication errors (401, 403)
 *
 * Indicates invalid or expired authentication token.
 * These errors are NOT retryable - user needs to re-authenticate.
 */
export class AuthenticationError extends ApiError {
  constructor(
    message: string = AUTH_ERRORS.TOKEN_INVALID.dev,
    status: number = 401
  ) {
    super(message, status, "AUTH_ERROR", false);
    this.name = "AuthenticationError";
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }

  getUserMessage(): string {
    return AUTH_ERRORS.TOKEN_INVALID.user;
  }
}

/**
 * Validation errors (400, Zod schema failures)
 *
 * Indicates invalid request data or response format.
 * These errors are NOT retryable - data needs to be corrected.
 */
export class ValidationError extends ApiError {
  constructor(
    message: string,
    public readonly validationErrors?: z.ZodIssue[]
  ) {
    super(message, 400, "VALIDATION_ERROR", false);
    this.name = "ValidationError";
    Object.setPrototypeOf(this, ValidationError.prototype);
  }

  /**
   * Get formatted validation error message for display
   */
  getUserMessage(): string {
    if (this.validationErrors && this.validationErrors.length > 0) {
      const errorMessages = this.validationErrors
        .map((e) => e.message)
        .join(", ");
      return `Validation failed: ${errorMessages}`;
    }
    return API_ERRORS.VALIDATION.user;
  }
}

/**
 * Rate limiting errors (429 Too Many Requests)
 *
 * Indicates too many requests sent in a given timeframe.
 * These errors are retryable after the specified delay.
 */
export class RateLimitError extends ApiError {
  constructor(retryAfter: number = 60) {
    super(API_ERRORS.RATE_LIMIT.dev, 429, "RATE_LIMIT_ERROR", true, retryAfter);
    this.name = "RateLimitError";
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }

  getUserMessage(): string {
    return `${API_ERRORS.RATE_LIMIT.user} (${this.retryAfter}s)`;
  }
}

/**
 * Server errors (500-599)
 *
 * Indicates backend server errors or service unavailability.
 * These errors are retryable as they're often transient.
 */
export class ServerError extends ApiError {
  constructor(message: string, status: number = 500) {
    super(message, status, "SERVER_ERROR", true);
    this.name = "ServerError";
    Object.setPrototypeOf(this, ServerError.prototype);
  }

  getUserMessage(): string {
    return API_ERRORS.SERVER_ERROR.user;
  }
}

/**
 * Abort error (request cancelled by user or system)
 *
 * Indicates request was cancelled before completion.
 * These errors are NOT retryable - cancellation was intentional.
 */
export class AbortError extends ApiError {
  constructor(message: string = API_ERRORS.REQUEST_CANCELLED.dev) {
    super(message, 0, "ABORT_ERROR", false);
    this.name = "AbortError";
    Object.setPrototypeOf(this, AbortError.prototype);
  }

  getUserMessage(): string {
    return API_ERRORS.REQUEST_CANCELLED.user;
  }
}

/**
 * Timeout error (request took too long)
 *
 * Indicates request exceeded configured timeout duration.
 * These errors are retryable as they may succeed on retry.
 */
export class TimeoutError extends ApiError {
  constructor(message: string = API_ERRORS.REQUEST_TIMEOUT.dev, timeout?: number) {
    const fullMessage = timeout
      ? `${message} after ${timeout}ms`
      : message;
    super(fullMessage, 0, "TIMEOUT_ERROR", true);
    this.name = "TimeoutError";
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }

  getUserMessage(): string {
    return API_ERRORS.REQUEST_TIMEOUT.user;
  }
}
