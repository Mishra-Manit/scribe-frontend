"use client";

import { ChangeEvent, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface FileUploaderProps {
  onFileSelected: (file: File) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

export default function FileUploader({
  onFileSelected,
  onError,
  disabled = false,
}: FileUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.[0]) {
      const file = event.target.files[0];

      // Validate file type
      if (file.type !== "application/pdf") {
        onError("Please upload a PDF file.");
        return;
      }

      // Validate file size (10MB max)
      const MAX_FILE_SIZE = 10 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) {
        onError("File size must be less than 10MB.");
        return;
      }

      console.log("[FileUploader] File selected:", file.name, file.size);
      setSelectedFile(file);
      onFileSelected(file);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="resume" className="block text-sm font-medium text-foreground">
        Upload Resume (PDF only, max 10MB)
      </Label>
      <Input
        id="resume"
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileChange}
        disabled={disabled}
        className="cursor-pointer"
      />
      {selectedFile && (
        <p className="text-sm text-muted-foreground">
          Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
        </p>
      )}
    </div>
  );
}
