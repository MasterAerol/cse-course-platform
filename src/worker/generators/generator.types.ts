import type {
  DistractorDerivation,
  DistractorMistakeType,
} from '../domain/distractor-models'

export type GeneratorDifficulty = 'easy' | 'medium' | 'hard'

export type GeneratorSlug =
  | 'finding-percentage'
  | 'finding-base'
  | 'finding-rate'
  | 'equivalent-fractions'
  | 'simplifying-fractions'
  | 'comparing-fractions'
  | 'adding-fractions'
  | 'subtracting-fractions'
  | 'multiplying-fractions'
  | 'dividing-fractions'
  | 'comparing-decimals'
  | 'rounding-decimals'
  | 'adding-decimals'
  | 'subtracting-decimals'
  | 'multiplying-decimals'
  | 'dividing-decimals'
  | 'decimal-conversions'
  | 'simplifying-ratios'
  | 'equivalent-ratios'
  | 'comparing-ratios'
  | 'solving-proportions'
  | 'direct-proportion'
  | 'inverse-proportion'
  | 'ratio-sharing'
  | 'ratio-word-problems'
  | 'finding-average'
  | 'missing-value-average'
  | 'combined-average'
  | 'weighted-average'
  | 'average-after-adding'
  | 'average-after-removing'
  | 'average-age'
  | 'average-score-salary'
  | 'consecutive-integers'
  | 'consecutive-odd-even-integers'
  | 'sum-difference-numbers'
  | 'product-quotient-numbers'
  | 'two-digit-number-problems'
  | 'reversed-digit-problems'
  | 'remainder-number-problems'
  | 'fractional-part-number-problems'
  | 'mixed-number-relationships'
  | 'present-age-equations'
  | 'past-age-problems'
  | 'future-age-problems'
  | 'age-difference'
  | 'sum-of-ages'
  | 'age-ratios'
  | 'parent-child-ages'
  | 'sibling-group-ages'
  | 'mixed-age-relationships'
  | 'individual-work-rate'
  | 'combined-work-rate'
  | 'worker-joins-later'
  | 'worker-leaves-early'
  | 'pipes-filling'
  | 'pipes-filling-draining'
  | 'efficiency-work-rates'
  | 'unknown-work-time'
  | 'mixed-work-rate'
  | 'distance-from-speed-time'
  | 'speed-from-distance-time'
  | 'time-from-distance-speed'
  | 'travel-unit-conversions'
  | 'average-speed'
  | 'same-direction-relative-speed'
  | 'opposite-direction-relative-speed'
  | 'meeting-and-overtaking'
  | 'mixed-distance-speed-time'

export type AnswerKind =
  | 'number'
  | 'percent'
  | 'money'
  | 'count'
  | 'fraction'
  | 'ratio'

export interface GeneratedExplanation {
  title: string
  steps: string[]
  finalAnswer: string
}

export interface GeneratedChoice {
  text: string
  isCorrect: boolean
  distractorType: string | null
  mistakeType: DistractorMistakeType | null
  derivation: DistractorDerivation | null
  qualityScore: number
  numericValue: number
}

export interface GeneratedQuestionMetadata {
  answerKind: AnswerKind
  unit: string | null
  canonicalSignature: string
}

export interface GeneratedQuestion<
  TParameters extends Record<string, unknown> = Record<string, unknown>,
> {
  generatorSlug: GeneratorSlug
  generatorVersion: number
  difficulty: GeneratorDifficulty
  seed: string
  prompt: string
  parameters: TParameters
  choices: GeneratedChoice[]
  explanation: GeneratedExplanation
  metadata: GeneratedQuestionMetadata
}

export interface GenerateQuestionInput {
  seed: string
  difficulty: GeneratorDifficulty
}

export interface GeneratorValidationResult {
  valid: boolean
  reason: string | null
}

export interface QuestionGenerator {
  slug: GeneratorSlug
  version: number
  title: string
  supportedDifficulties: readonly GeneratorDifficulty[]
  generate: (input: GenerateQuestionInput) => GeneratedQuestion
  validate: (
    question: GeneratedQuestion,
  ) => GeneratorValidationResult
}

export interface PersistedGeneratedQuestion {
  publicId: string
  sourcePosition: number
  question: GeneratedQuestion
}
