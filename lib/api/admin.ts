import { z } from "zod";
import { apiClient } from "./client";
import type { ApiRequestOptions } from "./types";

export const AdminOverviewSchema = z.object({
  total_users: z.number(),
  total_emails: z.number(),
  success_rate: z.number(),
  avg_gen_time_seconds: z.number(),
  total_templates: z.number(),
  confidence_rate: z.number(),
  error_count: z.number(),
  emails_this_week: z.number(),
  active_users_this_week: z.number(),
});

export const AdminUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  display_name: z.string().nullable(),
  generation_count: z.number(),
  template_count: z.number(),
  onboarded: z.boolean(),
  created_at: z.string(),
  actual_email_count: z.number(),
  queue_submissions: z.number(),
  failed_count: z.number(),
  email_template: z.string().nullable(),
});

export const AdminEmailSchema = z.object({
  id: z.string().uuid(),
  recipient_name: z.string(),
  recipient_interest: z.string(),
  email_message: z.string(),
  template_type: z.string().nullable(),
  is_confident: z.boolean(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  created_at: z.string(),
});

export const PaginatedEmailsSchema = z.object({
  items: z.array(AdminEmailSchema),
  total: z.number(),
  page: z.number(),
  per_page: z.number(),
  pages: z.number(),
});

export const AdminTemplateSchema = z.object({
  id: z.string().uuid(),
  template_text: z.string(),
  user_instructions: z.string().nullable(),
  pdf_url: z.string().nullable(),
  created_at: z.string(),
});

export const AdminQueueItemSchema = z.object({
  id: z.string().uuid(),
  recipient_name: z.string(),
  recipient_interest: z.string(),
  status: z.string(),
  current_step: z.string().nullable(),
  error_message: z.string().nullable(),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  created_at: z.string(),
});

export const AdminActivitySchema = z.object({
  week: z.string(),
  emails_generated: z.number(),
  active_users: z.number(),
});

export const AdminErrorSchema = z.object({
  id: z.string().uuid(),
  user_email: z.string(),
  user_display_name: z.string().nullable(),
  recipient_name: z.string(),
  current_step: z.string().nullable(),
  error_message: z.string().nullable(),
  created_at: z.string(),
  started_at: z.string().nullable(),
});

export type AdminOverview = z.infer<typeof AdminOverviewSchema>;
export type AdminUser = z.infer<typeof AdminUserSchema>;
export type AdminEmail = z.infer<typeof AdminEmailSchema>;
export type PaginatedEmails = z.infer<typeof PaginatedEmailsSchema>;
export type AdminTemplate = z.infer<typeof AdminTemplateSchema>;
export type AdminQueueItem = z.infer<typeof AdminQueueItemSchema>;
export type AdminActivity = z.infer<typeof AdminActivitySchema>;
export type AdminError = z.infer<typeof AdminErrorSchema>;

export const adminApi = {
  getOverview: (options?: ApiRequestOptions): Promise<AdminOverview> =>
    apiClient.requestWithValidation("/api/admin/overview", AdminOverviewSchema, options),

  getUsers: (options?: ApiRequestOptions): Promise<AdminUser[]> =>
    apiClient.requestWithValidation("/api/admin/users", z.array(AdminUserSchema), options),

  getUserEmails: (
    userId: string,
    page: number,
    perPage: number,
    options?: ApiRequestOptions
  ): Promise<PaginatedEmails> =>
    apiClient.requestWithValidation(
      `/api/admin/users/${userId}/emails?page=${page}&per_page=${perPage}`,
      PaginatedEmailsSchema,
      options
    ),

  getUserTemplates: (
    userId: string,
    options?: ApiRequestOptions
  ): Promise<AdminTemplate[]> =>
    apiClient.requestWithValidation(
      `/api/admin/users/${userId}/templates`,
      z.array(AdminTemplateSchema),
      options
    ),

  getUserQueue: (
    userId: string,
    options?: ApiRequestOptions
  ): Promise<AdminQueueItem[]> =>
    apiClient.requestWithValidation(
      `/api/admin/users/${userId}/queue`,
      z.array(AdminQueueItemSchema),
      options
    ),

  getActivity: (options?: ApiRequestOptions): Promise<AdminActivity[]> =>
    apiClient.requestWithValidation(
      "/api/admin/activity",
      z.array(AdminActivitySchema),
      options
    ),

  getErrors: (options?: ApiRequestOptions): Promise<AdminError[]> =>
    apiClient.requestWithValidation("/api/admin/errors", z.array(AdminErrorSchema), options),
};
