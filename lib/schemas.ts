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
  is_confident: z.boolean(),
  displayed: z.boolean().default(true), // NEW FIELD
  created_at: z.string().datetime(),
});
export type EmailResponse = z.infer<typeof EmailResponseSchema>;

/**
 * Email history array schema - GET /api/email/
 */
export const EmailHistorySchema = z.array(EmailResponseSchema);
export type EmailHistory = z.infer<typeof EmailHistorySchema>;

/**
 * Update email request schema - PATCH /api/email/{email_id}
 */
export const UpdateEmailRequestSchema = z.object({
  displayed: z.boolean(),
});
export type UpdateEmailRequest = z.infer<typeof UpdateEmailRequestSchema>;

/**
 * User profile schema - GET /api/user and POST /api/user/init
 */
export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  display_name: z.string().nullable(),
  generation_count: z.number().int().nonnegative(),
  onboarded: z.boolean(),
  email_template: z.string().nullable(),
  created_at: z.string().datetime(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

/**
 * Template generation request schema - POST /api/templates/
 */
export const TemplateGenerationRequestSchema = z.object({
  pdf_url: z.string().url("Must be a valid URL"),
  user_instructions: z.string().min(10, "Instructions must be at least 10 characters"),
});
export type TemplateGenerationRequest = z.infer<typeof TemplateGenerationRequestSchema>;

/**
 * Template response schema - POST /api/templates/ and GET /api/templates/{id}
 */
export const TemplateResponseSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  pdf_url: z.string(),
  template_text: z.string(),
  user_instructions: z.string(),
  created_at: z.string().datetime(),
});
export type TemplateResponse = z.infer<typeof TemplateResponseSchema>;

/**
 * Template list schema - GET /api/templates/
 */
export const TemplateListSchema = z.array(TemplateResponseSchema);
export type TemplateList = z.infer<typeof TemplateListSchema>;

/**
 * Extended user profile with template_count - GET /api/user/profile
 */
export const UserProfileWithCountSchema = UserProfileSchema.extend({
  template_count: z.number().int().nonnegative(),
});
export type UserProfileWithCount = z.infer<typeof UserProfileWithCountSchema>;

/**
 * Template update validation schema - PATCH /api/user/template
 *
 * Matches backend constraints from schemas/auth.py TemplateUpdate:
 * - 1-10,000 characters
 * - Cannot be whitespace-only
 */
export const TemplateUpdateSchema = z.object({
  template: z
    .string()
    .min(1, "Template cannot be empty")
    .max(10000, "Template too long (max 10,000 characters)")
    .refine((val) => val.trim().length > 0, {
      message: "Template cannot be empty or whitespace only",
    }),
});
export type TemplateUpdate = z.infer<typeof TemplateUpdateSchema>;
