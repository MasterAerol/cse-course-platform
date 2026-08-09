import { z } from 'zod'

const safeSlug = z.string().trim().min(1).max(160).regex(/^[a-z0-9][a-z0-9.-]*$/u)

export const mistakeNotebookListQuerySchema = z.object({
  subject: safeSlug.optional(),
  source: z
    .enum(['practice', 'subject_assessment', 'mock_exam', 'smart_recovery'])
    .optional(),
  skill: safeSlug.optional(),
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
  unansweredOnly: z.enum(['true', 'false']).optional().transform((value) => value === 'true'),
  repeatedPatternOnly: z.enum(['true', 'false']).optional().transform((value) => value === 'true'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
}).refine((value) => value.from === undefined || value.to === undefined || Date.parse(value.from) <= Date.parse(value.to), {
  message: 'The start date must not be after the end date.',
})

export const mistakeNotebookEntryParamsSchema = z.object({
  entryId: z
    .string()
    .min(5)
    .max(500)
    .refine((value) => {
      const parts = value.split(':')
      return parts.length === 3 &&
        ['practice', 'subject_assessment', 'mock_exam', 'smart_recovery'].includes(parts[0] ?? '') &&
        parts.slice(1).every((part) => /^[A-Za-z0-9._-]+$/u.test(part))
    }, 'The mistake entry identifier is invalid.'),
})