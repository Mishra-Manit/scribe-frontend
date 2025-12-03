/**
 * Toast Notification Service
 *
 * Wrapper around Sonner toast library with centralized error messages.
 * Provides consistent toast notifications across the application.
 */

import { toast as sonnerToast } from "sonner";
import type { ErrorMessage } from "@/constants/error-messages";

interface ToastOptions {
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Show success toast
 */
export function showSuccess(message: string, options?: ToastOptions) {
  sonnerToast.success(message, {
    duration: options?.duration || 4000,
    action: options?.action,
  });
}

/**
 * Show error toast from ErrorMessage object
 */
export function showError(errorMessage: ErrorMessage, options?: ToastOptions) {
  sonnerToast.error(errorMessage.user, {
    duration: options?.duration || 5000,
    action: options?.action,
  });
}

/**
 * Show error toast from string message
 */
export function showErrorMessage(message: string, options?: ToastOptions) {
  sonnerToast.error(message, {
    duration: options?.duration || 5000,
    action: options?.action,
  });
}

/**
 * Show info toast
 */
export function showInfo(message: string, options?: ToastOptions) {
  sonnerToast.info(message, {
    duration: options?.duration || 4000,
    action: options?.action,
  });
}

/**
 * Show warning toast
 */
export function showWarning(message: string, options?: ToastOptions) {
  sonnerToast.warning(message, {
    duration: options?.duration || 5000,
    action: options?.action,
  });
}

/**
 * Show loading toast (returns toast ID for dismissal)
 */
export function showLoading(message: string): string | number {
  return sonnerToast.loading(message);
}

/**
 * Dismiss toast by ID
 */
export function dismissToast(toastId: string | number) {
  sonnerToast.dismiss(toastId);
}

/**
 * Dismiss all toasts
 */
export function dismissAll() {
  sonnerToast.dismiss();
}

// Export default object with all methods
export const toastService = {
  success: showSuccess,
  error: showError,
  errorMessage: showErrorMessage,
  info: showInfo,
  warning: showWarning,
  loading: showLoading,
  dismiss: dismissToast,
  dismissAll,
};
