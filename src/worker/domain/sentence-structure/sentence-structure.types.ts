import type { GeneratorDifficulty } from '../../generators/generator.types'

export type SentenceStructureSkill = 'parts_clauses' | 'sentence_type' | 'fragment' | 'run_on' | 'coordination' | 'parallel' | 'unclear_logical' | 'segmented_error'
export type SentenceType = 'simple' | 'compound' | 'complex' | 'compound_complex' | 'fragment' | 'run_on'
export type StructuralError = 'none' | 'fragment' | 'fused_sentence' | 'comma_splice' | 'faulty_coordination' | 'faulty_subordination' | 'nonparallel' | 'unclear_reference' | 'illogical_comparison' | 'misplaced_modifier' | 'agreement' | 'tense' | 'pronoun' | 'article' | 'preposition' | 'modifier' | 'clause_connector'
export type SentenceStructureMistakeType = 'structure_object_as_subject' | 'structure_partial_subject' | 'structure_modifier_as_predicate' | 'structure_phrase_as_clause' | 'structure_dependent_as_independent' | 'structure_counted_verbs_as_clauses' | 'structure_compound_predicate_as_compound' | 'structure_ignored_dependent_clause' | 'structure_short_sentence_as_fragment' | 'structure_dependent_as_sentence' | 'structure_punctuation_only_fragment_fix' | 'structure_comma_only_run_on_fix' | 'structure_missing_coordination_comma' | 'structure_semicolon_before_dependent' | 'structure_wrong_connector' | 'structure_double_conjunction' | 'structure_reversed_cause_result' | 'structure_mixed_parallel_forms' | 'structure_mismatched_correlative' | 'structure_ambiguous_reference' | 'structure_unlike_comparison' | 'structure_wrong_modifier_position' | 'structure_wrong_error_segment' | 'structure_no_error_when_error_exists'
export interface ClauseMetadata { text: string; kind: 'independent' | 'dependent'; subject: string; verb: string }
export interface SegmentMetadata { label: 'A' | 'B' | 'C' | 'D'; text: string; hasError: boolean }
export interface StructuralDistractorSpec { text: string; mistakeType: SentenceStructureMistakeType }
export interface SentenceStructureEntry {
  id: string
  skill: SentenceStructureSkill
  promptStem: string
  sentence: string
  subject: string | null
  predicate: string | null
  phrases: readonly string[]
  clauses: readonly ClauseMetadata[]
  sentenceType: SentenceType
  errorType: StructuralError
  correctedVersion: string
  errorLocation: string | null
  connector: string | null
  parallelForms: readonly string[]
  comparisonItems: readonly [string, string] | null
  segments: readonly SegmentMetadata[]
  noError: boolean
  correctChoice: string
  difficulty: GeneratorDifficulty
  distractors: readonly StructuralDistractorSpec[]
  ruleDetail: string
  explanationRationale: string
}
