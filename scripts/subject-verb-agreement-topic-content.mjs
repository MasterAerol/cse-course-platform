export const subjectSlug = 'verbal-ability'
export const topicSlug = 'subject-verb-agreement'
export const topicTitle = 'Subject–Verb Agreement'
export const topicDescription = 'A structured course on matching subjects and verbs in number and person, including compound subjects, indefinite pronouns, collective nouns, intervening phrases, inverted sentences, and special agreement cases.'

export const lessonSpecs = [
  ['Understanding Subject–Verb Agreement', 'understanding-subject-verb-agreement', 'reading', 16],
  ['Singular and Plural Subjects', 'singular-and-plural-subjects', 'practice', 16],
  ['Compound Subjects', 'compound-subjects', 'practice', 16],
  ['Subjects Joined by Either, Or, Neither, and Nor', 'either-or-neither-nor-subjects', 'practice', 17],
  ['Indefinite Pronouns', 'indefinite-pronouns', 'practice', 17],
  ['Collective Nouns and Quantities', 'collective-nouns-and-quantities', 'practice', 18],
  ['Intervening Phrases and Clauses', 'intervening-phrases-and-clauses', 'practice', 17],
  ['Inverted Sentences and There Is or There Are', 'inverted-sentences-there-is-there-are', 'practice', 18],
  ['Special Agreement Cases', 'special-agreement-cases', 'practice', 18],
  ['Mixed Subject–Verb Agreement Problems', 'mixed-subject-verb-agreement-problems', 'practice', 20],
  ['Mixed Subject–Verb Agreement Practice', 'mixed-subject-verb-agreement-practice', 'practice', 20],
  ['Subject–Verb Agreement Topic Quiz', 'subject-verb-agreement-topic-quiz', 'quiz', 25],
].map(([title, slug, lessonType, minutes], index) => ({ title, slug, lessonType, minutes, position: index + 1 }))

export const generatedByLesson = {
  'singular-and-plural-subjects': 'basic-subject-verb-agreement',
  'compound-subjects': 'compound-subject-agreement',
  'either-or-neither-nor-subjects': 'either-or-neither-nor-agreement',
  'indefinite-pronouns': 'indefinite-pronoun-agreement',
  'collective-nouns-and-quantities': 'collective-quantity-agreement',
  'intervening-phrases-and-clauses': 'intervening-phrase-agreement',
  'inverted-sentences-there-is-there-are': 'inverted-sentence-agreement',
  'special-agreement-cases': 'special-case-agreement',
  'mixed-subject-verb-agreement-problems': 'mixed-subject-verb-agreement',
}

const heading = (text, level = 2) => ({ blockType: 'heading', content: { text, level } })
const paragraph = (text) => ({ blockType: 'paragraph', content: { text } })
const callout = (title, text, variant = 'info') => ({ blockType: 'callout', content: { title, text, variant } })
const example = (title, problem, steps, answer) => ({ blockType: 'example', content: { title, problem, steps, answer } })
const summary = (items) => ({ blockType: 'summary', content: { items } })

const teaching = {
  'singular-and-plural-subjects': ['A singular third-person subject normally takes a simple-present verb ending in s or es; a plural subject takes the base form.', 'Find the complete subject, reduce it to its head noun or pronoun, classify number and person, then select the matching verb.', 'The employee submits the report.', 'The employees submit the report.'],
  'compound-subjects': ['Distinct subjects joined by and normally form a plural subject, while every or each before compound singular nouns calls for singular agreement.', 'Decide whether and truly joins separate subjects or whether every or each distributes the statement one item at a time.', 'The manager and the clerk are present.', 'Every desk and chair is labeled.'],
  'either-or-neither-nor-subjects': ['With either/or and neither/nor, standard test convention makes the verb agree with the nearer subject.', 'Bracket the paired connector, ignore the first alternative temporarily, and classify the subject closest to the verb.', 'Either the clerk or the manager is attending.', 'Neither the folder nor the files are missing.'],
  'indefinite-pronouns': ['Each, everyone, and nobody are singular; both, few, many, and several are plural; all, any, most, none, and some depend on the noun after of.', 'Classify the indefinite pronoun first; for a context-dependent form, inspect whether the of noun is a mass noun or plural count noun.', 'Each of the reports is complete.', 'Some of the files are missing.'],
  'collective-nouns-and-quantities': ['A collective noun acting as one unit is singular in formal American English; a single measurement also takes singular agreement.', 'Look for explicit unit meaning, then let fractions and percentages agree with the noun after of.', 'The committee is meeting today as one body.', 'Half of the files are missing.'],
  'intervening-phrases-and-clauses': ['An of phrase, prepositional phrase, relative clause, or phrase beginning along with does not normally change the main subject.', 'Cross out the interrupting words and match the verb with the remaining head subject.', 'The list of requirements is complete.', 'The manager, along with the clerks, is attending.'],
  'inverted-sentences-there-is-there-are': ['In an inverted sentence, the grammatical subject may follow the verb; there and here are not the subjects.', 'Restore ordinary order mentally and classify the delayed subject.', 'There are several files on the desk.', 'On the table lies the report.'],
  'special-agreement-cases': ['Some established nouns and phrases have number that cannot be judged from a final s alone.', 'Identify the whole construction: news, a pair of, one of, a number of, or the number of.', 'The news is encouraging.', 'The number of pending files is increasing.'],
  'mixed-subject-verb-agreement-problems': ['Mixed questions require identifying the controlling agreement family before selecting a verb.', 'Find the true subject, remove interrupters, inspect connectors, and check any indefinite, quantity, inverted, or special rule.', 'Several are waiting for assistance.', 'Ten kilometers is a long distance to walk.'],
}

export function blocksFor(slug) {
  if (slug === 'understanding-subject-verb-agreement') return [
    heading('Subjects and verbs must agree'),
    paragraph('A singular subject normally takes a singular verb, while a plural subject takes a plural verb. In the simple present, a third-person singular subject usually takes a verb ending in s or es; plural subjects use the base form.'),
    heading('Find the true grammatical subject', 3),
    paragraph('Agreement follows the true subject, not automatically the noun nearest the verb. First locate the complete subject, then identify its controlling head word.'),
    example('Basic number', 'The employee submits the report. The employees submit the report.', ['Employee is singular and takes submits.', 'Employees is plural and takes submit.', 'The tense remains simple present.'], 'Match submits with employee and submit with employees.'),
    example('Intervening phrase', 'The list of requirements is complete.', ['The grammatical subject is list.', 'Of requirements is an intervening phrase.', 'The plural noun requirements does not control the verb.'], 'The singular subject list takes is.'),
    example('Compound and proximity rules', 'The manager and the clerk are present. Neither the files nor the folder is missing.', ['And creates a plural compound subject.', 'Neither/nor uses the nearer-subject convention.', 'Folder is nearer the second verb and is singular.'], 'Use are for the and subject and is for the nearer folder.'),
    example('Indefinite pronoun', 'Each of the applicants has an identification card.', ['Each is the grammatical subject.', 'Each is singular.', 'Applicants is inside an of phrase.'], 'The singular subject each takes has.'),
    callout('Agreement rule table', 'Singular third person: submits, is, has, does. Plural: submit, are, have, do. Compound and: usually plural. Either/or and neither/nor: agree with the nearer subject.', 'important'),
    callout('Cases that need an extra check', 'Indefinite pronouns, collective nouns, quantities, intervening phrases, inverted order, titles, subjects ending in s, and fixed number phrases may change how number is identified.'),
    callout('Common mistakes', 'Do not match the nearest noun automatically, treat each or everyone as plural, apply the and rule to or, make every quantity plural, or mistake there for the subject.', 'warning'),
    summary(['Identify the grammatical subject.', 'Classify number and person.', 'Preserve the intended tense.', 'Apply the relevant special rule.', 'Reread for one uniquely standard form.']),
  ]
  const item = teaching[slug] ?? ['Apply the complete subject–verb agreement checklist.', 'Identify the true subject before selecting a verb.', 'A singular subject takes a singular verb.', 'A plural subject takes a plural verb.']
  return [heading(lessonSpecs.find((lesson) => lesson.slug === slug)?.title ?? topicTitle), paragraph(item[0]), callout('Subject-identification strategy', item[1]), heading('Worked examples', 3), example('Example one', item[2], ['Locate the complete subject.', 'Identify its controlling word and number.', 'Select the verb form required by the rule.'], item[2]), example('Example two', item[3], ['Remove intervening words if present.', 'Check connectors or special classifications.', 'Reread the completed sentence.'], item[3]), callout('Common mistakes', 'Reject agreement with a nearby non-subject, wrong proximity, plural treatment of each, and treated like or, along with treated like and, collective or quantity misclassification, automatic there is, and guesses based only on final s.', 'warning'), heading('Before practice', 3), paragraph('For every item, name the grammatical subject, state its number, and identify the exact agreement rule before choosing.'), summary([item[0], item[1], 'Use the one verb that agrees with the true subject.'])]
}

export const mixedQuestions = [
  ['The applicant ____ the form each morning.', ['submits', 'submit', 'submitted', 'submitting'], 0, 'The singular third-person subject applicant takes submits.'],
  ['The manager and the clerk ____ present.', ['are', 'is', 'was', 'be'], 0, 'Two distinct subjects joined by and take the plural verb are.'],
  ['Neither the folder nor the files ____ missing.', ['are', 'is', 'was', 'be'], 0, 'Files is the nearer plural subject, so are is correct.'],
  ['Each of the reports ____ complete.', ['is', 'are', 'were', 'be'], 0, 'Each is a singular indefinite pronoun and controls agreement.'],
  ['Ten kilometers ____ a long distance to walk.', ['is', 'are', 'were', 'be'], 0, 'The distance is treated as one measurement and takes is.'],
  ['The list of requirements ____ complete.', ['is', 'are', 'were', 'be'], 0, 'List is the singular subject; requirements is in an intervening phrase.'],
  ['There ____ several files on the desk.', ['are', 'is', 'was', 'be'], 0, 'Several files is the delayed plural subject.'],
  ['The number of pending files ____ increasing.', ['is', 'are', 'were', 'be'], 0, 'The singular head phrase the number controls the verb.'],
]

export const quizQuestions = [
  ['The employee ____ the weekly report.', ['submits', 'submit', 'submitted', 'submitting'], 0, 'Employee is a singular third-person subject.'],
  ['The employees ____ the weekly report.', ['submit', 'submits', 'submitted', 'submitting'], 0, 'Employees is plural and takes the base verb submit.'],
  ['They ____ responsible for the records.', ['are', 'is', 'was', 'be'], 0, 'They is plural and takes are.'],
  ['The supervisor and the assistant ____ available.', ['are', 'is', 'was', 'be'], 0, 'Two subjects joined by and take a plural verb.'],
  ['Every desk and chair ____ labeled.', ['is', 'are', 'were', 'be'], 0, 'Every makes the compound singular nouns distributively singular.'],
  ['Either the manager or the clerks ____ attending.', ['are', 'is', 'was', 'be'], 0, 'The nearer subject clerks is plural.'],
  ['Neither the files nor the folder ____ missing.', ['is', 'are', 'were', 'be'], 0, 'The nearer subject folder is singular.'],
  ['Everyone in the office ____ a schedule.', ['has', 'have', 'having', 'had'], 0, 'Everyone is a singular indefinite pronoun.'],
  ['Several ____ waiting for assistance.', ['are', 'is', 'was', 'be'], 0, 'Several is a plural indefinite pronoun.'],
  ['Some of the water ____ unavailable.', ['is', 'are', 'were', 'be'], 0, 'Some agrees with the mass noun water.'],
  ['The committee ____ meeting today as one body.', ['is', 'are', 'were', 'be'], 0, 'The committee acts as one unit and takes is.'],
  ['Five thousand pesos ____ enough for the purchase.', ['is', 'are', 'were', 'be'], 0, 'The amount is treated as one sum.'],
  ['The reports in the cabinet ____ organized.', ['are', 'is', 'was', 'be'], 0, 'Reports is the plural subject; cabinet is inside a phrase.'],
  ['Here ____ the completed forms.', ['are', 'is', 'was', 'be'], 0, 'Completed forms is the delayed plural subject.'],
  ['A pair of scissors ____ on the desk.', ['is', 'are', 'were', 'be'], 0, 'The singular head word pair controls agreement.'],
]

export function fixedQuestion([prompt, choices, correctIndex, explanation], position, quiz = false) { return { prompt, explanation: `${explanation} Distractors model a documented agreement mistake involving subject number, proximity, an intervening noun, an indefinite pronoun, a collective or quantity, inversion, or a special case.`, points: 1, position, status: 'active', ...(quiz ? { questionType: 'multiple_choice' } : {}), choices: choices.map((text, index) => ({ text, isCorrect: index === correctIndex, position: index + 1 })) } }
export function validateQuestions(label, questions, expected) { const failures = []; if (questions.length !== expected) failures.push(`${label} must have ${expected} questions.`); for (const question of questions) { if (question.choices.length !== 4) failures.push(`${label} question ${question.position} must have four choices.`); if (new Set(question.choices.map((choice) => choice.text.trim().toLowerCase())).size !== 4) failures.push(`${label} question ${question.position} has duplicate choices.`); if (question.choices.filter((choice) => choice.isCorrect).length !== 1) failures.push(`${label} question ${question.position} must have exactly one correct choice.`); if (!question.explanation.toLowerCase().includes('distractor')) failures.push(`${label} question ${question.position} lacks documented distractors.`) } return failures }
