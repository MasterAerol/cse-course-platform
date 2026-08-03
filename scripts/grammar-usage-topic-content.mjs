export const subjectSlug = 'verbal-ability'
export const topicSlug = 'grammar-and-correct-usage'
export const topicTitle = 'Grammar and Correct Usage'
export const topicDescription = 'A structured course on standard English grammar, correct word forms, verb usage, modifiers, prepositions, conjunctions, and common usage errors.'

export const lessonSpecs = [
  ['Understanding Standard English Usage', 'understanding-standard-english-usage', 'reading', 16],
  ['Nouns, Verbs, Adjectives, and Adverbs', 'parts-of-speech-usage', 'practice', 16],
  ['Verb Tense and Consistency', 'verb-tense-and-consistency', 'practice', 17],
  ['Articles and Determiners', 'articles-and-determiners', 'practice', 16],
  ['Prepositions', 'prepositions', 'practice', 16],
  ['Conjunctions and Logical Connections', 'conjunctions-and-logical-connections', 'practice', 17],
  ['Comparative and Superlative Forms', 'comparative-and-superlative-forms', 'practice', 17],
  ['Commonly Misused Words and Expressions', 'commonly-misused-words-and-expressions', 'practice', 18],
  ['Correct Usage in Sentences', 'correct-usage-in-sentences', 'practice', 18],
  ['Mixed Grammar and Usage Problems', 'mixed-grammar-and-usage-problems', 'practice', 20],
  ['Mixed Grammar and Correct Usage Practice', 'mixed-grammar-and-correct-usage-practice', 'practice', 20],
  ['Grammar and Correct Usage Topic Quiz', 'grammar-and-correct-usage-topic-quiz', 'quiz', 25],
].map(([title, slug, lessonType, minutes], index) => ({ title, slug, lessonType, minutes, position: index + 1 }))

export const generatedByLesson = {
  'parts-of-speech-usage': 'part-of-speech-usage',
  'verb-tense-and-consistency': 'verb-tense-consistency',
  'articles-and-determiners': 'article-determiner-usage',
  prepositions: 'preposition-usage',
  'conjunctions-and-logical-connections': 'conjunction-usage',
  'comparative-and-superlative-forms': 'comparative-superlative-usage',
  'commonly-misused-words-and-expressions': 'commonly-misused-expression',
  'correct-usage-in-sentences': 'correct-sentence-usage',
  'mixed-grammar-and-usage-problems': 'mixed-grammar-usage',
}

const heading = (text, level = 2) => ({ blockType: 'heading', content: { text, level } })
const paragraph = (text) => ({ blockType: 'paragraph', content: { text } })
const callout = (title, text, variant = 'info') => ({ blockType: 'callout', content: { title, text, variant } })
const example = (title, problem, steps, answer) => ({ blockType: 'example', content: { title, problem, steps, answer } })
const summary = (items) => ({ blockType: 'summary', content: { items } })

const teaching = {
  'parts-of-speech-usage': ['A word form must perform the sentence role required of a noun, verb, adjective, or adverb.', 'Locate the word being named, acted, described, or modified before choosing from a word family.', 'The committee reached a final decision.', 'The employee responded promptly.'],
  'verb-tense-and-consistency': ['Verb tense locates an action in time and should remain consistent unless the time relationship changes.', 'Use explicit markers such as yesterday, since, tomorrow, and by the time before judging a verb form.', 'She submitted the report yesterday.', 'By the time the meeting began, the staff had arrived.'],
  'articles-and-determiners': ['Articles and determiners signal number, countability, specificity, and distance.', 'Check whether the noun is singular, plural, countable, specific, or introduced for the first time.', 'She submitted an application.', 'Each employee received a copy.'],
  prepositions: ['Standard preposition patterns connect words in precise and conventional ways.', 'Learn the complete expression and use context to distinguish place, duration, source, and participation.', 'The applicant complied with the instructions.', 'He has worked here since 2020.'],
  'conjunctions-and-logical-connections': ['Conjunctions express addition, contrast, choice, reason, result, and concession.', 'Name the relationship first, then check punctuation and any required correlative partner.', 'The form was incomplete, so it was returned.', 'Neither the manager nor the clerk was available.'],
  'comparative-and-superlative-forms': ['Comparatives relate two items; superlatives identify an extreme in a clear group.', 'Count the items, avoid double forms, and distinguish count nouns from mass nouns.', 'This route is better than the old route.', 'This is the most efficient of the three methods.'],
  'commonly-misused-words-and-expressions': ['Similar spelling does not mean identical grammar or direction of meaning.', 'Define the needed word in context and verify its sentence role before relying on sound.', 'The supervisor gave useful advice.', 'May I borrow your reference book?'],
  'correct-usage-in-sentences': ['A correct sentence must satisfy grammar, meaning, word form, tense, and standard usage together.', 'Identify one primary rule, keep every other feature stable, and test all four complete choices.', 'The staff is responsible for the records.', 'The team finished the report last Monday.'],
  'mixed-grammar-and-usage-problems': ['Mixed questions first require recognizing which standard-usage rule controls the choice.', 'Scan for sentence role, time marker, noun type, fixed expression, logical connector, or comparison set.', 'Yesterday requires a past-tense verb.', 'Many pairs naturally with plural count nouns.'],
}

export function blocksFor(slug) {
  if (slug === 'understanding-standard-english-usage') return [
    heading('Standard English usage in formal tests'),
    paragraph('Standard usage means forms accepted in clear formal written English. These lessons use original workplace and public-service contexts and are not official CSC questions.'),
    heading('Correctness has several parts', 3),
    paragraph('A strong sentence is grammatical and meaningful. Check sentence structure, word form, tense, basic agreement, logical connection, and an appropriate formal register.'),
    example('Word form', 'She completed the report carefully.', ['Completed is the action.', 'The sentence asks how she completed it.', 'The adverb carefully modifies the verb.'], 'She completed the report carefully.'),
    example('Time relationship', 'He has worked here since 2024.', ['Since introduces a starting point.', 'The work began in the past and continues.', 'Present perfect expresses that relationship.'], 'He has worked here since 2024.'),
    example('Preposition and comparison', 'The meeting begins at 9:00 a.m. This method is more efficient than the previous one.', ['At introduces a precise clock time.', 'Two methods require a comparative.', 'Than introduces the second member of the comparison.'], 'Use at for the time and more efficient than for the comparison.'),
    example('Correlative form', 'Neither option is acceptable.', ['Neither presents two rejected alternatives.', 'Option is singular in this construction.', 'The sentence is both grammatical and meaningful.'], 'Neither option is acceptable.'),
    callout('Grammar checklist', 'Check part of speech, tense, articles, determiners, prepositions, conjunctions, comparisons, idiomatic usage, meaning, and formal register.', 'important'),
    callout('Familiar is not always correct', 'A phrase may sound familiar yet contain the wrong word form, an unjustified tense change, or a preposition borrowed from another expression.'),
    callout('Common mistakes', 'Do not choose a familiar phrase without checking grammar, use the right word in the wrong form, shift tense without reason, combine because with so or although with but, or create forms such as more better.', 'warning'),
    summary(['Require both grammar and meaning.', 'Use explicit sentence clues.', 'Prefer the uniquely best standard form.', 'Check logical connections and register.', 'Reread the complete sentence.']),
  ]
  const item = teaching[slug] ?? ['Apply the complete standard-usage checklist.', 'Identify the controlling rule before comparing choices.', 'A correct form must fit grammar.', 'A correct sentence must also preserve meaning.']
  return [heading(lessonSpecs.find((lesson) => lesson.slug === slug)?.title ?? topicTitle), paragraph(item[0]), callout('Usage strategy', item[1]), heading('Worked examples', 3), example('Example one', item[2], ['Identify the target rule.', 'Use the surrounding grammatical clues.', 'Reread the completed standard sentence.'], item[2]), example('Example two', item[3], ['Name the required relationship.', 'Reject each documented mistake type.', 'Confirm that only one answer remains.'], item[3]), callout('Common mistakes', 'Reject wrong word forms, incompatible tenses, countability errors, nonstandard prepositions, illogical or doubled conjunctions, double comparisons, and confused words.', 'warning'), heading('Before practice', 3), paragraph('For each answer, state the controlling rule and explain why every distractor violates grammar, meaning, or established formal usage.'), summary([item[0], item[1], 'Choose the only form that produces a grammatical and meaningful sentence.'])]
}

export const mixedQuestions = [
  ['The assistant completed the task ____.', ['carefully', 'careful', 'care', 'carefulness'], 0, 'Carefully is the adverb that modifies completed.'],
  ['The clerk ____ the application yesterday.', ['reviewed', 'reviews', 'has reviewed', 'reviewing'], 0, 'Yesterday requires the simple past form reviewed.'],
  ['She submitted ____ application before noon.', ['an', 'a', 'the every', 'many'], 0, 'Application begins with a vowel sound and is a singular count noun, so an is required.'],
  ['The office is responsible ____ issuing permits.', ['for', 'to', 'at', 'of'], 0, 'Responsible for is the standard preposition pattern.'],
  ['The form was incomplete, ____ it was returned.', ['so', 'although', 'because', 'however'], 0, 'So introduces the result of the incomplete form.'],
  ['This process is ____ than the previous one.', ['better', 'more better', 'best', 'good'], 0, 'Better is the irregular comparative used for two processes.'],
  ['The supervisor gave useful ____ about the interview.', ['advice', 'advise', 'advised', 'advising'], 0, 'Advice is the noun required as the object of gave.'],
  ['Which sentence uses standard English correctly?', ['The applicant complied with the instructions.', 'The applicant complied to the instructions.', 'The applicant comply with the instructions yesterday.', 'Although the applicant complied, but the form was late.'], 0, 'Complied with is the correct past-tense standard expression.'],
]

export const quizQuestions = [
  ['The employee responded ____.', ['promptly', 'prompt', 'promptness', 'prompting'], 0, 'Promptly is the adverb modifying responded.'],
  ['The committee reached a final ____.', ['decision', 'decide', 'decisive', 'decisively'], 0, 'Decision is the noun required after a final.'],
  ['The staff handled the request ____.', ['professionally', 'professional', 'profession', 'profess'], 0, 'Professionally is the adverb modifying handled.'],
  ['The officer ____ the records yesterday.', ['checked', 'checks', 'has checked', 'checking'], 0, 'Yesterday requires simple past.'],
  ['She ____ here since 2022.', ['has worked', 'worked', 'works yesterday', 'will work'], 0, 'Present perfect fits an action continuing from the starting point introduced by since.'],
  ['By the time the meeting began, the staff ____.', ['had arrived', 'arrives', 'will arrive', 'has arrive'], 0, 'Past perfect marks the action completed before the past meeting began.'],
  ['She submitted ____ application.', ['an', 'a', 'many', 'this two'], 0, 'An precedes the vowel sound in application.'],
  ['There are ____ applicants for the post.', ['many', 'much', 'little', 'every'], 0, 'Many modifies a plural count noun.'],
  ['The applicant complied ____ the instructions.', ['with', 'to', 'for', 'at'], 0, 'Comply with is the standard expression.'],
  ['The form was incomplete, ____ it was returned.', ['so', 'although', 'because', 'while'], 0, 'So introduces a result.'],
  ['Neither the manager ____ the clerk was available.', ['nor', 'or', 'and', 'but also'], 0, 'Neither pairs with nor.'],
  ['This route is ____ than the old route.', ['better', 'more better', 'best', 'good'], 0, 'Better is the irregular comparative for two routes.'],
  ['This is the ____ efficient of the three methods.', ['most', 'more', 'much', 'many'], 0, 'Most forms the superlative for a group of three.'],
  ['The schedule change may ____ attendance.', ['affect', 'effect', 'effects', 'effective'], 0, 'Affect is the base verb meaning influence.'],
  ['Which sentence uses standard English correctly?', ['The team finished the report last Monday.', 'The team has finished the report last Monday.', 'The team finish the report last Monday.', 'Although the team finished, but it was late.'], 0, 'Simple past fits the completed time last Monday without a doubled conjunction.'],
]

export function fixedQuestion([prompt, choices, correctIndex, explanation], position, quiz = false) { return { prompt, explanation: `${explanation} Distractors model a documented grammar mistake involving word form, tense, article, determiner, preposition, conjunction, comparison, countability, or confused usage.`, points: 1, position, status: 'active', ...(quiz ? { questionType: 'multiple_choice' } : {}), choices: choices.map((text, index) => ({ text, isCorrect: index === correctIndex, position: index + 1 })) } }
export function validateQuestions(label, questions, expected) { const failures = []; if (questions.length !== expected) failures.push(`${label} must have ${expected} questions.`); for (const question of questions) { if (question.choices.length !== 4) failures.push(`${label} question ${question.position} must have four choices.`); if (new Set(question.choices.map((choice) => choice.text.trim().toLowerCase())).size !== 4) failures.push(`${label} question ${question.position} has duplicate choices.`); if (question.choices.filter((choice) => choice.isCorrect).length !== 1) failures.push(`${label} question ${question.position} must have exactly one correct choice.`); if (!question.explanation.toLowerCase().includes('distractor')) failures.push(`${label} question ${question.position} lacks documented distractors.`) } return failures }
