/**
 * Zod Validation Schemas
 * Provides runtime validation and type inference for all API responses
 */

import { z } from "zod";


/**
 * Task status enum
 */
export const TaskStatusSchema = z.enum(["PENDING", "STARTED", "SUCCESS", "FAILURE"]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

/**
 * Email generation request schema
 */
export const EmailGenerationDataSchema = z.object({
  email_template: z.string().min(10, "Template must be at least 10 characters"),
  recipient_name: z.string().min(2, "Name must be at least 2 characters"),
  recipient_interest: z.string().min(3, "Interest must be at least 3 characters"),
});
export type EmailGenerationData = z.infer<typeof EmailGenerationDataSchema>;

/**
 * Generate email response schema - POST /api/email/generate
 */
export const GenerateEmailResponseSchema = z.object({
  task_id: z.string(),
});
export type GenerateEmailResponse = z.infer<typeof GenerateEmailResponseSchema>;

/**
 * Task status response schema - GET /api/email/status/{task_id}
 */
export const TaskStatusResponseSchema = z.object({
  task_id: z.string(),
  status: TaskStatusSchema,
  result: z.object({
    email_id: z.string().uuid().optional(),
    current_step: z.string().optional(),
    step_status: z.string().optional(),
    step_timings: z.record(z.string(), z.number()).optional(),
  }).nullish(), // Changed from .optional() to handle null from backend
  error: z.union([
    z.string(),
    z.object({
      message: z.string(),
      type: z.string(),
      failed_step: z.string().optional(),
    }),
  ]).nullish(), // Changed from .optional() to handle null from backend
});
export type TaskStatusResponse = z.infer<typeof TaskStatusResponseSchema>;

/**
 * Email response schema - GET /api/email/{email_id} and GET /api/email/
 */
export const EmailResponseSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  recipient_name: z.string(),
  recipient_interest: z.string(),
  email_message: z.string(),
  template_type: z.string(), // Could be TemplateTypeSchema but backend might return string
  metadata: z.record(z.string(), z.unknown()).nullable(),
  created_at: z.string().datetime(),
});
export type EmailResponse = z.infer<typeof EmailResponseSchema>;

/**
 * Email history array schema - GET /api/email/
 */
export const EmailHistorySchema = z.array(EmailResponseSchema);
export type EmailHistory = z.infer<typeof EmailHistorySchema>;

/**
 * User profile schema - GET /api/user and POST /api/user/init
 */
export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  display_name: z.string().nullable(),
  generation_count: z.number().int().nonnegative(),
  created_at: z.string().datetime(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;
