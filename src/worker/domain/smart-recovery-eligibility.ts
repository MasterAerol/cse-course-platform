import {
  RecoveryGenerationError,
  allocateRecoveryQuestions,
  filterGeneratableWeaknesses,
  generateRecoveryQuestions,
  type RecentRecoveryIdentity,
  type RecoveryGeneratedQuestion,
  type RecoverySkillAllocation,
} from './smart-recovery-attempt'
import type {
  SkillWeaknessSummary,
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
}

export interface RecoveryEligibility {
  eligibleSkills: SkillWeaknessSummary[]
  selectedSkills: RecoverySkillAllocation[]
  recommendedQuestionCount: number
  recoveryAvailable: boolean
  unavailableReason: RecoveryUnavailableReason
  generatedQuestions: RecoveryGeneratedQuestion[]
  diagnostics: RecoveryEligibilityDiagnostics
}

export function evaluateRecoveryEligibility(input: {
  observedSkills: readonly SkillWeaknessSummary[]
  hasEnoughEvidence: boolean
  attemptSeed: string
  recentIdentities?: readonly RecentRecoveryIdentity[]
  activeAttempt?: {
    compatible: boolean
    questionCount: number
  } | null
  ambiguousEvidenceCount?: number
  missingCanonicalSkillEvidenceCount?: number
  invalidMappingOrContextEvidenceCount?: number
  maximumGenerationRetries?: number
}): RecoveryEligibility {
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
  const selectedSkills = allocateRecoveryQuestions(eligibleSkills)
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
    missingCanonicalSkillEvidenceCount: input.missingCanonicalSkillEvidenceCount ?? 0,
    missingGeneratorEligibilityCount: candidates.length - eligibleSkills.length,
    invalidMappingOrContextEvidenceCount:
      input.invalidMappingOrContextEvidenceCount ?? 0,
  }

  if (input.activeAttempt !== undefined && input.activeAttempt !== null) {
    return {
      eligibleSkills,
      selectedSkills,
      recommendedQuestionCount: input.activeAttempt.questionCount,
      recoveryAvailable: input.activeAttempt.compatible,
      unavailableReason: input.activeAttempt.compatible
        ? null
        : 'configuration_unavailable',
      generatedQuestions: [],
      diagnostics,
    }
  }
  if (candidates.length === 0) {
    return {
      eligibleSkills,
      selectedSkills,
      recommendedQuestionCount: 0,
      recoveryAvailable: false,
      unavailableReason: input.hasEnoughEvidence
        ? 'no_current_weakness'
        : 'not_enough_evidence',
      generatedQuestions: [],
      diagnostics,
    }
  }
  if (selectedSkills.length === 0) {
    return {
      eligibleSkills,
      selectedSkills,
      recommendedQuestionCount: 0,
      recoveryAvailable: false,
      unavailableReason: 'no_generatable_skills',
      generatedQuestions: [],
      diagnostics,
    }
  }

  try {
    const generatedQuestions = generateRecoveryQuestions({
      attemptSeed: input.attemptSeed,
      allocations: selectedSkills,
      recentIdentities: input.recentIdentities,
      maximumRetries: input.maximumGenerationRetries,
    })
    return {
      eligibleSkills,
      selectedSkills,
      recommendedQuestionCount,
      recoveryAvailable: true,
      unavailableReason: null,
      generatedQuestions,
      diagnostics,
    }
  } catch (error) {
    return {
      eligibleSkills,
      selectedSkills,
      recommendedQuestionCount,
      recoveryAvailable: false,
      unavailableReason:
        error instanceof RecoveryGenerationError
          ? error.reason
          : 'configuration_unavailable',
      generatedQuestions: [],
      diagnostics,
    }
  }
}