import { z } from 'zod'

export const subjectAssessmentTopicPerformanceSchema = z.object({
  topicSlug: z.string(),
  topicTitle: z.string(),
  totalQuestions: z.number().int().nonnegative(),
  correctCount: z.number().int().nonnegative(),
  incorrectCount: z.number().int().nonnegative(),
  unansweredCount: z.number().int().nonnegative(),
  percentage: z.number(),
  status: z.enum(['Strong', 'Developing', 'Needs Review']),
})

export const subjectAssessmentResultSchema = z.object({
  assessment: z.object({
    title: z.string(),
    slug: z.string(),
    passingScore: z.number(),
    passingTarget: z.number(),
  }),
  attempt: z.object({
    publicId: z.string(),
    attemptNumber: z.number().int().positive(),
    status: z.literal('submitted'),
    startedAt: z.string(),
    submittedAt: z.string(),
  }),
  totalPoints: z.number().int().positive(),
  earnedPoints: z.number().int().nonnegative(),
  scorePercent: z.number(),
  passed: z.boolean(),
  feedback: z.enum(['Excellent', 'Very Good', 'Passed', 'Needs More Practice']),
  breakdown: z.object({
    topics: z.array(subjectAssessmentTopicPerformanceSchema),
    strongestTopic: subjectAssessmentTopicPerformanceSchema,
    weakestTopic: subjectAssessmentTopicPerformanceSchema,
    correctCount: z.number().int().nonnegative(),
    incorrectCount: z.number().int().nonnegative(),
    unansweredCount: z.number().int().nonnegative(),
  }),
  resultUrl: z.string(),
})

export type SubjectAssessmentResult = z.infer<
  typeof subjectAssessmentResultSchema
>
