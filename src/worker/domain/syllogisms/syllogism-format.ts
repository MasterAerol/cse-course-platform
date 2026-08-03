import type { CategoricalStatement, ConclusionClassification } from './syllogism.types'

export function formatStatement(statement: CategoricalStatement): string {
  const subject = statement.subject.toLowerCase()
  const predicate = statement.predicate.toLowerCase()
  if (statement.quantifier === 'some-not') return `Some ${subject} are not ${predicate}.`
  const quantifier = statement.quantifier[0]?.toUpperCase() + statement.quantifier.slice(1)
  return `${quantifier} ${subject} are ${predicate}.`
}

export function formatPremises(premises: readonly CategoricalStatement[]): string {
  return premises.map((premise, index) => `${index + 1}. ${formatStatement(premise)}`).join('\n')
}

export function classificationText(classification: ConclusionClassification): string {
  if (classification === 'definite') return 'The conclusion definitely follows.'
  if (classification === 'possible') return 'The conclusion may be true, but it does not definitely follow.'
  return 'The conclusion cannot be true.'
}

export function normalizeSyllogismChoice(value: string): string {
  return value.trim().toLowerCase().replaceAll(/\s+/gu, ' ').replace(/[.]$/u, '')
}

export function syllogismNumericValue(value: string): number {
  return [...normalizeSyllogismChoice(value)].reduce((total, character) => (total * 37 + character.charCodeAt(0)) % 2_147_483_647, 0)
}
