"use client";

import React from 'react';
import { Component, type ReactNode } from "react";
import { ApiError } from "@/lib/api";
import logger from '@/utils/logger';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { UI_ERRORS } from "@/constants/error-messages";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary for graceful error handling
 *
 * Catches errors in child components and displays user-friendly error UI.
 * Provides special handling for ApiError instances with retry information.
 *
 * @example
 * // Wrap entire dashboard
 * <ErrorBoundary>
 *   <DashboardPage />
 * </ErrorBoundary>
 *
 * @example
 * // With custom fallback
 * <ErrorBoundary
 *   fallback={(error, reset) => (
 *     <CustomErrorUI error={error} onRetry={reset} />
 *   )}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error("ErrorBoundary caught error", {
      error: error.message,
      errorName: error.name,
      errorStack: error.stack,
      componentStack: errorInfo.componentStack
    });

    // Log to error tracking service (e.g., Sentry)
    // Sentry.captureException(error, { contexts: { react: errorInfo } });
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }

      // Default error UI
      const error = this.state.error;
      const isApiError = error instanceof ApiError;

      return (
        <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50">
          <Card className="max-w-md w-full shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-red-600" />
                <CardTitle className="text-red-600">
                  {isApiError ? "API Error" : "Something went wrong"}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* User-friendly error message */}
              <p className="text-gray-700">
                {isApiError
                  ? (error as ApiError).getUserMessage()
                  : error.message || UI_ERRORS.ERROR_BOUNDARY.user}
              </p>

              {/* Status code for API errors */}
              {isApiError && (error as ApiError).status > 0 && (
                <p className="text-sm text-gray-500">
                  Status code: {(error as ApiError).status}
                </p>
              )}

              {/* Retry indicator for retryable errors */}
              {isApiError && (error as ApiError).retryable && (
                <p className="text-sm text-blue-600 font-medium">
                  This error may be temporary. Retrying might help.
                </p>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                <Button onClick={this.reset} variant="default" className="flex-1">
                  Try Again
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="flex-1"
                >
                  Reload Page
                </Button>
              </div>

              {/* Development-only: Error details */}
              {process.env.NODE_ENV === "development" && (
                <details className="mt-4">
                  <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                    Error details (dev only)
                  </summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                    {error.stack}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
