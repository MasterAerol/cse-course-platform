import type { GeneratorDifficulty } from '../../generators/generator.types'

export type ReadingSkill = 'main_idea' | 'supporting_detail' | 'sequence_organization' | 'cause_effect' | 'vocabulary_context' | 'inference' | 'purpose_tone' | 'fact_opinion_conclusion'
export type AuthorPurpose = 'inform' | 'explain' | 'describe' | 'instruct' | 'compare' | 'warn'
export type AuthorTone = 'informative' | 'objective' | 'encouraging' | 'cautious' | 'positive' | 'neutral'
export type ReadingMistakeType = 'reading_true_detail_not_main' | 'reading_overly_broad_summary' | 'reading_overly_narrow_detail' | 'reading_altered_detail' | 'reading_outside_assumption' | 'reading_reversed_cause_effect' | 'reading_wrong_sequence' | 'reading_unsupported_word_sense' | 'reading_wrong_part_of_speech' | 'reading_overgeneralized_inference' | 'reading_direct_detail_not_inference' | 'reading_topic_instead_of_purpose' | 'reading_reader_reaction_as_tone' | 'reading_opinion_as_fact' | 'reading_unsupported_conclusion'
export interface EvidenceSpan { text: string; supports: string }
export interface VocabularyTarget { word: string; sense: string; partOfSpeech: 'noun' | 'verb' | 'adjective' | 'adverb' }
export interface ReadingPassage {
  id: string
  title: string
  text: string
  topic: string
  mainIdea: string
  supportingDetails: readonly string[]
  sequence: readonly string[]
  organization: 'description' | 'chronological' | 'cause_effect' | 'comparison' | 'general_specific' | 'problem_solution'
  causeEffects: readonly (readonly [string, string])[]
  vocabularyTargets: readonly VocabularyTarget[]
  validInferences: readonly string[]
  invalidOvergeneralizations: readonly string[]
  purpose: AuthorPurpose
  tone: AuthorTone
  facts: readonly string[]
  opinions: readonly string[]
  conclusions: readonly string[]
  difficulty: GeneratorDifficulty
}
export interface ReadingDistractorSpec { text: string; mistakeType: ReadingMistakeType }
export interface ReadingComprehensionEntry {
  id: string
  passageId: string
  skill: ReadingSkill
  question: string
  correctChoice: string
  distractors: readonly ReadingDistractorSpec[]
  evidence: readonly EvidenceSpan[]
  explanationRationale: string
}
