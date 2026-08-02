export type PropositionType =
  | 'statement'
  | 'question'
  | 'command'
  | 'exclamation'
  | 'simple statement'
  | 'compound statement'

export interface ConditionalRule {
  antecedent: string
  consequent: string
}

export interface DeductionRule {
  from: string
  to: string
}

export type QuantifiedStatement =
  | { quantifier: 'all'; subject: string; predicate: string }
  | { quantifier: 'some'; subject: string; predicate: string }

import type { DistractorMistakeType } from '../distractor-models'

export interface LogicalChoiceCandidate {
  text: string
  mistakeType: DistractorMistakeType
}
