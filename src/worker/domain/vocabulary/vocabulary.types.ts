import type { GeneratorDifficulty } from '../../generators/generator.types'

export type PartOfSpeech = 'noun' | 'verb' | 'adjective' | 'adverb'
export type Connotation = 'positive' | 'neutral' | 'negative'

export interface WordFamilyForm { word: string; partOfSpeech: PartOfSpeech }
export interface WordSense { meaning: string; example: string; partOfSpeech: PartOfSpeech }
export interface VocabularyEntry {
  word: string
  normalized: string
  definition: string
  partOfSpeech: PartOfSpeech
  base: string
  prefix: string | null
  suffix: string | null
  family: readonly WordFamilyForm[]
  denotation: string
  connotation: Connotation
  senses: readonly WordSense[]
  confusedWith: string | null
  example: string
  difficulty: GeneratorDifficulty
  tags: readonly string[]
}

export interface VocabularyScenario {
  prompt: string
  correct: string
  distractors: readonly { text: string; mistake: VocabularyMistakeType }[]
  explanation: readonly string[]
  signature: string
  targetWord: string
}

export type VocabularyMistakeType =
  | 'vocabulary_wrong_affix'
  | 'vocabulary_wrong_base'
  | 'vocabulary_wrong_part_of_speech'
  | 'vocabulary_related_not_equivalent'
  | 'vocabulary_wrong_connotation'
  | 'vocabulary_alternate_sense'
  | 'vocabulary_confused_partner'
  | 'vocabulary_similar_spelling'
