import {
  getGenerator,
} from '../generators/generator.registry'
import { createSeededRandom, deriveQuestionSeed } from '../generators/generator-random'
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
export const RECOVERY_GENERATION_MAX_RETRIES = 40
export const RECOVERY_RECENT_IDENTITIES_PER_GENERATOR = 1

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

export type RecoverySkillBlockingReason =
  | 'no_eligible_generator'
  | 'all_generators_excluded'
  | 'seed_space_exhausted'
  | 'signature_space_exhausted'
  | 'generator_validation_failed'
  | 'duplicate_within_attempt'
  | 'insufficient_retry_budget'
  | 'missing_skill_configuration'
  | null

export interface RecoverySkillFeasibilityDiagnostic {
  skillSlug: string
  skillTitle: string
  requestedQuestionCount: number
  activeGenerators: Array<{ slug: GeneratorSlug; version: number }>
  excludedGenerators: Array<{
    slug: GeneratorSlug
    version: number
    reason: 'not_registered' | 'no_supported_difficulty'
  }>
  recentlySeenSeedCount: number
  recentlySeenCanonicalSignatureCount: number
  candidateAttemptsMade: number
  uniqueValidQuestionsFound: number
  finalFeasibleCount: number
  collisionFailures: {
    recentSeed: number
    recentSignatureOrPrompt: number
    duplicateWithinAttempt: number
    generatorValidation: number
  }
  blockingReason: RecoverySkillBlockingReason
}

export interface RecoveryQuestionPlan {
  selectedSkills: RecoverySkillAllocation[]
  plannedQuestionCount: number
  feasibleQuestionCount: number
  available: boolean
  unavailableReason:
    | 'no_eligible_skills'
    | 'no_eligible_generators'
    | 'insufficient_fresh_questions'
    | 'configuration_unavailable'
    | null
  generatedQuestions: RecoveryGeneratedQuestion[]
  diagnostics: RecoverySkillFeasibilityDiagnostic[]
}

function scopedRecentIdentities(
  identities: readonly RecentRecoveryIdentity[],
): RecentRecoveryIdentity[] {
  const counts = new Map<string, number>()
  return identities.filter((identity) => {
    const key = identity.generatorSlug + '@' + identity.generatorVersion
    const count = counts.get(key) ?? 0
    if (count >= RECOVERY_RECENT_IDENTITIES_PER_GENERATOR) return false
    counts.set(key, count + 1)
    return true
  })
}

function generatorConfiguration(skillSlug: string): {
  active: RecoveryGeneratorEligibility[]
  excluded: RecoverySkillFeasibilityDiagnostic['excludedGenerators']
  hasMapping: boolean
} {
  const mappings = generatorSkillMappings.filter(
    (mapping) =>
      mapping.skillSlug === skillSlug && mapping.mappingKind === 'direct',
  )
  const active: RecoveryGeneratorEligibility[] = []
  const excluded: RecoverySkillFeasibilityDiagnostic['excludedGenerators'] = []
  for (const mapping of mappings) {
    const generator = getGenerator(mapping.generatorSlug, mapping.generatorVersion)
    if (generator === null) {
      excluded.push({
        slug: mapping.generatorSlug,
        version: mapping.generatorVersion,
        reason: 'not_registered',
      })
    } else if (generator.supportedDifficulties.length === 0) {
      excluded.push({
        slug: mapping.generatorSlug,
        version: mapping.generatorVersion,
        reason: 'no_supported_difficulty',
      })
    } else {
      active.push({
        skillSlug: mapping.skillSlug,
        generatorSlug: mapping.generatorSlug,
        generatorVersion: mapping.generatorVersion,
        supportedDifficulties: generator.supportedDifficulties,
      })
    }
  }
  return { active, excluded, hasMapping: mappings.length > 0 }
}

function blockingReasonFor(input: {
  hasMapping: boolean
  activeGeneratorCount: number
  excludedGeneratorCount: number
  requested: number
  feasible: number
  attempts: number
  retryBudget: number
  recentSeed: number
  recentSignatureOrPrompt: number
  duplicateWithinAttempt: number
  generatorValidation: number
}): RecoverySkillBlockingReason {
  if (!input.hasMapping) return 'missing_skill_configuration'
  if (input.activeGeneratorCount === 0) {
    return input.excludedGeneratorCount > 0
      ? 'all_generators_excluded'
      : 'no_eligible_generator'
  }
  if (input.feasible >= input.requested) return null
  if (
    input.generatorValidation > 0 &&
    input.generatorValidation === input.attempts
  ) {
    return 'generator_validation_failed'
  }
  if (
    input.recentSeed > 0 &&
    input.recentSignatureOrPrompt === 0 &&
    input.duplicateWithinAttempt === 0
  ) {
    return 'seed_space_exhausted'
  }
  if (input.recentSignatureOrPrompt > 0) {
    return 'signature_space_exhausted'
  }
  if (input.duplicateWithinAttempt > 0) {
    return 'duplicate_within_attempt'
  }
  if (input.attempts >= input.retryBudget) {
    return 'insufficient_retry_budget'
  }
  return 'generator_validation_failed'
}

export function planRecoveryQuestions(input: {
  attemptSeed: string
  allocations: readonly RecoverySkillAllocation[]
  recentIdentities?: readonly RecentRecoveryIdentity[]
  maximumCandidateAttemptsPerQuestion?: number
}): RecoveryQuestionPlan {
  const retryBudget =
    input.maximumCandidateAttemptsPerQuestion ??
    RECOVERY_GENERATION_MAX_RETRIES
  const recent = scopedRecentIdentities(input.recentIdentities ?? [])
  const recentSeeds = new Set(
    recent.map(
      (item) =>
        item.generatorSlug + '@' + item.generatorVersion + ':' + item.generatorSeed,
    ),
  )
  const recentSignatures = new Set(
    recent
      .map((item) => item.canonicalSignature)
      .filter((value): value is string => value !== null),
  )
  const recentPrompts = new Set(recent.map((item) => item.normalizedPrompt))
  const attemptSignatures = new Set<string>()
  const attemptPrompts = new Set<string>()
  const generatedQuestions: RecoveryGeneratedQuestion[] = []
  const diagnostics: RecoverySkillFeasibilityDiagnostic[] = []
  let plannedPosition = 1

  for (const allocation of input.allocations) {
    const configuration = generatorConfiguration(allocation.skill.skill.slug)
    const generatorKeys = new Set(
      configuration.active.map(
        (item) => item.generatorSlug + '@' + item.generatorVersion,
      ),
    )
    const skillRecent = recent.filter((item) =>
      generatorKeys.has(item.generatorSlug + '@' + item.generatorVersion),
    )
    const counters = {
      attempts: 0,
      recentSeed: 0,
      recentSignatureOrPrompt: 0,
      duplicateWithinAttempt: 0,
      generatorValidation: 0,
    }
    let feasible = 0

    for (let offset = 0; offset < allocation.questionCount; offset += 1) {
      let accepted: GeneratedQuestion | null = null
      if (configuration.active.length > 0 && retryBudget > 0) {
        const generator = generatorFor(
          configuration.active,
          input.attemptSeed,
          allocation.skill.skill.slug,
          offset,
        )
        const difficulty = difficultyFor(generator.supportedDifficulties, offset)
        const registered = getGenerator(
          generator.generatorSlug,
          generator.generatorVersion,
        )
        for (let retry = 0; retry < retryBudget; retry += 1) {
          counters.attempts += 1
          if (registered === null) {
            counters.generatorValidation += 1
            break
          }
          const seed = deriveQuestionSeed({
            attemptSeed:
              input.attemptSeed + '|' + allocation.skill.skill.slug,
            generatorSlug: generator.generatorSlug,
            generatorVersion: generator.generatorVersion,
            difficulty,
            position: plannedPosition,
            retry,
          })
          const seedKey =
            generator.generatorSlug + '@' + generator.generatorVersion + ':' + seed
          if (recentSeeds.has(seedKey)) {
            counters.recentSeed += 1
            continue
          }
          let question: GeneratedQuestion
          try {
            question = registered.generate({ seed, difficulty })
          } catch {
            counters.generatorValidation += 1
            continue
          }
          const normalizedPrompt = question.prompt.trim().toLowerCase()
          const normalizedChoices = question.choices.map((choice) =>
            choice.text.trim().toLowerCase(),
          )
          let valid: boolean
          try {
            valid = registered.validate(question).valid
          } catch {
            counters.generatorValidation += 1
            continue
          }
          if (
            !valid ||
            new Set(normalizedChoices).size !== normalizedChoices.length
          ) {
            counters.generatorValidation += 1
            continue
          }
          if (
            recentSignatures.has(question.metadata.canonicalSignature) ||
            recentPrompts.has(normalizedPrompt)
          ) {
            counters.recentSignatureOrPrompt += 1
            continue
          }
          if (
            attemptSignatures.has(question.metadata.canonicalSignature) ||
            attemptPrompts.has(normalizedPrompt)
          ) {
            counters.duplicateWithinAttempt += 1
            continue
          }
          accepted = question
          break
        }
      }
      if (accepted !== null) {
        feasible += 1
        attemptSignatures.add(accepted.metadata.canonicalSignature)
        attemptPrompts.add(accepted.prompt.trim().toLowerCase())
        generatedQuestions.push({
          position: plannedPosition,
          skill: allocation.skill,
          question: accepted,
        })
      }
      plannedPosition += 1
    }

    diagnostics.push({
      skillSlug: allocation.skill.skill.slug,
      skillTitle: allocation.skill.skill.title,
      requestedQuestionCount: allocation.questionCount,
      activeGenerators: configuration.active.map((item) => ({
        slug: item.generatorSlug,
        version: item.generatorVersion,
      })),
      excludedGenerators: configuration.excluded,
      recentlySeenSeedCount: new Set(
        skillRecent.map((item) => item.generatorSeed),
      ).size,
      recentlySeenCanonicalSignatureCount: new Set(
        skillRecent
          .map((item) => item.canonicalSignature)
          .filter((value): value is string => value !== null),
      ).size,
      candidateAttemptsMade: counters.attempts,
      uniqueValidQuestionsFound: feasible,
      finalFeasibleCount: feasible,
      collisionFailures: {
        recentSeed: counters.recentSeed,
        recentSignatureOrPrompt: counters.recentSignatureOrPrompt,
        duplicateWithinAttempt: counters.duplicateWithinAttempt,
        generatorValidation: counters.generatorValidation,
      },
      blockingReason: blockingReasonFor({
        hasMapping: configuration.hasMapping,
        activeGeneratorCount: configuration.active.length,
        excludedGeneratorCount: configuration.excluded.length,
        requested: allocation.questionCount,
        feasible,
        attempts: counters.attempts,
        retryBudget: retryBudget * allocation.questionCount,
        recentSeed: counters.recentSeed,
        recentSignatureOrPrompt: counters.recentSignatureOrPrompt,
        duplicateWithinAttempt: counters.duplicateWithinAttempt,
        generatorValidation: counters.generatorValidation,
      }),
    })
  }

  const plannedQuestionCount = input.allocations.reduce(
    (total, allocation) => total + allocation.questionCount,
    0,
  )
  const feasibleQuestionCount = generatedQuestions.length
  const blocked = diagnostics.filter((item) => item.blockingReason !== null)
  const unavailableReason =
    input.allocations.length === 0
      ? 'no_eligible_skills'
      : blocked.some((item) =>
          item.blockingReason === 'no_eligible_generator' ||
          item.blockingReason === 'all_generators_excluded'
        )
        ? 'no_eligible_generators'
        : blocked.some((item) =>
            item.blockingReason === 'generator_validation_failed' ||
            item.blockingReason === 'missing_skill_configuration'
          )
          ? 'configuration_unavailable'
          : feasibleQuestionCount < plannedQuestionCount
            ? 'insufficient_fresh_questions'
            : null
  return {
    selectedSkills: [...input.allocations],
    plannedQuestionCount,
    feasibleQuestionCount,
    available: unavailableReason === null,
    unavailableReason,
    generatedQuestions:
      unavailableReason === null ? generatedQuestions : [],
    diagnostics,
  }
}

export function generateRecoveryQuestions(input: {
  attemptSeed: string
  allocations: readonly RecoverySkillAllocation[]
  recentIdentities?: readonly RecentRecoveryIdentity[]
  maximumRetries?: number
}): RecoveryGeneratedQuestion[] {
  const plan = planRecoveryQuestions({
    attemptSeed: input.attemptSeed,
    allocations: input.allocations,
    recentIdentities: input.recentIdentities,
    maximumCandidateAttemptsPerQuestion: input.maximumRetries,
  })
  if (!plan.available) {
    const skillSlug =
      plan.diagnostics.find((item) => item.blockingReason !== null)?.skillSlug ??
      'unknown-skill'
    throw new RecoveryGenerationError(
      plan.unavailableReason === 'configuration_unavailable' ||
      plan.unavailableReason === 'no_eligible_generators'
        ? 'configuration_unavailable'
        : 'insufficient_fresh_questions',
      skillSlug,
    )
  }
  return plan.generatedQuestions
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
