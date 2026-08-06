import {
  SMART_RECOVERY_TAXONOMY_VERSION,
} from '../domain/smart-recovery-skills'
import { evaluateRecoveryAvailability } from '../domain/smart-recovery-eligibility'
import {
  SMART_RECOVERY_EVIDENCE_WINDOW,
  SMART_RECOVERY_FORMULA_VERSION,
  analyzeLearnerRecoveryEvidence,
  calculateEvidenceSourceBreakdown,
  calculateSkillWeakness,
  groupEvidenceBySkill,
  compareWeaknessPriority,
  normalizeGeneratedEvidence,
  type NormalizedSkillEvidence,
  type SkillCatalogEntry,
  type SmartRecoveryDashboardSummary,
  type SmartRecoveryDetailsResponse,
} from '../domain/smart-recovery-weakness'
import { findPublishedCourseEnrollment } from '../repositories/course.repository'
import {
  findActiveRecoveryAttempt,
  findLatestSubmittedRecoveryAttempt,
  findRecoveryAttemptSkillSlugs,
} from '../repositories/smart-recovery-attempt.repository'
import {
  findActiveSmartRecoverySkills,
  findSubmittedGeneratedEvidence,
} from '../repositories/smart-recovery.repository'
import { AppError } from '../utils/app-error'

const CSE_PROFESSIONAL_SLUG = 'cse-professional'
const evidenceScope = {
  submittedGeneratedAttemptsOnly: true,
  recoveryEvidenceIncluded: true,
  fixedQuestionEvidenceIncluded: false,
  ambiguousGeneratorMappingsIncluded: false,
} as const

export interface SmartRecoveryEvidenceContext {
  courseId: number
  skills: SkillCatalogEntry[]
  skillsBySlug: Map<string, SkillCatalogEntry>
  evidence: NormalizedSkillEvidence[]
  evidenceBySkill: Map<string, NormalizedSkillEvidence[]>
  excludedEvidenceCount: number
  exclusionDiagnostics: {
    ambiguousMappingCount: number
    missingCanonicalSkillRowCount: number
    invalidMappingOrContextCount: number
  }
}

function assertValidCalculationDate(calculatedAt: Date): void {
  if (!Number.isFinite(calculatedAt.getTime())) {
    throw new Error('The Smart Recovery calculation date is invalid.')
  }
}

async function assertSmartRecoveryEnrollment(
  database: D1Database,
  userId: number,
) {
  const enrollment = await findPublishedCourseEnrollment(
    database,
    userId,
    CSE_PROFESSIONAL_SLUG,
  )
  if (enrollment === null || enrollment.has_active_access !== 1) {
    throw new AppError(
      403,
      'SMART_RECOVERY_ENROLLMENT_REQUIRED',
      'An active CSE Professional enrollment is required.',
    )
  }
  return enrollment
}

export async function loadSmartRecoveryEvidenceContext(
  database: D1Database,
  userId: number,
  calculatedAt: Date,
  submittedAtOrAfter?: string,
): Promise<SmartRecoveryEvidenceContext> {
  assertValidCalculationDate(calculatedAt)
  const enrollment = await assertSmartRecoveryEnrollment(database, userId)
  const cutoff =
    submittedAtOrAfter ??
    new Date(
      calculatedAt.getTime() -
        SMART_RECOVERY_EVIDENCE_WINDOW.lookbackDays * 24 * 60 * 60 * 1000,
    ).toISOString()
  if (!Number.isFinite(Date.parse(cutoff))) {
    throw new Error('The Smart Recovery evidence cutoff is invalid.')
  }
  const [skills, records] = await Promise.all([
    findActiveSmartRecoverySkills(database, SMART_RECOVERY_TAXONOMY_VERSION),
    findSubmittedGeneratedEvidence(database, userId, cutoff),
  ])
  const skillsBySlug = new Map(skills.map((skill) => [skill.slug, skill]))
  const normalized = normalizeGeneratedEvidence(records, skillsBySlug)
  return {
    courseId: enrollment.course_id,
    skills,
    skillsBySlug,
    evidence: normalized.evidence,
    evidenceBySkill: groupEvidenceBySkill(normalized.evidence),
    excludedEvidenceCount: normalized.excludedCount,
    exclusionDiagnostics: normalized.exclusionDiagnostics,
  }
}

export async function getSmartRecoveryDashboard(
  database: D1Database,
  userId: number,
  calculatedAt = new Date(),
  requestId?: string,
): Promise<SmartRecoveryDashboardSummary> {
  const context = await loadSmartRecoveryEvidenceContext(database, userId, calculatedAt)
  const analysisStartedAt = performance.now()
  const analysis = analyzeLearnerRecoveryEvidence(
    context.skills,
    context.evidence,
    calculatedAt,
  )
  const summaries = analysis.summaries.filter(
    (summary) => summary.evidenceCount > 0,
  )
  const needsMorePractice = summaries
    .filter((summary) => summary.status === 'needs_more_practice')
    .sort(compareWeaknessPriority)
  const improving = summaries
    .filter((summary) => summary.status === 'improving')
    .sort(compareWeaknessPriority)
  const strong = summaries
    .filter((summary) => summary.status === 'strong')
    .sort((left, right) => left.skill.title.localeCompare(right.skill.title))
  const hasEnoughEvidence = summaries.some(
    (summary) => summary.status !== 'not_enough_data',
  )
  const activeAttempt = await findActiveRecoveryAttempt(
    database,
    userId,
    context.courseId,
  )
  let latestAttempt: Awaited<
    ReturnType<typeof findLatestSubmittedRecoveryAttempt>
  > = null
  try {
    latestAttempt = await findLatestSubmittedRecoveryAttempt(
      database,
      userId,
      context.courseId,
    )
  } catch (error) {
    console.error(JSON.stringify({
      message: 'Smart Recovery latest result lookup failed',
      requestId: requestId ?? null,
      errorName: error instanceof Error ? error.name : 'UnknownError',
      stage: 'latest_recovery_result',
    }))
  }
  const recentlyTrainedSkillSlugs =
    latestAttempt === null
      ? []
      : await findRecoveryAttemptSkillSlugs(database, latestAttempt.id)
  const activeIsCompatible =
    activeAttempt !== null &&
    activeAttempt.taxonomy_version === SMART_RECOVERY_TAXONOMY_VERSION &&
    activeAttempt.weakness_formula_version === SMART_RECOVERY_FORMULA_VERSION
  const eligibility = evaluateRecoveryAvailability({
    observedSkills: summaries,
    hasEnoughEvidence,

    recentlyTrainedSkillSlugs,
    activeAttempt:
      activeAttempt === null
        ? null
        : {
            compatible: activeIsCompatible,
            questionCount: activeAttempt.question_count,
          },
    ambiguousEvidenceCount:
      context.exclusionDiagnostics.ambiguousMappingCount,
    missingCanonicalSkillEvidenceCount:
      context.exclusionDiagnostics.missingCanonicalSkillRowCount,
    invalidMappingOrContextEvidenceCount:
      context.exclusionDiagnostics.invalidMappingOrContextCount,
  })
  console.info(JSON.stringify({
    message: 'Smart Recovery summary analysis completed',
    requestId: requestId ?? null,
    durationMs: Math.round((performance.now() - analysisStartedAt) * 10) / 10,
    inputEvidenceCount: analysis.metrics.inputEvidenceCount,
    boundedEvidenceCount: analysis.metrics.boundedEvidenceCount,
    skillsProcessed: analysis.metrics.skillsProcessed,
    skillsObserved: summaries.length,
    formulaEvaluationCount: analysis.metrics.formulaEvaluationCount,
    databaseRoundTrips: latestAttempt === null ? 5 : 6,
    recentlyTrainedSkillCount: eligibility.diagnostics.recentlyTrainedSkillCount,
    rotationCandidateSkillCount: eligibility.diagnostics.rotationCandidateSkillCount,
    generatorMetadataEvaluations: eligibility.diagnostics.statusCounts.needs_more_practice,
    freshQuestionCandidatesGenerated: 0,
    returnedPriorityCount: Math.min(needsMorePractice.length, 3),
    returnedImprovingCount: Math.min(improving.length, 3),
    returnedStrongCount: Math.min(strong.length, 3),
  }))
  return {
    taxonomyVersion: SMART_RECOVERY_TAXONOMY_VERSION,
    formulaVersion: SMART_RECOVERY_FORMULA_VERSION,
    calculatedAt: calculatedAt.toISOString(),
    evidenceWindow: SMART_RECOVERY_EVIDENCE_WINDOW,
    evidenceScope,
    state:
      needsMorePractice.length > 0
        ? 'has_priorities'
        : hasEnoughEvidence
          ? 'no_current_weakness'
          : 'not_enough_data',
    eligibleEvidenceCount: context.evidence.length,
    excludedEvidenceCount: context.excludedEvidenceCount,
    skillsWithEvidence: summaries.length,
    prioritySkillCount: needsMorePractice.length,
    needsMorePractice: needsMorePractice.slice(0, 3),
    improving: improving.slice(0, 3),
    strong: strong.slice(0, 3),
    recoveryAvailable: eligibility.recoveryAvailable,
    activeRecoveryAttemptPublicId: activeAttempt?.public_id ?? null,
    recommendedRecoveryQuestionCount: eligibility.recommendedQuestionCount,
    eligibleRecoverySkillCount: eligibility.eligibleSkills.length,
    selectedRecoverySkillCount: eligibility.selectedSkills.length,
    recoveryUnavailableReason: eligibility.unavailableReason,
    recoveryDiagnostics: eligibility.diagnostics,
    latestRecoveryResult:
      latestAttempt === null ||
      latestAttempt.submitted_at === null ||
      latestAttempt.score_percent === null
        ? null
        : {
            attemptPublicId: latestAttempt.public_id,
            scorePercent: latestAttempt.score_percent,
            correctCount: latestAttempt.correct_count,
            questionCount: latestAttempt.question_count,
            submittedAt: latestAttempt.submitted_at,
          },
  }
}
export async function getSmartRecoverySkillDetails(
  database: D1Database,
  userId: number,
  skillSlug: string,
  calculatedAt = new Date(),
): Promise<SmartRecoveryDetailsResponse> {
  const context = await loadSmartRecoveryEvidenceContext(database, userId, calculatedAt)
  const skill = context.skillsBySlug.get(skillSlug)
  if (skill === undefined) {
    throw new AppError(
      404,
      'SMART_RECOVERY_SKILL_NOT_FOUND',
      'The requested Smart Recovery skill was not found.',
    )
  }

  return {
    taxonomyVersion: SMART_RECOVERY_TAXONOMY_VERSION,
    formulaVersion: SMART_RECOVERY_FORMULA_VERSION,
    calculatedAt: calculatedAt.toISOString(),
    evidenceWindow: SMART_RECOVERY_EVIDENCE_WINDOW,
    evidenceScope,
    summary: calculateSkillWeakness(skill, context.evidence, calculatedAt),
    sourceBreakdown: calculateEvidenceSourceBreakdown(
      skill.slug,
      context.evidence,
      calculatedAt,
    ),
  }
}
