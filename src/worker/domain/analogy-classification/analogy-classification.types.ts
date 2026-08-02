import type { DistractorMistakeType } from '../distractor-models'
import type { GeneratorDifficulty } from '../../generators/generator.types'

export type GrammaticalRole = 'noun' | 'verb' | 'adjective'
export type AnalogyRelationship = 'synonym' | 'antonym' | 'part-to-whole' | 'whole-to-part' | 'tool-to-function' | 'worker-to-activity' | 'cause-to-effect' | 'weak-to-strong'
export type NumericTransformation = 'add' | 'subtract' | 'multiply' | 'divide' | 'square'

export interface CuratedAnalogyPair {
  left: string
  right: string
  relationship: AnalogyRelationship
  role: GrammaticalRole
  difficulty: GeneratorDifficulty
  category: string
}

export interface CuratedCategorySet {
  category: string
  members: readonly [string, string, string]
  outlier: string
  difficulty: GeneratorDifficulty
}

export interface AnalogyDistractor {
  text: string
  mistakeType: DistractorMistakeType
  numericValue?: number
}

export interface NumericRule {
  operation: NumericTransformation
  constant: number
}
