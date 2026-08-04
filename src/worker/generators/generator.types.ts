import type {
  DistractorDerivation,
  DistractorMistakeType,
} from '../domain/distractor-models'

export type GeneratorDifficulty = 'easy' | 'medium' | 'hard'

export type GeneratorSlug =
  | 'finding-percentage'
  | 'finding-base'
  | 'finding-rate'
  | 'equivalent-fractions'
  | 'simplifying-fractions'
  | 'comparing-fractions'
  | 'adding-fractions'
  | 'subtracting-fractions'
  | 'multiplying-fractions'
  | 'dividing-fractions'
  | 'comparing-decimals'
  | 'rounding-decimals'
  | 'adding-decimals'
  | 'subtracting-decimals'
  | 'multiplying-decimals'
  | 'dividing-decimals'
  | 'decimal-conversions'
  | 'simplifying-ratios'
  | 'equivalent-ratios'
  | 'comparing-ratios'
  | 'solving-proportions'
  | 'direct-proportion'
  | 'inverse-proportion'
  | 'ratio-sharing'
  | 'ratio-word-problems'
  | 'finding-average'
  | 'missing-value-average'
  | 'combined-average'
  | 'weighted-average'
  | 'average-after-adding'
  | 'average-after-removing'
  | 'average-age'
  | 'average-score-salary'
  | 'consecutive-integers'
  | 'consecutive-odd-even-integers'
  | 'sum-difference-numbers'
  | 'product-quotient-numbers'
  | 'two-digit-number-problems'
  | 'reversed-digit-problems'
  | 'remainder-number-problems'
  | 'fractional-part-number-problems'
  | 'mixed-number-relationships'
  | 'present-age-equations'
  | 'past-age-problems'
  | 'future-age-problems'
  | 'age-difference'
  | 'sum-of-ages'
  | 'age-ratios'
  | 'parent-child-ages'
  | 'sibling-group-ages'
  | 'mixed-age-relationships'
  | 'individual-work-rate'
  | 'combined-work-rate'
  | 'worker-joins-later'
  | 'worker-leaves-early'
  | 'pipes-filling'
  | 'pipes-filling-draining'
  | 'efficiency-work-rates'
  | 'unknown-work-time'
  | 'mixed-work-rate'
  | 'distance-from-speed-time'
  | 'speed-from-distance-time'
  | 'time-from-distance-speed'
  | 'travel-unit-conversions'
  | 'average-speed'
  | 'same-direction-relative-speed'
  | 'opposite-direction-relative-speed'
  | 'meeting-and-overtaking'
  | 'mixed-distance-speed-time'
  | 'simple-interest'
  | 'principal-from-interest'
  | 'rate-from-interest'
  | 'time-from-interest'
  | 'maturity-value'
  | 'interest-time-conversions'
  | 'compare-interest-options'
  | 'loan-savings-applications'
  | 'mixed-simple-interest'
  | 'statement-classification'
  | 'fact-opinion-conclusion'
  | 'valid-conclusion'
  | 'assumption-identification'
  | 'conditional-reasoning'
  | 'necessary-sufficient-condition'
  | 'negation-contradiction'
  | 'basic-deduction'
  | 'logical-equivalence'
  | 'mixed-logical-reasoning'
  | 'synonym-antonym-analogy'
  | 'part-whole-analogy'
  | 'function-purpose-analogy'
  | 'cause-effect-analogy'
  | 'degree-intensity-analogy'
  | 'symbol-number-analogy'
  | 'odd-one-out'
  | 'category-classification'
  | 'mixed-analogy-classification'
  | 'addition-subtraction-series'
  | 'multiplication-division-series'
  | 'alternating-operation-series'
  | 'increasing-difference-series'
  | 'squares-cubes-powers-series'
  | 'fibonacci-recursive-series'
  | 'interleaved-two-pattern-series'
  | 'missing-term-series'
  | 'mixed-number-series'
  | 'forward-letter-series'
  | 'backward-letter-series'
  | 'skipping-letter-series'
  | 'alternating-letter-series'
  | 'increasing-gap-letter-series'
  | 'grouped-letter-series'
  | 'letter-number-series'
  | 'missing-term-letter-series'
  | 'mixed-letter-series'
  | 'letter-shift-codes'
  | 'reverse-alphabet-codes'
  | 'letter-position-codes'
  | 'word-substitution-codes'
  | 'symbol-replacement-codes'
  | 'mixed-letter-number-codes'
  | 'infer-coding-rule'
  | 'multi-step-coding-rules'
  | 'mixed-coding-decoding'
  | 'left-right-ranking'
  | 'total-from-two-ranks'
  | 'rearranged-position'
  | 'comparative-ordering'
  | 'before-after-order'
  | 'middle-position'
  | 'multi-rank-comparison'
  | 'queue-line-ranking'
  | 'mixed-ordering-ranking'
  | 'universal-affirmative-syllogism'
  | 'universal-negative-syllogism'
  | 'particular-affirmative-syllogism'
  | 'mixed-quantifier-syllogism'
  | 'valid-conclusion-syllogism'
  | 'venn-diagram-syllogism'
  | 'possibility-conclusion-syllogism'
  | 'either-or-syllogism'
  | 'mixed-syllogism'
  | 'linear-row-seating'
  | 'left-right-neighbor'
  | 'fixed-gap-seating'
  | 'circular-seating'
  | 'facing-direction-seating'
  | 'rearrangement-swap'
  | 'schedule-slot-arrangement'
  | 'object-shelf-arrangement'
  | 'mixed-seating-arrangement'
  | 'table-interpretation'
  | 'bar-chart-interpretation'
  | 'line-graph-interpretation'
  | 'pie-chart-interpretation'
  | 'percentage-ratio-data'
  | 'totals-differences-comparisons'
  | 'average-weighted-data'
  | 'multi-step-data-interpretation'
  | 'mixed-data-interpretation'
  | 'root-word-meaning'
  | 'prefix-meaning'
  | 'suffix-meaning'
  | 'word-family-form'
  | 'denotation-connotation'
  | 'multiple-meaning-word'
  | 'definition-example-match'
  | 'commonly-confused-words'
  | 'mixed-vocabulary-word-meaning'
  | 'basic-synonym'
  | 'basic-antonym'
  | 'context-sensitive-synonym'
  | 'context-sensitive-antonym'
  | 'degree-intensity-synonym'
  | 'connotation-tone-synonym'
  | 'formal-informal-equivalent'
  | 'sentence-synonym-antonym'
  | 'mixed-synonyms-antonyms'
  | 'definition-context-clue'
  | 'synonym-context-clue'
  | 'antonym-contrast-clue'
  | 'example-illustration-clue'
  | 'cause-effect-context-clue'
  | 'general-sense-context-clue'
  | 'multiple-meaning-context-clue'
  | 'two-sentence-context-clue'
  | 'mixed-context-clues'
  | 'grammar-fit-completion'
  | 'meaning-fit-completion'
  | 'transition-word-completion'
  | 'cause-effect-completion'
  | 'contrast-comparison-completion'
  | 'parallel-idea-completion'
  | 'tone-formality-completion'
  | 'double-blank-completion'
  | 'mixed-sentence-completion'
  | 'part-of-speech-usage'
  | 'verb-tense-consistency'
  | 'article-determiner-usage'
  | 'preposition-usage'
  | 'conjunction-usage'
  | 'comparative-superlative-usage'
  | 'commonly-misused-expression'
  | 'correct-sentence-usage'
  | 'mixed-grammar-usage'
  | 'basic-subject-verb-agreement'
  | 'compound-subject-agreement'
  | 'either-or-neither-nor-agreement'
  | 'indefinite-pronoun-agreement'
  | 'collective-quantity-agreement'
  | 'intervening-phrase-agreement'
  | 'inverted-sentence-agreement'
  | 'special-case-agreement'
  | 'mixed-subject-verb-agreement'
  | 'pronoun-reference-agreement'
  | 'pronoun-case'
  | 'possessive-reflexive-pronoun'
  | 'relative-pronoun-usage'
  | 'adjective-adverb-modifier'
  | 'comparative-modifier'
  | 'misplaced-modifier'
  | 'dangling-modifier'
  | 'mixed-pronouns-modifiers'
  | 'subject-predicate-clause-identification'
  | 'sentence-type-classification'
  | 'sentence-fragment-detection'
  | 'run-on-comma-splice-detection'
  | 'coordination-subordination-error'
  | 'parallel-structure-error'
  | 'unclear-illogical-sentence'
  | 'sentence-part-error-identification'
  | 'mixed-sentence-structure-errors'
  | 'topic-sentence-identification'
  | 'supporting-detail-order'
  | 'chronological-paragraph-order'
  | 'cause-effect-paragraph-order'
  | 'comparison-contrast-order'
  | 'general-specific-order'
  | 'transition-link-order'
  | 'opening-closing-sentence'
  | 'mixed-paragraph-organization'
  | 'main-idea-comprehension'
  | 'supporting-detail-comprehension'
  | 'sequence-organization-comprehension'
  | 'cause-effect-comprehension'
  | 'vocabulary-in-context-comprehension'
  | 'inference-comprehension'
  | 'author-purpose-tone-comprehension'
  | 'fact-opinion-conclusion-comprehension'
  | 'mixed-reading-comprehension'
  | 'constitution-structure-principles'
  | 'bill-of-rights'
  | 'citizenship-suffrage'
  | 'legislative-department'
  | 'executive-department'
  | 'judicial-department'
  | 'constitutional-commissions'
  | 'public-officer-accountability'
  | 'local-government-economy-amendments'
  | 'mixed-philippine-constitution'

export type AnswerKind =
  | 'number'
  | 'percent'
  | 'money'
  | 'count'
  | 'fraction'
  | 'ratio'
  | 'text'

export interface GeneratedExplanation {
  title: string
  steps: string[]
  finalAnswer: string
}

export interface GeneratedChoice {
  text: string
  isCorrect: boolean
  distractorType: string | null
  mistakeType: DistractorMistakeType | null
  derivation: DistractorDerivation | null
  qualityScore: number
  numericValue: number
}

export interface GeneratedQuestionMetadata {
  answerKind: AnswerKind
  unit: string | null
  canonicalSignature: string
}

export interface GeneratedQuestion<
  TParameters extends Record<string, unknown> = Record<string, unknown>,
> {
  generatorSlug: GeneratorSlug
  generatorVersion: number
  difficulty: GeneratorDifficulty
  seed: string
  prompt: string
  parameters: TParameters
  choices: GeneratedChoice[]
  explanation: GeneratedExplanation
  metadata: GeneratedQuestionMetadata
}

export interface GenerateQuestionInput {
  seed: string
  difficulty: GeneratorDifficulty
}

export interface GeneratorValidationResult {
  valid: boolean
  reason: string | null
}

export interface QuestionGenerator {
  slug: GeneratorSlug
  version: number
  title: string
  supportedDifficulties: readonly GeneratorDifficulty[]
  generate: (input: GenerateQuestionInput) => GeneratedQuestion
  validate: (
    question: GeneratedQuestion,
  ) => GeneratorValidationResult
}

export interface PersistedGeneratedQuestion {
  publicId: string
  sourcePosition: number
  question: GeneratedQuestion
}
