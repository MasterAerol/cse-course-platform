import { classifyConclusion, isEntailed, isSatisfiable, isValidEitherOrPair } from './syllogism-model'
import { normalizeSyllogismChoice } from './syllogism-format'
import type { CategoricalStatement } from './syllogism.types'

export function hasUniqueSyllogismChoices(choices: readonly string[]): boolean {
  return choices.length === 4 && new Set(choices.map(normalizeSyllogismChoice)).size === 4
}

export function hasExactlyOneSyllogismAnswer(choices: readonly string[], correct: string): boolean {
  return choices.map(normalizeSyllogismChoice).filter((choice) => choice === normalizeSyllogismChoice(correct)).length === 1
}

export function uniqueEntailedConclusion(premises: readonly CategoricalStatement[], conclusions: readonly CategoricalStatement[]): number | null {
  if (!isSatisfiable(premises)) return null
  const entailed = conclusions.map((conclusion, index) => isEntailed(premises, conclusion) ? index : -1).filter((index) => index >= 0)
  return entailed.length === 1 ? entailed[0] ?? null : null
}

export function validateClassification(premises: readonly CategoricalStatement[], conclusion: CategoricalStatement, expected: string): boolean {
  return isSatisfiable(premises) && classifyConclusion(premises, conclusion) === expected
}

export function validateEitherOr(premises: readonly CategoricalStatement[], pair: readonly [CategoricalStatement, CategoricalStatement]): boolean {
  return isValidEitherOrPair(premises, pair[0], pair[1])
}
