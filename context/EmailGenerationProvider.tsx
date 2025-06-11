"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContextProvider';
import { Professor } from '../hooks/useFirebaseProfessors';

interface EmailGenerationContextType {
  addProfessorToQueue: (professor: Professor) => void;
  emailQueue: Professor[];
}

const EmailGenerationContext = createContext<EmailGenerationContextType | undefined>(undefined);

export const useEmailGeneration = () => {
  const context = useContext(EmailGenerationContext);
  if (!context) {
    throw new Error('useEmailGeneration must be used within an EmailGenerationProvider');
  }
  return context;
};

interface EmailGenerationProviderProps {
  children: ReactNode;
}

export const EmailGenerationProvider: React.FC<EmailGenerationProviderProps> = ({ children }) => {
  const [emailQueue, setEmailQueue] = useState<Professor[]>([]);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [emailTemplate, setEmailTemplate] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    const savedQueue = localStorage.getItem('emailQueue');
    if (savedQueue) {
      try {
        const parsedQueue = JSON.parse(savedQueue);
        if (Array.isArray(parsedQueue)) {
          setEmailQueue(parsedQueue);
        }
      } catch (error) {
        console.error("Failed to parse email queue from localStorage", error);
      }
    }

    const savedTemplate = localStorage.getItem('emailTemplate');
    if (savedTemplate) {
        setEmailTemplate(savedTemplate);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('emailQueue', JSON.stringify(emailQueue));

    if (!user || emailQueue.length === 0 || isGeneratingEmail) {
      return;
    }
    
    const template = localStorage.getItem('emailTemplate');
    if (!template) {
        // Maybe wait or handle this case where template isn't loaded yet
        return;
    }


    setIsGeneratingEmail(true);
    const professorToProcess = emailQueue[0];

    const requestBody = {
      email_template: template,
      name: professorToProcess.name,
      professor_interest: "computer science",
      userId: user.uid,
      source: 'swipe',
    };

    fetch("https://api.manit.codes/generate-email", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })
    .catch(error => {
      console.error('Failed to generate email:', error);
    })
    .finally(() => {
      setEmailQueue(prevQueue => {
        const newQueue = prevQueue.slice(1);
        localStorage.setItem('emailQueue', JSON.stringify(newQueue));
        return newQueue;
      });
      setIsGeneratingEmail(false);
    });
  }, [emailQueue, isGeneratingEmail, user]);

  const addProfessorToQueue = (professor: Professor) => {
    setEmailQueue(prevQueue => [...prevQueue, professor]);
  };

  return (
    <EmailGenerationContext.Provider value={{ addProfessorToQueue, emailQueue }}>
      {children}
    </EmailGenerationContext.Provider>
  );
}; 