"use client";

import React, { useState, useEffect } from 'react';
import { useProfessors } from '../../../hooks/useProfessors';
import { ProfessorCard } from '../../../components/ProfessorCard';
import { Header } from '../../../components/Header';
import { AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import MobileRestriction from '@/components/MobileRestriction';
import { Professor } from '../../../hooks/useFirebaseProfessors'; // Import Professor type
import { useAuth } from '../../../context/AuthContextProvider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useEmailGeneration } from '@/context/EmailGenerationProvider';

interface UseProfessorsReturn {
  professors: Professor[];
  acceptedProfessors: Professor[];
  handleSwipe: (direction: string, p: Professor) => void;
  loading: boolean;
  error: string | null;
}

export default function SwipePage() {
  const { 
    professors,
    acceptedProfessors,
    handleSwipe,
    loading,
    error 
  }: UseProfessorsReturn = useProfessors();

  const [emailTemplate, setEmailTemplate] = useState('');
  const [isTemplateSubmitted, setTemplateSubmitted] = useState(false);
  const { addItemsToQueue } = useEmailGeneration();
  const { user } = useAuth();

  useEffect(() => {
    const savedTemplate = localStorage.getItem('emailTemplate');
    if (savedTemplate) {
        setEmailTemplate(savedTemplate);
        setTemplateSubmitted(true);
    }
  }, []);

  const handleTemplateSubmit = () => {
    if (emailTemplate.trim() === '') {
      alert('Please enter an email template.');
      return;
    }
    localStorage.setItem('emailTemplate', emailTemplate);
    setTemplateSubmitted(true);
  };

  const handleSwipeAndGenerate = (direction: string, professor: Professor) => {
    // Call handleSwipe immediately for optimistic UI update
    handleSwipe(direction, professor);

    // Queue email generation for right swipes
    if (direction === 'right' && user) {
      addItemsToQueue([{
        name: professor.name,
        interest: professor.interests.length > 0 ? professor.interests.join(', ') : 'their research',
        source: 'swipe'
      }]);
    }
  };

  if (!isTemplateSubmitted) {
    return (
      <ProtectedRoute>
        <MobileRestriction>
          <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 flex flex-col overflow-hidden">
            <Navbar />
            <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8 w-full">
              <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">First, Enter Your Cold Email Template</h1>
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
              </div>
              <div className="max-w-2xl mx-auto mb-8">
                <div className="border border-gray-200 bg-white rounded-lg">
                  <div className="p-6">
                    <Label htmlFor="template" className="form-label">
                      Email Template
                    </Label>
                    <Textarea
                      id="template"
                      placeholder="Enter your email template"
                      className="w-full form-textarea resize-y text-black"
                      value={emailTemplate}
                      onChange={(e) => setEmailTemplate(e.target.value)}
                      rows={15}
                    />
                  </div>
                  <div className="flex flex-col items-center justify-center p-4 border-t border-gray-200 bg-gray-50">
                    <Button
                      className="mx-auto"
                      onClick={handleTemplateSubmit}
                    >
                      submit email template to open swiping feature
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </MobileRestriction>
      </ProtectedRoute>
    );
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <MobileRestriction>
          <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 flex flex-col">
            <Navbar /> 
            <div className="flex-grow flex items-center justify-center">
              <p className="text-2xl font-bold text-gray-600">Loading professors...</p>
            </div>
          </div>
        </MobileRestriction>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <MobileRestriction>
          <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 flex flex-col">
            <Navbar />
            <Header acceptedProfessors={acceptedProfessors} />
            <div className="flex-grow flex items-center justify-center">
              <p className="text-2xl font-bold text-red-600">Error: {error}</p>
            </div>
          </div>
        </MobileRestriction>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <MobileRestriction>
        <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 flex flex-col overflow-hidden">
          <Navbar />
          <Header acceptedProfessors={acceptedProfessors} />
          <main className="flex-grow flex flex-col items-center justify-center p-4 relative">
            {professors.length > 0 ? (
              <>
                {/* Swipe Instructions */}
                <div className="text-center mb-4">
                  <p className="text-lg font-semibold text-gray-700">
                    <span className="text-red-500">← Swipe Left</span> to Reject • 
                    <span className="text-green-500"> Swipe Right →</span> to Accept
                  </p>
                </div>
                
                <div className="relative w-full max-w-sm aspect-[3/4] sm:max-w-md md:max-w-lg mb-6" style={{ minHeight: '400px' }}>
                  <AnimatePresence initial={false}>
                    {professors.map((professor: Professor, index: number) => (
                      <ProfessorCard
                        key={professor.id}
                        professor={professor}
                        onSwipe={(direction) => handleSwipeAndGenerate(direction, professor)}
                        isActive={index === professors.length - 1}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </>
            ) : !loading && (
              <div className="text-center p-10 bg-white rounded-xl shadow-2xl">
                <h2 className="text-3xl font-bold text-gray-700 mb-3">All Swiped!</h2>
                <p className="text-gray-500">You&apos;ve gone through all available professors for now.</p>
                <p className="text-gray-500">Check back later for new matches!</p>
              </div>
            )}
          </main>
        </div>
      </MobileRestriction>
    </ProtectedRoute>
  );
} 