import { z } from 'zod'

const slug = z.string().min(1).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
export const mockExamSlugParamsSchema = z.object({ mockExamSlug: slug }).strict()
export const mockAttemptParamsSchema = z.object({ attemptPublicId: slug }).strict()
export const mockQuestionParamsSchema = mockAttemptParamsSchema.extend({ snapshotPublicId: slug }).strict()
export const createMockAttemptSchema = z.object({ mode: z.enum(['timed', 'untimed']) }).strict()
export const saveMockAnswerSchema = z.object({ selectedChoicePublicId: slug }).strict()
export const markMockQuestionSchema = z.object({ markedForReview: z.boolean() }).strict()

const difficulty = z.object({ easy: z.number().int().nonnegative(), medium: z.number().int().nonnegative(), hard: z.number().int().nonnegative() }).strict()
const generator = z.object({ slug, version: z.number().int().positive(), rotationPosition: z.number().int().positive(), selectionWeight: z.number().int().positive() }).strict()
const topic = z.object({ topicSlug: slug, topicTitle: z.string().trim().min(1), position: z.number().int().positive(), count: z.number().int().positive(), difficulty, generators: z.array(generator).min(1) }).strict()
const subject = z.object({ subjectSlug: z.enum(['verbal-ability', 'numerical-ability', 'analytical-ability', 'general-information']), subjectTitle: z.string().trim().min(1), position: z.number().int().positive(), count: z.number().int().positive(), difficulty, assessmentSlug: slug, topics: z.array(topic).min(1) }).strict()
export const mockBlueprintSchema = z.object({ version: z.number().int().positive(), label: z.string().trim().min(1), totalQuestions: z.number().int().positive(), passingScorePercent: z.number().int().min(0).max(100), timedDurationMinutes: z.number().int().positive(), difficulty, subjects: z.array(subject).length(4) }).strict()
export const adminMockExamInputSchema = z.object({
  title: z.string().trim().min(1).max(200), slug, description: z.string().trim().min(1).max(3000), simulationLabel: z.string().trim().min(1).max(200), position: z.number().int().positive(), passingScore: z.number().int().min(0).max(100), questionCount: z.number().int().positive(), timedDurationMinutes: z.number().int().positive(), maximumAttempts: z.number().int().positive().nullable(), showExplanations: z.boolean(), sourceUrl: z.string().url(), status: z.enum(['draft', 'published']), blueprint: mockBlueprintSchema, updatedAt: z.string().optional(),
}).strict()
export type AdminMockExamInput = z.infer<typeof adminMockExamInputSchema>
