/**
 * API Configuration
 * Handles environment-based API endpoint configuration
 */

// Get the API base URL from environment variables
// Fallback to localhost for development if not set
const getApiBaseUrl = (): string => {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    console.warn('NEXT_PUBLIC_API_BASE_URL is not defined in environment variables. Falling back to localhost:8000');
    return 'http://localhost:8000';
  }

  return baseUrl;
};

export const API_BASE_URL = getApiBaseUrl();

/**
 * API Endpoints
 *
 * @deprecated These legacy endpoints are no longer used.
 * All new code should use the api object from @/lib/api.ts instead.
 *
 * Legacy endpoints (kept for reference during migration):
 * - /generate-email → Use api.email.generateEmail() (now async with task polling)
 * - /call-openai → Template generation (functionality moved to backend pipeline)
 */
export const API_ENDPOINTS = {
  /** @deprecated Use api.email.generateEmail() from @/lib/api.ts */
  generateEmail: `${API_BASE_URL}/generate-email`,
  /** @deprecated Template generation moved to backend pipeline */
  callOpenAI: `${API_BASE_URL}/call-openai`,
} as const;

/**
 * Current environment (DEVELOPMENT or PRODUCTION)
 */
export const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || 'DEVELOPMENT';

/**
 * Helper to check if running in production
 */
export const isProduction = () => ENVIRONMENT === 'PRODUCTION';

/**
 * Feature flag to show maintenance/shutdown notice across the app.
 * When true: 
 *   - Landing page shows maintenance notice with GitHub self-hosting links
 *   - All sign-in and get started buttons are hidden
 *   - Dashboard redirects to landing page (users cannot access the app)
 *   - Displays 24-hour scheduled maintenance message
 * When false: Normal app behavior.
 */
export const SHOW_SHUTDOWN_NOTICE = true;

/**
 * Helper to check if running in development
 */
export const isDevelopment = () => ENVIRONMENT === 'DEVELOPMENT';
