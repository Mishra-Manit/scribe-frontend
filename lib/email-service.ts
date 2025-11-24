/**
 * Email Service - Clean API interface for email operations
 */

import { apiClient } from '@/lib/api/client';
import { EmailHistory } from '@/lib/schemas';

export interface EmailGenerationRequest {
  email_template: string;
  recipient_name: string;
  recipient_interest: string;
}

export interface EmailGenerationResponse {
  task_id: string;
}

export interface TaskStatus {
  task_id: string;
  status: "PENDING" | "STARTED" | "SUCCESS" | "FAILURE";
  result?: {
    email_id?: string;
    current_step?: string;
    step_status?: string;
    error?: string;
  };
  error?: string;
}

class EmailService {
  private async makeRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return apiClient.request<T>(endpoint, {
      method: options?.method || 'GET',
      body: options?.body,
      headers: options?.headers,
    });
  }

  /**
   * Start email generation
   */
  async generateEmail(data: EmailGenerationRequest): Promise<EmailGenerationResponse> {
    return this.makeRequest<EmailGenerationResponse>('/api/email/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Check task status
   */
  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    return this.makeRequest<TaskStatus>(`/api/email/status/${taskId}`);
  }

  /**
   * Get email history
   */
  async getEmailHistory(limit = 100, offset = 0): Promise<EmailHistory> {
    return this.makeRequest<EmailHistory>(`/api/email/?limit=${limit}&offset=${offset}`);
  }
}

export const emailService = new EmailService();
