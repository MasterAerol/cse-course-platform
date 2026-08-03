import type { AgreementSkill } from './subject-verb-agreement.types'

const labels: Readonly<Record<AgreementSkill, string>> = { basic: 'basic subject–verb agreement', compound: 'compound-subject agreement', proximity: 'either/or and neither/nor proximity', indefinite: 'indefinite-pronoun agreement', collective_quantity: 'collective-noun and quantity agreement', intervening: 'intervening-phrase agreement', inverted: 'inverted-sentence agreement', special: 'special agreement cases' }
export function agreementSkillLabel(skill: AgreementSkill): string { return labels[skill] }
export function agreementNumericValue(value: string): number { let total = 0; for (const character of value) total = (total * 31 + character.codePointAt(0)!) % 1_000_003; return total }
