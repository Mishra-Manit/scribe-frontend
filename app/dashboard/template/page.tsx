"use client";

export const dynamic = 'force-dynamic';

import { useState, FormEvent, useRef, useEffect } from "react";
import { useAuth } from "../../../context/AuthContextProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import dynamicImport from 'next/dynamic';
import { API_ENDPOINTS } from '@/config/api';

// Dynamically import the PDF processing components to avoid SSR issues
const PDFProcessor = dynamicImport(() => import('@/components/PDFProcessor'), { 
  ssr: false,
  loading: () => <div>Loading PDF processor...</div>
});

const MAX_GENERATIONS = 5; // ADDED: Maximum number of generations allowed

export default function TemplateGenerationPage() {
  const { user } = useAuth();
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [instructions, setInstructions] = useState("");
  const [generatedTemplate, setGeneratedTemplate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedPdfText, setExtractedPdfText] = useState<string>("");
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [copied, setCopied] = useState(false);
  const generatedTemplateRef = useRef<HTMLDivElement>(null);
  const [generationsLeft, setGenerationsLeft] = useState(MAX_GENERATIONS); // ADDED: State for tracking generations left

  // Callback handlers for PDF processing
  const handleFileProcessed = (file: File, extractedText: string) => {
    setResumeFile(file);
    setExtractedPdfText(extractedText);
    setError(null);
  };

  const handleProcessingChange = (isProcessing: boolean) => {
    setIsExtractingText(isProcessing);
  };

  // ADDED: useEffect to load and persist generation count from localStorage
  useEffect(() => {
    if (user && user.uid) { // Assuming user object has a 'uid' property
      const storageKey = `templateGenerations_${user.uid}`;
      const storedCount = localStorage.getItem(storageKey);
      if (storedCount !== null) {
        const count = parseInt(storedCount, 10);
        if (!isNaN(count) && count >= 0) {
          setGenerationsLeft(count);
        } else {
          // Invalid data in localStorage, reset to MAX_GENERATIONS
          setGenerationsLeft(MAX_GENERATIONS);
          localStorage.setItem(storageKey, String(MAX_GENERATIONS));
        }
      } else {
        // No data in localStorage for this user, initialize
        setGenerationsLeft(MAX_GENERATIONS);
        localStorage.setItem(storageKey, String(MAX_GENERATIONS));
      }
    } else {
      // No user or no user.uid, use default non-persistent limit for the session
      setGenerationsLeft(MAX_GENERATIONS);
    }
  }, [user]); // Rerun when user object changes

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    // ADDED: Check if user has generations left
    if (generationsLeft <= 0) {
      setError("You have reached your generation limit for today. Please try again later.");
      return;
    }

    if (!resumeFile) {
      setError("Please upload your resume.");
      return;
    }
    if (!instructions.trim()) {
      setError("Please provide instructions.");
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedTemplate("");
    setCopied(false);

    // ADDED: Decrement and save generation count before making the API call
    const newCount = generationsLeft - 1;
    setGenerationsLeft(newCount);
    if (user && user.uid) {
      localStorage.setItem(`templateGenerations_${user.uid}`, String(newCount));
    }

    try {
      let resumeContentForApi = "";
      if (resumeFile.type === "application/pdf" || resumeFile.type === "text/plain") {
        // If PDF or TXT, use the client-side extracted text
        if (!extractedPdfText && !isExtractingText) { // ensure extraction is complete or was attempted
             setError("Text could not be extracted from the uploaded file. Please try again or use a different file.");
             setLoading(false);
             return;
        }
        resumeContentForApi = extractedPdfText;
      } else {
        // For other types (DOCX, etc.), you'd typically send the file to the backend for extraction.
        // For this example, we'll just use a placeholder message if it's not PDF/TXT.
        // In a real scenario, you might want to prevent submission or handle file upload differently.
        resumeContentForApi = "File content not directly readable by client-side JS. Server-side extraction needed for " + resumeFile.name;
        // Or, better yet, implement file upload to a server that handles DOCX parsing.
        // For now, let's assume the mock API can handle a file name or some indicator
        console.warn("Submitting non-PDF/TXT file. Ensure backend can handle:", resumeFile.name);
      }
      
      if (!resumeContentForApi.trim() && (resumeFile.type === "application/pdf" || resumeFile.type === "text/plain")) {
        setError("Extracted text is empty. Please check the file or try again.");
        setLoading(false);
        return;
      }


      console.log("Making API call to generate template with:");
      console.log("Resume Content (first 500 chars):", resumeContentForApi.substring(0, 500));
      console.log("Instructions:", instructions);

      // Construct the prompt for the backend
      const prompt = `Generate a short cold email template based on the following resume text and instructions. Do not create a subject or signature. Use the "[ ]" brackets to indicate where information should be inserted.
      
      Use the same format, writing style, and tone as this example template. You must write like a high school/college student: My name is Gurnoor Sandhu, and I am a rising senior at Irvington High School in Fremont, California. I have worked on a paper with mentorship from Professor X. Prochaska, which uses machine learning to find damped Lyman-Alpha absorbers in the IGM. I have attached my resume which details my research experience and the skills I have garnered in this process, as well as an early draft of the research paper I am currently working on.

      I have a deep passion for the field of [insert topic of research at Lab] and would love to learn further from you. I read your paper, "[insert researcher's key research paper name]," and found it incredibly fascinating; your findings prompted me to read more about [insert research paper's specific topic in that field]. I would love to gain experience in [insert topic of research at Lab] by working under you and would appreciate your expertise as I work to accomplish my goals. In the future, I aspire to pursue a degree in astrophysics and later down the road, a research career. 

      Please let me know if we can schedule a call to discuss my possible involvement in your research. Along with contributing to projects, I could conduct literature reviews, perform data analysis, help write research papers, and more. I would be able to commit 10+ hours a week through remote work now. Please contact me if you may require assistance this fall term or afterwards. I look forward to hearing from you!
      
    \n\nResume Text:\n${resumeContentForApi}\n\nUser requested Instructions:\n${instructions}`;

      // Replace mock logic with actual API call to your Python backend
      //const response = await fetch('https://pythonserver-42bcc9044f10.herokuapp.com/call-openai', { // MODIFIED URL
      //const response = await fetch('http://127.0.0.1:5000/call-openai', { // MODIFIED URL from https to http

      // STEP 1: Use the IP address for now to test that your backend server is working correctly.
      //const response = await fetch("http://146.190.115.1/call-openai", {
      // STEP 2: After your DNS record is set up and has propagated, comment out the line above and uncomment the one below.
      const response = await fetch(API_ENDPOINTS.callOpenAI, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt, // MODIFIED to send a single prompt
          // You can also specify model, max_tokens, temperature here if needed, e.g.:
          // model: "gpt-4o-mini",
          // max_tokens: 2000,
          // temperature: 0.7
        }),
      });

      if (!response.ok) {
        let errorMessage = `API request failed with status ${response.status}`;
        try {
            const errorData = await response.json();
            if (errorData && errorData.error && typeof errorData.error === 'string') { // MODIFIED to check errorData.error
                errorMessage = errorData.error;
            }
        } catch (parseError) {
            console.warn("Could not parse error response JSON or extract message:", parseError);
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // MODIFIED to access data.response for the template content
      if (data.response && typeof data.response === 'string') { 
        setGeneratedTemplate(data.response);
        setTimeout(() => {
          generatedTemplateRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        console.error("Invalid response format from API. Expected { response: string } got:", data);
        throw new Error("Received invalid template format from the server.");
      }

    } catch (e) {
      console.error("Error generating template:", e);
      let errorMessage = "Failed to generate template. Please try again.";
      if (e instanceof Error) {
        errorMessage = e.message;
      } else if (typeof e === 'string') {
        errorMessage = e; // Should be less common, but handles direct string throws
      }
      // If 'e' is not an Error object or string, the default message is used.
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
          <Navbar />
          
          <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Create Email Template</h1>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-xl">Upload Your Resume and Provide Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <PDFProcessor 
                      onFileProcessed={handleFileProcessed}
                      onError={setError}
                      onProcessingChange={handleProcessingChange}
                    />
                    {resumeFile && <p className="mt-2 text-sm text-gray-500">Selected file: {resumeFile.name} ({resumeFile.type})</p>}
                    {isExtractingText && <p className="mt-2 text-sm text-blue-600">Extracting text from file...</p>}
                  </div>
                  
                  {/* Removed extracted text section */}
                  
                  {/* Message for non-supported types for client-side extraction */}
                   {resumeFile && !(resumeFile.type === "application/pdf" || resumeFile.type === "text/plain") && !isExtractingText && (
                     <p className="mt-2 text-sm text-orange-600 bg-orange-100 p-3 rounded-md">
                       Preview for this file type ({resumeFile.type}) is not available here. The file will be sent to the server for processing if you proceed.
                     </p>
                   )}


                  <div>
                    <Label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-1">
                      Specific Instructions for GPT
                    </Label>
                    <Textarea
                      id="instructions"
                      placeholder="e.g., Focus on my software engineering skills for a startup role. Make it concise and professional."
                      className="w-full form-textarea resize-y text-gray-900 border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      rows={6}
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-red-600 bg-red-100 p-3 rounded-md">{error}</p>
                  )}

                  <div className="flex justify-center">
                    <Button 
                      type="submit"
                      className="w-full sm:w-auto"
                      disabled={loading || isExtractingText || generationsLeft <= 0} // MODIFIED: disable button if no uses left
                    >
                      {/* MODIFIED: Update button text based on loading/extracting state and generations left */}
                      {loading
                        ? "Generating Template..."
                        : isExtractingText
                        ? "Processing File..."
                        : generationsLeft <= 0
                        ? "Generation Limit Reached"
                        : `Generate Template (${generationsLeft} ${generationsLeft === 1 ? 'use' : 'uses'} left)`}
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
                    className="w-full form-textarea resize-y text-gray-900 bg-gray-100 border-gray-300 rounded-md"
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
          </div>
        </div>
    </ProtectedRoute>
  );
}
