import { z } from 'zod'

export const adminIdSchema = z.coerce.number().int().positive()

export const adminStatusSchema = z.enum([
  'draft',
  'published',
  'archived',
])

export const adminSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Slug is required.')
  .max(120, 'Slug is too long.')
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Use lowercase letters, numbers, and single hyphens.',
  )

export const adminUpdatedAtSchema = z
  .string()
  .min(1, 'A current updatedAt value is required.')

export const optionalTextSchema = (max: number) =>
  z.preprocess(
    (value) => (value === null ? undefined : value),
    z
      .string()
      .trim()
      .max(max)
      .optional()
      .transform((value) =>
        value === undefined || value === '' ? null : value,
      ),
  )

export const requiredTitleSchema = z
  .string()
  .trim()
  .min(1, 'Title is required.')
  .max(180, 'Title is too long.')

export const positivePositionSchema = z.coerce
  .number()
  .int()
  .positive('Position must be positive.')

export const staleProtectedSchema = z.object({
  updatedAt: adminUpdatedAtSchema,
})

export const moveParamsSchema = z.object({
  id: adminIdSchema,
})

export type AdminStatus = z.infer<typeof adminStatusSchema>
