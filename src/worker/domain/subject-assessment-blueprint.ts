import {
  generateValidatedQuestion,
  getGenerator,
} from '../generators/generator.registry'
import {
  createSeededRandom,
} from '../generators/generator-random'
import type {
  GeneratedQuestion,
  GeneratorDifficulty,
  GeneratorSlug,
} from '../generators/generator.types'

export const numericalAbilityAssessmentSlug =
  'numerical-ability-subject-assessment'
export const numericalAbilitySubjectSlug = 'numerical-ability'

export type NumericalAbilityTopicSlug =
  | 'percentages'
  | 'fractions'
  | 'decimals'
  | 'ratio-and-proportion'
  | 'average'
  | 'number-problems'
  | 'age-problems'
  | 'work-and-rate-problems'
  | 'distance-speed-and-time'
  | 'simple-interest'

export interface SubjectAssessmentGeneratorConfig {
  slug: GeneratorSlug
  version: number
  rotationPosition: number
  selectionWeight: number
}

export interface SubjectAssessmentTopicConfig {
  topicSlug: NumericalAbilityTopicSlug
  topicTitle: string
  position: number
  count: number
  difficulty: Record<GeneratorDifficulty, number>
  generators: SubjectAssessmentGeneratorConfig[]
}

export interface SubjectAssessmentBlueprint {
  subjectSlug: typeof numericalAbilitySubjectSlug
  version: number
  totalQuestions: number
  passingScorePercent: number
  topics: SubjectAssessmentTopicConfig[]
}

const topicGeneratorOwnership = {
  percentages: [
    'finding-percentage',
    'finding-base',
    'finding-rate',
  ],
  fractions: [
    'equivalent-fractions',
    'simplifying-fractions',
    'comparing-fractions',
    'adding-fractions',
    'subtracting-fractions',
    'multiplying-fractions',
    'dividing-fractions',
  ],
  decimals: [
    'comparing-decimals',
    'rounding-decimals',
    'adding-decimals',
    'subtracting-decimals',
    'multiplying-decimals',
    'dividing-decimals',
    'decimal-conversions',
  ],
  'ratio-and-proportion': [
    'simplifying-ratios',
    'equivalent-ratios',
    'comparing-ratios',
    'solving-proportions',
    'direct-proportion',
    'inverse-proportion',
    'ratio-sharing',
    'ratio-word-problems',
  ],
  average: [
    'finding-average',
    'missing-value-average',
    'combined-average',
    'weighted-average',
    'average-after-adding',
    'average-after-removing',
    'average-age',
    'average-score-salary',
  ],
  'number-problems': [
    'consecutive-integers',
    'consecutive-odd-even-integers',
    'sum-difference-numbers',
    'product-quotient-numbers',
    'two-digit-number-problems',
    'reversed-digit-problems',
    'remainder-number-problems',
    'fractional-part-number-problems',
    'mixed-number-relationships',
  ],
  'age-problems': [
    'present-age-equations',
    'past-age-problems',
    'future-age-problems',
    'age-difference',
    'sum-of-ages',
    'age-ratios',
    'parent-child-ages',
    'sibling-group-ages',
    'mixed-age-relationships',
  ],
  'work-and-rate-problems': [
    'individual-work-rate',
    'combined-work-rate',
    'worker-joins-later',
    'worker-leaves-early',
    'pipes-filling',
    'pipes-filling-draining',
    'efficiency-work-rates',
    'unknown-work-time',
    'mixed-work-rate',
  ],
  'distance-speed-and-time': [
    'distance-from-speed-time',
    'speed-from-distance-time',
    'time-from-distance-speed',
    'travel-unit-conversions',
    'average-speed',
    'same-direction-relative-speed',
    'opposite-direction-relative-speed',
    'meeting-and-overtaking',
    'mixed-distance-speed-time',
  ],
  'simple-interest': [
    'simple-interest',
    'principal-from-interest',
    'rate-from-interest',
    'time-from-interest',
    'maturity-value',
    'interest-time-conversions',
    'compare-interest-options',
    'loan-savings-applications',
    'mixed-simple-interest',
  ],
} as const satisfies Record<
  NumericalAbilityTopicSlug,
  readonly GeneratorSlug[]
>

function generators(
  slugs: readonly GeneratorSlug[],
): SubjectAssessmentGeneratorConfig[] {
  return slugs.map((slug, index) => ({
    slug,
    version: 1,
    rotationPosition: index + 1,
    selectionWeight: 1,
  }))
}

const topicTitles: Record<NumericalAbilityTopicSlug, string> = {
  percentages: 'Percentages',
  fractions: 'Fractions',
  decimals: 'Decimals',
  'ratio-and-proportion': 'Ratio and Proportion',
  average: 'Average',
  'number-problems': 'Number Problems',
  'age-problems': 'Age Problems',
  'work-and-rate-problems': 'Work and Rate Problems',
  'distance-speed-and-time': 'Distance, Speed, and Time',
  'simple-interest': 'Simple Interest',
}

const topicOrder = Object.keys(
  topicGeneratorOwnership,
) as NumericalAbilityTopicSlug[]

export const numericalAbilityBlueprintV1: SubjectAssessmentBlueprint = {
  subjectSlug: numericalAbilitySubjectSlug,
  version: 1,
  totalQuestions: 50,
  passingScorePercent: 70,
  topics: topicOrder.map((topicSlug, index) => ({
    topicSlug,
    topicTitle: topicTitles[topicSlug],
    position: index + 1,
    count: 5,
    difficulty: { easy: 2, medium: 2, hard: 1 },
    generators: generators(topicGeneratorOwnership[topicSlug]),
  })),
}

export interface BlueprintValidationResult {
  valid: boolean
  errors: string[]
}

export function validateSubjectAssessmentBlueprint(
  blueprint: SubjectAssessmentBlueprint,
): BlueprintValidationResult {
  const errors: string[] = []
  const seenTopics = new Set<string>()

  if (blueprint.subjectSlug !== numericalAbilitySubjectSlug) {
    errors.push('The blueprint must belong to Numerical Ability.')
  }

  if (blueprint.version !== 1) {
    errors.push('The Numerical Ability blueprint version must be 1.')
  }

  if (blueprint.topics.length !== 10) {
    errors.push('The blueprint must contain exactly ten topics.')
  }

  for (const topic of blueprint.topics) {
    if (seenTopics.has(topic.topicSlug)) {
      errors.push(`Topic ${topic.topicSlug} is duplicated.`)
    }
    seenTopics.add(topic.topicSlug)

    if (topic.count !== 5) {
      errors.push(`Topic ${topic.topicSlug} must contain five questions.`)
    }

    const difficultyTotal =
      topic.difficulty.easy +
      topic.difficulty.medium +
      topic.difficulty.hard

    if (
      difficultyTotal !== topic.count ||
      topic.difficulty.easy !== 2 ||
      topic.difficulty.medium !== 2 ||
      topic.difficulty.hard !== 1
    ) {
      errors.push(`Topic ${topic.topicSlug} must use a 2/2/1 difficulty mix.`)
    }

    if (topic.generators.length === 0) {
      errors.push(`Topic ${topic.topicSlug} needs at least one generator.`)
    }

    const allowed = new Set(topicGeneratorOwnership[topic.topicSlug])
    const seenGenerators = new Set<string>()

    for (const config of topic.generators) {
      const key = `${config.slug}:${config.version}`
      if (seenGenerators.has(key)) {
        errors.push(`Generator ${key} is duplicated for ${topic.topicSlug}.`)
      }
      seenGenerators.add(key)

      if (!allowed.has(config.slug)) {
        errors.push(
          `Generator ${config.slug} does not belong to ${topic.topicSlug}.`,
        )
      }

      const generator = getGenerator(config.slug, config.version)
      if (generator === null) {
        errors.push(`Generator ${key} is not registered.`)
        continue
      }

      for (const difficulty of ['easy', 'medium', 'hard'] as const) {
        if (
          topic.difficulty[difficulty] > 0 &&
          !generator.supportedDifficulties.includes(difficulty)
        ) {
          errors.push(`${key} does not support ${difficulty}.`)
        }
      }
    }
  }

  const total = blueprint.topics.reduce(
    (sum, topic) => sum + topic.count,
    0,
  )
  if (total !== blueprint.totalQuestions || total !== 50) {
    errors.push('Blueprint topic counts must total exactly 50.')
  }

  return { valid: errors.length === 0, errors }
}

export interface GeneratedSubjectAssessmentQuestion {
  topicSlug: NumericalAbilityTopicSlug
  topicTitle: string
  topicPosition: number
  position: number
  question: GeneratedQuestion
}

function buildDifficultyPlan(
  topic: SubjectAssessmentTopicConfig,
): GeneratorDifficulty[] {
  return [
    ...Array<GeneratorDifficulty>(topic.difficulty.easy).fill('easy'),
    ...Array<GeneratorDifficulty>(topic.difficulty.medium).fill('medium'),
    ...Array<GeneratorDifficulty>(topic.difficulty.hard).fill('hard'),
  ]
}

export function generateSubjectAssessmentQuestions(
  blueprint: SubjectAssessmentBlueprint,
  attemptSeed: string,
): GeneratedSubjectAssessmentQuestion[] {
  const validation = validateSubjectAssessmentBlueprint(blueprint)
  if (!validation.valid) {
    throw new Error(`Invalid assessment blueprint: ${validation.errors.join(' ')}`)
  }

  const signatures = new Set<string>()
  const prompts = new Set<string>()
  const generated: GeneratedSubjectAssessmentQuestion[] = []

  for (const topic of [...blueprint.topics].sort(
    (left, right) => left.position - right.position,
  )) {
    const random = createSeededRandom(
      `${attemptSeed}|${topic.topicSlug}|generator-rotation`,
    )
    const generatorPlan = random.shuffle(
      [...topic.generators].sort(
        (left, right) => left.rotationPosition - right.rotationPosition,
      ),
    )
    const difficultyPlan = buildDifficultyPlan(topic)

    for (let index = 0; index < difficultyPlan.length; index += 1) {
      const config = generatorPlan[index % generatorPlan.length]
      const difficulty = difficultyPlan[index]
      if (config === undefined || difficulty === undefined) {
        throw new Error(`Incomplete generator plan for ${topic.topicSlug}.`)
      }

      const question = generateValidatedQuestion({
        attemptSeed: `${attemptSeed}|${topic.topicSlug}`,
        generatorSlug: config.slug,
        generatorVersion: config.version,
        difficulty,
        position: index + 1,
        existingSignatures: signatures,
        existingPrompts: prompts,
        maxRetries: 40,
      })
      signatures.add(question.metadata.canonicalSignature)
      prompts.add(question.prompt.trim().toLowerCase())

      const choiceRandom = createSeededRandom(
        `${attemptSeed}|${topic.topicSlug}|${index + 1}|choices`,
      )
      generated.push({
        topicSlug: topic.topicSlug,
        topicTitle: topic.topicTitle,
        topicPosition: topic.position,
        position: 0,
        question: {
          ...question,
          choices: choiceRandom.shuffle(question.choices),
        },
      })
    }
  }

  return createSeededRandom(`${attemptSeed}|question-order`)
    .shuffle(generated)
    .map((item, index) => ({ ...item, position: index + 1 }))
}

export function isGeneratorAllowedForTopic(
  topicSlug: NumericalAbilityTopicSlug,
  generatorSlug: GeneratorSlug,
): boolean {
  return (topicGeneratorOwnership[topicSlug] as readonly GeneratorSlug[]).includes(
    generatorSlug,
  )
}
