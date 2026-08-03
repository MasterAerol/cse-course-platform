import type { GeneratorDifficulty } from '../../generators/generator.types'

export type AgreementSkill = 'basic' | 'compound' | 'proximity' | 'indefinite' | 'collective_quantity' | 'intervening' | 'inverted' | 'special'
export type SubjectNumber = 'singular' | 'plural'
export type SubjectPerson = 'first' | 'second' | 'third'
export type AgreementMistakeType = 'agreement_nearest_noun' | 'agreement_singular_for_plural' | 'agreement_plural_for_singular' | 'agreement_wrong_proximity' | 'agreement_indefinite_as_plural' | 'agreement_and_as_or' | 'agreement_along_with_as_and' | 'agreement_collective_as_plural' | 'agreement_quantity_as_plural' | 'agreement_always_there_is' | 'agreement_final_s'
export interface AgreementDistractorSpec { text: string; mistakeType: AgreementMistakeType }
export interface AgreementEntry {
  id: string
  skill: AgreementSkill
  sentenceTemplate: string
  grammaticalSubject: string
  subjectNumber: SubjectNumber
  subjectPerson: SubjectPerson
  verbLemma: string
  correctForm: string
  tense: 'simple_present'
  ruleFamily: AgreementSkill
  ruleDetail: string
  nearerSubjectNumber: SubjectNumber | null
  indefiniteClass: 'singular' | 'plural' | 'context' | null
  controllingNoun: string | null
  collectiveAsUnit: boolean | null
  invertedSubject: string | null
  specialCase: string | null
  completedSentence: string
  difficulty: GeneratorDifficulty
  distractors: readonly AgreementDistractorSpec[]
  explanationRationale: string
}
