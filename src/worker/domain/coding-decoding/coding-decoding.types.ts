import type { DistractorMistakeType } from '../distractor-models'

export type CodingRuleFamily = 'letter-shift' | 'reverse-alphabet' | 'letter-positions' | 'word-substitution' | 'symbol-replacement' | 'mixed-letter-number' | 'inference' | 'multi-step'

export interface CodingDistractor { text: string; mistakeType: DistractorMistakeType }
export interface CodingTransformation { kind: 'shift' | 'reverse-alphabet' | 'reverse-order'; amount?: number }
export interface CodingScenario {
  prompt: string
  correct: string
  family: CodingRuleFamily
  steps: string[]
  signature: string
  parameters: Record<string, unknown>
  distractors: CodingDistractor[]
}
