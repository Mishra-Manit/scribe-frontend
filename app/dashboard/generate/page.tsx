"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useAddToQueue } from "@/stores/queue-store";
import {
  useEmailTemplate,
  useSetEmailTemplate,
  useRecipientName,
  useSetRecipientName,
  useRecipientInterest,
  useSetRecipientInterest,
  useDefaultTemplateType,
  useSetDefaultTemplateType,
} from "@/stores/ui-store";
import ProtectedRoute from "@/components/ProtectedRoute";
import MobileRestriction from "@/components/MobileRestriction";
import Navbar from "@/components/Navbar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { TemplateType } from "@/lib/schemas";

export default function GenerateEmailsPage() {
  const { user } = useAuth();
  const addToQueue = useAddToQueue();

  // Form state from Zustand (auto-persisted to localStorage)
  const names = useRecipientName();
  const setNames = useSetRecipientName();
  const interest = useRecipientInterest();
  const setInterest = useSetRecipientInterest();
  const template = useEmailTemplate();
  const setTemplate = useSetEmailTemplate();
  const templateType = useDefaultTemplateType();
  const setTemplateType = useSetDefaultTemplateType();

  // Local UI state (not persisted)
  const [loading, setLoading] = useState(false);
  const [showMessage, setShowMessage] = useState(false);

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
      template_type: templateType,
    }));

    addToQueue(itemsToQueue);

    // Clear the form fields (template is kept for convenience)
    setNames("");
    setInterest("");

    setLoading(false);
    setShowMessage(true);
  };

  return (
    <ProtectedRoute>
      <MobileRestriction>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          
          <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">Generate Cold Emails</h1>
            
            {/* Instructions Section */}
            <div className="max-w-2xl mx-auto mb-6 p-4 border-2 border-dashed border-gray-300 rounded-lg">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">How to Format Your Email Template</h2>
              <p className="text-sm text-gray-700 mb-2">
                Please use square brackets <code>[]</code> to denote parts of your template that should be personalized for each professor.
                For example, if you want to insert the professor&apos;s name, use <code><strong>[Professor&apos;s Name]</strong></code>.
              </p>
              <p className="text-sm text-gray-700">
                Other placeholders you might use could be <code><strong>[University Name]</strong></code>, <code><strong>[Professor&apos;s Most Recent Research Paper]</strong></code>, etc.
                Ensure these placeholders are clearly marked so the system can replace them correctly.
              </p>

              <h3 className="text-md font-semibold text-gray-800 mt-4 mb-2">Template Types:</h3>
              <div className="text-sm text-gray-700 bg-blue-50 p-3 rounded-md space-y-2 mb-4">
                <p><strong>📚 Research:</strong> Best for reaching out about academic papers. The system will find and reference their publications from academic databases.</p>
                <p><strong>📖 Book:</strong> Best for authors. The system will find and reference books they&apos;ve written.</p>
                <p><strong>💼 General:</strong> For general outreach. Uses basic professional information without specific publications.</p>
              </div>

              <h3 className="text-md font-semibold text-gray-800 mt-4 mb-2">Example Section:</h3>
              <div className="text-sm text-gray-700 bg-gray-100 p-3 rounded-md">
                <p className="mb-2">I have a deep passion for the field of <strong>[insert topic of research at Lab]</strong> and would love to learn further from you. I read your paper, <strong>&quot;[insert researcher&apos;s key research paper name],&quot;</strong> and found it incredibly fascinating; your findings prompted me to read more about <strong>[insert research paper&apos;s specific topic in that field]</strong>. I would love to gain experience in <strong>[insert topic of research at Lab]</strong> by working under you and would appreciate your expertise as I work to accomplish my goals. In the future, I aspire to pursue a degree in astrophysics and later down the road, a research career.</p>
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
                      <Label htmlFor="templateType" className="form-label">
                        Template Type
                      </Label>
                      <select
                        id="templateType"
                        className="w-full form-input text-black border border-gray-300 rounded-md p-2 bg-white"
                        value={templateType}
                        onChange={(e) => setTemplateType(e.target.value as TemplateType)}
                      >
                        <option value="research">Research (includes academic papers)</option>
                        <option value="book">Book (includes authored books)</option>
                        <option value="general">General (basic information)</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Select the type of content to include in the personalized email
                      </p>
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
      </MobileRestriction>
    </ProtectedRoute>
  );
} 