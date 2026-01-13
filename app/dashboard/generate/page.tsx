"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useSimpleQueueStore } from "@/stores/simple-queue-store";
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
import { FadeIn } from "@/components/motion/FadeIn";
import { SlideIn } from "@/components/motion/SlideIn";
import { ScaleIn } from "@/components/motion/ScaleIn";
import { Loader2, Sparkles, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function GenerateEmailsPage() {
  const { user } = useAuth();
  const addToQueue = useSimpleQueueStore((state) => state.addItems);

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
        <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-900 mb-4" />
            <p className="text-gray-500 font-medium">Loading...</p>
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
      <div className="min-h-screen bg-gray-50/50 pb-12">
          <Navbar />
          
          <main className="max-w-4xl mx-auto pt-24 px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <div className="text-center mb-10">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-3">Generate Cold Emails</h1>
                <p className="text-gray-500 max-w-xl mx-auto">
                  Create personalized outreach emails in bulk. Just provide the recipients and your template.
                </p>
              </div>
            </FadeIn>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Instructions Section */}
              <div className="lg:col-span-1 order-last lg:order-first">
                <SlideIn delay={0.2} direction="left">
                  <div className="sticky top-28 space-y-4">
                    <Card className="border-none shadow-sm bg-blue-50/50 border-blue-100/50">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-3 text-blue-900 font-semibold">
                          <Info className="h-4 w-4" />
                          <span>Template Guide</span>
                        </div>
                        <p className="text-sm text-blue-800/80 mb-4 leading-relaxed">
                          Use double curly braces to insert personalized variables.
                        </p>
                        
                        <div className="space-y-3">
                          <div className="text-xs font-mono bg-white/60 p-2 rounded text-blue-900 border border-blue-100">
                            {'{{professor_name}}'}
                          </div>
                          <div className="text-xs font-mono bg-white/60 p-2 rounded text-blue-900 border border-blue-100">
                            {'{{research_paper}}'}
                          </div>
                          <div className="text-xs font-mono bg-white/60 p-2 rounded text-blue-900 border border-blue-100">
                            {'{{university_name}}'}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm">
                      <CardContent className="p-5">
                        <h3 className="font-semibold text-gray-900 mb-3 text-sm">Pro Tip</h3>
                        <p className="text-sm text-gray-500 leading-relaxed">
                          The more specific your interest field, the better the personalization will be. Try "Reinforcement Learning in Robotics" instead of just "AI".
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </SlideIn>
              </div>

              {/* Form Section */}
              <div className="lg:col-span-2">
                <ScaleIn delay={0.1}>
                  <div className="bg-white rounded-xl shadow-[0_2px_10px_-2px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden">
                    <div className="p-6 md:p-8 space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="names" className="text-gray-700 font-medium">
                          Recipients
                        </Label>
                        <Input
                          id="names"
                          placeholder="John Smith, Sarah Jones, Michael Williams..."
                          className="w-full bg-gray-50/50"
                          value={names}
                          onChange={(e) => setNames(e.target.value)}
                        />
                        <p className="text-xs text-gray-400">Comma separated names</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="interest" className="text-gray-700 font-medium">
                          Professor's Research Field
                        </Label>
                        <Input
                          id="interest"
                          placeholder="e.g. Natural Language Processing"
                          className="w-full bg-gray-50/50"
                          value={interest}
                          onChange={(e) => setInterest(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="template" className="text-gray-700 font-medium">
                          Email Template
                        </Label>
                        <Textarea
                          id="template"
                          placeholder="Dear {{professor_name}}, ..."
                          className="w-full bg-gray-50/50 min-h-[450px] font-mono text-xs leading-relaxed"
                          value={template}
                          onChange={(e) => setTemplate(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="p-6 border-t border-gray-50 bg-gray-50/30 flex flex-col items-center gap-4">
                      <Button 
                        className="w-full sm:w-auto min-w-[200px] shadow-lg shadow-blue-900/5 hover:shadow-blue-900/10 transition-all" 
                        size="lg"
                        onClick={handleSubmit}
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing Queue...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Generate Emails
                          </>
                        )}
                      </Button>
                      
                      {showMessage && (
                        <FadeIn>
                          <p className="text-sm text-gray-500 text-center bg-green-50 text-green-700 px-4 py-2 rounded-full border border-green-100">
                            Added to queue! Check status on{" "}
                            <Link href="/dashboard" className="font-semibold hover:underline">
                              dashboard
                            </Link>
                          </p>
                        </FadeIn>
                      )}
                    </div>
                  </div>
                </ScaleIn>
              </div>
            </div>
          </main>
      </div>
    </ProtectedRoute>
  );
}
