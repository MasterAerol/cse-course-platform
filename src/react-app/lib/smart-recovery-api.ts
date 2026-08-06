import { z } from 'zod'

import { request } from './api'

const evidenceSourceSchema = z.enum([
  'generated_practice',
  'subject_assessment',
  'mock_exam',
  'recovery',
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
    recovery: z.number().positive(),
  }),
  needsMorePracticeBelowPercent: z.number().min(0).max(100),
  strongAtOrAbovePercent: z.number().min(0).max(100),
  meaningfulTrendPercent: z.number().min(0).max(100),
  maximumMistakePatterns: z.number().int().nonnegative(),
})

const evidenceScopeSchema = z.object({
  submittedGeneratedAttemptsOnly: z.literal(true),
  recoveryEvidenceIncluded: z.literal(true),
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
    formulaVersion: z.literal(2),
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
    recoveryAvailable: z.boolean(),
    activeRecoveryAttemptPublicId: z.string().nullable(),
    recommendedRecoveryQuestionCount: z.number().int().nonnegative(),
    eligibleRecoverySkillCount: z.number().int().nonnegative(),
    recoveryUnavailableReason: z.enum([
      'not_enough_evidence',
      'no_current_weakness',
      'no_generatable_skills',
      'configuration_unavailable',
    ]).nullable(),
    latestRecoveryResult: z.object({
      attemptPublicId: z.string(),
      scorePercent: z.number().min(0).max(100),
      correctCount: z.number().int().nonnegative(),
      questionCount: z.number().int().positive(),
      submittedAt: z.string(),
    }).nullable(),
  }),
})

export const smartRecoveryDetailsResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    taxonomyVersion: z.literal(1),
    formulaVersion: z.literal(2),
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

export const getSmartRecoverySummary = fetchSmartRecoveryDashboard
export const getSmartRecoverySkillDetails = fetchSmartRecoverySkillDetails
const recoveryChoiceSchema = z.object({
  publicId: z.string(),
  text: z.string(),
  position: z.number().int().positive(),
}).strict()

const recoveryAttemptPayloadSchema = z.object({
  attempt: z.object({
    publicId: z.string(),
    status: z.literal('in_progress'),
    questionCount: z.number().int().positive(),
    answeredCount: z.number().int().nonnegative(),
    startedAt: z.string(),
  }).strict(),
  questions: z.array(z.object({
    publicId: z.string(),
    position: z.number().int().positive(),
    prompt: z.string(),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    selectedChoicePublicId: z.string().nullable(),
    skill: z.object({ slug: z.string(), title: z.string() }).strict(),
    subject: z.object({ slug: z.string(), title: z.string() }).strict(),
    topic: z.object({ slug: z.string(), title: z.string() }).strict().nullable(),
    choices: z.array(recoveryChoiceSchema),
  }).strict()),
  answeredCount: z.number().int().nonnegative(),
  totalCount: z.number().int().positive(),
}).strict()

const recoveryResultAvailableSchema = z.object({
  attempt: z.object({
    publicId: z.string(),
    status: z.literal('submitted'),
  }).strict(),
  resultAvailable: z.literal(true),
}).strict()

export const recoveryAttemptResponseSchema = z.object({
  success: z.literal(true),
  data: z.union([recoveryAttemptPayloadSchema, recoveryResultAvailableSchema]),
})

const weaknessStatusSchema = z.enum([
  'not_enough_data',
  'needs_more_practice',
  'improving',
  'strong',
])

const recoveryProgressSchema = z.object({
  statusBefore: weaknessStatusSchema,
  weightedAccuracyBefore: z.number().min(0).max(100).nullable(),
  evidenceCountBefore: z.number().int().nonnegative(),
  statusAfter: weaknessStatusSchema,
  weightedAccuracyAfter: z.number().min(0).max(100).nullable(),
  evidenceCountAfter: z.number().int().nonnegative(),
  percentagePointChange: z.number().min(-100).max(100).nullable(),
  trend: z.enum(['improved', 'stable', 'declined', 'insufficient_data']),
})

const recoveryInterpretationSchema = z.object({
  code: z.enum([
    'improved',
    'strong_recovery_result',
    'still_needs_practice',
    'more_evidence_needed',
  ]),
  title: z.string(),
  message: z.string(),
})

export const recoveryResultResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    formulaVersion: z.number().int().positive(),
    attempt: z.object({
      publicId: z.string(),
      status: z.literal('submitted'),
      formulaVersion: z.number().int().positive(),
      startedAt: z.string(),
      submittedAt: z.string(),
    }),
    interpretation: recoveryInterpretationSchema,
    scorePercent: z.number().min(0).max(100),
    correctCount: z.number().int().nonnegative(),
    questionCount: z.number().int().positive(),
    skillsTrained: z.number().int().positive(),
    strongestRecoverySkill: z.string().nullable(),
    stillNeedsPractice: z.array(z.string()),
    skillBreakdown: z.array(z.object({
      skill: z.object({ slug: z.string(), title: z.string() }),
      questions: z.number().int().positive(),
      correct: z.number().int().nonnegative(),
      accuracyPercent: z.number().min(0).max(100),
      ...recoveryProgressSchema.shape,
      currentStatus: weaknessStatusSchema,
      relatedLesson: z.object({
        publicId: z.string(),
        slug: z.string(),
        title: z.string(),
        courseSlug: z.string(),
      }).nullable(),
    })),
    questions: z.array(z.object({
      publicId: z.string(),
      position: z.number().int().positive(),
      prompt: z.string(),
      skillTitle: z.string(),
      selectedChoice: z.object({ publicId: z.string(), text: z.string() }).nullable(),
      correctChoice: z.object({ publicId: z.string(), text: z.string() }),
      isCorrect: z.boolean(),
      explanation: z.string(),
      mistakePattern: z.string().nullable(),
      choices: z.array(recoveryChoiceSchema),
    })),
  }),
})

const saveRecoveryAnswerResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    saved: z.literal(true),
    selectedChoicePublicId: z.string(),
    answeredCount: z.number().int().nonnegative(),
    totalCount: z.number().int().positive(),
    savedAt: z.string(),
  }),
})

export type RecoveryAttempt = z.infer<typeof recoveryAttemptPayloadSchema>
export type RecoveryAttemptResponse = z.infer<typeof recoveryAttemptResponseSchema>['data']
export type RecoveryResult = z.infer<typeof recoveryResultResponseSchema>['data']

export async function createSmartRecoveryAttempt(
  idempotencyKey: string,
): Promise<RecoveryAttemptResponse> {
  const response = await request(
    '/api/student/smart-recovery/attempts',
    recoveryAttemptResponseSchema,
    { method: 'POST', body: JSON.stringify({ idempotencyKey }) },
  )
  return response.data
}

export async function fetchSmartRecoveryAttempt(
  attemptPublicId: string,
  signal?: AbortSignal,
): Promise<RecoveryAttemptResponse> {
  const response = await request(
    `/api/student/smart-recovery/attempts/${encodeURIComponent(attemptPublicId)}`,
    recoveryAttemptResponseSchema,
    { signal },
  )
  return response.data
}

export async function saveSmartRecoveryAnswer(
  attemptPublicId: string,
  snapshotPublicId: string,
  selectedChoicePublicId: string,
): Promise<z.infer<typeof saveRecoveryAnswerResponseSchema>['data']> {
  const response = await request(
    `/api/student/smart-recovery/attempts/${encodeURIComponent(attemptPublicId)}/answers/${encodeURIComponent(snapshotPublicId)}`,
    saveRecoveryAnswerResponseSchema,
    { method: 'PUT', body: JSON.stringify({ selectedChoicePublicId }) },
  )
  return response.data
}

export async function submitSmartRecoveryAttempt(
  attemptPublicId: string,
): Promise<RecoveryResult> {
  const response = await request(
    `/api/student/smart-recovery/attempts/${encodeURIComponent(attemptPublicId)}/submit`,
    recoveryResultResponseSchema,
    { method: 'POST' },
  )
  return response.data
}

export async function fetchSmartRecoveryResult(
  attemptPublicId: string,
  signal?: AbortSignal,
): Promise<RecoveryResult> {
  const response = await request(
    `/api/student/smart-recovery/attempts/${encodeURIComponent(attemptPublicId)}/result`,
    recoveryResultResponseSchema,
    { signal },
  )
  return response.data
}
export const recoveryHistoryResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    formulaVersion: z.literal(2),
    activeAttemptPublicId: z.string().nullable(),
    totalSubmittedAttempts: z.number().int().nonnegative(),
    historyLimit: z.number().int().positive(),
    attempts: z.array(z.object({
      attempt: z.object({
        publicId: z.string(),
        formulaVersion: z.number().int().positive(),
        startedAt: z.string(),
        submittedAt: z.string(),
      }),
      scorePercent: z.number().min(0).max(100),
      correctCount: z.number().int().nonnegative(),
      questionCount: z.number().int().positive(),
      skillsTrained: z.number().int().positive(),
      interpretation: recoveryInterpretationSchema,
      skillProgress: z.array(z.object({
        skill: z.object({ slug: z.string(), title: z.string() }),
        questions: z.number().int().positive(),
        correct: z.number().int().nonnegative(),
        accuracyPercent: z.number().min(0).max(100),
        progress: recoveryProgressSchema,
      })),
    })),
  }),
})

export type RecoveryHistory = z.infer<
  typeof recoveryHistoryResponseSchema
>['data']

export async function fetchSmartRecoveryHistory(
  signal?: AbortSignal,
): Promise<RecoveryHistory> {
  const response = await request(
    '/api/student/smart-recovery/history',
    recoveryHistoryResponseSchema,
    { signal },
  )
  return response.data
}
