"use client";

import { ChangeEvent } from "react";
import * as pdfjsLib from 'pdfjs-dist';

// Specify the workerSrc for pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

export interface PDFProcessorProps {
  onFileProcessed: (file: File, extractedText: string) => void;
  onError: (error: string) => void;
  onProcessingChange: (isProcessing: boolean) => void;
}

export default function PDFProcessor({ onFileProcessed, onError, onProcessingChange }: PDFProcessorProps) {
  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      
      if (file.type === "application/pdf") {
        onProcessingChange(true);
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          let fullText = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            fullText += textContent.items.map(item => ('str' in item && typeof item.str === 'string' ? item.str : '')).join(" ") + "\n";
          }
          
          if (!fullText.trim()) {
            onError("No text content was found in the uploaded PDF. It might be an image-only file, empty, or in an unsupported format. Please try a different PDF or copy the text manually.");
            onFileProcessed(file, "");
          } else {
            onFileProcessed(file, fullText);
          }
        } catch (e) {
          console.error("Error extracting PDF text:", e);
          onError("Failed to extract text from PDF. Please ensure it\'s a valid PDF file.");
          onFileProcessed(file, "");
        } finally {
          onProcessingChange(false);
        }
      } else if (file.type === "text/plain") {
        onProcessingChange(true);
        try {
          const text = await file.text();
          onFileProcessed(file, text);
        } catch (e) {
          console.error("Error reading text file:", e);
          onError("Failed to read text from file.");
          onFileProcessed(file, "");
        } finally {
          onProcessingChange(false);
        }
      } else {
        onFileProcessed(file, "Text extraction for this file type is not supported in the browser. The file will be sent as is.");
      }
    }
  };

  return (
    <div>
      <label htmlFor="resume" className="block text-sm font-medium text-gray-700 mb-2">
        Upload Resume (PDF, TXT supported for direct text extraction)
      </label>
      <input
        id="resume"
        type="file"
        accept=".pdf,.doc,.docx,.txt"
        onChange={handleFileChange}
        className="w-full h-10 px-3 py-1.5 text-gray-900 border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
      />
    </div>
  );
}
