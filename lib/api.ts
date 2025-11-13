/**
 * API Service Layer
 * Handles all communication with the backend API
 */

import { supabase } from "../config/supabase";
import { API_BASE_URL } from "../config/api";

/**
 * Email generation request data type
 */
export interface EmailGenerationData {
  email_template: string;
  name: string;
  professor_interest: string;
  userId: string;
  source: string;
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
 * User API
 */
export const userAPI = {
  /**
   * Get current user's data including profile and email count
   */
  getUserData: async () => {
    const response = await authenticatedFetch("/api/user");
    return response.json();
  },

  /**
   * Initialize user profile in backend database (called on first login)
   * The backend reads user email from JWT token automatically
   */
  initUser: async (displayName?: string) => {
    const body = displayName ? JSON.stringify({ display_name: displayName }) : undefined;
    const response = await authenticatedFetch("/api/user/init", {
      method: "POST",
      body,
    });
    return response.json();
  },
};

/**
 * Email API
 */
export const emailAPI = {
  /**
   * Get user's email history
   */
  getEmailHistory: async () => {
    const response = await authenticatedFetch("/api/emails");
    return response.json();
  },

  /**
   * Generate a new email
   */
  generateEmail: async (emailData: EmailGenerationData) => {
    const response = await authenticatedFetch("/api/generate-email", {
      method: "POST",
      body: JSON.stringify(emailData),
    });
    return response.json();
  },

  /**
   * Get a specific email by ID
   */
  getEmail: async (emailId: string) => {
    const response = await authenticatedFetch(`/api/emails/${emailId}`);
    return response.json();
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
