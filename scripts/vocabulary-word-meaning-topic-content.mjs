export const subjectTitle = 'Verbal Ability'
export const subjectSlug = 'verbal-ability'
export const subjectDescription = 'Training in vocabulary, grammar, sentence construction, paragraph organization, and reading comprehension.'
export const topicSlug = 'vocabulary-and-word-meaning'
export const topicTitle = 'Vocabulary and Word Meaning'
export const topicDescription = 'A structured course on understanding roots, prefixes, suffixes, word families, denotation, connotation, multiple meanings, and commonly confused words.'

export const lessonSpecs = [
  ['Understanding Vocabulary and Word Meaning', 'understanding-vocabulary-and-word-meaning', 'reading', 16],
  ['Roots and Base Words', 'roots-and-base-words', 'practice', 15],
  ['Prefixes and Meaning', 'prefixes-and-meaning', 'practice', 15],
  ['Suffixes and Meaning', 'suffixes-and-meaning', 'practice', 15],
  ['Word Families and Parts of Speech', 'word-families-and-parts-of-speech', 'practice', 17],
  ['Denotation and Connotation', 'denotation-and-connotation', 'practice', 16],
  ['Multiple-Meaning Words', 'multiple-meaning-words', 'practice', 16],
  ['Matching Words with Definitions and Examples', 'matching-words-with-definitions-and-examples', 'practice', 17],
  ['Commonly Confused Words', 'commonly-confused-words', 'practice', 17],
  ['Mixed Vocabulary and Word Meaning', 'mixed-vocabulary-and-word-meaning', 'practice', 20],
  ['Mixed Vocabulary Practice', 'mixed-vocabulary-practice', 'practice', 20],
  ['Vocabulary and Word Meaning Topic Quiz', 'vocabulary-and-word-meaning-topic-quiz', 'quiz', 25],
].map(([title, slug, lessonType, minutes], index) => ({ title, slug, lessonType, minutes, position: index + 1 }))

export const generatedByLesson = {
  'roots-and-base-words': 'root-word-meaning',
  'prefixes-and-meaning': 'prefix-meaning',
  'suffixes-and-meaning': 'suffix-meaning',
  'word-families-and-parts-of-speech': 'word-family-form',
  'denotation-and-connotation': 'denotation-connotation',
  'multiple-meaning-words': 'multiple-meaning-word',
  'matching-words-with-definitions-and-examples': 'definition-example-match',
  'commonly-confused-words': 'commonly-confused-words',
  'mixed-vocabulary-and-word-meaning': 'mixed-vocabulary-word-meaning',
}

const heading = (text, level = 2) => ({ blockType: 'heading', content: { text, level } })
const paragraph = (text) => ({ blockType: 'paragraph', content: { text } })
const callout = (title, text, variant = 'info') => ({ blockType: 'callout', content: { title, text, variant } })
const example = (title, problem, steps, answer) => ({ blockType: 'example', content: { title, problem, steps, answer } })
const table = (headers, rows) => ({
  blockType: 'example',
  content: {
    title: 'Vocabulary reference table',
    problem: headers.join(' | '),
    steps: rows.map((row) => row.join(' | ')),
    answer: 'Use the named tool that matches the word feature or meaning clue in the question.',
  },
})
const summary = (items) => ({ blockType: 'summary', content: { items } })

const teaching = {
  'roots-and-base-words': ['A base word carries the central meaning and can stand alone or support affixes.', 'Remove only a valid prefix or suffix, then check that the remaining base explains the whole word.', 'careless → care + -less', 'review → re- + view'],
  'prefixes-and-meaning': ['A prefix appears before a base and changes its meaning.', 'Use transparent combinations: re- means again, mis- incorrectly, pre- before, and under- too little.', 'rewrite means write again', 'prearrange means arrange in advance'],
  'suffixes-and-meaning': ['A suffix follows a base and often changes grammatical function.', 'Check both meaning and part of speech; -ful and -less form adjectives, while -ment often forms a noun.', 'helpful is an adjective meaning useful', 'agreement is a noun formed from agree'],
  'word-families-and-parts-of-speech': ['A word family shares a base but changes form and sentence role.', 'Let grammar identify the needed form without turning the task into a full grammar lesson.', 'decide, decision, decisive, decisively', 'create, creation, creative, creatively'],
  'denotation-and-connotation': ['Denotation is a direct meaning; connotation is an associated tone or feeling.', 'Compare words with related denotations and choose the tone required by the sentence.', 'economical is usually favorable; cheap may sound critical', 'determined is often positive; stubborn is often negative'],
  'multiple-meaning-words': ['A common word can have several distinct senses.', 'Use surrounding words and grammatical role to select the intended sense.', 'light can mean illumination', 'light can also mean not heavy'],
  'matching-words-with-definitions-and-examples': ['A useful definition identifies essential meaning without simply repeating the word.', 'Test each option in the original example and reject related but non-equivalent meanings.', 'temporary means lasting for a limited time', 'inspect means examine carefully'],
  'commonly-confused-words': ['Similar spelling or sound does not make two words interchangeable.', 'Check meaning and grammatical role before choosing a partner.', 'affect is usually a verb; effect is usually a noun', 'advice is a noun; advise is a verb'],
  'mixed-vocabulary-and-word-meaning': ['Mixed vocabulary questions first require identifying the skill being tested.', 'Label the task as structure, family, tone, sense, definition, or confused-word use.', 'rewrite tests a prefix and base', 'file may test a noun or verb sense'],
}

export function blocksFor(slug) {
  if (slug === 'understanding-vocabulary-and-word-meaning') return [
    heading('Vocabulary and meaning work together'),
    paragraph('Vocabulary is the collection of words a person understands and uses. In public-service reading, accurate word meaning supports clear notices, reports, schedules, correspondence, and instructions.'),
    heading('Ten useful meaning tools', 3),
    table(['Tool', 'Purpose'], [['Base or root', 'Carries central meaning'], ['Prefix', 'Changes meaning before the base'], ['Suffix', 'Changes meaning or grammatical form'], ['Word family', 'Links related parts of speech'], ['Denotation', 'Direct literal meaning'], ['Connotation', 'Associated tone'], ['Multiple meaning', 'A sense selected by context'], ['Confused pair', 'Similar form but different use']]),
    example('Word structure', 'rewrite and careless', ['rewrite = re- + write', 'careless = care + -less'], 'Affixes modify a meaningful base.'),
    example('Word family', 'decide, decision, decisive', ['Decide is a verb.', 'Decision is a noun.', 'Decisive is an adjective.'], 'Grammatical form helps identify meaning.'),
    example('Meaning and tone', 'economical versus cheap', ['Both can concern low cost.', 'Economical usually praises careful use; cheap can criticize quality.'], 'Check connotation as well as denotation.'),
    example('Specific sense', 'light', ['Light above a desk means illumination.', 'A light package is not heavy.'], 'Context selects the intended sense.'),
    callout('Commonly confused', 'Affect usually means influence and functions as a verb. Effect usually means result and functions as a noun. Similar sound is not enough.', 'important'),
    callout('Common mistakes', 'Do not choose an answer only because it looks or sounds familiar. Check structure, sentence role, literal meaning, tone, and specific sense.', 'warning'),
    paragraph('Definitions and examples in this course are original learner-friendly descriptions, not copied dictionary entries and not official CSC questions.'),
    summary(['Find the central base.', 'Read affixes accurately.', 'Check part of speech.', 'Separate denotation from connotation.', 'Use context to select a sense.', 'Verify confused words by meaning and grammar.']),
  ]
  const item = teaching[slug] ?? ['Review all vocabulary-building tools before the assessment.', 'Name the tested skill before comparing choices.', 'A base carries central meaning.', 'Context and grammar select the intended form or sense.']
  return [heading(lessonSpecs.find((lesson) => lesson.slug === slug)?.title ?? topicTitle), paragraph(item[0]), callout('Recognition method', item[1]), heading('Worked examples', 3), example('Example one', item[2], ['Identify the target word or form.', 'Check the relevant structure or meaning rule.'], item[2]), example('Example two', item[3], ['Read the complete sentence.', 'Reject a related form that does not match the intended meaning.'], item[3]), callout('Common mistakes', 'Avoid choosing by familiarity, ignoring an affix, using the wrong part of speech, selecting the wrong tone, or defaulting to the most familiar sense.', 'warning'), heading('Before practice', 3), paragraph('Explain why the correct choice fits and name the specific mistake represented by each rejected choice.'), summary([item[0], item[1], 'Require one clear answer supported by the word data and sentence.'])]
}

export const mixedQuestions = [
  ['What is the base word in “careless”?', ['care', 'less', 'careless', 'car'], 0, 'Care is the base; -less is the suffix. Distractors model choosing an affix, the complete word, or similar spelling.'],
  ['What does re- contribute in “rewrite”?', ['again', 'before', 'not', 'too little'], 0, 'Re- means again. Distractors model other common prefix meanings.'],
  ['Which suffix appears in “helpful”?', ['-ful', 'help', 're-', '-less'], 0, '-ful is the suffix. Distractors model the base, a prefix, or another suffix.'],
  ['Which is the adjective in the decide family?', ['decisive', 'decide', 'decision', 'decisively'], 0, 'Decisive is the adjective. Distractors are the correct family with the wrong part of speech.'],
  ['Which word usually gives a more favorable tone?', ['economical', 'cheap', 'wasteful', 'cost'], 0, 'Economical usually praises careful resource use. Distractors model the wrong tone or a related category.'],
  ['In “The package is light enough to carry,” what does light mean?', ['not heavy', 'illumination', 'pale in color', 'not serious'], 0, 'Carry clearly selects the not-heavy sense. Distractors model other familiar senses.'],
  ['Which word means “lasting for a limited time”?', ['temporary', 'accurate', 'helpful', 'creative'], 0, 'Temporary matches the original definition. Distractors are useful but non-equivalent words.'],
  ['The delay may _____ the delivery date.', ['affect', 'effect', 'advice', 'advise'], 0, 'Affect is the verb meaning influence. Distractors model the confused partner and another noun/verb pair.'],
]

export const quizQuestions = [
  ['What central idea does the base “view” carry in “review”?', ['seeing or examining', 'writing', 'moving', 'agreeing'], 0, 'View concerns seeing or examining; distractors use unrelated common roots.'],
  ['What is the base word in “readable”?', ['read', 'able', 'readable', 'reader'], 0, 'Read is the base and -able is the suffix.'],
  ['What does mis- mean in “misunderstand”?', ['incorrectly', 'again', 'before', 'between'], 0, 'Mis- contributes the meaning incorrectly.'],
  ['Which meaning best matches “prearrange”?', ['arrange in advance', 'arrange again', 'refuse to arrange', 'arrange too little'], 0, 'Pre- means before, so prearrange means arrange in advance.'],
  ['What does -less contribute in “careless”?', ['without enough', 'full of', 'able to', 'the act of'], 0, '-less means without.'],
  ['Which is a noun form of decide?', ['decision', 'decide', 'decisive', 'decisively'], 0, 'Decision is the noun form.'],
  ['Which is an adjective form of create?', ['creative', 'create', 'creation', 'creatively'], 0, 'Creative is the adjective form.'],
  ['Which is an adverb form of decisive?', ['decisively', 'decision', 'decide', 'decisive'], 0, 'Decisively is the adverb.'],
  ['What is denotation?', ['a direct literal meaning', 'a word’s emotional association only', 'a spelling pattern', 'a sentence’s length'], 0, 'Denotation is the direct meaning.'],
  ['Which word usually carries a positive connotation?', ['helpful', 'careless', 'wasteful', 'nosy'], 0, 'Helpful normally expresses a favorable association.'],
  ['In “Please file the request,” what does file mean?', ['officially submit', 'a folder of records', 'a metal tool', 'a line of people'], 0, 'The verb and object select the submit sense.'],
  ['Which word means “correct and free from mistakes”?', ['accurate', 'temporary', 'economical', 'readable'], 0, 'Accurate matches the definition.'],
  ['Which sentence correctly illustrates temporary?', ['The office used the room for two weeks.', 'The office keeps the room forever.', 'The room contains accurate records.', 'The room is economical to clean.'], 0, 'Two weeks clearly illustrates a limited duration.'],
  ['The supervisor gave useful _____.', ['advice', 'advise', 'effect', 'affect'], 0, 'Advice is the noun required after useful.'],
  ['Which analysis is correct?', ['rewrite = re- + write', 'careless = car + -eless', 'agreement = agree + re-', 'readable = read + un-'], 0, 'Only re- + write uses the actual base and affix.'],
]

export function fixedQuestion([prompt, choices, correctIndex, explanation], position, quiz = false) { return { prompt, explanation: `${explanation} Distractors model a documented affix, form, tone, sense, spelling, or related-meaning mistake.`, points: 1, position, status: 'active', ...(quiz ? { questionType: 'multiple_choice' } : {}), choices: choices.map((text, index) => ({ text, isCorrect: index === correctIndex, position: index + 1 })) } }
export function validateQuestions(label, questions, expected) { const failures = []; if (questions.length !== expected) failures.push(`${label} must have ${expected} questions.`); for (const question of questions) { if (question.choices.length !== 4) failures.push(`${label} question ${question.position} must have four choices.`); if (new Set(question.choices.map((choice) => choice.text.trim().toLowerCase())).size !== 4) failures.push(`${label} question ${question.position} has duplicate choices.`); if (question.choices.filter((choice) => choice.isCorrect).length !== 1) failures.push(`${label} question ${question.position} must have exactly one correct choice.`); if (!question.explanation.includes('Distractor') && !question.explanation.includes('distractor')) failures.push(`${label} question ${question.position} lacks documented distractors.`) } return failures }
