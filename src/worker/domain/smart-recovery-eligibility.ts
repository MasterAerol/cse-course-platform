import {
  allocateRecoveryQuestions,
  filterGeneratableWeaknesses,
  planRecoveryQuestionsAcrossCandidates,
  type RecentRecoveryIdentity,
  type RecoveryGeneratedQuestion,
  type RecoveryQuestionPlan,
  type RecoverySkillAllocation,
} from './smart-recovery-attempt'
import {
  compareWeaknessPriority,
  type SkillWeaknessSummary,
  WeaknessStatus,
} from './smart-recovery-weakness'

export type RecoveryUnavailableReason =
  | 'not_enough_evidence'
  | 'no_current_weakness'
  | 'no_generatable_skills'
  | 'insufficient_fresh_questions'
  | 'active_attempt_exists'
  | 'configuration_unavailable'
  | null

export interface RecoveryEligibilityDiagnostics {
  statusCounts: Record<WeaknessStatus, number> & { neutral: 0 }
  generatableSkillCount: number
  selectedSkillCount: number
  excludedSkillCount: number
  ambiguousEvidenceCount: number
  missingCanonicalSkillEvidenceCount: number
  missingGeneratorEligibilityCount: number
  invalidMappingOrContextEvidenceCount: number
  recentlyTrainedSkillCount: number
  rotationCandidateSkillCount: number
}

export interface RecoveryAvailabilitySummary {
  eligibleSkills: SkillWeaknessSummary[]
  candidateSkills: SkillWeaknessSummary[]
  selectedSkills: RecoverySkillAllocation[]
  recommendedQuestionCount: number
  recoveryAvailable: boolean
  unavailableReason: RecoveryUnavailableReason
  diagnostics: RecoveryEligibilityDiagnostics
}

export interface RecoveryEligibility extends RecoveryAvailabilitySummary {
  generatedQuestions: RecoveryGeneratedQuestion[]
  questionPlan: RecoveryQuestionPlan | null
}

interface RecoveryAvailabilityInput {
  observedSkills: readonly SkillWeaknessSummary[]
  hasEnoughEvidence: boolean
  activeAttempt?: {
    compatible: boolean
    questionCount: number
  } | null
  ambiguousEvidenceCount?: number
  missingCanonicalSkillEvidenceCount?: number
  invalidMappingOrContextEvidenceCount?: number
  recentlyTrainedSkillSlugs?: readonly string[]
}

export function evaluateRecoveryAvailability(
  input: RecoveryAvailabilityInput,
): RecoveryAvailabilitySummary {
  const statusCounts: RecoveryEligibilityDiagnostics['statusCounts'] = {
    not_enough_data: 0,
    needs_more_practice: 0,
    improving: 0,
    strong: 0,
    neutral: 0,
  }
  for (const summary of input.observedSkills) statusCounts[summary.status] += 1

  const candidates = input.observedSkills.filter(
    (summary) => summary.status === 'needs_more_practice',
  )
  const eligibleSkills = filterGeneratableWeaknesses(candidates)
    .sort(compareWeaknessPriority)
  const recentlyTrained = new Set(input.recentlyTrainedSkillSlugs ?? [])
  const candidateSkills = eligibleSkills.filter(
    (summary) => !recentlyTrained.has(summary.skill.slug),
  )
  const selectedSkills = allocateRecoveryQuestions(candidateSkills)
  const recommendedQuestionCount = selectedSkills.reduce(
    (total, allocation) => total + allocation.questionCount,
    0,
  )
  const diagnostics: RecoveryEligibilityDiagnostics = {
    statusCounts,
    generatableSkillCount: eligibleSkills.length,
    selectedSkillCount: selectedSkills.length,
    excludedSkillCount: candidates.length - eligibleSkills.length,
    ambiguousEvidenceCount: input.ambiguousEvidenceCount ?? 0,
    missingCanonicalSkillEvidenceCount:
      input.missingCanonicalSkillEvidenceCount ?? 0,
    missingGeneratorEligibilityCount: candidates.length - eligibleSkills.length,
    invalidMappingOrContextEvidenceCount:
      input.invalidMappingOrContextEvidenceCount ?? 0,
    recentlyTrainedSkillCount: eligibleSkills.length - candidateSkills.length,
    rotationCandidateSkillCount: candidateSkills.length,
  }

  if (input.activeAttempt !== undefined && input.activeAttempt !== null) {
    return {
      eligibleSkills,
      candidateSkills,
      selectedSkills,
      recommendedQuestionCount: input.activeAttempt.questionCount,
      recoveryAvailable: input.activeAttempt.compatible,
      unavailableReason: input.activeAttempt.compatible
        ? null
        : 'configuration_unavailable',
      diagnostics,
    }
  }
  if (candidates.length === 0) {
    return {
      eligibleSkills,
      candidateSkills,
      selectedSkills,
      recommendedQuestionCount: 0,
      recoveryAvailable: false,
      unavailableReason: input.hasEnoughEvidence
        ? 'no_current_weakness'
        : 'not_enough_evidence',
      diagnostics,
    }
  }
  if (selectedSkills.length === 0) {
    return {
      eligibleSkills,
      candidateSkills,
      selectedSkills,
      recommendedQuestionCount: 0,
      recoveryAvailable: false,
      unavailableReason:
        eligibleSkills.length > 0
          ? 'insufficient_fresh_questions'
          : 'no_generatable_skills',
      diagnostics,
    }
  }
  return {
    eligibleSkills,
    candidateSkills,
    selectedSkills,
    recommendedQuestionCount,
    recoveryAvailable: true,
    unavailableReason: null,
    diagnostics,
  }
}

export function evaluateRecoveryEligibility(input: RecoveryAvailabilityInput & {
  attemptSeed: string
  recentIdentities?: readonly RecentRecoveryIdentity[]
  maximumGenerationRetries?: number
}): RecoveryEligibility {
  const availability = evaluateRecoveryAvailability(input)
  if (
    input.activeAttempt !== undefined && input.activeAttempt !== null ||
    !availability.recoveryAvailable
  ) {
    return {
      ...availability,
      generatedQuestions: [],
      questionPlan: null,
    }
  }

  const questionPlan = planRecoveryQuestionsAcrossCandidates({
    attemptSeed: input.attemptSeed,
    candidateSkills: availability.candidateSkills,
    recentIdentities: input.recentIdentities,
    maximumCandidateAttemptsPerQuestion: input.maximumGenerationRetries,
  })
  const unavailableReason =
    questionPlan.unavailableReason === 'configuration_unavailable' ||
    questionPlan.unavailableReason === 'no_eligible_generators'
      ? 'configuration_unavailable'
      : questionPlan.unavailableReason === null
        ? null
        : 'insufficient_fresh_questions'
  return {
    ...availability,
    selectedSkills: questionPlan.selectedSkills,
    recommendedQuestionCount: questionPlan.plannedQuestionCount,
    recoveryAvailable: questionPlan.available,
    unavailableReason,
    generatedQuestions: questionPlan.generatedQuestions,
    questionPlan,
  }
}