import {
  SMART_RECOVERY_TAXONOMY_VERSION,
} from '../domain/smart-recovery-skills'
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
  findActiveSmartRecoverySkills,
  findSubmittedGeneratedEvidence,
} from '../repositories/smart-recovery.repository'
import { AppError } from '../utils/app-error'

const CSE_PROFESSIONAL_SLUG = 'cse-professional'
const evidenceScope = {
  submittedGeneratedAttemptsOnly: true,
  fixedQuestionEvidenceIncluded: false,
  ambiguousGeneratorMappingsIncluded: false,
} as const

interface SmartRecoveryEvidenceContext {
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
): Promise<void> {
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
}

async function loadEvidenceContext(
  database: D1Database,
  userId: number,
  calculatedAt: Date,
): Promise<SmartRecoveryEvidenceContext> {
  assertValidCalculationDate(calculatedAt)
  await assertSmartRecoveryEnrollment(database, userId)
  const cutoff = new Date(
    calculatedAt.getTime() -
      SMART_RECOVERY_EVIDENCE_WINDOW.lookbackDays * 24 * 60 * 60 * 1000,
  ).toISOString()
  const [skills, records] = await Promise.all([
    findActiveSmartRecoverySkills(database, SMART_RECOVERY_TAXONOMY_VERSION),
    findSubmittedGeneratedEvidence(database, userId, cutoff),
  ])
  const skillsBySlug = new Map(skills.map((skill) => [skill.slug, skill]))
  const normalized = normalizeGeneratedEvidence(records, skillsBySlug)
  return {
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
  const context = await loadEvidenceContext(database, userId, calculatedAt)
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
  }
}

export async function getSmartRecoverySkillDetails(
  database: D1Database,
  userId: number,
  skillSlug: string,
  calculatedAt = new Date(),
): Promise<SmartRecoveryDetailsResponse> {
  const context = await loadEvidenceContext(database, userId, calculatedAt)
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
