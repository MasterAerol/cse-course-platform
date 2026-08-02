import type { CuratedAnalogyPair, CuratedCategorySet, NumericRule } from './analogy-classification.types'

export const synonymPairs = [
  { left: 'rapid', right: 'fast', relationship: 'synonym', role: 'adjective', difficulty: 'easy', category: 'speed' },
  { left: 'silent', right: 'quiet', relationship: 'synonym', role: 'adjective', difficulty: 'easy', category: 'sound' },
  { left: 'begin', right: 'start', relationship: 'synonym', role: 'verb', difficulty: 'easy', category: 'sequence' },
  { left: 'end', right: 'finish', relationship: 'synonym', role: 'verb', difficulty: 'medium', category: 'sequence' },
  { left: 'assist', right: 'help', relationship: 'synonym', role: 'verb', difficulty: 'medium', category: 'action' },
  { left: 'select', right: 'choose', relationship: 'synonym', role: 'verb', difficulty: 'medium', category: 'action' },
] as const satisfies readonly CuratedAnalogyPair[]

export const antonymPairs = [
  { left: 'ancient', right: 'modern', relationship: 'antonym', role: 'adjective', difficulty: 'easy', category: 'age' },
  { left: 'scarce', right: 'abundant', relationship: 'antonym', role: 'adjective', difficulty: 'medium', category: 'quantity' },
  { left: 'accept', right: 'reject', relationship: 'antonym', role: 'verb', difficulty: 'easy', category: 'decision' },
  { left: 'expand', right: 'contract', relationship: 'antonym', role: 'verb', difficulty: 'medium', category: 'change' },
  { left: 'include', right: 'exclude', relationship: 'antonym', role: 'verb', difficulty: 'medium', category: 'membership' },
  { left: 'increase', right: 'decrease', relationship: 'antonym', role: 'verb', difficulty: 'easy', category: 'quantity' },
] as const satisfies readonly CuratedAnalogyPair[]

export const partWholePairs = [
  ['wheel', 'car'], ['page', 'book'], ['finger', 'hand'], ['toe', 'foot'], ['petal', 'flower'], ['room', 'house'], ['key', 'keyboard'], ['drawer', 'cabinet'],
] as const

export const functionPairs = [
  ['knife', 'cut'], ['pen', 'write'], ['key', 'unlock'], ['broom', 'sweep'], ['thermometer', 'measure temperature'], ['teacher', 'teach'], ['driver', 'drive'], ['calculator', 'calculate'],
] as const

export const causeEffectPairs = [
  ['rain', 'wet ground'], ['fire', 'smoke'], ['study', 'learning'], ['alarm', 'attention'], ['heat', 'expansion'], ['friction', 'heat'], ['practice', 'improvement'], ['wind', 'moving leaves'],
] as const

export const intensityPairs = [
  ['warm', 'hot'], ['tired', 'exhausted'], ['drizzle', 'downpour'], ['dislike', 'hate'], ['cool', 'cold'], ['concerned', 'alarmed'], ['pleased', 'delighted'], ['small', 'tiny'],
] as const

export const categorySets = [
  { category: 'writing tools', members: ['pen', 'pencil', 'marker'], outlier: 'notebook', difficulty: 'easy' },
  { category: 'road vehicles', members: ['bus', 'car', 'bicycle'], outlier: 'spoon', difficulty: 'easy' },
  { category: 'body parts', members: ['hand', 'foot', 'elbow'], outlier: 'table', difficulty: 'easy' },
  { category: 'tools', members: ['hammer', 'saw', 'wrench'], outlier: 'folder', difficulty: 'medium' },
  { category: 'units of length', members: ['meter', 'centimeter', 'kilometer'], outlier: 'liter', difficulty: 'medium' },
  { category: 'geometric shapes with straight sides', members: ['triangle', 'square', 'rectangle'], outlier: 'circle', difficulty: 'medium' },
  { category: 'even numbers', members: ['2', '4', '6'], outlier: '9', difficulty: 'easy' },
  { category: 'office storage items', members: ['folder', 'cabinet', 'drawer'], outlier: 'bicycle', difficulty: 'hard' },
] as const satisfies readonly CuratedCategorySet[]

export function applyNumericRule(input: number, rule: NumericRule): number {
  switch (rule.operation) {
    case 'add': return input + rule.constant
    case 'subtract': return input - rule.constant
    case 'multiply': return input * rule.constant
    case 'divide': {
      if (rule.constant === 0 || input % rule.constant !== 0) throw new Error('Division analogy must have a nonzero divisor and an integer result.')
      return input / rule.constant
    }
    case 'square': return input * input
  }
}

export function relationshipMatches(first: CuratedAnalogyPair, second: CuratedAnalogyPair): boolean {
  return first.relationship === second.relationship && first.role === second.role
}

export function reversePair(pair: readonly [string, string]): readonly [string, string] {
  return [pair[1], pair[0]]
}

export function findOddOneOut(items: readonly string[], membership: ReadonlySet<string>): string | null {
  const outliers = items.filter((item) => !membership.has(item))
  return outliers.length === 1 ? outliers[0] ?? null : null
}
