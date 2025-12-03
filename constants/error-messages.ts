/**
 * Centralized Error Messages
 *
 * Single source of truth for all error messages in the application.
 * Each message has two components:
 * - dev: Technical message for developers (logs, debugging)
 * - user: User-friendly message for UI display (toasts, error boundaries)
 */

export interface ErrorMessage {
  dev: string;
  user: string;
}

// ========================================
// AUTHENTICATION ERRORS
// ========================================
export const AUTH_ERRORS = {
  NO_TOKEN: {
    dev: "No valid authentication token available",
    user: "Your session has expired. Please log in again."
  },
  TOKEN_EXPIRED: {
    dev: "Token expired, refresh needed",
    user: "Your session has expired. Please log in again."
  },
  TOKEN_INVALID: {
    dev: "Authentication failed - invalid token",
    user: "Authentication failed. Please log in again."
  },
  SESSION_VALIDATION_FAILED: {
    dev: "Session validation error in middleware",
    user: "Unable to verify your session. Please log in again."
  },
  SESSION_PROCESSING_ERROR: {
    dev: "Error processing session in AuthContext",
    user: "Authentication error. Please try refreshing the page."
  },
  USER_INIT_FAILED: {
    dev: "Failed to initialize user in backend",
    user: "Failed to initialize your account. Please contact support if this persists."
  },
  USER_INIT_FORBIDDEN: {
    dev: "User initialization forbidden (401/403)",
    user: "Failed to initialize your account. Please try logging out and back in."
  },
  NO_SESSION: {
    dev: "No active session found",
    user: "Not authenticated. Please log in again."
  },
  SESSION_TIMEOUT: {
    dev: "Session check timed out",
    user: "Authentication is taking too long. Please check your connection."
  },
  AUTH_TIMEOUT: {
    dev: "Authentication verification timeout in ProtectedRoute",
    user: "Unable to verify authentication. Please check your connection and try again."
  }
} as const;

// ========================================
// API ERRORS
// ========================================
export const API_ERRORS = {
  NETWORK: {
    dev: "Network request failed - possible offline",
    user: "Network error. Please check your connection and try again."
  },
  RATE_LIMIT: {
    dev: "Rate limit exceeded (429)",
    user: "Too many requests. Please wait a moment and try again."
  },
  VALIDATION: {
    dev: "Request validation failed (400)",
    user: "Invalid data provided. Please check your input and try again."
  },
  VALIDATION_RESPONSE: {
    dev: "API response validation failed - schema mismatch",
    user: "Received unexpected data format. Please try again or contact support."
  },
  NOT_FOUND: {
    dev: "Resource not found (404)",
    user: "The requested resource was not found."
  },
  FORBIDDEN: {
    dev: "Access forbidden (403)",
    user: "You do not have permission to access this resource."
  },
  SERVER_ERROR: {
    dev: "Server error (5xx)",
    user: "Server error. Please try again later."
  },
  UNKNOWN: {
    dev: "Unknown API error occurred",
    user: "An unexpected error occurred. Please try again."
  },
  REQUEST_CANCELLED: {
    dev: "Request was cancelled by user/system",
    user: "Request was cancelled."
  },
  REQUEST_TIMEOUT: {
    dev: "Request exceeded timeout duration",
    user: "Request timed out. Please try again."
  }
} as const;

// ========================================
// QUEUE ERRORS
// ========================================
export const QUEUE_ERRORS = {
  GENERATION_FAILED: {
    dev: "Email generation API call failed",
    user: "Failed to generate email. Please try again."
  },
  GENERATION_START_FAILED: {
    dev: "Failed to start email generation task",
    user: "Failed to start email generation. Please try again."
  },
  TASK_FAILED: {
    dev: "Task completed with FAILURE status",
    user: "Email generation failed. Please try again."
  },
  TASK_TIMEOUT: {
    dev: "Task polling timeout - no response",
    user: "Email generation is taking longer than expected. Please check back later."
  },
  TASK_INTERRUPTED: {
    dev: "Task processing was interrupted on page navigation",
    user: "Process was interrupted. Please try again."
  },
  UNKNOWN_ERROR: {
    dev: "Unknown queue processing error",
    user: "An unexpected error occurred during email generation."
  }
} as const;

// ========================================
// STORAGE ERRORS
// ========================================
export const STORAGE_ERRORS = {
  NO_FILE: {
    dev: "No file provided to upload",
    user: "No file selected. Please choose a file to upload."
  },
  INVALID_FILE_TYPE: {
    dev: "File type not supported - expected PDF",
    user: "Invalid file type. Please upload a PDF file."
  },
  FILE_TOO_LARGE: {
    dev: "File exceeds 10MB size limit",
    user: "File is too large. Maximum size is 10MB."
  },
  BUCKET_NOT_FOUND: {
    dev: "Storage bucket not configured in Supabase",
    user: "Storage bucket not configured. Please contact support."
  },
  AUTH_ERROR: {
    dev: "Storage authentication error",
    user: "Authentication issue. Please try logging out and back in."
  },
  NO_SESSION: {
    dev: "No active session for storage operation",
    user: "Session expired. Please log in again."
  },
  RLS_POLICY_ERROR: {
    dev: "Row-level security policy not configured",
    user: "Storage permissions not configured. Please contact support with error code: RLS_POLICY"
  },
  NO_PUBLIC_URL: {
    dev: "Failed to get public URL for uploaded file",
    user: "Upload completed but failed to get file URL. Please contact support."
  },
  UPLOAD_FAILED: {
    dev: "Supabase storage upload failed",
    user: "Failed to upload file. Please try again."
  },
  DELETE_FAILED: {
    dev: "Supabase storage delete failed",
    user: "Failed to delete file. Please try again."
  },
  UNKNOWN_ERROR: {
    dev: "Unknown storage error",
    user: "An unexpected storage error occurred. Please try again."
  }
} as const;

// ========================================
// VALIDATION ERRORS
// ========================================
export const VALIDATION_ERRORS = {
  MISSING_FIELDS: {
    dev: "Required fields missing in request",
    user: "Required fields are missing. Please fill out all required fields."
  },
  INVALID_FORMAT: {
    dev: "Data format validation failed",
    user: "Invalid data format. Please check your input."
  },
  SCHEMA_MISMATCH: {
    dev: "Zod schema validation failed",
    user: "Data validation failed. Please check your input."
  }
} as const;

// ========================================
// UI / COMPONENT ERRORS
// ========================================
export const UI_ERRORS = {
  ERROR_BOUNDARY: {
    dev: "Unhandled error caught by ErrorBoundary",
    user: "An unexpected error occurred. Please try refreshing the page."
  },
  RENDER_ERROR: {
    dev: "Component render error",
    user: "Failed to display content. Please refresh the page."
  }
} as const;

/**
 * Helper function to get error messages by category and key
 */
export function getErrorMessage(
  category: keyof typeof ERROR_MESSAGES,
  key: string
): ErrorMessage {
  const categoryErrors = ERROR_MESSAGES[category];
  if (categoryErrors && key in categoryErrors) {
    return categoryErrors[key as keyof typeof categoryErrors];
  }

  // Fallback
  return {
    dev: `Unknown error: ${category}.${key}`,
    user: "An unexpected error occurred. Please try again."
  };
}

// Unified export for convenience
export const ERROR_MESSAGES = {
  AUTH: AUTH_ERRORS,
  API: API_ERRORS,
  QUEUE: QUEUE_ERRORS,
  STORAGE: STORAGE_ERRORS,
  VALIDATION: VALIDATION_ERRORS,
  UI: UI_ERRORS
} as const;
