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
 */
export const API_ENDPOINTS = {
  generateEmail: `${API_BASE_URL}/generate-email`,
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
 * Helper to check if running in development
 */
export const isDevelopment = () => ENVIRONMENT === 'DEVELOPMENT';
