import { z } from 'zod'

import {
  adminIdSchema,
  adminSlugSchema,
  adminStatusSchema,
  adminUpdatedAtSchema,
  optionalTextSchema,
  positivePositionSchema,
  requiredTitleSchema,
} from './common.schemas'

export const courseIdParamsSchema = z.object({
  courseId: adminIdSchema,
})

export const subjectIdParamsSchema = z.object({
  subjectId: adminIdSchema,
})

export const topicIdParamsSchema = z.object({
  topicId: adminIdSchema,
})

export const lessonIdParamsSchema = z.object({
  lessonId: adminIdSchema,
})

export const courseCreateSchema = z
  .object({
    title: requiredTitleSchema,
    slug: adminSlugSchema,
    shortDescription: optionalTextSchema(280),
    description: optionalTextSchema(4_000),
    level: optionalTextSchema(80),
    accessDurationDays: z.coerce
      .number()
      .int()
      .positive('Access duration must be positive.')
      .nullable()
      .optional(),
    status: adminStatusSchema.default('draft'),
    thumbnailKey: optionalTextSchema(500),
  })
  .strict()

export const courseUpdateSchema = courseCreateSchema
  .partial()
  .extend({
    updatedAt: adminUpdatedAtSchema,
  })
  .strict()

export const subjectCreateSchema = z
  .object({
    title: requiredTitleSchema,
    slug: adminSlugSchema,
    description: optionalTextSchema(2_000),
    position: positivePositionSchema.optional(),
    status: adminStatusSchema.default('draft'),
  })
  .strict()

export const subjectUpdateSchema = subjectCreateSchema
  .partial()
  .extend({
    updatedAt: adminUpdatedAtSchema,
  })
  .strict()

export const topicCreateSchema = z
  .object({
    title: requiredTitleSchema,
    slug: adminSlugSchema,
    description: optionalTextSchema(2_000),
    position: positivePositionSchema.optional(),
    status: adminStatusSchema.default('draft'),
  })
  .strict()

export const topicUpdateSchema = topicCreateSchema
  .partial()
  .extend({
    updatedAt: adminUpdatedAtSchema,
  })
  .strict()

export const lessonTypeSchema = z.enum(['reading', 'practice', 'quiz'])

export const lessonCreateSchema = z
  .object({
    title: requiredTitleSchema,
    slug: adminSlugSchema,
    lessonType: lessonTypeSchema.default('reading'),
    summary: optionalTextSchema(1_000),
    estimatedMinutes: z.coerce.number().int().positive().nullable().optional(),
    position: positivePositionSchema.optional(),
    isPreview: z.boolean().default(false),
    requiresPrevious: z.boolean().default(true),
    status: adminStatusSchema.default('draft'),
  })
  .strict()

export const lessonUpdateSchema = lessonCreateSchema
  .partial()
  .extend({
    updatedAt: adminUpdatedAtSchema,
  })
  .strict()

export type CourseCreateInput = z.infer<typeof courseCreateSchema>
export type CourseUpdateInput = z.infer<typeof courseUpdateSchema>
export type SubjectCreateInput = z.infer<typeof subjectCreateSchema>
export type SubjectUpdateInput = z.infer<typeof subjectUpdateSchema>
export type TopicCreateInput = z.infer<typeof topicCreateSchema>
export type TopicUpdateInput = z.infer<typeof topicUpdateSchema>
export type LessonCreateInput = z.infer<typeof lessonCreateSchema>
export type LessonUpdateInput = z.infer<typeof lessonUpdateSchema>
