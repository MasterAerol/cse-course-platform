import {
  SMART_RECOVERY_TAXONOMY_VERSION,
} from '../domain/smart-recovery-skills'
import {
  allocateRecoveryQuestions,
  filterGeneratableWeaknesses,
  generateRecoveryQuestions,
  recommendedRecoveryQuestionCount,
  type RecentRecoveryIdentity,
} from '../domain/smart-recovery-attempt'
import {
  SMART_RECOVERY_EVIDENCE_WINDOW,
  SMART_RECOVERY_FORMULA_VERSION,
  calculateEvidenceSourceBreakdown,
  calculateSkillWeakness,
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
  findRecentGeneratedIdentities,
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

function mapRecentIdentities(
  rows: Awaited<ReturnType<typeof findRecentGeneratedIdentities>>,
): RecentRecoveryIdentity[] {
  return rows.map((row) => {
    let canonicalSignature: string | null
    try {
      const metadata = JSON.parse(row.metadata_json) as { canonicalSignature?: unknown }
      canonicalSignature = typeof metadata.canonicalSignature === 'string'
        ? metadata.canonicalSignature
        : null
    } catch {
      canonicalSignature = null
    }
    return {
      generatorSlug: row.generator_slug,
      generatorVersion: row.generator_version,
      generatorSeed: row.generator_seed,
      canonicalSignature,
      normalizedPrompt: row.prompt.trim().toLowerCase(),
    }
  })
}

export interface SmartRecoveryEvidenceContext {
  courseId: number
  skills: SkillCatalogEntry[]
  skillsBySlug: Map<string, SkillCatalogEntry>
  evidence: NormalizedSkillEvidence[]
  excludedEvidenceCount: number
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
    excludedEvidenceCount: normalized.excludedCount,
  }
}

export async function getSmartRecoveryDashboard(
  database: D1Database,
  userId: number,
  calculatedAt = new Date(),
): Promise<SmartRecoveryDashboardSummary> {
  const context = await loadSmartRecoveryEvidenceContext(database, userId, calculatedAt)
  const summaries = context.skills
    .map((skill) =>
      calculateSkillWeakness(skill, context.evidence, calculatedAt),
    )
    .filter((summary) => summary.evidenceCount > 0)
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
  const generatableWeaknesses = filterGeneratableWeaknesses(needsMorePractice)
  const allocations = allocateRecoveryQuestions(generatableWeaknesses)
  const [activeAttempt, latestAttempt, recentRows] = await Promise.all([
    findActiveRecoveryAttempt(database, userId, context.courseId),
    findLatestSubmittedRecoveryAttempt(database, userId, context.courseId),
    findRecentGeneratedIdentities(database, userId),
  ])
  const activeIsCompatible =
    activeAttempt !== null &&
    activeAttempt.taxonomy_version === SMART_RECOVERY_TAXONOMY_VERSION &&
    activeAttempt.weakness_formula_version === SMART_RECOVERY_FORMULA_VERSION
  let recoveryAvailable = activeIsCompatible
  let recoveryUnavailableReason:
    | 'not_enough_evidence'
    | 'no_current_weakness'
    | 'no_generatable_skills'
    | 'configuration_unavailable'
    | null = null

  if (activeAttempt !== null && !activeIsCompatible) {
    recoveryUnavailableReason = 'configuration_unavailable'
  } else if (activeAttempt === null && needsMorePractice.length === 0) {
    recoveryUnavailableReason = hasEnoughEvidence
      ? 'no_current_weakness'
      : 'not_enough_evidence'
  } else if (activeAttempt === null && allocations.length === 0) {
    recoveryUnavailableReason = 'no_generatable_skills'
  } else if (activeAttempt === null) {
    try {
      generateRecoveryQuestions({
        attemptSeed: [
          'recovery-availability',
          String(userId),
          calculatedAt.toISOString().slice(0, 10),
        ].join('|'),
        allocations,
        recentIdentities: mapRecentIdentities(recentRows),
      })
      recoveryAvailable = true
    } catch {
      recoveryUnavailableReason = 'configuration_unavailable'
    }
  }

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
    needsMorePractice,
    improving,
    strong,
    recoveryAvailable,
    activeRecoveryAttemptPublicId: activeAttempt?.public_id ?? null,
    recommendedRecoveryQuestionCount:
      activeAttempt?.question_count ??
      recommendedRecoveryQuestionCount(generatableWeaknesses.length),
    eligibleRecoverySkillCount: generatableWeaknesses.length,
    recoveryUnavailableReason,
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
