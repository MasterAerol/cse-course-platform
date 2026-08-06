import {
  SMART_RECOVERY_EVIDENCE_WINDOW,
  calculateSkillWeakness,
  type NormalizedSkillEvidence,
  type SkillCatalogEntry,
  type WeaknessStatus,
} from './smart-recovery-weakness'

export type RecoveryProgressTrend =
  | 'improved'
  | 'stable'
  | 'declined'
  | 'insufficient_data'

export type RecoveryResultInterpretation =
  | 'improved'
  | 'strong_recovery_result'
  | 'still_needs_practice'
  | 'more_evidence_needed'

export interface RecoverySkillProgress {
  statusBefore: WeaknessStatus
  weightedAccuracyBefore: number | null
  evidenceCountBefore: number
  statusAfter: WeaknessStatus
  weightedAccuracyAfter: number | null
  evidenceCountAfter: number
  percentagePointChange: number | null
  trend: RecoveryProgressTrend
}

const statusRank: Readonly<Record<WeaknessStatus, number>> = {
  not_enough_data: 0,
  needs_more_practice: 1,
  improving: 2,
  strong: 3,
}

function roundPercent(value: number): number {
  return Math.round(value * 10) / 10
}

function evidenceAtOrBefore(
  evidence: readonly NormalizedSkillEvidence[],
  submittedAt: number,
): NormalizedSkillEvidence[] {
  return evidence.filter((item) => {
    const itemTime = Date.parse(item.attemptSubmittedAt)
    return Number.isFinite(itemTime) && itemTime <= submittedAt
  })
}

export function calculateRecoverySkillProgress(
  skill: SkillCatalogEntry,
  evidence: readonly NormalizedSkillEvidence[],
  attemptPublicId: string,
  submittedAt: string,
): RecoverySkillProgress {
  const submittedAtMs = Date.parse(submittedAt)
  if (!Number.isFinite(submittedAtMs)) {
    throw new Error('Recovery submission timestamp is invalid.')
  }
  const calculationDate = new Date(submittedAtMs)
  const eligible = evidenceAtOrBefore(evidence, submittedAtMs)
  const beforeEvidence = eligible.filter((item) => {
    const itemTime = Date.parse(item.attemptSubmittedAt)
    return item.attemptPublicId !== attemptPublicId && itemTime < submittedAtMs
  })
  const before = calculateSkillWeakness(skill, beforeEvidence, calculationDate)
  const after = calculateSkillWeakness(skill, eligible, calculationDate)
  const percentagePointChange =
    before.accuracyPercent === null || after.accuracyPercent === null
      ? null
      : roundPercent(after.accuracyPercent - before.accuracyPercent)

  let trend: RecoveryProgressTrend
  if (
    before.status === 'not_enough_data' ||
    after.status === 'not_enough_data' ||
    percentagePointChange === null
  ) {
    trend = 'insufficient_data'
  } else if (
    statusRank[after.status] > statusRank[before.status] ||
    percentagePointChange >=
      SMART_RECOVERY_EVIDENCE_WINDOW.meaningfulTrendPercent
  ) {
    trend = 'improved'
  } else if (
    statusRank[after.status] < statusRank[before.status] ||
    percentagePointChange <=
      -SMART_RECOVERY_EVIDENCE_WINDOW.meaningfulTrendPercent
  ) {
    trend = 'declined'
  } else {
    trend = 'stable'
  }

  return {
    statusBefore: before.status,
    weightedAccuracyBefore: before.accuracyPercent,
    evidenceCountBefore: before.evidenceCount,
    statusAfter: after.status,
    weightedAccuracyAfter: after.accuracyPercent,
    evidenceCountAfter: after.evidenceCount,
    percentagePointChange,
    trend,
  }
}

export function interpretRecoveryResult(
  scorePercent: number,
  progress: readonly RecoverySkillProgress[],
): {
  code: RecoveryResultInterpretation
  title: string
  message: string
} {
  if (progress.some((item) => item.trend === 'improved')) {
    return {
      code: 'improved',
      title: 'Improved',
      message:
        'Your submitted evidence improved for at least one trained skill. Keep practicing to make the signal more reliable.',
    }
  }
  if (progress.some((item) => item.statusAfter === 'needs_more_practice')) {
    return {
      code: 'still_needs_practice',
      title: 'Still needs practice',
      message:
        'At least one trained skill still needs practice under the standard evidence rules.',
    }
  }
  if (scorePercent >= 80) {
    return {
      code: 'strong_recovery_result',
      title: 'Strong recovery result',
      message:
        'This was a strong recovery-set result. Continue building evidence before treating it as a lasting skill signal.',
    }
  }
  return {
    code: 'more_evidence_needed',
    title: 'More evidence needed',
    message:
      'Keep training this skill so Smart Recovery can form a more reliable long-term signal.',
  }
}
