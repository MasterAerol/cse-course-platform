import { normalizeAnalogyText } from './analogy-classification-format'
import type { CuratedAnalogyPair, NumericRule } from './analogy-classification.types'
import { applyNumericRule, relationshipMatches } from './analogy-classification-rules'

export function hasUniqueVisibleAnalogyChoices(choices: readonly string[]): boolean {
  return new Set(choices.map(normalizeAnalogyText)).size === choices.length
}

export function hasOneAnalogyAnswer(choices: readonly { isCorrect: boolean }[]): boolean {
  return choices.filter((choice) => choice.isCorrect).length === 1
}

export function validateCuratedPairMatch(first: CuratedAnalogyPair, second: CuratedAnalogyPair): boolean {
  return relationshipMatches(first, second) && first.left !== first.right && second.left !== second.right
}

export function validateNumericAnalogy(inputA: number, outputA: number, inputB: number, outputB: number, rule: NumericRule): boolean {
  return [inputA, outputA, inputB, outputB, rule.constant].every(Number.isSafeInteger) && inputA > 0 && inputB > 0 && outputA === applyNumericRule(inputA, rule) && outputB === applyNumericRule(inputB, rule) && outputA <= 400 && outputB <= 400
}

export function validateUniqueOutlier(items: readonly string[], sharedMembers: ReadonlySet<string>): boolean {
  return items.length === 4 && new Set(items.map(normalizeAnalogyText)).size === 4 && items.filter((item) => !sharedMembers.has(item)).length === 1
}
