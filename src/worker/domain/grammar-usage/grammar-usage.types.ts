import type { GeneratorDifficulty } from '../../generators/generator.types'
import type { PartOfSpeech } from '../vocabulary/vocabulary.types'

export type GrammarUsageSkill = 'part_of_speech' | 'verb_tense' | 'article_determiner' | 'preposition' | 'conjunction' | 'comparison' | 'misused_expression' | 'correct_sentence'
export type GrammarTense = 'present' | 'past' | 'present_perfect' | 'past_perfect' | 'future' | 'not_applicable'
export type Countability = 'count_singular' | 'count_plural' | 'mass' | 'not_applicable'
export type GrammarUsageMistakeType = 'grammar_wrong_part_of_speech' | 'grammar_wrong_tense' | 'grammar_tense_shift' | 'grammar_wrong_article' | 'grammar_wrong_determiner' | 'grammar_wrong_preposition' | 'grammar_wrong_conjunction' | 'grammar_double_conjunction' | 'grammar_comparison_error' | 'grammar_countability_error' | 'grammar_confused_word' | 'grammar_semantic_mismatch'
export interface GrammarDistractorSpec { text: string; mistakeType: GrammarUsageMistakeType }
export interface GrammarUsageEntry {
  id: string
  skill: GrammarUsageSkill
  sentenceTemplate: string
  targetRule: string
  correctChoice: string
  completedSentence: string
  partOfSpeech: PartOfSpeech | null
  tense: GrammarTense
  timeMarker: string | null
  countability: Countability
  articleRule: 'a' | 'an' | 'the' | 'no_article' | null
  determinerRule: string | null
  prepositionPattern: string | null
  conjunctionRelationship: 'addition' | 'contrast' | 'choice' | 'cause' | 'result' | 'concession' | null
  correlativePair: 'neither_nor' | 'either_or' | 'not_only_but_also' | null
  comparisonType: 'comparative' | 'superlative' | 'equality' | 'fewer_count' | 'less_mass' | null
  usageKey: string | null
  usageNote: string
  difficulty: GeneratorDifficulty
  distractors: readonly GrammarDistractorSpec[]
  explanationRationale: string
}
