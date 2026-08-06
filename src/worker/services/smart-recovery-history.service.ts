import {
  SMART_RECOVERY_EVIDENCE_WINDOW,
  SMART_RECOVERY_FORMULA_VERSION,
  type SkillCatalogEntry,
} from '../domain/smart-recovery-weakness'
import {
  buildRecoveryAttemptProgress,
  type RecoveryAttemptProgressInput,
  type RecoveryAttemptProgressSummary,
} from '../domain/smart-recovery-history'
import { findActiveRecoveryAttempt } from '../repositories/smart-recovery-attempt.repository'
import {
  findRecoveryHistorySkillRows,
  type RecoveryHistorySkillRow,
} from '../repositories/smart-recovery-history.repository'
import { loadSmartRecoveryEvidenceContext } from './smart-recovery.service'

const HISTORY_LIMIT = 20

export interface RecoveryHistoryPayload {
  formulaVersion: typeof SMART_RECOVERY_FORMULA_VERSION
  activeAttemptPublicId: string | null
  totalSubmittedAttempts: number
  historyLimit: number
  attempts: RecoveryAttemptProgressSummary[]
}

function skillFromSnapshot(row: RecoveryHistorySkillRow): SkillCatalogEntry {
  return {
    slug: row.skill_slug,
    title: row.skill_title,
    description: null,
    taxonomyVersion: row.attempt_taxonomy_version,
    subjectSlug: row.subject_slug,
    subjectTitle: row.subject_title,
    topicSlug: row.topic_slug,
    topicTitle: row.topic_title,
    relatedLessonSlug: row.related_lesson_slug,
    relatedLessonTitle: row.related_lesson_title,
  }
}

function groupHistoryRows(
  rows: readonly RecoveryHistorySkillRow[],
): RecoveryAttemptProgressInput[] {
  const attempts = new Map<string, RecoveryAttemptProgressInput>()
  for (const row of rows) {
    const existing = attempts.get(row.attempt_public_id)
    const attempt = existing ?? {
      attemptPublicId: row.attempt_public_id,
      attemptFormulaVersion: row.attempt_formula_version,
      startedAt: row.started_at,
      submittedAt: row.submitted_at,
      scorePercent: row.score_percent,
      correctCount: row.correct_count,
      questionCount: row.question_count,
      skills: [],
    }
    ;(attempt.skills as RecoveryAttemptProgressInput['skills'][number][]).push({
      skill: skillFromSnapshot(row),
      questions: row.questions,
      correct: row.correct,
    })
    if (existing === undefined) attempts.set(row.attempt_public_id, attempt)
  }
  return [...attempts.values()]
}

export async function getRecoveryHistory(
  database: D1Database,
  userId: number,
  calculatedAt = new Date(),
  requestId?: string,
): Promise<RecoveryHistoryPayload> {
  const analysisStartedAt = performance.now()
  const currentContext = await loadSmartRecoveryEvidenceContext(
    database,
    userId,
    calculatedAt,
  )
  const [active, rows] = await Promise.all([
    findActiveRecoveryAttempt(database, userId, currentContext.courseId),
    findRecoveryHistorySkillRows(
      database,
      userId,
      currentContext.courseId,
      HISTORY_LIMIT,
    ),
  ])
  const earliestSubmission = rows.reduce<number | null>((earliest, row) => {
    const timestamp = Date.parse(row.submitted_at)
    return earliest === null || timestamp < earliest ? timestamp : earliest
  }, null)
  const currentCutoff =
    calculatedAt.getTime() -
    SMART_RECOVERY_EVIDENCE_WINDOW.lookbackDays * 24 * 60 * 60 * 1000
  const context =
    earliestSubmission !== null && earliestSubmission < currentCutoff
      ? await loadSmartRecoveryEvidenceContext(
          database,
          userId,
          calculatedAt,
          new Date(
            earliestSubmission -
              SMART_RECOVERY_EVIDENCE_WINDOW.lookbackDays * 24 * 60 * 60 * 1000,
          ).toISOString(),
        )
      : currentContext
  const attempts = groupHistoryRows(rows).map((attempt) =>
    buildRecoveryAttemptProgress(attempt, context.evidenceBySkill),
  )
  console.info(JSON.stringify({
    message: 'Smart Recovery history analysis completed',
    requestId: requestId ?? null,
    durationMs: Math.round((performance.now() - analysisStartedAt) * 10) / 10,
    evidenceCount: context.evidence.length,
    groupedSkillCount: context.evidenceBySkill.size,
    historyRowCount: rows.length,
    attemptCount: attempts.length,
    formulaEvaluationCount: attempts.reduce(
      (total, attempt) => total + attempt.skillsTrained * 2,
      0,
    ),
    databaseRoundTrips: context === currentContext ? 5 : 8,
  }))
  return {
    formulaVersion: SMART_RECOVERY_FORMULA_VERSION,
    activeAttemptPublicId: active?.public_id ?? null,
    totalSubmittedAttempts: rows[0]?.total_submitted_attempts ?? 0,
    historyLimit: HISTORY_LIMIT,
    attempts,

  }
}
