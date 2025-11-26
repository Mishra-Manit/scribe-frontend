"use client";

export const dynamic = 'force-dynamic';

import { useState, FormEvent, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContextProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import FileUploader from "@/components/FileUploader";
import { api } from "@/lib/api";
import { storageService, StorageError } from "@/lib/supabase/storage";
import { RateLimitError } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query-keys";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const MAX_TEMPLATES = 5;

export default function TemplateGenerationPage() {
  const { user, supabaseReady } = useAuth();
  const queryClient = useQueryClient();

  // Form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [instructions, setInstructions] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [generatedTemplate, setGeneratedTemplate] = useState("");
  const [copied, setCopied] = useState(false);
  const generatedTemplateRef = useRef<HTMLDivElement>(null);

  // Fetch user profile for template_count
  const { data: userProfile } = useQuery({
    queryKey: queryKeys.user.profile(),
    queryFn: ({ signal }) => api.template.getUserProfile({ signal }),
    enabled: !!user?.uid && supabaseReady,
    staleTime: 30000,
  });

  const templateCount = userProfile?.template_count ?? 0;
  const templatesRemaining = Math.max(0, MAX_TEMPLATES - templateCount);
  const isLimitReached = templatesRemaining <= 0;

  // Fetch templates history
  const { data: templates, isLoading: isTemplatesLoading } = useQuery({
    queryKey: queryKeys.templates.list(),
    queryFn: ({ signal }) => api.template.getTemplates({ signal }),
    enabled: !!user?.uid && supabaseReady,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user?.uid) throw new Error("Not authenticated");
      return storageService.uploadResume(file, user.uid);
    },
    onError: (error) => {
      console.error("[Template] Upload failed:", error);
      if (error instanceof StorageError) {
        setError(error.getUserMessage());
      } else {
        setError("Upload failed. Please try again.");
      }
    },
  });

  // Generation mutation (SYNCHRONOUS - waits 5-15s)
  const generateMutation = useMutation({
    mutationFn: async ({ pdfUrl, userInstructions }: {
      pdfUrl: string;
      userInstructions: string;
    }) => {
      return api.template.generateTemplate(pdfUrl, userInstructions);
    },
    onSuccess: (data) => {
      console.log("[Template] Generation successful:", data.id);
      setGeneratedTemplate(data.template_text);
      setError(null);

      // Invalidate caches
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile() });
      queryClient.invalidateQueries({ queryKey: queryKeys.templates.list() });

      // Scroll to result
      setTimeout(() => {
        generatedTemplateRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    },
    onError: (error) => {
      console.error("[Template] Generation failed:", error);

      if (error instanceof RateLimitError) {
        setError(`Template limit reached (${MAX_TEMPLATES} maximum).`);
        queryClient.invalidateQueries({ queryKey: queryKeys.user.profile() });
      } else {
        setError(error instanceof Error ? error.message : "Generation failed");
      }
    },
  });

  const isGenerating = uploadMutation.isPending || generateMutation.isPending;

  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    // Validation
    if (isLimitReached) {
      setError(`Template limit reached (${MAX_TEMPLATES} maximum).`);
      return;
    }

    if (!selectedFile) {
      setError("Please upload your resume.");
      return;
    }

    if (!instructions.trim()) {
      setError("Please provide instructions.");
      return;
    }

    if (!user?.uid) {
      setError("User not authenticated.");
      return;
    }

    if (!supabaseReady) {
      setError("Storage service not ready. Please try again.");
      return;
    }

    // Reset state
    setError(null);
    setGeneratedTemplate("");
    setCopied(false);

    try {
      // Upload resume (1-3s)
      console.log("[Template] Starting upload...");
      const pdfUrl = await uploadMutation.mutateAsync(selectedFile);
      console.log("[Template] Upload complete:", pdfUrl);

      // Generate template (5-15s, SYNCHRONOUS)
      console.log("[Template] Starting generation...");
      await generateMutation.mutateAsync({
        pdfUrl,
        userInstructions: instructions,
      });
      console.log("[Template] Generation complete");
    } catch (error) {
      // Errors handled in mutation callbacks
      // Resume stays in storage for retry (per user requirement)
      console.error("[Template] Submit failed:", error);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Create Email Template
            </h1>
            <p className="text-sm text-gray-600">
              {templatesRemaining} of {MAX_TEMPLATES} templates remaining
            </p>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-xl">
                Upload Resume and Instructions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <FileUploader
                  onFileSelected={handleFileSelected}
                  onError={setError}
                  disabled={isGenerating || isLimitReached}
                />

                <div>
                  <Label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-1">
                    Instructions for Template Generation
                  </Label>
                  <Textarea
                    id="instructions"
                    placeholder="e.g., Focus on my ML research for academic positions. Keep it warm and professional."
                    className="w-full resize-y text-gray-900 border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    rows={6}
                    disabled={isGenerating || isLimitReached}
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {isGenerating && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <p className="text-sm text-blue-600">
                      {uploadMutation.isPending && "Uploading resume..."}
                      {generateMutation.isPending && "Generating template... This may take 5-15 seconds."}
                    </p>
                  </div>
                )}

                <div className="flex justify-center">
                  <Button
                    type="submit"
                    className="w-full sm:w-auto"
                    disabled={isGenerating || isLimitReached || !supabaseReady}
                  >
                    {isGenerating
                      ? uploadMutation.isPending
                        ? "Uploading Resume..."
                        : "Generating Template..."
                      : isLimitReached
                      ? "Template Limit Reached"
                      : `Generate Template (${templatesRemaining} ${
                          templatesRemaining === 1 ? "use" : "uses"
                        } left)`}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {generatedTemplate && (
            <Card ref={generatedTemplateRef}>
              <CardHeader>
                <CardTitle className="text-xl">Generated Email Template</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  readOnly
                  value={generatedTemplate}
                  className="w-full resize-y text-gray-900 bg-gray-100 border-gray-300 rounded-md"
                  rows={15}
                />
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedTemplate);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? "Copied!" : "Copy Template"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="mt-8">
            <h2 className="text-3xl font-semibold text-gray-900 mb-4">Template History</h2>

            {isTemplatesLoading ? (
              <Card>
                <CardContent className="py-12">
                  <p className="text-center text-gray-600">Loading templates...</p>
                </CardContent>
              </Card>
            ) : templates && templates.length > 0 ? (
              <div className="grid gap-6">
                {templates.map((template) => (
                  <Card key={template.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg">
                            Template from {new Date(template.created_at).toLocaleDateString()}
                          </CardTitle>
                          <p className="text-sm text-gray-600 mt-1">
                            {template.user_instructions}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(template.template_text);
                          }}
                        >
                          Copy Template
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gray-50 p-4 rounded-md">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">
                          {template.template_text}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-gray-600 mb-4">No templates yet.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
