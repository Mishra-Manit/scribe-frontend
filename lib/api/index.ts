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
  UpdateEmailRequestSchema,
  UserProfileSchema,
  TemplateResponseSchema,
  TemplateListSchema,
  UserProfileWithCountSchema,
  type EmailGenerationData,
  type GenerateEmailResponse,
  type TaskStatusResponse,
  type EmailResponse,
  type UpdateEmailRequest,
  type TaskStatus,
  type UserProfile,
  type TemplateGenerationRequest,
  type TemplateResponse,
  type TemplateList,
  type UserProfileWithCount,
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
   * @param displayName - Display name auto-derived from OAuth (e.g., Google full name or email username)
   * @param options - Request options
   * @returns User profile data
   *
   * @example
   * // After successful Supabase sign-in
   * const profile = await userAPI.initUser('John Doe');
   */
  initUser: async (
    displayName: string,
    options?: ApiRequestOptions
  ): Promise<UserProfile> => {
    return apiClient.requestWithValidation(
      "/api/user/init",
      UserProfileSchema,
      {
        method: "POST",
        body: JSON.stringify({ display_name: displayName }),
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

  /**
   * Update email properties (discard/restore)
   *
   * @param emailId - Email UUID
   * @param data - Update request data
   * @param options - Request options
   * @returns Updated email details
   *
   * @example
   * // Discard email
   * const updated = await emailAPI.updateEmail(emailId, { displayed: false });
   *
   * @example
   * // With React Mutation
   * useMutation({
   *   mutationFn: ({ emailId, displayed }: { emailId: string; displayed: boolean }) =>
   *     emailAPI.updateEmail(emailId, { displayed })
   * })
   */
  updateEmail: async (
    emailId: string,
    data: UpdateEmailRequest,
    options?: ApiRequestOptions
  ): Promise<EmailResponse> => {
    return apiClient.requestWithValidation(
      `/api/email/${emailId}`,
      EmailResponseSchema,
      {
        method: "PATCH",
        body: JSON.stringify(data),
        // Enable retry for mutations (network failures only)
        retry: {
          maxAttempts: 2,
          baseDelay: 1000,
        },
        ...options,
      }
    );
  },
};

/**
 * Template API
 *
 * Handles template generation, listing, and deletion
 */
export const templateAPI = {
  /**
   * Generate template from resume PDF (SYNCHRONOUS - waits 5-15 seconds)
   *
   * This is a synchronous operation similar to /api/user/init.
   * The backend will process the PDF and return the template in one request.
   *
   * @param pdfUrl - Public URL of resume PDF from Supabase Storage
   * @param userInstructions - User's specific instructions for template generation
   * @param options - Request options
   * @returns Generated template data
   *
   * @throws {RateLimitError} When user has reached 5 template limit (429)
   * @throws {ValidationError} For invalid PDF URL or instructions (400)
   * @throws {AuthenticationError} For auth issues (401/403)
   *
   * @example
   * // With React Mutation
   * const mutation = useMutation({
   *   mutationFn: ({ pdfUrl, instructions }: { pdfUrl: string; instructions: string }) =>
   *     templateAPI.generateTemplate(pdfUrl, instructions),
   *   onError: (error) => {
   *     if (error instanceof RateLimitError) {
   *       toast.error('Template limit reached. Maximum 5 templates allowed.');
   *     }
   *   }
   * });
   */
  generateTemplate: async (
    pdfUrl: string,
    userInstructions: string,
    options?: ApiRequestOptions
  ): Promise<TemplateResponse> => {
    return apiClient.requestWithValidation(
      "/api/templates/",
      TemplateResponseSchema,
      {
        method: "POST",
        body: JSON.stringify({
          pdf_url: pdfUrl,
          user_instructions: userInstructions,
        }),
        // Long timeout for 5-15 second generation
        timeout: 30000, // 30 seconds (buffer for network latency)
        // Retry disabled for template generation (avoid duplicate templates)
        retry: false,
        ...options,
      }
    );
  },

  /**
   * Get user's template list
   *
   * @param options - Request options
   * @returns Array of user's templates (max 5)
   *
   * @example
   * // With React Query
   * useQuery({
   *   queryKey: ['templates'],
   *   queryFn: ({ signal }) => templateAPI.getTemplates({ signal })
   * })
   */
  getTemplates: async (
    options?: ApiRequestOptions
  ): Promise<TemplateList> => {
    return apiClient.requestWithValidation(
      "/api/templates/",
      TemplateListSchema,
      options
    );
  },

  /**
   * Get single template by ID
   *
   * @param templateId - Template UUID
   * @param options - Request options
   * @returns Template details
   *
   * @example
   * // With React Query
   * useQuery({
   *   queryKey: ['template', templateId],
   *   queryFn: ({ signal }) => templateAPI.getTemplate(templateId, { signal })
   * })
   */
  getTemplate: async (
    templateId: string,
    options?: ApiRequestOptions
  ): Promise<TemplateResponse> => {
    return apiClient.requestWithValidation(
      `/api/templates/${templateId}`,
      TemplateResponseSchema,
      options
    );
  },

  /**
   * Get user profile with template_count
   *
   * Replaces userAPI.getUserData() for template page to get template count.
   *
   * @param options - Request options
   * @returns User profile with template_count field
   *
   * @example
   * // With React Query
   * useQuery({
   *   queryKey: ['user', 'profile'],
   *   queryFn: ({ signal }) => templateAPI.getUserProfile({ signal })
   * })
   */
  getUserProfile: async (
    options?: ApiRequestOptions
  ): Promise<UserProfileWithCount> => {
    return apiClient.requestWithValidation(
      "/api/user/profile",
      UserProfileWithCountSchema,
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
  template: templateAPI,
  client: apiClient, // Expose client for advanced usage
};

// Export types for use in components and hooks
export type {
  EmailGenerationData,
  GenerateEmailResponse,
  TaskStatusResponse,
  EmailResponse,
  TaskStatus,
  UserProfile,
  TemplateGenerationRequest,
  TemplateResponse,
  TemplateList,
  UserProfileWithCount,
};
