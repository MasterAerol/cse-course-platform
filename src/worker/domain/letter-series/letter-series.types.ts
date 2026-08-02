import type { DistractorMistakeType } from '../distractor-models'

export type LetterSeriesRuleFamily =
  | 'constant'
  | 'alternating'
  | 'increasing-gap'
  | 'interleaved'
  | 'grouped'
  | 'letter-number'

export interface LetterMovementOptions {
  wraparound?: boolean
}

export interface LetterSeriesDistractor {
  text: string
  mistakeType: DistractorMistakeType
}

export interface LetterNumberTerm {
  letter: string
  number: number
}

export interface LetterCompetingPattern {
  family: LetterSeriesRuleFamily
  nextTerm: string
}
