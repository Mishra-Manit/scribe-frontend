import { apiClient } from "./client";
import type { ApiRequestOptions } from "./types";
import {
  EmailHistorySchema,
  GenerateEmailResponseSchema,
  TaskStatusResponseSchema,
  EmailResponseSchema,
  UserProfileSchema,
  TemplateResponseSchema,
  TemplateListSchema,
  UserProfileWithCountSchema,
  QueueItemsSchema,
  BatchSubmitResponseSchema,
  CancelQueueItemResponseSchema,
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
  type QueueItem,
  type BatchItem,
  type BatchSubmitResponse,
  type CancelQueueItemResponse,
} from "../schemas";

export * from "./errors";
export type { RetryOptions } from "./retry";
export type { ApiRequestOptions } from "./types";

// User API - profile and authentication operations
export const userAPI = {
  getUserData: async (options?: ApiRequestOptions): Promise<UserProfile> => {
    return apiClient.requestWithValidation("/api/user", UserProfileSchema, options);
  },

  /** Creates user profile if it doesn't exist. Call after Supabase sign-in. */
  initUser: async (displayName: string, options?: ApiRequestOptions): Promise<UserProfile> => {
    return apiClient.requestWithValidation("/api/user/init", UserProfileSchema, {
      method: "POST",
      body: JSON.stringify({ display_name: displayName }),
      ...options,
    });
  },

  completeOnboarding: async (options?: ApiRequestOptions): Promise<UserProfileWithCount> => {
    return apiClient.requestWithValidation("/api/user/onboarding", UserProfileWithCountSchema, {
      method: "PATCH",
      ...options,
    });
  },

  updateTemplate: async (template: string, options?: ApiRequestOptions): Promise<UserProfile> => {
    return apiClient.requestWithValidation("/api/user/template", UserProfileSchema, {
      method: "PATCH",
      body: JSON.stringify({ template }),
      ...options,
    });
  },
};

// Email API - generation, history, and task status
export const emailAPI = {
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

  /** Starts async generation, returns task_id for polling via getTaskStatus. */
  generateEmail: async (
    emailData: EmailGenerationData,
    options?: ApiRequestOptions
  ): Promise<GenerateEmailResponse> => {
    return apiClient.requestWithValidation("/api/email/generate", GenerateEmailResponseSchema, {
      method: "POST",
      body: JSON.stringify(emailData),
      retry: { maxAttempts: 2, baseDelay: 1000 },
      ...options,
    });
  },

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

  getEmail: async (emailId: string, options?: ApiRequestOptions): Promise<EmailResponse> => {
    return apiClient.requestWithValidation(`/api/email/${emailId}`, EmailResponseSchema, options);
  },

  updateEmail: async (
    emailId: string,
    data: UpdateEmailRequest,
    options?: ApiRequestOptions
  ): Promise<EmailResponse> => {
    return apiClient.requestWithValidation(`/api/email/${emailId}`, EmailResponseSchema, {
      method: "PATCH",
      body: JSON.stringify(data),
      retry: { maxAttempts: 2, baseDelay: 1000 },
      ...options,
    });
  },
};

// Template API - generation, listing, and management
export const templateAPI = {
  /** Synchronous operation (5-15s). Throws RateLimitError at 5 template limit. */
  generateTemplate: async (
    pdfUrl: string,
    userInstructions: string,
    options?: ApiRequestOptions
  ): Promise<TemplateResponse> => {
    return apiClient.requestWithValidation("/api/templates/", TemplateResponseSchema, {
      method: "POST",
      body: JSON.stringify({ pdf_url: pdfUrl, user_instructions: userInstructions }),
      timeout: 30000,
      retry: false,
      ...options,
    });
  },

  getTemplates: async (options?: ApiRequestOptions): Promise<TemplateList> => {
    return apiClient.requestWithValidation("/api/templates/", TemplateListSchema, options);
  },

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

  /** Returns user profile with template_count for template page. */
  getUserProfile: async (options?: ApiRequestOptions): Promise<UserProfileWithCount> => {
    return apiClient.requestWithValidation(
      "/api/user/profile",
      UserProfileWithCountSchema,
      options
    );
  },
};

// Queue API - database-backed batch email generation
export const queueAPI = {
  submitBatch: async (
    items: BatchItem[],
    emailTemplate: string,
    options?: ApiRequestOptions
  ): Promise<BatchSubmitResponse> => {
    return apiClient.requestWithValidation("/api/queue/batch", BatchSubmitResponseSchema, {
      method: "POST",
      body: JSON.stringify({
        items: items.map((i) => ({
          recipient_name: i.recipient_name,
          recipient_interest: i.recipient_interest,
        })),
        email_template: emailTemplate,
      }),
      retry: { maxAttempts: 2, baseDelay: 1000 },
      ...options,
    });
  },

  getQueueItems: async (options?: ApiRequestOptions): Promise<QueueItem[]> => {
    return apiClient.requestWithValidation("/api/queue/", QueueItemsSchema, options);
  },

  cancelItem: async (
    id: string,
    options?: ApiRequestOptions
  ): Promise<CancelQueueItemResponse> => {
    return apiClient.requestWithValidation(`/api/queue/${id}`, CancelQueueItemResponseSchema, {
      method: "DELETE",
      ...options,
    });
  },
};

export const api = {
  user: userAPI,
  email: emailAPI,
  template: templateAPI,
  queue: queueAPI,
  client: apiClient,
};

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
  QueueItem,
  BatchItem,
  BatchSubmitResponse,
  CancelQueueItemResponse,
};
