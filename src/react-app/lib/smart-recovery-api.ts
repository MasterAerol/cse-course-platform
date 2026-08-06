import { z } from 'zod'

import { request } from './api'

const evidenceSourceSchema = z.enum([
  'generated_practice',
  'subject_assessment',
  'mock_exam',
])

const evidenceWindowSchema = z.object({
  lookbackDays: z.number().int().positive(),
  maximumItemsPerSkill: z.number().int().positive(),
  minimumEvidenceItems: z.number().int().positive(),
  recentItemCount: z.number().int().positive(),
  recentWeightMultiplier: z.number().positive(),
  sourceWeights: z.object({
    generated_practice: z.number().positive(),
    subject_assessment: z.number().positive(),
    mock_exam: z.number().positive(),
  }),
  needsMorePracticeBelowPercent: z.number().min(0).max(100),
  strongAtOrAbovePercent: z.number().min(0).max(100),
  meaningfulTrendPercent: z.number().min(0).max(100),
  maximumMistakePatterns: z.number().int().nonnegative(),
})

const evidenceScopeSchema = z.object({
  submittedGeneratedAttemptsOnly: z.literal(true),
  fixedQuestionEvidenceIncluded: z.literal(false),
  ambiguousGeneratorMappingsIncluded: z.literal(false),
})

const skillCatalogSchema = z.object({
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  taxonomyVersion: z.number().int().positive(),
  subjectSlug: z.string(),
  subjectTitle: z.string(),
  topicSlug: z.string().nullable(),
  topicTitle: z.string().nullable(),
  relatedLessonSlug: z.string().nullable(),
  relatedLessonTitle: z.string().nullable(),
})

const skillWeaknessSummarySchema = z.object({
  skill: skillCatalogSchema,
  status: z.enum([
    'not_enough_data',
    'needs_more_practice',
    'improving',
    'strong',
  ]),
  trend: z.enum(['not_available', 'improving', 'stable', 'declining']),
  evidenceCount: z.number().int().nonnegative(),
  answeredCount: z.number().int().nonnegative(),
  correctCount: z.number().int().nonnegative(),
  incorrectCount: z.number().int().nonnegative(),
  unansweredCount: z.number().int().nonnegative(),
  accuracyPercent: z.number().min(0).max(100).nullable(),
  recentAccuracyPercent: z.number().min(0).max(100).nullable(),
  previousAccuracyPercent: z.number().min(0).max(100).nullable(),
  lastPracticedAt: z.string().nullable(),
  mistakePatterns: z.array(
    z.object({
      distractorType: z.string(),
      count: z.number().int().positive(),
      percentOfClassifiedMistakes: z.number().min(0).max(100),
    }),
  ),
})

export const smartRecoveryDashboardResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    taxonomyVersion: z.literal(1),
    formulaVersion: z.literal(1),
    calculatedAt: z.string(),
    evidenceWindow: evidenceWindowSchema,
    evidenceScope: evidenceScopeSchema,
    state: z.enum([
      'not_enough_data',
      'has_priorities',
      'no_current_weakness',
    ]),
    eligibleEvidenceCount: z.number().int().nonnegative(),
    excludedEvidenceCount: z.number().int().nonnegative(),
    skillsWithEvidence: z.number().int().nonnegative(),
    needsMorePractice: z.array(skillWeaknessSummarySchema),
    improving: z.array(skillWeaknessSummarySchema),
    strong: z.array(skillWeaknessSummarySchema),
  }),
})

export const smartRecoveryDetailsResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    taxonomyVersion: z.literal(1),
    formulaVersion: z.literal(1),
    calculatedAt: z.string(),
    evidenceWindow: evidenceWindowSchema,
    evidenceScope: evidenceScopeSchema,
    summary: skillWeaknessSummarySchema,
    sourceBreakdown: z.array(
      z.object({
        sourceType: evidenceSourceSchema,
        evidenceCount: z.number().int().nonnegative(),
        answeredCount: z.number().int().nonnegative(),
        correctCount: z.number().int().nonnegative(),
        accuracyPercent: z.number().min(0).max(100).nullable(),
      }),
    ),
  }),
})

export type SmartRecoveryDashboard = z.infer<
  typeof smartRecoveryDashboardResponseSchema
>['data']
export type SmartRecoveryDetails = z.infer<
  typeof smartRecoveryDetailsResponseSchema
>['data']
export type SmartRecoverySkillSummary = z.infer<
  typeof skillWeaknessSummarySchema
>

export async function fetchSmartRecoveryDashboard(
  signal?: AbortSignal,
): Promise<SmartRecoveryDashboard> {
  const response = await request(
    '/api/student/smart-recovery',
    smartRecoveryDashboardResponseSchema,
    { signal },
  )
  return response.data
}

export async function fetchSmartRecoverySkillDetails(
  skillSlug: string,
  signal?: AbortSignal,
): Promise<SmartRecoveryDetails> {
  const response = await request(
    `/api/student/smart-recovery/skills/${encodeURIComponent(skillSlug)}`,
    smartRecoveryDetailsResponseSchema,
    { signal },
  )
  return response.data
}
