import { EmailResponse } from "./schemas";

/**
 * Escape a CSV field according to RFC 4180
 * - Wrap in quotes if contains comma, newline, or quote
 * - Double any internal quotes
 */
export function escapeCSVField(value: string): string {
  if (!value) return '""';

  const needsQuotes = /[",\n\r]/.test(value);
  const escaped = value.replace(/"/g, '""'); // Double internal quotes

  return needsQuotes ? `"${escaped}"` : escaped;
}

/**
 * Convert EmailResponse array to CSV string with headers
 * Headers: "Recipient Name", "Interest/Field", "Email Content"
 */
export function convertEmailsToCSV(emails: EmailResponse[]): string {
  // Headers as per requirements
  const headers = ["Recipient Name", "Interest/Field", "Email Content"];
  const headerRow = headers.map((h) => escapeCSVField(h)).join(",");

  // Data rows
  const dataRows = emails.map((email) =>
    [
      escapeCSVField(email.recipient_name),
      escapeCSVField(email.recipient_interest),
      escapeCSVField(email.email_message || ""),
    ].join(",")
  );

  return [headerRow, ...dataRows].join("\n");
}

/**
 * Trigger CSV download in browser
 * Uses Blob API + URL.createObjectURL + synthetic anchor click
 */
export function downloadCSV(csvContent: string, filename: string): void {
  // Add UTF-8 BOM for Excel compatibility
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Cleanup
  URL.revokeObjectURL(url);
}
