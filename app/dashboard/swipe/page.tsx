"use client";

import React, { useState } from 'react';
import { useProfessors } from '../../../hooks/useProfessors';
import { ProfessorCard } from '../../../components/ProfessorCard';
import { Header } from '../../../components/Header';
import { AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import MobileRestriction from '@/components/MobileRestriction';
import { Professor } from '../../../hooks/useFirebaseProfessors'; // Import Professor type

interface UseProfessorsReturn {
  professors: Professor[];
  acceptedProfessors: Professor[];
  handleSwipe: (direction: string, p: Professor) => void;
  loading: boolean;
  error: string | null;
}

interface ManualSwipeInfo {
  professorId: string;
  direction: 'left' | 'right';
}

export default function SwipePage() {
  const { 
    professors,
    acceptedProfessors,
    handleSwipe,
    loading,
    error 
  }: UseProfessorsReturn = useProfessors();

  const [manualExitInfo, setManualExitInfo] = useState<ManualSwipeInfo | null>(null);

  const currentProfessor: Professor | null = professors.length > 0 ? professors[professors.length - 1] : null;

  const onExitComplete = () => {
    setManualExitInfo(null); // Clear manual exit info after animation
  };

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
            {/* Swipe Instructions */}
            {currentProfessor && (
              <div className="text-center mb-4">
                <p className="text-lg font-semibold text-gray-700">
                  <span className="text-red-500">← Swipe Left</span> to Reject • 
                  <span className="text-green-500"> Swipe Right →</span> to Accept
                </p>
              </div>
            )}
            
            <div className="relative w-full max-w-sm aspect-[3/4] sm:max-w-md md:max-w-lg mb-6" style={{ minHeight: '400px' }}>
              <AnimatePresence initial={false} onExitComplete={onExitComplete}>
                {professors.map((professor: Professor, index: number) => (
                  <ProfessorCard
                    key={professor.id}
                    professor={professor}
                    onSwipe={(direction) => handleSwipe(direction, professor)}
                    isActive={index === professors.length - 1}
                    manualExitInfo={manualExitInfo}
                  />
                ))}
              </AnimatePresence>
            </div>
            
            {professors.length === 0 && !loading && (
              <div className="text-center p-10 bg-white rounded-xl shadow-2xl">
                <h2 className="text-3xl font-bold text-gray-700 mb-3">All Swiped!</h2>
                <p className="text-gray-500">You've gone through all available professors for now.</p>
                <p className="text-gray-500">Check back later for new matches!</p>
              </div>
            )}
          </main>
        </div>
      </MobileRestriction>
    </ProtectedRoute>
  );
} 