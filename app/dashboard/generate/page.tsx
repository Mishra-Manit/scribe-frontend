"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContextProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import MobileRestriction from "@/components/MobileRestriction";
import Navbar from "@/components/Navbar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function GenerateEmailsPage() {
  const { user } = useAuth();
  const [names, setNames] = useState("");
  const [interest, setInterest] = useState("");
  const [template, setTemplate] = useState("");
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
    
    // Clear the form fields
    setNames("");
    setInterest("");
    setTemplate("");
    
    const professorNames = names.split(",").map(name => name.trim());

    for (const professorName of professorNames) {
      const requestBody = {
        email_template: template,
        name: professorName,
        professor_interest: interest,
        userId: user.uid,
        source: "generate"
      };

      try {
        //const res = await fetch("http://127.0.0.1:5000/generate-email", {
        const res = await fetch("https://pythonserver-42bcc9044f10.herokuapp.com/generate-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (!res.ok) {
          console.error("Failed to generate email for", professorName);
          continue;
        }

        // Just wait for the response to complete, no need to parse
        // await res.json(); // Commented out or removed
      } catch (error) {
        console.error("Error:", error);
      }
    }
    
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
            
            {/* Form Section */}
            <div className="max-w-2xl mx-auto mb-8">
              <div className="border border-gray-200 bg-white rounded-lg">
                <div className="p-6">
                  <div className="space-y-2">
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
                      Emails are being generated and will appear in the dashboard shortly.
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