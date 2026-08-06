import {
  calculateRecoverySkillProgress,
  interpretRecoveryResult,
  type RecoveryResultInterpretation,
  type RecoverySkillProgress,
} from './smart-recovery-progress'
import type {
  NormalizedSkillEvidence,
  SkillCatalogEntry,
} from './smart-recovery-weakness'

export interface RecoveryAttemptSkillInput {
  skill: SkillCatalogEntry
  questions: number
  correct: number
}

export interface RecoveryAttemptProgressInput {
  attemptPublicId: string
  attemptFormulaVersion: number
  startedAt: string
  submittedAt: string
  scorePercent: number
  correctCount: number
  questionCount: number
  skills: readonly RecoveryAttemptSkillInput[]
}

export interface RecoveryAttemptProgressSummary {
  attempt: {
    publicId: string
    formulaVersion: number
    startedAt: string
    submittedAt: string
  }
  scorePercent: number
  correctCount: number
  questionCount: number
  skillsTrained: number
  interpretation: {
    code: RecoveryResultInterpretation
    title: string
    message: string
  }
  skillProgress: Array<{
    skill: { slug: string; title: string }
    questions: number
    correct: number
    accuracyPercent: number
    progress: RecoverySkillProgress
  }>
}

export function buildRecoveryAttemptProgress(
  input: RecoveryAttemptProgressInput,
  evidence: readonly NormalizedSkillEvidence[] | Map<string, NormalizedSkillEvidence[]>,
): RecoveryAttemptProgressSummary {
  const skillProgress = input.skills.map((item) => ({
    skill: { slug: item.skill.slug, title: item.skill.title },
    questions: item.questions,
    correct: item.correct,
    accuracyPercent:
      Math.round((item.correct / item.questions) * 1000) / 10,
    progress: calculateRecoverySkillProgress(
      item.skill,
      evidence instanceof Map ? evidence.get(item.skill.slug) ?? [] : evidence,
      input.attemptPublicId,
      input.submittedAt,
      input.attemptFormulaVersion,
    ),
  }))
  return {
    attempt: {
      publicId: input.attemptPublicId,
      formulaVersion: input.attemptFormulaVersion,
      startedAt: input.startedAt,
      submittedAt: input.submittedAt,
    },
    scorePercent: input.scorePercent,
    correctCount: input.correctCount,
    questionCount: input.questionCount,
    skillsTrained: skillProgress.length,
    interpretation: interpretRecoveryResult(
      input.scorePercent,
      skillProgress.map((item) => item.progress),
    ),
    skillProgress,
  }
}
