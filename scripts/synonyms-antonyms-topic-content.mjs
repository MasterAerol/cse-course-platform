export const subjectSlug = 'verbal-ability'
export const topicSlug = 'synonyms-and-antonyms'
export const topicTitle = 'Synonyms and Antonyms'
export const topicDescription = 'A structured course on identifying words with similar and opposite meanings while preserving context, grammatical role, degree, tone, and usage.'

export const lessonSpecs = [
  ['Understanding Synonyms and Antonyms', 'understanding-synonyms-and-antonyms', 'reading', 16], ['Basic Synonyms', 'basic-synonyms', 'practice', 15], ['Basic Antonyms', 'basic-antonyms', 'practice', 15], ['Context-Sensitive Synonyms', 'context-sensitive-synonyms', 'practice', 16], ['Context-Sensitive Antonyms', 'context-sensitive-antonyms', 'practice', 16], ['Degree and Intensity', 'degree-and-intensity', 'practice', 17], ['Positive, Neutral, and Negative Tone', 'positive-neutral-and-negative-tone', 'practice', 17], ['Formal and Informal Word Choice', 'formal-and-informal-word-choice', 'practice', 16], ['Synonyms and Antonyms in Sentences', 'synonyms-and-antonyms-in-sentences', 'practice', 17], ['Mixed Synonym and Antonym Problems', 'mixed-synonym-and-antonym-problems', 'practice', 20], ['Mixed Synonyms and Antonyms Practice', 'mixed-synonyms-and-antonyms-practice', 'practice', 20], ['Synonyms and Antonyms Topic Quiz', 'synonyms-and-antonyms-topic-quiz', 'quiz', 25],
].map(([title, slug, lessonType, minutes], index) => ({ title, slug, lessonType, minutes, position: index + 1 }))

export const generatedByLesson = { 'basic-synonyms': 'basic-synonym', 'basic-antonyms': 'basic-antonym', 'context-sensitive-synonyms': 'context-sensitive-synonym', 'context-sensitive-antonyms': 'context-sensitive-antonym', 'degree-and-intensity': 'degree-intensity-synonym', 'positive-neutral-and-negative-tone': 'connotation-tone-synonym', 'formal-and-informal-word-choice': 'formal-informal-equivalent', 'synonyms-and-antonyms-in-sentences': 'sentence-synonym-antonym', 'mixed-synonym-and-antonym-problems': 'mixed-synonyms-antonyms' }

const heading = (text, level = 2) => ({ blockType: 'heading', content: { text, level } })
const paragraph = (text) => ({ blockType: 'paragraph', content: { text } })
const callout = (title, text, variant = 'info') => ({ blockType: 'callout', content: { title, text, variant } })
const example = (title, problem, steps, answer) => ({ blockType: 'example', content: { title, problem, steps, answer } })
const summary = (items) => ({ blockType: 'summary', content: { items } })

const teaching = {
  'basic-synonyms': ['Synonyms share the same or nearly the same meaning in a stated sense.', 'Confirm sense and part of speech before comparing degree or tone.', 'assist and help are verbs meaning give assistance', 'rapid and fast are adjectives describing quick movement or change'],
  'basic-antonyms': ['Antonyms express a defensible opposition in the intended context.', 'Look for direct opposition, reversal, or presence versus absence.', 'scarce contrasts with abundant', 'expand contrasts with contract'],
  'context-sensitive-synonyms': ['A short sentence selects one sense of a word.', 'Replace the target and reread the entire sentence for meaning and grammar.', 'brief means concise in “a brief instruction”', 'addressed means handled in “addressed the problem”'],
  'context-sensitive-antonyms': ['A contextual antonym reverses the selected sense while preserving grammatical role.', 'Reject an opposite belonging to a different sense or an excessive degree.', 'clear contrasts with confusing for instructions', 'stable contrasts with unstable for attendance'],
  'degree-and-intensity': ['Related words can differ in strength: warm is weaker than hot, and angry is weaker than furious.', 'Notice intensifiers and choose a word with the required degree.', 'furious is stronger than angry', 'warm is weaker than hot'],
  'positive-neutral-and-negative-tone': ['Words with related denotations may communicate different attitudes.', 'Match the requested positive, neutral, or negative tone without changing the core subject.', 'confident is favorable while arrogant is critical', 'economical praises care while cheap may criticize quality'],
  'formal-and-informal-word-choice': ['Register is the level of formality appropriate to a situation.', 'Preserve meaning and grammatical role, then match official or everyday communication.', 'purchase is more formal than buy', 'inquire is more formal than ask'],
  'synonyms-and-antonyms-in-sentences': ['Sentence substitution tests relationship, form, sense, intensity, tone, and register together.', 'Read the revised sentence aloud and verify one clear meaning.', 'respond can replace reply in a formal notice', 'permanent reverses temporary in the same adjective position'],
  'mixed-synonym-and-antonym-problems': ['Mixed questions first require identifying whether similarity, opposition, degree, tone, or register is tested.', 'Name the relationship before comparing options.', 'assist/help tests synonymy and register', 'expand/contract tests direct opposition'],
}

export function blocksFor(slug) {
  if (slug === 'understanding-synonyms-and-antonyms') return [
    heading('Meaning relationships require precision'),
    paragraph('Synonyms have the same or nearly the same meaning. Antonyms express opposite or contrasting meanings. These relationships help readers interpret public notices, reports, instructions, correspondence, schedules, and everyday communication.'),
    heading('Six checks before choosing', 3),
    example('Relationship reference table', 'Check | Question', ['Part of speech | Do both words perform the same grammatical job?', 'Sense | Do they refer to the same intended meaning?', 'Degree | Is one word stronger or weaker?', 'Tone | Is the attitude positive, neutral, or negative?', 'Formality | Does the register fit the situation?', 'Context | Does the sentence remain clear and grammatical?'], 'A valid answer satisfies every relevant check.'),
    example('Direct relationships', 'rapid / fast; scarce / abundant', ['Rapid and fast are comparable adjectives in a common sense.', 'Scarce and abundant express a direct contrast in amount.'], 'First identify whether similarity or opposition is requested.'),
    example('Intensity matters', 'angry / furious; old / ancient', ['Furious is much stronger than angry.', 'Ancient is much stronger than merely old.'], 'A stronger word is not automatically the closest synonym.'),
    example('Tone matters', 'confident / arrogant; economical / cheap', ['Confident and arrogant both concern self-assurance but differ in tone.', 'Economical and cheap can concern low cost but carry different attitudes.'], 'Preserve tone unless the question asks you to change it.'),
    example('Register matters', 'speak / announce; help / assist', ['Announce is not a synonym for every use of speak.', 'Assist is a more formal equivalent of help in many service contexts.'], 'Formal and informal words are not always interchangeable.'),
    callout('Antonym patterns', 'Opposition may be direct, a reversal, presence versus absence, or a positive versus negative quality. The stated context determines the defensible contrast.', 'important'),
    callout('Common mistakes', 'Do not choose a merely related word, ignore part of speech, overlook intensity or tone, trust familiarity, or answer with a synonym when an antonym is requested.', 'warning'),
    paragraph('All sentences and learner-friendly explanations in this topic are original educational material and are not official CSC questions.'),
    summary(['Identify synonym or antonym.', 'Match part of speech and intended sense.', 'Check degree, tone, and formality.', 'Reread the complete sentence.', 'Require one uniquely defensible answer.']),
  ]
  const item = teaching[slug] ?? ['Review the complete synonym and antonym decision process.', 'Identify the requested relationship before comparing choices.', 'assist and help preserve a common meaning', 'temporary and permanent express a direct contrast']
  return [heading(lessonSpecs.find((lesson) => lesson.slug === slug)?.title ?? topicTitle), paragraph(item[0]), callout('Comparison strategy', item[1]), heading('Worked examples', 3), example('Example one', item[2], ['Identify the intended sense and part of speech.', 'Compare relationship, degree, tone, and register.'], item[2]), example('Example two', item[3], ['Read the complete sentence or phrase.', 'Reject a related word that changes the requested relationship.'], item[3]), callout('Common mistakes', 'Avoid choosing by familiarity, confusing synonym with antonym, changing grammatical role, or overlooking intensity, tone, register, or context.', 'warning'), heading('Before practice', 3), paragraph('Explain why the correct choice fits and identify the precise language mistake represented by each rejected option.'), summary([item[0], item[1], 'Choose only the answer that preserves every required feature.'])]
}

export const mixedQuestions = [
  ['Which word is closest in meaning to “assist”?', ['help', 'hinder', 'ignore', 'assistance'], 0, 'Help is the matching verb. The distractors model an antonym, an unrelated response, and the wrong part of speech.'],
  ['Which word is opposite in meaning to “scarce”?', ['abundant', 'limited', 'brief', 'rapid'], 0, 'Abundant directly contrasts with scarce. The distractors model a synonym and merely related words.'],
  ['In “The supervisor issued a brief instruction,” which word best replaces “brief”?', ['concise', 'ancient', 'furious', 'hidden'], 0, 'Concise preserves the short-and-clear sense. The distractors model unrelated senses and qualities.'],
  ['In “Attendance remained stable,” which word best reverses “stable”?', ['unstable', 'steady', 'rapid', 'permanent'], 0, 'Unstable is the direct contextual antonym. The distractors model a synonym, intensity mismatch, or a different category.'],
  ['Which word is stronger than “angry”?', ['furious', 'calm', 'concise', 'warm'], 0, 'Furious expresses greater anger. The distractors model an antonym or unrelated degrees.'],
  ['Which word gives self-assurance a positive tone?', ['confident', 'arrogant', 'cheap', 'scarce'], 0, 'Confident is broadly favorable. The distractors model negative tone or unrelated qualities.'],
  ['Which formal equivalent best replaces “buy”?', ['purchase', 'sell', 'begin', 'reply'], 0, 'Purchase preserves the verb meaning at a more formal register. The distractors change meaning.'],
  ['Which replacement preserves “Please reply before Friday”?', ['respond', 'ignore', 'response', 'rapid'], 0, 'Respond preserves meaning and verb form. The distractors model an antonym, wrong part of speech, or unrelated word.'],
]

export const quizQuestions = [
  ['What is a synonym?', ['a word with the same or nearly the same meaning', 'a word with the opposite meaning', 'a stronger word only', 'a similarly spelled word'], 0, 'A synonym shares an intended sense; distractors confuse relationship, degree, or spelling.'],
  ['What is an antonym?', ['a word expressing an opposite or contrast', 'a word with identical spelling', 'a formal word only', 'a word in the same topic'], 0, 'An antonym expresses opposition in context.'],
  ['Which word is closest in meaning to “rapid”?', ['fast', 'slow', 'scarce', 'reply'], 0, 'Fast shares the common adjective sense of rapid.'],
  ['Which word is opposite in meaning to “expand”?', ['contract', 'enlarge', 'begin', 'stable'], 0, 'Contract directly reverses expand in the size sense.'],
  ['Why should synonyms usually share a part of speech?', ['so the replacement keeps the grammatical role', 'so both words have equal length', 'so both begin with the same letter', 'so tone never matters'], 0, 'Matching grammatical role helps preserve the sentence.'],
  ['In “The instruction was brief,” which replacement fits?', ['concise', 'furious', 'abundant', 'terminate'], 0, 'Concise fits the selected short-and-clear sense.'],
  ['In “The instructions were clear,” which word reverses “clear”?', ['confusing', 'plain', 'accurate', 'brief'], 0, 'Confusing supplies the direct contextual opposition.'],
  ['Which word is stronger than “angry”?', ['furious', 'upset', 'calm', 'warm'], 0, 'Furious has greater intensity.'],
  ['Which word is weaker than “hot”?', ['warm', 'scorching', 'cold', 'rapid'], 0, 'Warm expresses a lower degree of heat.'],
  ['Which word has a positive connotation?', ['confident', 'arrogant', 'wasteful', 'careless'], 0, 'Confident usually presents self-assurance favorably.'],
  ['Which word has a negative connotation?', ['arrogant', 'confident', 'economical', 'accurate'], 0, 'Arrogant criticizes excessive self-importance.'],
  ['Which is the formal equivalent of “ask”?', ['inquire', 'answer', 'buy', 'end'], 0, 'Inquire is a formal equivalent in information-seeking contexts.'],
  ['Which is the everyday equivalent of “purchase”?', ['buy', 'sell', 'permit', 'commence'], 0, 'Buy preserves the verb meaning at an everyday register.'],
  ['Which replacement preserves “Staff will assist visitors”?', ['help', 'hinder', 'assistance', 'helpful'], 0, 'Help preserves meaning and verb role.'],
  ['Which analysis is correct?', ['rapid/fast are synonyms; scarce/abundant are antonyms', 'rapid/slow are synonyms; scarce/limited are antonyms', 'assist/help are antonyms; expand/contract are synonyms', 'purchase/buy differ in meaning rather than register'], 0, 'The first option identifies both relationships correctly.'],
]

export function fixedQuestion([prompt, choices, correctIndex, explanation], position, quiz = false) { return { prompt, explanation: `${explanation} Distractors model a documented relationship, sense, part-of-speech, intensity, tone, register, or spelling mistake.`, points: 1, position, status: 'active', ...(quiz ? { questionType: 'multiple_choice' } : {}), choices: choices.map((text, index) => ({ text, isCorrect: index === correctIndex, position: index + 1 })) } }
export function validateQuestions(label, questions, expected) { const failures = []; if (questions.length !== expected) failures.push(`${label} must have ${expected} questions.`); for (const question of questions) { if (question.choices.length !== 4) failures.push(`${label} question ${question.position} must have four choices.`); if (new Set(question.choices.map((choice) => choice.text.trim().toLowerCase())).size !== 4) failures.push(`${label} question ${question.position} has duplicate choices.`); if (question.choices.filter((choice) => choice.isCorrect).length !== 1) failures.push(`${label} question ${question.position} must have exactly one correct choice.`); if (!question.explanation.toLowerCase().includes('distractor')) failures.push(`${label} question ${question.position} lacks documented distractors.`) } return failures }
