import type { ConditionalRule } from './logical-reasoning.types'

export function formatConditional(rule: ConditionalRule): string {
  return `If ${rule.antecedent}, then ${rule.consequent}.`
}

export function normalizeVisibleText(value: string): string {
  return value.trim().replace(/\s+/gu, ' ').toLocaleLowerCase()
}
