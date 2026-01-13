import { EmailResponse } from "./schemas";
import * as XLSX from "xlsx";

/**
 * Convert EmailResponse array to Excel workbook
 * Columns: "Recipient Name", "Interest/Field", "Message"
 */
export function convertEmailsToExcel(emails: EmailResponse[]): XLSX.WorkBook {
  // Map emails to row objects with new header names
  const data = emails.map((email) => ({
    "Recipient Name": email.recipient_name,
    "Interest/Field": email.recipient_interest,
    "Message": email.email_message || "",
  }));

  // Create worksheet from data
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Create workbook and add worksheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Email History");

  return workbook;
}

/**
 * Trigger Excel download in browser
 * Uses Blob API + URL.createObjectURL + synthetic anchor click
 */
export function downloadExcel(workbook: XLSX.WorkBook, filename: string): void {
  // Generate Excel file buffer
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

  // Create blob with Excel MIME type
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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
