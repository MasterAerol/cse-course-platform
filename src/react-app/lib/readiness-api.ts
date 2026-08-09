import { z } from 'zod'
import { request } from './api'

const statusCountsSchema = z.object({ not_enough_data: z.number().int().nonnegative(), needs_more_practice: z.number().int().nonnegative(), improving: z.number().int().nonnegative(), strong: z.number().int().nonnegative() })
const signalSchema = z.object({ title: z.string(), detail: z.string() })
const readinessSchema = z.object({
  formulaVersion: z.literal(1), score: z.number().min(0).max(100), hasSufficientEvidence: z.boolean(),
  readinessBand: z.enum(['building_foundations', 'developing', 'getting_closer', 'nearly_ready', 'strong_readiness']),
  confidence: z.enum(['low', 'moderate', 'strong']), confidenceExplanation: z.string(),
  evidence: z.object({ mockAttemptCount: z.number().int().nonnegative(), subjectAssessmentCount: z.number().int().nonnegative(), subjectsAssessed: z.number().int().min(0).max(4), observedSkillCount: z.number().int().nonnegative(), classifiedSkillCount: z.number().int().nonnegative(), skillEvidenceCount: z.number().int().nonnegative(), recentPracticeQuestionCount: z.number().int().min(0).max(50) }),
  components: z.array(z.object({ key: z.enum(['fullMock', 'subjectAssessments', 'skillStrength', 'recentPractice', 'improvementConsistency']), title: z.string(), contribution: z.number().nonnegative(), maximum: z.number().positive(), evidenceAvailable: z.boolean(), explanation: z.string() })),
  subjects: z.array(z.object({ slug: z.enum(['verbal-ability', 'numerical-ability', 'analytical-ability', 'general-information']), title: z.string(), readinessPercent: z.number().min(0).max(100).nullable(), readinessLabel: z.enum(['Not enough evidence', 'Needs attention', 'Developing', 'Strong']), latestAssessmentScorePercent: z.number().min(0).max(100).nullable(), assessmentAttemptCount: z.number().int().nonnegative(), skillStatusCounts: statusCountsSchema })).length(4),
  limiters: z.array(signalSchema).max(5), positiveSignals: z.array(signalSchema).max(5),
  recommendation: z.object({ title: z.string(), detail: z.string(), actionLabel: z.string(), route: z.string().startsWith('/') }),
  generatedAt: z.string(), disclaimer: z.string(),
})
export type CseReadiness = z.infer<typeof readinessSchema>
export async function fetchCseReadiness(signal?: AbortSignal): Promise<CseReadiness> {
  return request('/api/student/readiness', z.object({ success: z.literal(true), data: readinessSchema }), { signal }).then((response) => response.data)
}
