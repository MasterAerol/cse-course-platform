import { z } from 'zod'

import { request } from './api'

export const mistakeSourceSchema = z.enum([
  'practice', 'subject_assessment', 'mock_exam', 'smart_recovery',
])
const pairSchema = z.object({ slug: z.string(), title: z.string() })
const entrySchema = z.object({
  id: z.string(), sourceType: mistakeSourceSchema,
  attemptPublicId: z.string(), snapshotPublicId: z.string(), submittedAt: z.string(),
  prompt: z.string(), selectedAnswer: z.string().nullable(), correctAnswer: z.string(),
  explanation: z.string().nullable(), wasUnanswered: z.boolean(),
  subject: pairSchema.nullable(), topic: pairSchema.nullable(), skill: pairSchema.nullable(),
  currentSkillStatus: z.enum(['not_enough_data', 'needs_more_practice', 'improving', 'strong']).nullable(),
  mistakePattern: z.string().nullable(),
  relatedLesson: z.object({ title: z.string(), route: z.string() }).nullable(),
  practiceRoute: z.string().nullable(),
})
const summarySchema = z.object({
  totalMistakes: z.number().int().nonnegative(), recentMistakes: z.number().int().nonnegative(),
  latestMistakeAt: z.string().nullable(), reviewedSourceCount: z.number().int().nonnegative(),
  mistakesBySubject: z.array(pairSchema.extend({ count: z.number().int().nonnegative() })),
  topMistakeSkills: z.array(pairSchema.extend({ count: z.number().int().nonnegative() })),
  repeatedMistakePatterns: z.array(z.object({ pattern: z.string(), count: z.number().int().positive() })),
})
const success = <T extends z.ZodTypeAny>(data: T) => z.object({ success: z.literal(true), data })
const listSchema = z.object({
  entries: z.array(entrySchema),
  pagination: z.object({
    page: z.number().int().positive(), limit: z.number().int().positive(), total: z.number().int().nonnegative(),
    totalPages: z.number().int().positive(), hasPreviousPage: z.boolean(), hasNextPage: z.boolean(),
  }),
  appliedFilters: z.object({
    subject: z.string().optional(), source: mistakeSourceSchema.optional(), skill: z.string().optional(),
    from: z.string().optional(), to: z.string().optional(), unansweredOnly: z.boolean(), repeatedPatternOnly: z.boolean(),
  }),
})

export type MistakeNotebookEntry = z.infer<typeof entrySchema>
export type MistakeNotebookSummary = z.infer<typeof summarySchema>
export type MistakeNotebookList = z.infer<typeof listSchema>
export type MistakeNotebookSource = z.infer<typeof mistakeSourceSchema>
export interface MistakeNotebookFilters {
  subject?: string
  source?: MistakeNotebookSource
  skill?: string
  from?: string
  to?: string
  unansweredOnly?: boolean
  repeatedPatternOnly?: boolean
  page?: number
  limit?: number
}

export async function fetchMistakeNotebookSummary(signal?: AbortSignal): Promise<MistakeNotebookSummary> {
  return request('/api/student/mistake-notebook/summary', success(summarySchema), { signal }).then((response) => response.data)
}
export async function fetchMistakeNotebook(filters: MistakeNotebookFilters = {}, signal?: AbortSignal): Promise<MistakeNotebookList> {
  const query = new URLSearchParams()
  if (filters.subject !== undefined) query.set('subject', filters.subject)
  if (filters.source !== undefined) query.set('source', filters.source)
  if (filters.skill !== undefined) query.set('skill', filters.skill)
  if (filters.from !== undefined) query.set('from', filters.from)
  if (filters.to !== undefined) query.set('to', filters.to)
  if (filters.unansweredOnly) query.set('unansweredOnly', 'true')
  if (filters.repeatedPatternOnly) query.set('repeatedPatternOnly', 'true')
  query.set('page', String(filters.page ?? 1))
  query.set('limit', String(filters.limit ?? 20))
  return request(`/api/student/mistake-notebook?${query.toString()}`, success(listSchema), { signal }).then((response) => response.data)
}
export async function fetchMistakeNotebookEntry(entryId: string, signal?: AbortSignal): Promise<MistakeNotebookEntry> {
  return request(`/api/student/mistake-notebook/${encodeURIComponent(entryId)}`, success(entrySchema), { signal }).then((response) => response.data)
}