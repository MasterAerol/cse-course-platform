import type {
  DistractorDerivation,
  DistractorMistakeType,
} from '../domain/distractor-models'

export type GeneratorDifficulty = 'easy' | 'medium' | 'hard'

export type GeneratorSlug =
  | 'finding-percentage'
  | 'finding-base'
  | 'finding-rate'

export type AnswerKind = 'number' | 'percent' | 'money' | 'count'

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
