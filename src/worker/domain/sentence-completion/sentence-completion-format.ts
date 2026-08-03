import type { SentenceCompletionSkill } from './sentence-completion.types'

export function sentenceSkillLabel(skill: SentenceCompletionSkill): string { return skill.replaceAll('_', ' ') }
export function sentenceCompletionNumericValue(value: string): number { return [...value].reduce((total, character) => (total * 31 + (character.codePointAt(0) ?? 0)) % 1_000_003, 0) }
export function displaySentenceCompletion(value: string): string { return value.replaceAll(/\s*\|\s*/gu, ' / ') }
