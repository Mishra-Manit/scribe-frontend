/**
 * API Service Layer
 * Handles all communication with the backend API with runtime validation
 */

import { supabase } from "../config/supabase";
import { API_BASE_URL } from "../config/api";
import { z } from "zod";
import {
  EmailHistorySchema,
  GenerateEmailResponseSchema,
  TaskStatusResponseSchema,
  EmailResponseSchema,
  UserProfileSchema,
} from "./schemas";

/**
 * Template type enum matching backend
 */
export type TemplateType = "research" | "book" | "general";

/**
 * Task status enum
 */
export type TaskStatus = "PENDING" | "STARTED" | "SUCCESS" | "FAILURE";

/**
 * Email generation request data type (NEW - for async API)
 */
export interface EmailGenerationData {
  email_template: string;
  recipient_name: string;
  recipient_interest: string;
  template_type: TemplateType;
}

/**
 * Response from POST /api/email/generate
 */
export interface GenerateEmailResponse {
  task_id: string;
}

/**
 * Response from GET /api/email/status/{task_id}
 */
export interface TaskStatusResponse {
  task_id: string;
  status: TaskStatus;
  result?: {
    email_id?: string;
    current_step?: string;
    step_status?: string;
    step_timings?: Record<string, number>;
  };
  error?: string | {
    message: string;
    type: string;
    failed_step?: string;
  };
}

/**
 * Response from GET /api/email/{email_id} and GET /api/email/
 */
export interface EmailResponse {
  id: string;
  user_id: string;
  recipient_name: string;
  recipient_interest: string;
  email_message: string;
  template_type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/**
 * Get the current user's JWT token from Supabase
 * This token should be included in all authenticated API requests
 */
const getAuthToken = async (): Promise<string | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
};

/**
 * Make an authenticated API request
 */
const authenticatedFetch = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const token = await getAuthToken();

  if (!token) {
    throw new Error("No authentication token available");
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API request failed: ${response.statusText}`);
  }

  return response;
};

/**
 * Make an authenticated API request with Zod validation
 * Validates the response data against a Zod schema for runtime type safety
 */
const validatedFetch = async <T>(
  endpoint: string,
  schema: z.ZodSchema<T>,
  options: RequestInit = {}
): Promise<T> => {
  const response = await authenticatedFetch(endpoint, options);
  const data = await response.json();

  // Validate with Zod - throws on validation error
  // React Query will catch this and put the query into error state
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("API validation error:", error.issues);
      throw new Error(
        `Invalid API response format: ${error.issues.map((e) => e.message).join(", ")}`
      );
    }
    throw error;
  }
};

/**
 * User API
 */
export const userAPI = {
  /**
   * Get current user's data including profile and email count
   */
  getUserData: async () => {
    return validatedFetch("/api/user", UserProfileSchema);
  },

  /**
   * Initialize user profile in backend database (called on first login)
   * The backend reads user email from JWT token automatically
   */
  initUser: async (displayName?: string) => {
    const body = displayName ? JSON.stringify({ display_name: displayName }) : undefined;
    return validatedFetch("/api/user/init", UserProfileSchema, {
      method: "POST",
      body,
    });
  },
};

/**
 * Email API
 */
export const emailAPI = {
  /**
   * Get user's email history with pagination
   * @param limit - Number of emails to fetch (default: 20, max: 100)
   * @param offset - Number of emails to skip (default: 0)
   * @returns Array of EmailResponse objects
   */
  getEmailHistory: async (limit: number = 20, offset: number = 0): Promise<EmailResponse[]> => {
    return validatedFetch(`/api/email/?limit=${limit}&offset=${offset}`, EmailHistorySchema);
  },

  /**
   * Generate a new email (async - returns task_id for polling)
   * @param emailData - Email generation data including template and recipient info
   * @returns GenerateEmailResponse with task_id
   */
  generateEmail: async (emailData: EmailGenerationData): Promise<GenerateEmailResponse> => {
    return validatedFetch("/api/email/generate", GenerateEmailResponseSchema, {
      method: "POST",
      body: JSON.stringify(emailData),
    });
  },

  /**
   * Check status of email generation task
   * @param taskId - Celery task ID returned from generateEmail
   * @returns TaskStatusResponse with current status
   */
  getTaskStatus: async (taskId: string): Promise<TaskStatusResponse> => {
    return validatedFetch(`/api/email/status/${taskId}`, TaskStatusResponseSchema);
  },

  /**
   * Get a specific email by ID
   * @param emailId - UUID of the email
   * @returns EmailResponse object
   */
  getEmail: async (emailId: string): Promise<EmailResponse> => {
    return validatedFetch(`/api/email/${emailId}`, EmailResponseSchema);
  },

  /**
   * Poll task status until completion (helper method for async flow)
   * @param taskId - Celery task ID
   * @param onProgress - Optional callback for progress updates
   * @param pollInterval - Polling interval in milliseconds (default: 3000)
   * @returns EmailResponse when task completes
   * @throws Error if task fails or polling error occurs
   */
  pollTaskUntilComplete: async (
    taskId: string,
    onProgress?: (status: TaskStatusResponse) => void,
    pollInterval: number = 3000
  ): Promise<EmailResponse> => {
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const status = await emailAPI.getTaskStatus(taskId);

          // Call progress callback if provided
          if (onProgress) {
            onProgress(status);
          }

          if (status.status === "SUCCESS") {
            // Task completed - fetch the email
            const emailId = status.result?.email_id;
            if (!emailId) {
              reject(new Error("Task succeeded but no email_id returned"));
              return;
            }
            const email = await emailAPI.getEmail(emailId);
            resolve(email);
          } else if (status.status === "FAILURE") {
            // Task failed
            const errorMsg = typeof status.error === "string"
              ? status.error
              : status.error?.message || "Unknown error occurred";
            reject(new Error(errorMsg));
          } else {
            // Still running (PENDING or STARTED) - poll again
            setTimeout(poll, pollInterval);
          }
        } catch (error) {
          reject(error);
        }
      };

      // Start polling
      poll();
    });
  },
};

/**
 * Export a single API object for convenience
 */
export const api = {
  user: userAPI,
  email: emailAPI,
  getAuthToken,
};
