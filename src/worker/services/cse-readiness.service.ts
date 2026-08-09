import {
  calculateCseReadiness,
  type ReadinessAssessmentEvidence,
  type ReadinessMockEvidence,
  type ReadinessSubjectSlug,
} from '../domain/cse-readiness'
import { analyzeLearnerRecoveryEvidence } from '../domain/smart-recovery-weakness'
import {
  findReadinessAssessmentEvidence,
  findReadinessMockEvidence,
  findRecentGeneratedPracticeEvidence,
} from '../repositories/cse-readiness.repository'
import { loadSmartRecoveryEvidenceContext } from './smart-recovery.service'

const supportedSubjects = new Set<ReadinessSubjectSlug>(['verbal-ability', 'numerical-ability', 'analytical-ability', 'general-information'])

export async function getCseReadiness(database: D1Database, userId: number, generatedAt = new Date()) {
  const recoveryContext = await loadSmartRecoveryEvidenceContext(database, userId, generatedAt)
  const [mockRows, assessmentRows, practiceRows] = await Promise.all([
    findReadinessMockEvidence(database, userId, recoveryContext.courseId),
    findReadinessAssessmentEvidence(database, userId, recoveryContext.courseId),
    findRecentGeneratedPracticeEvidence(database, userId, recoveryContext.courseId, 50),
  ])
  const recoveryAnalysis = analyzeLearnerRecoveryEvidence(recoveryContext.skills, recoveryContext.evidence, generatedAt)
  const observedSummaries = recoveryAnalysis.summaries.filter((summary) => summary.evidenceCount > 0 && supportedSubjects.has(summary.skill.subjectSlug as ReadinessSubjectSlug))
  const latestMock = mockRows[0]
  const mock: ReadinessMockEvidence | null = latestMock === undefined ? null : {
    latestScorePercent: latestMock.score_percent,
    previousScorePercent: mockRows[1]?.score_percent ?? null,
    bestScorePercent: latestMock.best_score_percent,
    attemptCount: latestMock.attempt_count,
    latestSubmittedAt: latestMock.submitted_at,
  }
  const assessmentGroups = new Map<ReadinessSubjectSlug, typeof assessmentRows>()
  for (const row of assessmentRows) {
    if (!supportedSubjects.has(row.subject_slug)) continue
    const group = assessmentGroups.get(row.subject_slug)
    if (group === undefined) assessmentGroups.set(row.subject_slug, [row])
    else group.push(row)
  }
  const assessments: ReadinessAssessmentEvidence[] = [...assessmentGroups.entries()].map(([subjectSlug, rows]) => ({
    subjectSlug,
    subjectTitle: rows[0]?.subject_title ?? subjectSlug,
    assessmentSlug: rows[0]?.assessment_slug ?? `${subjectSlug}-subject-assessment`,
    latestScorePercent: rows[0]?.score_percent ?? 0,
    previousScorePercent: rows[1]?.score_percent ?? null,
    attemptCount: rows[0]?.attempt_count ?? 0,
    latestSubmittedAt: rows[0]?.submitted_at ?? generatedAt.toISOString(),
  }))
  return calculateCseReadiness({
    mock,
    assessments,
    recentPractice: practiceRows.map((row) => ({ wasCorrect: row.is_correct === 1, submittedAt: row.submitted_at })),
    skills: observedSummaries.map((summary) => ({ slug: summary.skill.slug, title: summary.skill.title, subjectSlug: summary.skill.subjectSlug as ReadinessSubjectSlug, status: summary.status, evidenceCount: summary.evidenceCount })),
    totalSkillEvidenceCount: recoveryAnalysis.metrics.boundedEvidenceCount,
    generatedAt,
  })
}
