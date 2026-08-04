export const requiredTopics = [
  'vocabulary-and-word-meaning', 'synonyms-and-antonyms', 'context-clues', 'sentence-completion', 'grammar-and-correct-usage', 'subject-verb-agreement', 'pronouns-and-modifiers', 'sentence-structure-and-error-identification', 'paragraph-organization', 'reading-comprehension',
]
export const topicTitles = [
  'Vocabulary and Word Meaning', 'Synonyms and Antonyms', 'Context Clues', 'Sentence Completion', 'Grammar and Correct Usage', 'Subject–Verb Agreement', 'Pronouns and Modifiers', 'Sentence Structure and Error Identification', 'Paragraph Organization', 'Reading Comprehension',
]
export const generatorPools = [
  ['root-word-meaning','prefix-meaning','suffix-meaning','word-family-form','denotation-connotation','multiple-meaning-word','definition-example-match','commonly-confused-words','mixed-vocabulary-word-meaning'],
  ['basic-synonym','basic-antonym','context-sensitive-synonym','context-sensitive-antonym','degree-intensity-synonym','connotation-tone-synonym','formal-informal-equivalent','sentence-synonym-antonym','mixed-synonyms-antonyms'],
  ['definition-context-clue','synonym-context-clue','antonym-contrast-clue','example-illustration-clue','cause-effect-context-clue','general-sense-context-clue','multiple-meaning-context-clue','two-sentence-context-clue','mixed-context-clues'],
  ['grammar-fit-completion','meaning-fit-completion','transition-word-completion','cause-effect-completion','contrast-comparison-completion','parallel-idea-completion','tone-formality-completion','double-blank-completion','mixed-sentence-completion'],
  ['part-of-speech-usage','verb-tense-consistency','article-determiner-usage','preposition-usage','conjunction-usage','comparative-superlative-usage','commonly-misused-expression','correct-sentence-usage','mixed-grammar-usage'],
  ['basic-subject-verb-agreement','compound-subject-agreement','either-or-neither-nor-agreement','indefinite-pronoun-agreement','collective-quantity-agreement','intervening-phrase-agreement','inverted-sentence-agreement','special-case-agreement','mixed-subject-verb-agreement'],
  ['pronoun-reference-agreement','pronoun-case','possessive-reflexive-pronoun','relative-pronoun-usage','adjective-adverb-modifier','comparative-modifier','misplaced-modifier','dangling-modifier','mixed-pronouns-modifiers'],
  ['subject-predicate-clause-identification','sentence-type-classification','sentence-fragment-detection','run-on-comma-splice-detection','coordination-subordination-error','parallel-structure-error','unclear-illogical-sentence','sentence-part-error-identification','mixed-sentence-structure-errors'],
  ['topic-sentence-identification','supporting-detail-order','chronological-paragraph-order','cause-effect-paragraph-order','comparison-contrast-order','general-specific-order','transition-link-order','opening-closing-sentence','mixed-paragraph-organization'],
  ['main-idea-comprehension','supporting-detail-comprehension','sequence-organization-comprehension','cause-effect-comprehension','vocabulary-in-context-comprehension','inference-comprehension','author-purpose-tone-comprehension','fact-opinion-conclusion-comprehension','mixed-reading-comprehension'],
]
export const verbalAbilityBlueprintV1 = {
  subjectSlug: 'verbal-ability', version: 1, totalQuestions: 50, passingScorePercent: 70,
  topics: requiredTopics.map((topicSlug, index) => ({
    topicSlug, topicTitle: topicTitles[index], position: index + 1, count: 5,
    difficulty: { easy: 2, medium: 2, hard: 1 },
    generators: generatorPools[index].map((slug, generatorIndex) => ({ slug, version: 1, rotationPosition: generatorIndex + 1, selectionWeight: 1 })),
  })),
}