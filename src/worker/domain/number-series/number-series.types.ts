import type { DistractorMistakeType } from '../distractor-models'

export type SeriesOperation =
  | { kind: 'add'; value: number }
  | { kind: 'multiply'; value: number }
  | { kind: 'divide'; value: number }

export type SeriesRuleFamily =
  | 'arithmetic'
  | 'geometric'
  | 'operation-cycle'
  | 'increasing-difference'
  | 'power'
  | 'recursive'
  | 'interleaved'

export interface SeriesDistractor {
  value: number
  mistakeType: DistractorMistakeType
}

export interface SeriesBounds {
  minimum: number
  maximum: number
}

export interface CompetingPattern {
  family: SeriesRuleFamily
  nextValue: number
}
