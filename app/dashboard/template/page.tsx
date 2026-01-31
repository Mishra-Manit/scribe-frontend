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
import { FadeIn } from "@/components/motion/FadeIn";
import { SlideIn } from "@/components/motion/SlideIn";
import { ScaleIn } from "@/components/motion/ScaleIn";
import { Loader2, Copy, FileText, CheckCircle2, History, Check } from "lucide-react";

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
  const [copiedTemplateId, setCopiedTemplateId] = useState<number | null>(null);
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
        generatedTemplateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
      console.error("[Template] Submit failed:", error);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50/50 pb-12">
        <Navbar />

        <div className="max-w-4xl mx-auto pt-24 px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                  Create Email Template
                </h1>
                <p className="text-gray-500 mt-2">
                  Generate a custom email template based on your resume and goals.
                </p>
              </div>
              <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-xs text-sm">
                <span className="font-semibold text-gray-900">{templatesRemaining}</span>
                <span className="text-gray-500"> of {MAX_TEMPLATES} templates remaining</span>
              </div>
            </div>
          </FadeIn>

          <div className="space-y-8">
            <ScaleIn delay={0.1}>
              <Card className="border-none shadow-[0_2px_10px_-2px_rgba(0,0,0,0.1)]">
                <CardHeader>
                  <CardTitle className="text-lg font-medium text-gray-900">
                    Upload Resume & Instructions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-gray-50/50 p-4 rounded-xl border border-dashed border-gray-200 hover:border-gray-300 transition-colors">
                      <FileUploader
                        onFileSelected={handleFileSelected}
                        onError={setError}
                        disabled={isGenerating || isLimitReached}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="instructions" className="text-gray-700 font-medium">
                        Custom Instructions
                      </Label>
                      <Textarea
                        id="instructions"
                        placeholder="e.g., Focus on my ML research for academic positions. Keep it warm and professional. Mention my paper on transformers."
                        className="min-h-[120px] resize-y bg-gray-50/50 border-gray-200 focus:bg-white transition-all"
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        disabled={isGenerating || isLimitReached}
                      />
                    </div>

                    {error && (
                      <FadeIn>
                        <div className="bg-red-50 border border-red-100 rounded-lg p-4 text-sm text-red-600 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          {error}
                        </div>
                      </FadeIn>
                    )}

                    {isGenerating && (
                      <FadeIn>
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-center gap-3">
                          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                          <p className="text-sm text-blue-700">
                            {uploadMutation.isPending && "Uploading resume..."}
                            {generateMutation.isPending && "Analyzing resume and generating template (this takes 5-15s)..."}
                          </p>
                        </div>
                      </FadeIn>
                    )}

                    <Button
                      type="submit"
                      className="w-full shadow-lg shadow-blue-900/5"
                      disabled={isGenerating || isLimitReached || !supabaseReady}
                    >
                      {isGenerating
                        ? "Processing..."
                        : isLimitReached
                        ? "Limit Reached"
                        : "Generate Template"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </ScaleIn>

            {generatedTemplate && (
              <ScaleIn delay={0.2}>
                <div ref={generatedTemplateRef}>
                  <Card className="border-green-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] overflow-hidden">
                    <div className="bg-green-50/50 border-b border-green-100 px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-green-800 font-medium">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        Template Generated Successfully
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-green-700 hover:text-green-800 hover:bg-green-100"
                        onClick={() => {
                          navigator.clipboard.writeText(generatedTemplate);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                      >
                        {copied ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Text
                          </>
                        )}
                      </Button>
                    </div>
                    <CardContent className="p-0">
                      <Textarea
                        readOnly
                        value={generatedTemplate}
                        className="w-full min-h-[400px] resize-y border-0 rounded-none focus:ring-0 p-6 font-mono text-sm leading-relaxed text-gray-700 bg-white"
                      />
                    </CardContent>
                  </Card>
                </div>
              </ScaleIn>
            )}

            <SlideIn delay={0.3}>
              <div className="mt-8">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
                  <History className="h-5 w-5 text-gray-400" />
                  History
                </h2>

                {isTemplatesLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
                  </div>
                ) : templates && templates.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.map((template) => (
                      <Card key={template.id} className="group hover:shadow-md transition-all duration-200 border-gray-100">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-medium text-gray-400">
                              {new Date(template.created_at).toLocaleDateString()}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity border border-gray-200 hover:bg-gray-50"
                              onClick={async () => {
                                await navigator.clipboard.writeText(template.template_text);
                                setCopiedTemplateId(template.id);
                                setTimeout(() => setCopiedTemplateId(null), 2000);
                              }}
                            >
                              {copiedTemplateId === template.id ? (
                                <Check className="h-3.5 w-3.5 text-green-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5 text-gray-500" />
                              )}
                            </Button>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                            {template.user_instructions}
                          </p>
                          <div className="bg-gray-50 p-3 rounded text-xs text-gray-600 font-mono leading-relaxed max-h-40 overflow-y-auto">
                            {template.template_text}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                    <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No templates yet</p>
                  </div>
                )}
              </div>
            </SlideIn>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
