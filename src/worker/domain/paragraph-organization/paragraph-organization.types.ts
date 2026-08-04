import type { GeneratorDifficulty } from '../../generators/generator.types'

export type ParagraphSkill = 'topic_sentence' | 'supporting_detail' | 'chronological' | 'cause_effect' | 'comparison_contrast' | 'general_specific' | 'transition_link' | 'opening_closing'
export type OrganizationType = 'topic_support' | 'stepwise' | 'chronological' | 'cause_effect' | 'comparison_contrast' | 'general_to_specific' | 'specific_to_general' | 'transition_link'
export type SentenceRole = 'topic' | 'support' | 'example' | 'cause' | 'effect' | 'comparison' | 'contrast' | 'closing'
export type ParagraphQuestionMode = 'topic' | 'order' | 'opening_closing'
export type ParagraphMistakeType = 'paragraph_detail_before_topic' | 'paragraph_pronoun_before_antecedent' | 'paragraph_example_before_general' | 'paragraph_effect_before_cause' | 'paragraph_conclusion_before_support' | 'paragraph_reversed_chronology' | 'paragraph_broken_comparison_pair' | 'paragraph_transition_separated' | 'paragraph_opening_closing_swapped' | 'paragraph_adjacent_sentences_reversed' | 'paragraph_surface_keyword_order' | 'paragraph_new_idea_as_closing'
export interface SentenceNode { id: 'A' | 'B' | 'C' | 'D'; text: string; role: SentenceRole; transition: string | null; refersTo: SentenceNode['id'] | null }
export interface OrderDependency { before: SentenceNode['id']; after: SentenceNode['id']; relation: 'support' | 'chronology' | 'cause_effect' | 'comparison' | 'hierarchy' | 'reference' | 'transition' | 'closing' }
export interface ParagraphDistractorSpec { text: string; mistakeType: ParagraphMistakeType }
export interface ParagraphOrganizationEntry {
  id: string
  skill: ParagraphSkill
  questionMode: ParagraphQuestionMode
  promptStem: string
  nodes: readonly SentenceNode[]
  correctOrder: readonly SentenceNode['id'][]
  topicSentenceId: SentenceNode['id']
  openingSentenceId: SentenceNode['id']
  closingSentenceId: SentenceNode['id']
  organizationType: OrganizationType
  dependencies: readonly OrderDependency[]
  transitionLinks: readonly (readonly [SentenceNode['id'], SentenceNode['id']])[]
  referenceLinks: readonly (readonly [SentenceNode['id'], SentenceNode['id']])[]
  correctChoice: string
  difficulty: GeneratorDifficulty
  distractors: readonly ParagraphDistractorSpec[]
  explanationRationale: string
}
