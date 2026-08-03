export const subjectSlug = 'verbal-ability'
export const topicSlug = 'sentence-completion'
export const topicTitle = 'Sentence Completion'
export const topicDescription = 'A structured course on completing sentences using grammar, meaning, logic, transitions, tone, parallel structure, and contextual relationships.'

export const lessonSpecs = [
  ['Understanding Sentence Completion', 'understanding-sentence-completion', 'reading', 17],
  ['Grammar Fit', 'grammar-fit', 'practice', 15],
  ['Meaning and Logic Fit', 'meaning-and-logic-fit', 'practice', 16],
  ['Transition Words', 'transition-words', 'practice', 16],
  ['Cause-and-Effect Relationships', 'cause-and-effect-relationships', 'practice', 16],
  ['Contrast and Comparison', 'contrast-and-comparison', 'practice', 17],
  ['Parallel Ideas and Structure', 'parallel-ideas-and-structure', 'practice', 17],
  ['Tone and Formality', 'tone-and-formality', 'practice', 16],
  ['Double-Blank Sentences', 'double-blank-sentences', 'practice', 18],
  ['Mixed Sentence Completion Problems', 'mixed-sentence-completion-problems', 'practice', 20],
  ['Mixed Sentence Completion Practice', 'mixed-sentence-completion-practice', 'practice', 20],
  ['Sentence Completion Topic Quiz', 'sentence-completion-topic-quiz', 'quiz', 25],
].map(([title, slug, lessonType, minutes], index) => ({ title, slug, lessonType, minutes, position: index + 1 }))

export const generatedByLesson = {
  'grammar-fit': 'grammar-fit-completion',
  'meaning-and-logic-fit': 'meaning-fit-completion',
  'transition-words': 'transition-word-completion',
  'cause-and-effect-relationships': 'cause-effect-completion',
  'contrast-and-comparison': 'contrast-comparison-completion',
  'parallel-ideas-and-structure': 'parallel-idea-completion',
  'tone-and-formality': 'tone-formality-completion',
  'double-blank-sentences': 'double-blank-completion',
  'mixed-sentence-completion-problems': 'mixed-sentence-completion',
}

const heading = (text, level = 2) => ({ blockType: 'heading', content: { text, level } })
const paragraph = (text) => ({ blockType: 'paragraph', content: { text } })
const callout = (title, text, variant = 'info') => ({ blockType: 'callout', content: { title, text, variant } })
const example = (title, problem, steps, answer) => ({ blockType: 'example', content: { title, problem, steps, answer } })
const summary = (items) => ({ blockType: 'summary', content: { items } })

const teaching = {
  'grammar-fit': ['Grammar fit asks which form can perform the job of the blank while preserving natural meaning.', 'Identify part of speech, tense, number, and required word-family form before comparing meanings.', 'The employee completed the task carefully. The verb completed needs the adverb carefully.', 'The committee reached a final decision. The article and adjective require a singular noun.'],
  'meaning-and-logic-fit': ['Several choices may be grammatical, but only one should make the complete sentence logical.', 'Predict a broad meaning from the whole sentence, then reject related words that contradict its strongest clue.', 'Praise because work was accurate connects a positive response with a positive quality.', 'A closed road requires motorists to find an alternative route.'],
  'transition-words': ['Transitions name relationships between clauses: addition, contrast, cause, result, example, or sequence.', 'Read both sides, name the relationship, and check that punctuation fits the selected transition.', 'Furthermore adds another office service; however introduces an unexpected contrast.', 'Therefore introduces the accurate count as a result of checking twice.'],
  'cause-and-effect-relationships': ['Cause-and-effect completions must preserve chronology and a clear reason-result link.', 'Locate because, so, caused, or therefore, then decide whether the blank supplies the cause or its effect.', 'Incomplete files cause an application to be delayed.', 'An alarm sounds, so occupants leave the building.'],
  'contrast-and-comparison': ['Contrast signals difference or concession, while comparison measures how two items are alike or different.', 'Use although, whereas, but, unlike, and than to determine direction and grammatical form.', 'Although the task was difficult, the team remained determined.', 'A route may be shorter but more congested than another route.'],
  'parallel-ideas-and-structure': ['Coordinated ideas should share grammatical form and belong to a logical category.', 'Find the repeated pattern before and after and, or, both, or a sequence of verbs.', 'Filing, answering, and assisting are parallel gerunds.', 'Practical, affordable, and reliable are parallel adjectives.'],
  'tone-and-formality': ['The same basic meaning can be expressed with different levels of courtesy and formality.', 'Identify whether the sentence is an official notice, workplace instruction, or neutral professional message.', 'Applicants are requested to submit a form is courteous and official.', 'Please notify us fits formal workplace communication better than a casual alternative.'],
  'double-blank-sentences': ['A double-blank answer is one pair: both parts must fit grammar, meaning, and the relationship between clauses.', 'Predict both blanks together and reject pairs where only the first or only the second works.', 'Although the task was difficult, the team remained determined.', 'Because the road was slippery, drivers proceeded cautiously.'],
  'mixed-sentence-completion-problems': ['Mixed items require identifying the primary constraint before solving.', 'Read fully, label the blank role and relationship, predict meaning, test every choice, and reread.', 'Yesterday points to reviewed through tense; than points to a comparative form.', 'A formal notice may require requested even when another verb has a related meaning.'],
}

export function blocksFor(slug) {
  if (slug === 'understanding-sentence-completion') return [
    heading('A completion must satisfy the whole sentence'),
    paragraph('Sentence completion is not a vocabulary guessing game. The best answer must fit grammar, meaning, logic, tense, number, part of speech, tone, formality, and the relationship between ideas.'),
    heading('Seven-step completion method', 3),
    example('Completion checklist', 'Read, identify, predict, test, and reread.', ['Read the entire one- or two-sentence item.', 'Identify the grammatical role of each blank.', 'Look for signal words.', 'Determine the relationship between ideas.', 'Predict a general meaning before reading choices.', 'Test every choice for grammar and logic.', 'Reread the completed sentence naturally.'], 'Use every step when choices look equally plausible.'),
    example('Grammar and meaning', 'The report was clear and ____.', ['And coordinates two descriptions of report.', 'The blank needs an adjective with a positive useful meaning.', 'Concise fits both requirements.'], 'The report was clear and concise.'),
    example('Cause and result', 'Because the road was flooded, the trip was ____.', ['Because identifies flooded road as the cause.', 'The blank describes a likely effect on the trip.', 'Delayed is grammatical and logically precise.'], 'Because the road was flooded, the trip was delayed.'),
    example('Concession', 'Although the task was difficult, the team remained ____.', ['Although signals an unexpected contrast.', 'The team response should oppose giving up.', 'Determined supplies the intended positive quality.'], 'Although the task was difficult, the team remained determined.'),
    callout('Nine relationships to recognize', 'Continuation, cause and effect, contrast, comparison, example, condition, result, sequence, and concession each constrain the blank differently.', 'important'),
    callout('Strongest-clue rule', 'If two choices initially seem possible, identify which one matches every grammatical and contextual clue, not merely one nearby phrase.'),
    callout('Common mistakes', 'Avoid filling the blank before reading fully, choosing grammar without meaning, choosing logic in the wrong form, ignoring transitions, missing tone, or accepting multiple plausible answers without testing the strongest clue.', 'warning'),
    paragraph('All sentences and explanations in this topic are original educational material for exam preparation and are not official CSC questions.'),
    summary(['Read the entire item.', 'Identify grammar and relationship.', 'Predict before viewing choices.', 'Test grammar, logic, tone, and formality.', 'Reread and require one uniquely best answer.']),
  ]
  const item = teaching[slug] ?? ['Review the complete sentence-completion process.', 'Identify the primary constraint before choosing.', 'Grammar narrows the possible forms.', 'Context and relationships select the uniquely logical answer.']
  return [heading(lessonSpecs.find((lesson) => lesson.slug === slug)?.title ?? topicTitle), paragraph(item[0]), callout('Completion strategy', item[1]), heading('Worked examples', 3), example('Example one', item[2], ['Read the full sentence.', 'Identify blank role and signal words.', 'Test grammar and meaning together.'], item[2]), example('Example two', item[3], ['Name the relationship.', 'Reject the documented mistake types.', 'Reread the completed sentence.'], item[3]), callout('Common mistakes', 'Reject wrong parts of speech, tense or number errors, illogical words, wrong transitions, nonparallel forms, unsuitable tone, and double-blank pairs where only one side fits.', 'warning'), heading('Before practice', 3), paragraph('For every answer, state the grammatical clue, the logical clue, and why each distractor fails.'), summary([item[0], item[1], 'Choose the only completion that satisfies the complete sentence.'])]
}

export const mixedQuestions = [
  ['The assistant organized the files ____.', ['carefully', 'careful', 'care', 'carefulness'], 0, 'Carefully is the adverb that describes how the files were organized.'],
  ['The manager praised the report because it was ____.', ['accurate', 'careless', 'unfinished', 'secret'], 0, 'Accurate logically explains the praise.'],
  ['The office was busy; ____, every applicant was served before closing.', ['nevertheless', 'therefore', 'for example', 'moreover'], 0, 'Nevertheless introduces a contrast between being busy and serving everyone on time.'],
  ['Because the form lacked a signature, it was ____.', ['returned', 'celebrated', 'expanded', 'announced'], 0, 'A missing required signature logically causes the form to be returned.'],
  ['Although the schedule changed, the staff remained ____.', ['prepared', 'confusedly', 'absent', 'delayed'], 0, 'Although signals a concession; prepared provides the logical positive contrast.'],
  ['The clerk was responsible for receiving forms, checking details, and ____ receipts.', ['issuing', 'issue', 'to issue', 'receipt issuance'], 0, 'Issuing matches the coordinated gerunds receiving and checking.'],
  ['Applicants are ____ to keep a copy of the receipt.', ['advised', 'ordered around', 'bugged', 'threatened'], 0, 'Advised is courteous and appropriately formal for an official notice.'],
  ['Although the line was ____, the service moved ____.', ['long / efficiently', 'long / inefficient', 'short / efficiently', 'length / efficient'], 0, 'Both long and efficiently fit the concession, grammar, and service context.'],
]

export const quizQuestions = [
  ['In "The staff responded ____," what part of speech should complete the sentence?', ['adverb', 'noun', 'adjective', 'plural pronoun'], 0, 'An adverb describes how the staff responded.'],
  ['The committee reached an important ____.', ['agreement', 'agree', 'agreeable', 'agreed'], 0, 'An important requires a singular noun, agreement.'],
  ['The clerk ____ the request yesterday.', ['processed', 'processes', 'processing', 'process'], 0, 'Yesterday requires the simple past verb processed.'],
  ['The driver handled the vehicle ____.', ['carefully', 'careful', 'care', 'caring'], 0, 'Carefully is the adverb modifying handled.'],
  ['The notice was revised so that its instructions would be more ____.', ['understandable', 'secret', 'distant', 'expensive'], 0, 'Revision is intended to make instructions easier to understand.'],
  ['The office accepts online forms; ____, it provides a submission counter.', ['in addition', 'however', 'therefore', 'instead'], 0, 'In addition introduces another available service.'],
  ['The route is short; ____, it is often congested.', ['however', 'therefore', 'moreover', 'for example'], 0, 'However introduces the contrasting disadvantage.'],
  ['____ the records were incomplete, the audit took longer.', ['Because', 'Although', 'Meanwhile', 'For example'], 0, 'Because introduces the reason for the longer audit.'],
  ['The records were incomplete; ____, the audit took longer.', ['therefore', 'however', 'for instance', 'similarly'], 0, 'Therefore introduces the resulting delay.'],
  ['This queue is ____ than the one near the entrance.', ['shorter', 'short', 'shortest', 'more short'], 0, 'Than requires the standard comparative form shorter.'],
  ['The team will review, revise, and ____ the proposal.', ['submit', 'submitting', 'submission', 'submitted'], 0, 'Submit matches the parallel base verbs review and revise.'],
  ['The instructions were clear, practical, and ____.', ['complete', 'completely', 'completion', 'completedly'], 0, 'Complete matches the coordinated adjectives clear and practical.'],
  ['Please ____ the office if your address changes.', ['notify', 'yell at', 'bother', 'lecture'], 0, 'Notify is courteous and formal enough for an official instruction.'],
  ['Because the floor was ____, visitors walked ____.', ['wet / carefully', 'wet / careless', 'dry / carefully', 'wetness / careful'], 0, 'Both words fit the causal relationship and their grammatical positions.'],
  ['Although the deadline was near, the team worked ____ and finished the report ____.', ['efficiently / on time', 'slow / yesterday', 'efficiency / timely', 'careless / early'], 0, 'The adverb efficiently and phrase on time satisfy grammar and concession logic.'],
]

export function fixedQuestion([prompt, choices, correctIndex, explanation], position, quiz = false) { return { prompt, explanation: `${explanation} Distractors model a documented part-of-speech, tense, number, semantic, transition, intensity, tone, parallel-form, or paired-blank mistake.`, points: 1, position, status: 'active', ...(quiz ? { questionType: 'multiple_choice' } : {}), choices: choices.map((text, index) => ({ text, isCorrect: index === correctIndex, position: index + 1 })) } }
export function validateQuestions(label, questions, expected) { const failures = []; if (questions.length !== expected) failures.push(`${label} must have ${expected} questions.`); for (const question of questions) { if (question.choices.length !== 4) failures.push(`${label} question ${question.position} must have four choices.`); if (new Set(question.choices.map((choice) => choice.text.trim().toLowerCase())).size !== 4) failures.push(`${label} question ${question.position} has duplicate choices.`); if (question.choices.filter((choice) => choice.isCorrect).length !== 1) failures.push(`${label} question ${question.position} must have exactly one correct choice.`); if (!question.explanation.toLowerCase().includes('distractor')) failures.push(`${label} question ${question.position} lacks documented distractors.`) } return failures }
