import { z } from 'zod'

export const FEEDBACK_CATEGORIES = [
  'bug',
  'content',
  'confusing',
  'suggestion',
  'other',
] as const

export const FEEDBACK_STATUSES = ['new', 'reviewed', 'resolved'] as const

export const createFeedbackSchema = z.object({
  category: z.enum(FEEDBACK_CATEGORIES),
  message: z.string().trim().min(10).max(2000),
  pagePath: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .startsWith('/')
    .refine((value) => !value.includes('://'), 'Page must be a local path.'),
})

export const feedbackStatusSchema = z.object({
  status: z.enum(FEEDBACK_STATUSES),
})

export const feedbackParamsSchema = z.object({
  feedbackId: z.uuid(),
})

export const feedbackQuerySchema = z.object({
  status: z.enum(FEEDBACK_STATUSES).optional(),
})

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>
export type FeedbackStatus = z.infer<typeof feedbackStatusSchema>['status']
