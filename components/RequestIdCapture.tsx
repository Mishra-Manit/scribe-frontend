"use client";

import { useEffect } from "react";

// Extend Window interface to include __REQUEST_ID__
declare global {
  interface Window {
    __REQUEST_ID__?: string;
  }
}

/**
 * Capture request ID from response headers and store globally
 * This allows API client to propagate request IDs to backend
 */
export function RequestIdCapture() {
  useEffect(() => {
    // Intercept fetch to capture X-Request-ID from responses
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const response = await originalFetch(...args);

      // Extract request ID from response headers
      const requestId = response.headers.get('X-Request-ID');
      if (requestId) {
        window.__REQUEST_ID__ = requestId;
      }

      return response;
    };

    // Cleanup on unmount
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null; // This component renders nothing
}
