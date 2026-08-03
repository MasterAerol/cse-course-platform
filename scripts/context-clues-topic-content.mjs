export const subjectSlug = 'verbal-ability'
export const topicSlug = 'context-clues'
export const topicTitle = 'Context Clues'
export const topicDescription = 'A structured course on inferring word meanings from definitions, synonyms, contrasts, examples, cause-and-effect relationships, general sense, multiple meanings, and linked sentences.'

export const lessonSpecs = [
  ['Understanding Context Clues', 'understanding-context-clues', 'reading', 16],
  ['Definition Clues', 'definition-clues', 'practice', 15],
  ['Synonym Clues', 'synonym-clues', 'practice', 15],
  ['Antonym and Contrast Clues', 'antonym-contrast-clues', 'practice', 16],
  ['Example and Illustration Clues', 'example-illustration-clues', 'practice', 16],
  ['Cause-and-Effect Clues', 'cause-effect-clues', 'practice', 16],
  ['General-Sense Clues', 'general-sense-clues', 'practice', 17],
  ['Multiple-Meaning Words', 'multiple-meaning-clues', 'practice', 17],
  ['Two-Sentence Clues', 'two-sentence-clues', 'practice', 17],
  ['Mixed Context Clues', 'mixed-context-clues', 'practice', 20],
  ['Context Clues Fixed Practice', 'context-clues-fixed-practice', 'practice', 20],
  ['Context Clues Topic Quiz', 'context-clues-topic-quiz', 'quiz', 25],
].map(([title, slug, lessonType, minutes], index) => ({ title, slug, lessonType, minutes, position: index + 1 }))

export const generatedByLesson = {
  'definition-clues': 'definition-context-clue',
  'synonym-clues': 'synonym-context-clue',
  'antonym-contrast-clues': 'antonym-contrast-clue',
  'example-illustration-clues': 'example-illustration-clue',
  'cause-effect-clues': 'cause-effect-context-clue',
  'general-sense-clues': 'general-sense-context-clue',
  'multiple-meaning-clues': 'multiple-meaning-context-clue',
  'two-sentence-clues': 'two-sentence-context-clue',
  'mixed-context-clues': 'mixed-context-clues',
}

const heading = (text, level = 2) => ({ blockType: 'heading', content: { text, level } })
const paragraph = (text) => ({ blockType: 'paragraph', content: { text } })
const callout = (title, text, variant = 'info') => ({ blockType: 'callout', content: { title, text, variant } })
const example = (title, problem, steps, answer) => ({ blockType: 'example', content: { title, problem, steps, answer } })
const summary = (items) => ({ blockType: 'summary', content: { items } })

const teaching = {
  'definition-clues': ['A definition clue states the target meaning directly, often after meaning, that is, or in other words.', 'Read punctuation and signal phrases, then substitute the stated definition.', 'The room was dim, meaning it had very little light.', 'The schedule is provisional; in other words, it is temporary.'],
  'synonym-clues': ['A synonym clue restates the target with a word or phrase of nearly the same meaning.', 'Check that the restatement has the same grammatical role and sense.', 'The clerk was diligent, or careful and hardworking.', 'The applicants were elated and extremely happy.'],
  'antonym-contrast-clues': ['A contrast clue reveals meaning through an opposite condition.', 'Use signals such as unlike, whereas, but, and rather than; reverse the contrasted idea.', 'Unlike the noisy lobby, the room was tranquil.', 'The first inspector was severe, whereas the second was lenient.'],
  'example-illustration-clues': ['Examples identify the category represented by an unfamiliar word.', 'Use including, such as, and for instance, then name the category shared by all examples.', 'Beverages including water, juice, and coffee means drinks.', 'Credentials such as a license and diploma means proof of qualifications.'],
  'cause-effect-clues': ['A result can reveal the quality or condition that caused it.', 'Separate the meaning from the consequence; do not choose the effect itself.', 'A fragile box is handled carefully because it is easily broken.', 'Parched soil absorbs water quickly because it is extremely dry.'],
  'general-sense-clues': ['Sometimes the whole situation supports a meaning without an explicit signal.', 'Combine actions, setting, tone, and logical consequences before testing each choice.', 'Twelve hours without rest supports exhausted meaning extremely tired.', 'Repeated encouragement before entering supports reluctant meaning unwilling.'],
  'multiple-meaning-clues': ['Familiar words may have several meanings, but grammar and nearby details select one.', 'List plausible senses, identify part of speech, and reject meanings the sentence cannot support.', 'File a request means officially submit it.', 'Review a draft means examine a preliminary document.'],
  'two-sentence-clues': ['A following or preceding sentence can explain the target indirectly.', 'Carry information across the sentence boundary and connect pronouns or repeated ideas.', 'An obsolete system is explained as replaced and no longer useful.', 'To scrutinize receipts is explained by inspecting each detail carefully.'],
  'mixed-context-clues': ['Mixed problems require identifying the clue type before inferring the meaning.', 'Underline the strongest support, name the clue relationship, substitute the answer, and reread.', 'Including identifies an example clue; whereas identifies contrast.', 'No signal phrase may indicate general sense or multiple meaning.'],
}

export function blocksFor(slug) {
  if (slug === 'understanding-context-clues') return [
    heading('Context turns an unknown word into a solvable problem'),
    paragraph('Context clues are words, phrases, punctuation, and relationships around an unfamiliar or multiple-meaning word. They allow a careful reader to infer a precise meaning without relying only on memory.'),
    heading('Eight clue families', 3),
    example('Clue reference', 'Type | Common evidence', ['Definition | meaning, that is, in other words', 'Synonym | or, and, a nearby restatement', 'Contrast | unlike, whereas, but, rather than', 'Example | including, such as, for instance', 'Cause and effect | therefore, so, as a result', 'General sense | the logic of the full situation', 'Multiple meaning | grammar plus sense-specific details', 'Two sentence | explanation across a sentence boundary'], 'Name the clue type before testing answer choices.'),
    example('Substitution check', 'The room was dim, meaning it had very little light.', ['Locate the target word dim.', 'Notice the direct definition after meaning.', 'Replace dim with having very little light and reread.'], 'Dim means having very little light.'),
    example('Contrast check', 'Unlike the noisy lobby, the archive room was tranquil.', ['The word unlike signals opposition.', 'Reverse noisy and unsettled.', 'Quiet and calm makes the sentence logical.'], 'Tranquil means quiet and calm.'),
    example('Multiple-meaning check', 'Please file the completed request before Friday.', ['File is a verb here.', 'The object is a request and a deadline is given.', 'Folder and metal-tool senses do not fit.'], 'File means officially submit.'),
    callout('One-answer standard', 'The strongest answer must match the selected sense, part of speech, sentence logic, and exact supporting evidence.', 'important'),
    callout('Common mistakes', 'Do not select a familiar but unsupported sense, copy the effect instead of the cause, name an example instead of its category, reverse a contrast incorrectly, or ignore the next sentence.', 'warning'),
    paragraph('All passages and explanations are original educational material and are not official CSC questions.'),
    summary(['Read beyond the target word.', 'Name the clue relationship.', 'Locate exact support.', 'Test the meaning by substitution.', 'Require one uniquely defensible answer.']),
  ]
  const item = teaching[slug] ?? ['Review every context-clue relationship.', 'Name the clue type and locate exact support before choosing.', 'Definition and synonym clues restate meaning.', 'Contrast, examples, effects, and linked sentences imply meaning.']
  return [heading(lessonSpecs.find((lesson) => lesson.slug === slug)?.title ?? topicTitle), paragraph(item[0]), callout('Inference strategy', item[1]), heading('Worked examples', 3), example('Example one', item[2], ['Locate the target and its grammatical role.', 'Identify the strongest contextual evidence.', 'Substitute the inferred meaning and reread.'], item[2]), example('Example two', item[3], ['Name the clue relationship.', 'Reject familiar but unsupported meanings.', 'Confirm one precise answer.'], item[3]), callout('Common mistakes', 'Avoid ignoring signal words, selecting a related idea rather than the meaning, reversing a contrast, copying an example or effect, changing part of speech, or using an unsupported familiar sense.', 'warning'), heading('Before practice', 3), paragraph('Explain the exact words that support your answer and the language mistake represented by every rejected option.'), summary([item[0], item[1], 'Choose only the meaning supported by the complete context.'])]
}

export const mixedQuestions = [
  ['In "The hall was vacant, meaning completely empty," what does "vacant" mean?', ['completely empty', 'very noisy', 'recently painted', 'to leave a place'], 0, 'The phrase after meaning directly defines vacant.'],
  ['In "The analyst was precise, or exact, in every calculation," what does "precise" mean?', ['exact', 'quick', 'uncertain', 'a measurement'], 0, 'Or introduces a synonym restatement.'],
  ['In "Unlike the rigid rule, the new guideline was flexible," what does "flexible" mean?', ['able to adapt', 'strict and fixed', 'written recently', 'a bending motion'], 0, 'Unlike signals a contrast with rigid.'],
  ['In "Aquatic animals, such as fish, dolphins, and turtles, need clean water," what does "aquatic" mean?', ['living in or near water', 'large and powerful', 'able to fly', 'an animal enclosure'], 0, 'The examples share a water-based category.'],
  ['The path was slippery, so everyone walked slowly. What does "slippery" mean?', ['difficult to stand on without sliding', 'walked slowly', 'very narrow', 'a slow walk'], 0, 'Walking slowly is the effect of a surface that may cause sliding.'],
  ['After answering calls all night, Bea could barely keep her eyes open; she was drowsy. What does "drowsy" mean?', ['sleepy', 'angry', 'confused', 'a night shift'], 0, 'The whole situation supports sleepy.'],
  ['In "The bank approved the business loan," what does "bank" mean?', ['a financial institution', 'the side of a river', 'to tilt an aircraft', 'a pile of soil'], 0, 'Approved a loan selects the financial sense.'],
  ['"The memo was concise. It gave all necessary information in very few words." What does "concise" mean?', ['brief but complete', 'unclear', 'confidential', 'a written note'], 0, 'The second sentence explains concise.'],
]

export const quizQuestions = [
  ['Which clue type directly states a word meaning?', ['definition clue', 'contrast clue', 'example clue', 'general-sense clue'], 0, 'A definition clue states the meaning directly.'],
  ['Which signal most often introduces a contrast?', ['whereas', 'including', 'meaning', 'therefore'], 0, 'Whereas marks a contrast between ideas.'],
  ['Which signal most often introduces examples?', ['such as', 'unlike', 'in other words', 'as a result'], 0, 'Such as introduces examples.'],
  ['In "The room was dim, meaning it had very little light," what does dim mean?', ['having very little light', 'not intelligent', 'crowded', 'a light switch'], 0, 'Meaning introduces the direct definition.'],
  ['In "The clerk was diligent, or careful and hardworking," what does diligent mean?', ['careful and hardworking', 'strict with others', 'quick but careless', 'a difficult task'], 0, 'Or introduces a synonymous restatement.'],
  ['In "Unlike the noisy lobby, the archive room was tranquil," what does tranquil mean?', ['quiet and calm', 'noisy and crowded', 'empty', 'dark'], 0, 'Unlike requires the opposite of noisy.'],
  ['Beverages including water, juice, and coffee are what?', ['drinks', 'containers', 'meals', 'supplies'], 0, 'The examples belong to the category drinks.'],
  ['A fragile box was handled carefully. What does fragile mean?', ['easily broken', 'very heavy', 'very valuable', 'handled carefully'], 0, 'Careful handling is the effect of being easily broken.'],
  ['After twelve hours without rest, the staff were exhausted. What does exhausted mean?', ['extremely tired', 'confused', 'busy', 'used up supplies'], 0, 'The full situation supports extreme tiredness.'],
  ['In "Please file the request before Friday," what does file mean?', ['officially submit', 'a folder of records', 'smooth with a tool', 'an official document'], 0, 'The verb, object, and deadline select submit.'],
  ['Why does part of speech matter for multiple-meaning words?', ['it helps select the sense that fits the sentence grammar', 'it makes every meaning correct', 'it identifies the longest answer', 'it removes the need for context'], 0, 'Grammar eliminates senses that cannot occupy the target position.'],
  ['"The system was obsolete. A newer system had replaced it." What does obsolete mean?', ['no longer useful because it was replaced', 'damaged', 'secret', 'recently installed'], 0, 'The second sentence explains the outdated condition.'],
  ['Which choice is an effect rather than the meaning of parched soil?', ['it absorbed water quickly', 'extremely dry', 'lacking moisture', 'dried out'], 0, 'Absorbing water is the result; the meaning is extremely dry.'],
  ['What is the best final check after inferring a meaning?', ['substitute it and reread the complete passage', 'choose the most familiar option', 'ignore punctuation', 'use the longest definition'], 0, 'Substitution confirms meaning, grammar, and logic.'],
  ['Which sequence is most reliable?', ['read widely, identify clue type, locate support, substitute', 'guess, choose, then skip the sentence', 'look only at the target word', 'select the first related word'], 0, 'The complete inference sequence uses all contextual evidence.'],
]

export function fixedQuestion([prompt, choices, correctIndex, explanation], position, quiz = false) { return { prompt, explanation: `${explanation} Distractors model a documented wrong sense, related-but-unsupported idea, reversed contrast, copied example or effect, semantic mismatch, or wrong part of speech.`, points: 1, position, status: 'active', ...(quiz ? { questionType: 'multiple_choice' } : {}), choices: choices.map((text, index) => ({ text, isCorrect: index === correctIndex, position: index + 1 })) } }
export function validateQuestions(label, questions, expected) { const failures = []; if (questions.length !== expected) failures.push(`${label} must have ${expected} questions.`); for (const question of questions) { if (question.choices.length !== 4) failures.push(`${label} question ${question.position} must have four choices.`); if (new Set(question.choices.map((choice) => choice.text.trim().toLowerCase())).size !== 4) failures.push(`${label} question ${question.position} has duplicate choices.`); if (question.choices.filter((choice) => choice.isCorrect).length !== 1) failures.push(`${label} question ${question.position} must have exactly one correct choice.`); if (!question.explanation.toLowerCase().includes('distractor')) failures.push(`${label} question ${question.position} lacks documented distractors.`) } return failures }
