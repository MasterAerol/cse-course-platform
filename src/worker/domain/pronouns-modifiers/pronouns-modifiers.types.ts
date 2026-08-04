import type { GeneratorDifficulty } from '../../generators/generator.types'

export type PronounModifierSkill = 'reference_agreement' | 'case' | 'possessive_reflexive' | 'relative' | 'adjective_adverb' | 'comparative' | 'misplaced' | 'dangling'
export type PronounNumber = 'singular' | 'plural' | 'not_applicable'
export type PronounPerson = 'first' | 'second' | 'third' | 'not_applicable'
export type PronounType = 'personal' | 'possessive' | 'reflexive' | 'relative' | 'not_applicable'
export type PronounCase = 'subject' | 'object' | 'possessive' | 'reflexive' | 'not_applicable'
export type ModifierType = 'adjective' | 'adverb' | 'comparative' | 'misplaced' | 'dangling' | 'not_applicable'
export type PronounModifierMistakeType = 'pronoun_ambiguous_reference' | 'pronoun_number_mismatch' | 'pronoun_person_shift' | 'pronoun_case_error' | 'pronoun_possessive_contraction' | 'pronoun_unnecessary_reflexive' | 'pronoun_wrong_relative' | 'pronoun_adjective_adverb' | 'pronoun_double_comparison' | 'pronoun_fewer_less' | 'pronoun_wrong_modifier_target' | 'pronoun_dangling_modifier'
export interface PronounModifierDistractorSpec { text: string; mistakeType: PronounModifierMistakeType }
export interface PronounModifierEntry {
  id: string
  skill: PronounModifierSkill
  sentenceTemplate: string
  antecedent: string | null
  antecedentNumber: PronounNumber
  antecedentPerson: PronounPerson
  antecedentKind: 'person' | 'thing' | 'not_applicable'
  pronounType: PronounType
  pronounCase: PronounCase
  correctChoice: string
  modifierType: ModifierType
  modifiedTarget: string | null
  modifierPlacement: 'clear' | 'misplaced' | 'dangling' | 'not_applicable'
  relativeRole: 'subject' | 'object' | 'possessive' | 'not_applicable'
  nonrestrictive: boolean | null
  impliedActor: string | null
  mainClauseSubject: string | null
  ruleFamily: PronounModifierSkill
  ruleDetail: string
  completedSentence: string
  difficulty: GeneratorDifficulty
  distractors: readonly PronounModifierDistractorSpec[]
  explanationRationale: string
}
