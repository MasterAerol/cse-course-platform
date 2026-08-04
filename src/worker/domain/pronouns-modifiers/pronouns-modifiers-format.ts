import type { PronounModifierSkill } from './pronouns-modifiers.types'
const labels: Readonly<Record<PronounModifierSkill, string>> = { reference_agreement: 'pronoun reference and agreement', case: 'subject and object pronoun case', possessive_reflexive: 'possessive and reflexive pronouns', relative: 'relative-pronoun usage', adjective_adverb: 'adjective and adverb modifiers', comparative: 'comparative modifiers', misplaced: 'misplaced modifiers', dangling: 'dangling modifiers' }
export function pronounModifierSkillLabel(skill: PronounModifierSkill): string { return labels[skill] }
export function pronounModifierNumericValue(value: string): number { let total = 0; for (const character of value) total = (total * 31 + character.codePointAt(0)!) % 1_000_003; return total }
