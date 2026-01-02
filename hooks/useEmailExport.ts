import { useState } from "react";
import { emailAPI } from "@/lib/api";
import { EmailResponse } from "@/lib/schemas";
import { convertEmailsToCSV, downloadCSV } from "@/lib/csv-utils";

interface UseEmailExportReturn {
  isExporting: boolean;
  error: string | null;
  exportEmails: () => Promise<void>;
}

/**
 * Hook for exporting all emails as CSV
 * Handles pagination and error handling
 */
export function useEmailExport(): UseEmailExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportEmails = async () => {
    setIsExporting(true);
    setError(null);

    try {
      const allEmails: EmailResponse[] = [];
      let offset = 0;
      const BATCH_SIZE = 1000;
      let hasMore = true;

      while (hasMore) {
        let retryCount = 0;
        let batch: EmailResponse[] = [];
        let success = false;

        // Retry logic for each batch
        while (retryCount < 3 && !success) {
          try {
            batch = await emailAPI.getEmailHistory(BATCH_SIZE, offset);
            success = true;
          } catch (batchError) {
            retryCount++;
            if (retryCount >= 3) {
              throw new Error(
                `Failed to fetch emails after 3 retries: ${
                  batchError instanceof Error
                    ? batchError.message
                    : "Unknown error"
                }`
              );
            }
            // Exponential backoff: 1s, 2s, 4s
            await new Promise((resolve) =>
              setTimeout(resolve, Math.pow(2, retryCount) * 1000)
            );
          }
        }

        if (batch.length === 0) {
          hasMore = false;
          break;
        }

        // Filter out discarded emails (backend already filters, but this is defensive)
        const displayedEmails = batch.filter(email => email.displayed !== false);
        allEmails.push(...displayedEmails);
        offset += BATCH_SIZE;

        // Check if we've reached the end (batch returned less than requested)
        if (batch.length < BATCH_SIZE) {
          hasMore = false;
        } else {
          // Delay between batches to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      if (allEmails.length === 0) {
        setError("No emails to export");
        return;
      }

      // Generate CSV and trigger download
      const csvContent = convertEmailsToCSV(allEmails);
      const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      downloadCSV(csvContent, `email-history-${timestamp}.csv`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  return { isExporting, error, exportEmails };
}
