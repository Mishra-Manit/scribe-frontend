/**
 * Supabase Storage Service
 * Handles resume uploads to Supabase Storage bucket
 */

import { supabase } from "@/config/supabase";
import { STORAGE_ERRORS } from "@/constants/error-messages";

const BUCKET_NAME = "resumes";

export class StorageError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "StorageError";
    Object.setPrototypeOf(this, StorageError.prototype);
  }

  getUserMessage(): string {
    if (this.code === "BUCKET_NOT_FOUND") {
      return STORAGE_ERRORS.BUCKET_NOT_FOUND.user;
    }
    if (this.code === "FILE_TOO_LARGE") {
      return STORAGE_ERRORS.FILE_TOO_LARGE.user;
    }
    if (this.code === "INVALID_FILE_TYPE") {
      return STORAGE_ERRORS.INVALID_FILE_TYPE.user;
    }
    if (this.code === "AUTH_ERROR") {
      return STORAGE_ERRORS.AUTH_ERROR.user;
    }
    if (this.code === "NO_SESSION") {
      return STORAGE_ERRORS.NO_SESSION.user;
    }
    if (this.message?.includes("row-level security") || this.status === 403) {
      return STORAGE_ERRORS.RLS_POLICY_ERROR.user;
    }
    return this.message || STORAGE_ERRORS.UPLOAD_FAILED.user;
  }
}

export const storageService = {
  /**
   * Upload resume PDF to Supabase Storage
   *
   * Path pattern: {user_id}/{timestamp}_resume.pdf
   * Each upload creates a new file with unique timestamp
   *
   * @param file - PDF file to upload
   * @param userId - User ID for path
   * @returns Public URL of uploaded file
   */
  async uploadResume(file: File, userId: string): Promise<string> {
    // Validation
    if (!file) {
      throw new StorageError(STORAGE_ERRORS.NO_FILE.dev, "NO_FILE");
    }

    if (file.type !== "application/pdf") {
      throw new StorageError(
        STORAGE_ERRORS.INVALID_FILE_TYPE.dev,
        "INVALID_FILE_TYPE"
      );
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      throw new StorageError(
        STORAGE_ERRORS.FILE_TOO_LARGE.dev,
        "FILE_TOO_LARGE"
      );
    }

    try {
      // Verify we have an authenticated session
      console.log("[Storage] Checking authentication...");

      // SAFEGUARD: Wrap getSession() in a timeout so we never hang indefinitely
      const getSessionWithTimeout = async () => {
        const timeoutMs = 5000;

        return new Promise<Awaited<ReturnType<typeof supabase.auth.getSession>>>(
          (resolve, reject) => {
            const timeoutId = setTimeout(() => {
              console.error("[Storage] getSession() timeout after", timeoutMs, "ms");
              reject(new Error("getSession timeout"));
            }, timeoutMs);

            supabase.auth
              .getSession()
              .then((result) => {
                clearTimeout(timeoutId);
                resolve(result as Awaited<ReturnType<typeof supabase.auth.getSession>>);
              })
              .catch((error) => {
                clearTimeout(timeoutId);
                reject(error);
              });
          }
        );
      };

      const { data: { session }, error: sessionError } = await getSessionWithTimeout();
      
      if (sessionError) {
        console.error("[Storage] Session error:", sessionError);
        throw new StorageError(
          STORAGE_ERRORS.AUTH_ERROR.dev,
          "AUTH_ERROR"
        );
      }

      if (!session) {
        console.error("[Storage] No active session found");
        throw new StorageError(
          STORAGE_ERRORS.NO_SESSION.dev,
          "NO_SESSION"
        );
      }

      console.log("[Storage] Session verified:", {
        userId: session.user.id,
        hasToken: !!session.access_token,
        tokenLength: session.access_token?.length
      });

      const timestamp = Date.now();
      const filePath = `${userId}/${timestamp}_resume.pdf`;

      console.log(`[Storage] Uploading resume to ${filePath}`, {
        fileSize: file.size,
        fileType: file.type,
        fileName: file.name
      });

      // Upload with unique timestamp (no overwrite)
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false, // Each upload is unique
        });

      if (error) {
        console.error("[Storage] Upload failed:", {
          message: error.message,
          name: error.name,
          // @ts-expect-error - statusCode may not exist on all error types
          statusCode: error.statusCode,
          // @ts-expect-error - error may not exist on all error types
          error: error.error,
          fullError: error
        });
        throw new StorageError(
          error.message,
          error.name,
          // @ts-expect-error - statusCode may not exist on all error types
          error.statusCode ? parseInt(error.statusCode) : undefined
        );
      }

      console.log("[Storage] Upload successful:", data.path);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        throw new StorageError(
          STORAGE_ERRORS.NO_PUBLIC_URL.dev,
          "NO_PUBLIC_URL"
        );
      }

      console.log("[Storage] Public URL:", urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }

      console.error("[Storage] Unexpected error:", error);
      throw new StorageError(
        error instanceof Error ? error.message : STORAGE_ERRORS.UNKNOWN_ERROR.dev,
        "UNKNOWN_ERROR"
      );
    }
  },

  /**
   * Delete resume from storage
   *
   * @param userId - User ID
   */
  async deleteResume(userId: string): Promise<void> {
    try {
      const filePath = `${userId}/resume.pdf`;

      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([filePath]);

      if (error) {
        console.error("[Storage] Delete failed:", error);
        throw new StorageError(
          error.message || STORAGE_ERRORS.DELETE_FAILED.dev,
          error.name
        );
      }

      console.log("[Storage] Resume deleted:", filePath);
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }

      console.error("[Storage] Unexpected delete error:", error);
      throw new StorageError(
        error instanceof Error ? error.message : STORAGE_ERRORS.UNKNOWN_ERROR.dev,
        "UNKNOWN_ERROR"
      );
    }
  },

  /**
   * Check if resume exists for user
   *
   * @param userId - User ID
   * @returns True if resume exists
   */
  async resumeExists(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list(userId);

      if (error) {
        console.error("[Storage] List failed:", error);
        return false;
      }

      return data?.some(file => file.name === "resume.pdf") || false;
    } catch (error) {
      console.error("[Storage] Exists check failed:", error);
      return false;
    }
  },
};
