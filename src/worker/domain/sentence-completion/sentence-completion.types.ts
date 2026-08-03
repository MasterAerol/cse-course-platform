import type { GeneratorDifficulty } from '../../generators/generator.types'
import type { PartOfSpeech } from '../vocabulary/vocabulary.types'
import type { Formality } from '../synonyms-antonyms/synonyms-antonyms.types'

export type SentenceCompletionSkill = 'grammar_fit' | 'meaning_fit' | 'transition' | 'cause_effect' | 'contrast_comparison' | 'parallel' | 'tone_formality' | 'double_blank'
export type SentenceRelationship = 'continuation' | 'cause' | 'result' | 'contrast' | 'comparison' | 'example' | 'condition' | 'sequence' | 'concession' | 'parallel'
export type SentenceTone = 'positive' | 'neutral' | 'courteous' | 'official'
export type GrammaticalForm = 'noun' | 'verb' | 'adjective' | 'adverb' | 'gerund' | 'infinitive' | 'comparative' | 'word_pair' | 'transition'
export type SentenceCompletionMistakeType = 'sentence_wrong_part_of_speech' | 'sentence_wrong_tense' | 'sentence_wrong_number' | 'sentence_semantic_mismatch' | 'sentence_wrong_transition' | 'sentence_intensity_mismatch' | 'sentence_tone_formality_mismatch' | 'sentence_nonparallel_form' | 'sentence_first_blank_only' | 'sentence_second_blank_only'

export interface SentenceCompletionDistractorSpec { text: string; mistakeType: SentenceCompletionMistakeType }
export interface SentenceCompletionEntry {
  id: string
  skill: SentenceCompletionSkill
  sentenceTemplate: string
  blankCount: 1 | 2
  correctCompletion: string
  completedSentence: string
  acceptableGrammaticalForm: GrammaticalForm
  partOfSpeech: PartOfSpeech | null
  tense: 'past' | 'present' | 'future' | 'not_applicable'
  number: 'singular' | 'plural' | 'not_applicable'
  relationship: SentenceRelationship
  transitionType: 'addition' | 'contrast' | 'cause' | 'result' | 'example' | 'sequence' | null
  tone: SentenceTone
  formality: Formality
  targetVocabularySense: string
  difficulty: GeneratorDifficulty
  distractors: readonly SentenceCompletionDistractorSpec[]
  explanationRationale: string
}
