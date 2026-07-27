import { z } from 'zod'

export const courseSlugSchema = z
  .object({
    courseSlug: z
      .string({ error: 'Course slug is required.' })
      .min(1, 'Course slug is required.')
      .max(120, 'Course slug must be 120 characters or fewer.')
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/u,
        'Course slug must use lowercase letters, numbers, and hyphens.',
      ),
  })
  .strict()

export const lessonPublicIdSchema = z
  .object({
    lessonPublicId: z
      .string({ error: 'Lesson id is required.' })
      .min(1, 'Lesson id is required.')
      .max(160, 'Lesson id must be 160 characters or fewer.')
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/u,
        'Lesson id must use lowercase letters, numbers, and hyphens.',
      ),
  })
  .strict()

const optionalAccessExpirationSchema = z.preprocess(
  (value) => (value === '' ? null : value),
  z
    .string()
    .datetime({ offset: true })
    .nullable()
    .optional(),
)

export const operationalEnrollmentSchema = z
  .object({
    email: z.preprocess(
      (value) =>
        typeof value === 'string' ? value.trim().toLowerCase() : value,
      z
        .string({ error: 'Enter an email address.' })
        .min(1, 'Enter an email address.')
        .max(254, 'Email must be 254 characters or fewer.')
        .email('Enter a valid email address.'),
    ),
    courseSlug: courseSlugSchema.shape.courseSlug,
    accessExpiresAt: optionalAccessExpirationSchema,
  })
  .strict()

export type CourseSlugInput = z.infer<typeof courseSlugSchema>
export type LessonPublicIdInput = z.infer<typeof lessonPublicIdSchema>
export type OperationalEnrollmentInput = z.infer<
  typeof operationalEnrollmentSchema
>
