import type { DistractorMistakeType } from '../distractor-models'

export type SyllogismQuantifier = 'all' | 'no' | 'some' | 'some-not'
export type ConclusionClassification = 'definite' | 'possible' | 'impossible'

export interface CategoricalStatement {
  quantifier: SyllogismQuantifier
  subject: string
  predicate: string
}

export interface RegionRequirement {
  statement: CategoricalStatement
  candidateRegions: readonly number[]
}

export interface SyllogismRegionModel {
  categories: readonly string[]
  allowedRegions: readonly number[]
  existentialRequirements: readonly RegionRequirement[]
  satisfiable: boolean
}

export interface SyllogismDistractor {
  text: string
  mistakeType: DistractorMistakeType
}

export interface SyllogismScenario {
  prompt: string
  premises: readonly CategoricalStatement[]
  correct: string
  choices: readonly SyllogismDistractor[]
  steps: readonly string[]
  signature: string
  validation:
    | { kind: 'entailed-choice'; conclusions: readonly CategoricalStatement[] }
    | { kind: 'classification'; conclusion: CategoricalStatement; classification: ConclusionClassification }
    | { kind: 'conclusion-pair'; conclusions: readonly [CategoricalStatement, CategoricalStatement]; follows: readonly [boolean, boolean] }
    | { kind: 'either-or'; pair: readonly [CategoricalStatement, CategoricalStatement] }
}
