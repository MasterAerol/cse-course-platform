import type { GrammarUsageSkill } from './grammar-usage.types'
export function grammarSkillLabel(skill: GrammarUsageSkill): string { return skill.replaceAll('_', ' ') }
export function grammarNumericValue(value: string): number { return [...value].reduce((total, character) => (total * 31 + (character.codePointAt(0) ?? 0)) % 1_000_003, 0) }
