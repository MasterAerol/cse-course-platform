import {
  generateValidatedQuestion,
  getGenerator,
} from '../generators/generator.registry'
import { createSeededRandom } from '../generators/generator-random'
import type {
  GeneratedQuestion,
  GeneratorDifficulty,
  GeneratorSlug,
} from '../generators/generator.types'
import {
  generatorSkillMappings,
  type SkillSlug,
} from './smart-recovery-skills'
import {
  compareWeaknessPriority,
  type SkillWeaknessSummary,
} from './smart-recovery-weakness'

export const RECOVERY_MAXIMUM_SKILLS = 5
export const RECOVERY_MAXIMUM_QUESTIONS_PER_SKILL = 8
export const RECOVERY_GENERATION_MAX_RETRIES = 8

const allocationBySkillCount: Readonly<Record<number, readonly number[]>> = Object.freeze({
  0: [],
  1: [8],
  2: [8, 8],
  3: [8, 7, 5],
  4: [7, 5, 4, 4],
  5: [6, 5, 4, 3, 2],
})

export interface RecoverySkillAllocation {
  skill: SkillWeaknessSummary
  questionCount: number
}

export interface RecoveryGeneratorEligibility {
  skillSlug: SkillSlug
  generatorSlug: GeneratorSlug
  generatorVersion: number
  supportedDifficulties: readonly GeneratorDifficulty[]
}

export interface RecoveryGeneratedQuestion {
  position: number
  skill: SkillWeaknessSummary
  question: GeneratedQuestion
}

export interface RecentRecoveryIdentity {
  generatorSlug: string
  generatorVersion: number
  generatorSeed: string
  canonicalSignature: string | null
  normalizedPrompt: string
}

export type RecoveryGenerationFailureReason =
  | 'insufficient_fresh_questions'
  | 'configuration_unavailable'

export class RecoveryGenerationError extends Error {
  constructor(
    readonly reason: RecoveryGenerationFailureReason,
    skillSlug: string,
  ) {
    super(
      reason === 'insufficient_fresh_questions'
        ? `Unable to generate a fresh recovery question for ${skillSlug}.`
        : `Recovery generator configuration is unavailable for ${skillSlug}.`,
    )
    this.name = 'RecoveryGenerationError'
  }
}

export function allocateRecoveryQuestions(
  eligibleSkills: readonly SkillWeaknessSummary[],
): RecoverySkillAllocation[] {
  const selected = [...eligibleSkills]
    .filter((summary) => summary.status === 'needs_more_practice')
    .sort(compareWeaknessPriority)
    .slice(0, RECOVERY_MAXIMUM_SKILLS)
  const counts = allocationBySkillCount[selected.length] ?? []
  return selected.map((skill, index) => ({
    skill,
    questionCount: counts[index] ?? 0,
  }))
}

export function getRecoveryGeneratorEligibility(
  skillSlug: string,
): RecoveryGeneratorEligibility[] {
  return generatorSkillMappings
    .filter(
      (mapping) =>
        mapping.skillSlug === skillSlug && mapping.mappingKind === 'direct',
    )
    .flatMap((mapping) => {
      const generator = getGenerator(
        mapping.generatorSlug,
        mapping.generatorVersion,
      )
      return generator === null
        ? []
        : [
            {
              skillSlug: mapping.skillSlug,
              generatorSlug: mapping.generatorSlug,
              generatorVersion: mapping.generatorVersion,
              supportedDifficulties: generator.supportedDifficulties,
            },
          ]
    })
}

export function filterGeneratableWeaknesses(
  summaries: readonly SkillWeaknessSummary[],
): SkillWeaknessSummary[] {
  return summaries.filter(
    (summary) =>
      summary.status === 'needs_more_practice' &&
      getRecoveryGeneratorEligibility(summary.skill.slug).length > 0,
  )
}

function difficultyFor(
  supported: readonly GeneratorDifficulty[],
  offset: number,
): GeneratorDifficulty {
  const preferred: readonly GeneratorDifficulty[] = [
    'easy',
    'medium',
    'medium',
    'hard',
  ]
  const available = preferred.filter((difficulty) =>
    supported.includes(difficulty),
  )
  const choices = available.length > 0 ? available : supported
  const selected = choices[offset % choices.length]
  if (selected === undefined) {
    throw new Error('Recovery generator has no supported difficulty.')
  }
  return selected
}

function generatorFor(
  candidates: readonly RecoveryGeneratorEligibility[],
  attemptSeed: string,
  skillSlug: string,
  offset: number,
): RecoveryGeneratorEligibility {
  if (candidates.length === 0) {
    throw new RecoveryGenerationError('configuration_unavailable', skillSlug)
  }
  const random = createSeededRandom(`${attemptSeed}|${skillSlug}|generators`)
  const rotation = random.integer(0, candidates.length - 1)
  const selected = candidates[(rotation + offset) % candidates.length]
  if (selected === undefined) {
    throw new RecoveryGenerationError('configuration_unavailable', skillSlug)
  }
  return selected
}

export function generateRecoveryQuestions(input: {
  attemptSeed: string
  allocations: readonly RecoverySkillAllocation[]
  recentIdentities?: readonly RecentRecoveryIdentity[]
  maximumRetries?: number
}): RecoveryGeneratedQuestion[] {
  const maximumRetries =
    input.maximumRetries ?? RECOVERY_GENERATION_MAX_RETRIES
  const recentSeeds = new Set(
    (input.recentIdentities ?? []).map(
      (item) =>
        `${item.generatorSlug}@${item.generatorVersion}:${item.generatorSeed}`,
    ),
  )
  const signatures = new Set(
    (input.recentIdentities ?? [])
      .map((item) => item.canonicalSignature)
      .filter((value): value is string => value !== null),
  )
  const prompts = new Set(
    (input.recentIdentities ?? []).map((item) => item.normalizedPrompt),
  )
  const generated: RecoveryGeneratedQuestion[] = []
  let position = 1

  for (const allocation of input.allocations) {
    const candidates = getRecoveryGeneratorEligibility(
      allocation.skill.skill.slug,
    )
    for (let offset = 0; offset < allocation.questionCount; offset += 1) {
      const generator = generatorFor(
        candidates,
        input.attemptSeed,
        allocation.skill.skill.slug,
        offset,
      )
      const difficulty = difficultyFor(
        generator.supportedDifficulties,
        offset,
      )
      let accepted: GeneratedQuestion | null = null

      for (let freshnessRetry = 0; freshnessRetry < maximumRetries; freshnessRetry += 1) {
        const scopedAttemptSeed = [
          input.attemptSeed,
          allocation.skill.skill.slug,
          String(freshnessRetry),
        ].join('|')
        try {
          const question = generateValidatedQuestion({
            attemptSeed: scopedAttemptSeed,
            generatorSlug: generator.generatorSlug,
            generatorVersion: generator.generatorVersion,
            difficulty,
            position,
            existingSignatures: signatures,
            existingPrompts: prompts,
          })
          const seedKey = `${question.generatorSlug}@${question.generatorVersion}:${question.seed}`
          if (recentSeeds.has(seedKey)) continue
          accepted = question
          break
        } catch {
          // A bounded outer retry changes the scoped seed while preserving
          // deterministic reproduction for the same attempt seed.
        }
      }

      if (accepted === null) {
        throw new RecoveryGenerationError(
          'insufficient_fresh_questions',
          allocation.skill.skill.slug,
        )
      }
      signatures.add(accepted.metadata.canonicalSignature)
      prompts.add(accepted.prompt.trim().toLowerCase())
      recentSeeds.add(
        `${accepted.generatorSlug}@${accepted.generatorVersion}:${accepted.seed}`,
      )
      generated.push({ position, skill: allocation.skill, question: accepted })
      position += 1
    }
  }

  return generated
}

export function recommendedRecoveryQuestionCount(
  eligibleSkillCount: number,
): number {
  const normalized = Math.min(
    Math.max(eligibleSkillCount, 0),
    RECOVERY_MAXIMUM_SKILLS,
  )
  return (allocationBySkillCount[normalized] ?? []).reduce(
    (total, count) => total + count,
    0,
  )
}
