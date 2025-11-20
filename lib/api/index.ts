/**
 * Production-grade API client with:
 * - AbortController integration for request cancellation
 * - Retry logic with exponential backoff
 * - Request deduplication
 * - Custom error classes for granular error handling
 * - Runtime validation with Zod
 *
 * @module lib/api
 */

import { apiClient } from "./client";
import type { ApiRequestOptions } from "./types";
import {
  EmailHistorySchema,
  GenerateEmailResponseSchema,
  TaskStatusResponseSchema,
  EmailResponseSchema,
  UserProfileSchema,
  type EmailGenerationData,
  type GenerateEmailResponse,
  type TaskStatusResponse,
  type EmailResponse,
  type TaskStatus,
  type TemplateType,
  type UserProfile,
} from "../schemas";

// Re-export error classes for error handling in components
export * from "./errors";
export type { RetryOptions } from "./retry";
export type { ApiRequestOptions } from "./types";

/**
 * User API
 *
 * Handles user profile and authentication-related operations
 */
export const userAPI = {
  /**
   * Get current user's profile
   *
   * @param options - Request options (signal, timeout, etc.)
   * @returns User profile data
   *
   * @example
   * // Basic usage
   * const profile = await userAPI.getUserData();
   *
   * @example
   * // With React Query
   * useQuery({
   *   queryKey: ['user', 'profile'],
   *   queryFn: ({ signal }) => userAPI.getUserData({ signal })
   * })
   */
  getUserData: async (
    options?: ApiRequestOptions
  ): Promise<UserProfile> => {
    return apiClient.requestWithValidation(
      "/api/user",
      UserProfileSchema,
      options
    );
  },

  /**
   * Initialize user profile (idempotent)
   *
   * Creates user profile if it doesn't exist, returns existing if it does.
   * Should be called after user signs in with Supabase.
   *
   * @param displayName - Optional display name for the user
   * @param options - Request options
   * @returns User profile data
   *
   * @example
   * // After successful Supabase sign-in
   * const profile = await userAPI.initUser('John Doe');
   */
  initUser: async (
    displayName?: string,
    options?: ApiRequestOptions
  ): Promise<UserProfile> => {
    const body = displayName
      ? JSON.stringify({ display_name: displayName })
      : undefined;

    return apiClient.requestWithValidation(
      "/api/user/init",
      UserProfileSchema,
      {
        method: "POST",
        body,
        ...options,
      }
    );
  },
};

/**
 * Email API
 *
 * Handles email generation, history, and task status polling
 */
export const emailAPI = {
  /**
   * Get user's email history with pagination
   *
   * @param limit - Number of emails to fetch (default: 20)
   * @param offset - Pagination offset (default: 0)
   * @param options - Request options
   * @returns Array of email responses
   *
   * @example
   * // Basic usage
   * const emails = await emailAPI.getEmailHistory(20, 0);
   *
   * @example
   * // With React Query and pagination
   * useQuery({
   *   queryKey: ['emails', limit, offset],
   *   queryFn: ({ signal }) => emailAPI.getEmailHistory(limit, offset, { signal })
   * })
   */
  getEmailHistory: async (
    limit: number = 20,
    offset: number = 0,
    options?: ApiRequestOptions
  ): Promise<EmailResponse[]> => {
    return apiClient.requestWithValidation(
      `/api/email/?limit=${limit}&offset=${offset}`,
      EmailHistorySchema,
      options
    );
  },

  /**
   * Generate a new email (async operation)
   *
   * Starts email generation process and returns task_id for polling.
   * Use getTaskStatus() to check generation progress.
   *
   * @param emailData - Email generation parameters
   * @param options - Request options
   * @returns Task ID for polling generation status
   *
   * @example
   * // With React Mutation
   * const mutation = useMutation({
   *   mutationFn: (data: EmailGenerationData) => emailAPI.generateEmail(data)
   * });
   *
   * // Start generation
   * const { task_id } = await mutation.mutateAsync({
   *   email_template: 'Hi {{name}}...',
   *   recipient_name: 'Dr. Jane Smith',
   *   recipient_interest: 'machine learning',
   *   template_type: 'research'
   * });
   */
  generateEmail: async (
    emailData: EmailGenerationData,
    options?: ApiRequestOptions
  ): Promise<GenerateEmailResponse> => {
    return apiClient.requestWithValidation(
      "/api/email/generate",
      GenerateEmailResponseSchema,
      {
        method: "POST",
        body: JSON.stringify(emailData),
        // Enable retry for mutations (network failures)
        retry: {
          maxAttempts: 2, // Only retry once for mutations
          baseDelay: 1000,
        },
        ...options,
      }
    );
  },

  /**
   * Check email generation task status
   *
   * Poll this endpoint to track email generation progress.
   * React Query automatically handles polling via refetchInterval.
   *
   * @param taskId - Task ID from generateEmail()
   * @param options - Request options
   * @returns Task status with current step and progress
   *
   * @example
   * // With React Query auto-polling
   * useQuery({
   *   queryKey: ['task', taskId],
   *   queryFn: ({ signal }) => emailAPI.getTaskStatus(taskId, { signal }),
   *   refetchInterval: (query) => {
   *     const status = query.state.data?.status;
   *     // Stop polling when complete
   *     if (status === 'SUCCESS' || status === 'FAILURE') return false;
   *     // Poll every 3 seconds while running
   *     return 3000;
   *   }
   * })
   */
  getTaskStatus: async (
    taskId: string,
    options?: ApiRequestOptions
  ): Promise<TaskStatusResponse> => {
    return apiClient.requestWithValidation(
      `/api/email/status/${taskId}`,
      TaskStatusResponseSchema,
      options
    );
  },

  /**
   * Get a specific email by ID
   *
   * @param emailId - Email UUID
   * @param options - Request options
   * @returns Email details
   *
   * @example
   * // With React Query
   * useQuery({
   *   queryKey: ['email', emailId],
   *   queryFn: ({ signal }) => emailAPI.getEmail(emailId, { signal })
   * })
   */
  getEmail: async (
    emailId: string,
    options?: ApiRequestOptions
  ): Promise<EmailResponse> => {
    return apiClient.requestWithValidation(
      `/api/email/${emailId}`,
      EmailResponseSchema,
      options
    );
  },
};

/**
 * Unified API export
 *
 * Provides clean interface for all API operations.
 *
 * @example
 * import { api } from '@/lib/api';
 *
 * const emails = await api.email.getEmailHistory();
 * const profile = await api.user.getUserData();
 */
export const api = {
  user: userAPI,
  email: emailAPI,
  client: apiClient, // Expose client for advanced usage
};

// Export types for use in components and hooks
export type {
  EmailGenerationData,
  GenerateEmailResponse,
  TaskStatusResponse,
  EmailResponse,
  TaskStatus,
  TemplateType,
  UserProfile,
};
