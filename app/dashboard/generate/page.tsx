"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useQueueActions } from "@/hooks/useQueueActions";
import {
  useEmailTemplate,
  useSetEmailTemplate,
  useRecipientName,
  useSetRecipientName,
  useRecipientInterest,
  useSetRecipientInterest,
  useHasHydrated,
} from "@/stores/ui-store";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function GenerateEmailsPage() {
  const { user } = useAuth();
  const { addToQueue } = useQueueActions();

  // Wait for Zustand stores to hydrate
  const uiHydrated = useHasHydrated();

  // Form state from Zustand (auto-persisted to localStorage)
  const names = useRecipientName();
  const setNames = useSetRecipientName();
  const interest = useRecipientInterest();
  const setInterest = useSetRecipientInterest();
  const template = useEmailTemplate();
  const setTemplate = useSetEmailTemplate();

  // Local UI state (not persisted)
  const [loading, setLoading] = useState(false);
  const [showMessage, setShowMessage] = useState(false);

  // Wait for stores to hydrate before rendering
  if (!uiHydrated) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const handleSubmit = async () => {
    if (!names.trim() || !interest.trim() || !template.trim()) {
      alert("Please fill in all fields");
      return;
    }

    if (!user?.uid) {
      alert("User not authenticated");
      return;
    }

    setLoading(true);
    setShowMessage(false);

    // No need to manually save to localStorage - Zustand handles this automatically

    const professorNames = names.split(",").map(name => name.trim());
    const itemsToQueue = professorNames.map(name => ({
      name: name,
      interest: interest,
    }));

    addToQueue(itemsToQueue);

    // Clear the form fields (template is kept for convenience)
    setNames("");

    setLoading(false);
    setShowMessage(true);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
          <Navbar />
          
          <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">Generate Cold Emails</h1>
            
            {/* Instructions Section */}
            <div className="max-w-2xl mx-auto mb-6 p-4 border-2 border-dashed border-gray-300 rounded-lg">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">How to Format Your Email Template</h2>
              <p className="text-sm text-gray-700 mb-2">
                Please use double curly braces <code>{'{{}}'}</code> to denote parts of your template that should be personalized for each professor.
                For example, if you want to insert the professor's name, use <code><strong>{'{{'}professor_name{'}}'}</strong></code>.
              </p>
              <p className="text-sm text-gray-700 mb-2">
                Other placeholders you might use could be <code><strong>{'{{'}university_name{'}}'}</strong></code>, <code><strong>{'{{'}research_paper{'}}'}</strong></code>, or <code><strong>{'{{'}research_interest{'}}'}</strong></code>.
                Ensure these placeholders are wrapped in double curly braces so the system can replace them correctly.
              </p>

              <h3 className="text-md font-semibold text-gray-800 mt-4 mb-2">Example Section:</h3>
              <div className="text-sm text-gray-700 bg-gray-100 p-3 rounded-md">
                <p className="mb-2">I have a deep passion for the field of <strong>{'{{'}research_topic{'}}'}</strong> and would love to learn further from you. I read your paper, <strong>&quot;{'{'}recent_paper{'}}'}"</strong> and found it incredibly fascinating; your findings prompted me to read more about <strong>{'{{'}paper_topic{'}}'}</strong>. I would love to gain experience in <strong>{'{{'}research_field{'}}'}</strong> by working under you and would appreciate your expertise as I work to accomplish my goals.</p>
              </div>
            </div>

            {/* Form Section */}
            <div className="max-w-2xl mx-auto mb-8">
              <div className="border border-gray-200 bg-white rounded-lg">
                <div className="p-6">
                  <div className="space-y-1">
                    <div>
                      <Label htmlFor="names" className="form-label">
                        Professor Names
                      </Label>
                      <Input
                        id="names"
                        placeholder="Enter the names separated by commas"
                        className="w-full form-input text-black"
                        value={names}
                        onChange={(e) => setNames(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="interest" className="form-label">
                        Professor Interest
                      </Label>
                      <Input
                        id="interest"
                        placeholder="Enter the professor interest"
                        className="w-full form-input text-black"
                        value={interest}
                        onChange={(e) => setInterest(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="template" className="form-label">
                        Email Template
                      </Label>
                      <Textarea
                        id="template"
                        placeholder="Enter your email template"
                        className="w-full form-textarea resize-y text-black"
                        value={template}
                        onChange={(e) => setTemplate(e.target.value)}
                        rows={15}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-center justify-center p-4 border-t border-gray-200 bg-gray-50">
                  <Button 
                    className="mx-auto" 
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? "Generating..." : "Generate Emails"}
                  </Button>
                  {showMessage && (
                    <p className="text-sm text-gray-600 mt-3 text-center">
                      Emails are being generated. You can view them on your{" "}
                      <Link href="/dashboard" className="text-blue-500 hover:underline">
                        dashboard
                      </Link>
                      .
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
    </ProtectedRoute>
  );
} 