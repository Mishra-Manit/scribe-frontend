"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContextProvider';
import { api, TemplateType, TaskStatusResponse } from '@/lib/api';

export interface GenerationQueueItem {
  id: string;
  name: string;
  interest: string;
  source: 'generate';
  template_type: TemplateType;
}

interface EmailGenerationContextType {
  addItemsToQueue: (items: Omit<GenerationQueueItem, 'id'>[]) => void;
  emailQueue: GenerationQueueItem[];
  currentTaskStatus: TaskStatusResponse | null;
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
  const [emailQueue, setEmailQueue] = useState<GenerationQueueItem[]>([]);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [emailTemplate, setEmailTemplate] = useState('');
  const [taskStatuses, setTaskStatuses] = useState<Map<string, TaskStatusResponse>>(new Map());
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
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
        // Wait for template to be loaded
        return;
    }

    const processNextEmail = async () => {
      setIsGeneratingEmail(true);
      const professorToProcess = emailQueue[0];

      try {
        // Step 1: Submit email generation task
        const { task_id } = await api.email.generateEmail({
          email_template: template,
          recipient_name: professorToProcess.name,
          recipient_interest: professorToProcess.interest,
          template_type: professorToProcess.template_type,
        });

        setCurrentTaskId(task_id);
        console.log(`Email generation started for ${professorToProcess.name}, task_id: ${task_id}`);

        // Step 2: Poll task status until complete
        await api.email.pollTaskUntilComplete(
          task_id,
          (status) => {
            // Update status for UI display
            setTaskStatuses(prev => new Map(prev).set(task_id, status));
            if (status.result?.current_step) {
              console.log(`Task ${task_id} - Step: ${status.result.current_step}`);
            }
          },
          3000 // Poll every 3 seconds
        );

        // Step 3: Email successfully generated
        console.log(`Email generated successfully for ${professorToProcess.name}`);

      } catch (error) {
        console.error(`Failed to generate email for ${professorToProcess.name}:`, error);
      } finally {
        // Remove from queue and reset state
        setEmailQueue(prevQueue => {
          const newQueue = prevQueue.slice(1);
          localStorage.setItem('emailQueue', JSON.stringify(newQueue));
          return newQueue;
        });
        setCurrentTaskId(null);
        setIsGeneratingEmail(false);
      }
    };

    processNextEmail();
  }, [emailQueue, isGeneratingEmail, user]);

  const addItemsToQueue = (items: Omit<GenerationQueueItem, 'id'>[]) => {
    const newQueueItemsWithId = items.map(item => ({
      ...item,
      id: `${item.name}-${Date.now()}-${Math.random()}`
    }));
    setEmailQueue(prevQueue => [...prevQueue, ...newQueueItemsWithId]);
  };

  // Get current task status for UI consumption
  const currentTaskStatus = currentTaskId
    ? taskStatuses.get(currentTaskId) || null
    : null;

  return (
    <EmailGenerationContext.Provider value={{
      addItemsToQueue,
      emailQueue,
      currentTaskStatus
    }}>
      {children}
    </EmailGenerationContext.Provider>
  );
}; 