export const topicSlug = 'syllogisms'
export const topicTitle = 'Syllogisms'
export const topicDescription = 'A structured course on evaluating conclusions from categorical premises using quantifiers, set relationships, possibility reasoning, and Venn-diagram logic.'

export const lessonSpecs = [
  ['Understanding Premises and Conclusions', 'understanding-premises-and-conclusions', 'reading', 18],
  ['All-All Statements', 'all-all-statements', 'practice', 16],
  ['All-Some Statements', 'all-some-statements', 'practice', 17],
  ['Some-Some Statements', 'some-some-statements', 'practice', 17],
  ['No Statements', 'no-statements', 'practice', 16],
  ['Valid and Invalid Conclusions', 'valid-and-invalid-conclusions', 'practice', 18],
  ['Venn Diagram Reasoning', 'venn-diagram-reasoning', 'practice', 18],
  ['Possibility Conclusions', 'possibility-conclusions', 'practice', 18],
  ['Either-Or Conclusions', 'either-or-conclusions', 'practice', 19],
  ['Mixed Syllogism Problems', 'mixed-syllogism-problems', 'practice', 20],
  ['Mixed Syllogism Practice', 'mixed-syllogism-practice', 'practice', 20],
  ['Syllogisms Topic Quiz', 'syllogisms-topic-quiz', 'quiz', 25],
].map(([title, slug, lessonType, minutes], index) => ({ title, slug, lessonType, minutes, position: index + 1 }))

export const generatedByLesson = {
  'all-all-statements': 'universal-affirmative-syllogism',
  'all-some-statements': 'particular-affirmative-syllogism',
  'some-some-statements': 'mixed-quantifier-syllogism',
  'no-statements': 'universal-negative-syllogism',
  'valid-and-invalid-conclusions': 'valid-conclusion-syllogism',
  'venn-diagram-reasoning': 'venn-diagram-syllogism',
  'possibility-conclusions': 'possibility-conclusion-syllogism',
  'either-or-conclusions': 'either-or-syllogism',
  'mixed-syllogism-problems': 'mixed-syllogism',
}

const heading = (text, level = 2) => ({ blockType: 'heading', content: { text, level } })
const paragraph = (text) => ({ blockType: 'paragraph', content: { text } })
const callout = (title, text, variant = 'info') => ({ blockType: 'callout', content: { title, text, variant } })
const formula = (expression, description) => ({ blockType: 'formula', content: { expression, description } })
const example = (title, problem, steps, answer) => ({ blockType: 'example', content: { title, problem, steps, answer } })
const summary = (items) => ({ blockType: 'summary', content: { items } })

const teaching = {
  'all-all-statements': {
    rule: 'All A are B places A inside B. If all B are C, A is also inside C.',
    interpretation: 'Follow containment in its stated direction; never reverse a subset arrow.',
    first: ['All clerks are employees. All employees are supervisors.', ['Place clerks inside employees.', 'Place employees inside supervisors.', 'The nested regions force clerks inside supervisors.'], 'All clerks are supervisors.'],
    second: ['All books are folders.', ['The books region is inside folders.', 'No member is guaranteed to exist.', 'The reverse containment is not established.'], 'All folders are books does not follow.'],
  },
  'all-some-statements': {
    rule: 'A Some premise supplies a witness. An All premise can carry that same witness forward.',
    interpretation: 'Keep one identified member through the chain instead of changing Some into All.',
    first: ['Some students are artists. All artists are musicians.', ['Mark one member in both students and artists.', 'Every artist is a musician.', 'Move that same marker into musicians.'], 'Some students are musicians.'],
    second: ['All clerks are employees. Some employees are teachers.', ['Clerks lie inside employees.', 'The employee-teacher marker may be outside clerks.', 'Overlap with clerks is possible, not definite.'], 'Some clerks are teachers does not definitely follow.'],
  },
  'some-some-statements': {
    rule: 'Two Some premises may use different witnesses, even when they share a middle category.',
    interpretation: 'Do not merge existential markers unless the premises force them to be the same member.',
    first: ['Some books are folders. Some folders are reports.', ['Place one marker in books and folders.', 'Place another marker in folders and reports.', 'The markers need not coincide.'], 'No definite books-reports overlap follows.'],
    second: ['Some artists are musicians.', ['The same overlapping member belongs to both sets.', 'Some statements convert symmetrically.', 'Keep the quantifier particular.'], 'Some musicians are artists.'],
  },
  'no-statements': {
    rule: 'No A are B makes A and B disjoint. The relation is symmetric.',
    interpretation: 'A subset of either disjoint set is also excluded from the other set.',
    first: ['No vehicles are plants. All tools are vehicles.', ['Separate vehicles from plants.', 'Place tools inside vehicles.', 'Tools cannot enter the plants region.'], 'No tools are plants.'],
    second: ['No folders are reports.', ['Draw two non-overlapping regions.', 'Do not add any member marker.', 'Disjointness does not prove either set exists.'], 'No reports are folders also follows.'],
  },
  'valid-and-invalid-conclusions': {
    rule: 'A definite conclusion must hold in every arrangement that satisfies all premises.',
    interpretation: 'Test each numbered conclusion independently before choosing the answer combination.',
    first: ['All clerks are employees. All employees are supervisors.', ['Conclusion I: All clerks are supervisors is forced.', 'Conclusion II: Some clerks are supervisors assumes existence.', 'Only the first is definite.'], 'Only conclusion I follows.'],
    second: ['Some students are artists. All artists are musicians.', ['The witness proves some students are musicians.', 'It does not prove all students are musicians.', 'Quantifier strength matters.'], 'Only the particular conclusion follows.'],
  },
  'venn-diagram-reasoning': {
    rule: 'Containment, disjointness, overlap, and outside regions are text equivalents of Venn relationships.',
    interpretation: 'Universal statements shape regions; existential statements place markers in permitted regions.',
    first: ['All artists are musicians. No musicians are vehicles.', ['Place artists entirely inside musicians.', 'Keep musicians separate from vehicles.', 'Artists must also be separate from vehicles.'], 'Artists and vehicles do not overlap.'],
    second: ['Some books are not folders.', ['Draw books and folders with an outside part of books.', 'Place a marker in the books-only region.', 'The marker proves books exist outside folders.'], 'Part of books lies outside folders.'],
  },
  'possibility-conclusions': {
    rule: 'Definite means every valid model; possible means at least one; impossible means no valid model.',
    interpretation: 'To prove possibility, construct one arrangement without violating any premise.',
    first: ['All clerks are employees. Some employees are artists.', ['The artist employee may be placed inside clerks.', 'It may also be placed outside clerks.', 'The overlap is allowed but not forced.'], 'Some clerks are artists is possible, not definite.'],
    second: ['All clerks are employees. No employees are artists.', ['Clerks are inside employees.', 'Employees cannot overlap artists.', 'No clerk can be an artist.'], 'Some clerks are artists is impossible.'],
  },
  'either-or-conclusions': {
    rule: 'A valid either-or pair consists of exact logical complements about the same relationship.',
    interpretation: 'Neither option may follow alone, but one must be true and they cannot both be true.',
    first: ['Premise: All clerks are employees. Pair: Some clerks are artists / No clerks are artists.', ['The premise does not settle clerks-artists overlap.', 'The pair uses the same two categories.', 'Some overlap and no overlap are exact complements.'], 'The pair is valid either-or.'],
    second: ['Some students are artists / No teachers are musicians.', ['The category pairs differ.', 'The statements can both be true.', 'They can also both be false.'], 'The pair is not valid either-or.'],
  },
  'mixed-syllogism-problems': {
    rule: 'Mixed questions may combine All, No, Some, and Some-not premises with modal or paired conclusions.',
    interpretation: 'Translate each premise into a region constraint, preserve witnesses, then classify the conclusion.',
    first: ['Some clerks are employees. All employees are supervisors. No supervisors are artists.', ['Carry the clerk-employee witness into supervisors.', 'Keep supervisors outside artists.', 'The witness is a clerk outside artists.'], 'Some clerks are not artists.'],
    second: ['All books are folders. Some folders are reports.', ['Books are contained in folders.', 'The report marker is somewhere in folders.', 'It need not be inside books.'], 'Some books are reports is possible but not definite.'],
  },
}

function introductionBlocks() {
  return [
    heading('Understanding Premises and Conclusions'),
    paragraph('A premise is information accepted as true for the problem. A conclusion is a statement tested to determine whether it must follow from those premises. Treat category names as abstract sets and use no outside knowledge.'),
    callout('Validity standard', 'A valid conclusion must be true in every arrangement satisfying the premises. A statement that works in only one arrangement is possible, not definite.', 'important'),
    heading('The four categorical forms', 3),
    formula('A-form: All A are B', 'A is entirely contained inside B. This does not mean all B are A, and it does not prove that any A exists.'),
    formula('E-form: No A are B', 'A and B do not overlap. The exclusion works in both directions, but it does not prove that either set has members.'),
    formula('I-form: Some A are B', 'At least one witnessed member belongs to both A and B. The overlap also proves that both categories exist.'),
    formula('O-form: Some A are not B', 'At least one witnessed A lies outside B. This proves that A exists but does not describe every A.'),
    paragraph('Set-language guide: “All analysts are employees” means analysts sit inside employees. “No folders are vehicles” means the regions are separate. “Some employees are trainers” places a marker in the overlap. “Some books are not manuals” places a marker in the books-only region.'),
    example('Text-only Venn guide', 'Read the diagrams as region instructions.', ['All A are B: [ B contains A ].', 'No A are B: [ A ]   [ B ].', 'Some A are B: place x in the A-and-B overlap.', 'Some A are not B: place x in the part of A outside B.'], 'Universal statements shape regions; only particular statements place required markers.'),
    example('Direction and existence', 'All clerks are employees. Which claims are guaranteed?', ['Clerks are contained in employees.', 'Employees may include people who are not clerks.', 'No clerk is required to exist.', 'Therefore the converse and any Some conclusion are unsupported.'], 'Only “All clerks are employees” and its set-containment meaning are definite.'),
    callout('Common mistakes', 'Do not reverse All, strengthen Some into All, assume existence from All or No, use real-world facts, treat possible as definite, or assume two groups overlap without evidence.', 'warning'),
    heading('Before testing a conclusion', 3),
    summary(['Accept the premises only for this problem.', 'Keep subset direction exact.', 'Preserve each existential witness.', 'Definite means true in every valid arrangement.', 'Universal premises have no existential import.']),
  ]
}

export function blocksFor(slug) {
  if (slug === 'understanding-premises-and-conclusions') return introductionBlocks()
  const item = teaching[slug] ?? {
    rule: 'Review categorical quantifiers and region constraints.',
    interpretation: 'Use only the premises and test the conclusion against every permitted arrangement.',
    first: ['All clerks are employees.', ['Place clerks inside employees.', 'Do not reverse the relation.'], 'All clerks are employees.'],
    second: ['Some books are not folders.', ['Place a witness in books outside folders.', 'Keep the conclusion particular.'], 'Some books are not folders.'],
  }
  return [
    heading(lessonSpecs.find((lesson) => lesson.slug === slug)?.title ?? topicTitle),
    paragraph(item.rule),
    callout('Set interpretation', item.interpretation),
    heading('Worked examples', 3),
    example('Example 1', item.first[0], item.first[1], item.first[2]),
    example('Example 2', item.second[0], item.second[1], item.second[2]),
    callout('Common mistakes', 'Watch for converse errors, unsupported existence, merged witnesses, quantifier strengthening, unsupported overlap, ignored negative premises, and possible conclusions treated as certain.', 'warning'),
    heading('Practice method', 3),
    paragraph('Translate each premise, check consistency, preserve required witnesses, and select only the answer supported by the complete model. The practice uses neutral categories and no outside knowledge.'),
    summary(['Identify each quantifier.', 'Apply universal restrictions.', 'Place existential witnesses.', 'Separate definite, possible, and impossible conclusions.', 'Proceed to the generated practice when ready.']),
  ]
}

export const mixedQuestions = [
  ['All clerks are employees. All employees are supervisors. Which conclusion follows?', ['All clerks are supervisors.', 'All supervisors are clerks.', 'Some clerks are supervisors.', 'No clerks are supervisors.'], 0, 'Clerks are nested inside employees and supervisors, so all clerks are supervisors. Distractors model converse, existential-import, and ignored-inclusion errors.'],
  ['No vehicles are plants. All tools are vehicles. Which conclusion follows?', ['No tools are plants.', 'Some tools are not plants.', 'All plants are tools.', 'No tools are vehicles.'], 0, 'Tools lie inside vehicles, which are disjoint from plants; therefore tools and plants cannot overlap. Distractors model existential import, reversal, and unsupported disjointness.'],
  ['Some students are artists. All artists are musicians. Which conclusion follows?', ['Some students are musicians.', 'All students are musicians.', 'Some musicians are not students.', 'No students are musicians.'], 0, 'The witnessed student-artist is carried into musicians. Distractors model quantifier strengthening, a lost witness, and ignored inclusion.'],
  ['Some books are folders. Some folders are reports. What must follow about books and reports?', ['No definite overlap or exclusion follows.', 'Some books are reports.', 'All books are reports.', 'No books are reports.'], 0, 'The two Some premises may use different folder witnesses, so books-reports overlap is unsettled. Distractors model merged witnesses and unsupported universal or negative conclusions.'],
  ['All clerks are employees. All employees are supervisors. Conclusion I: All clerks are supervisors. Conclusion II: Some clerks are supervisors.', ['Only conclusion I follows.', 'Only conclusion II follows.', 'Both conclusions follow.', 'Neither conclusion follows.'], 0, 'The universal chain proves conclusion I, but universal premises do not prove clerks exist. Distractors model existential import and missed transitivity.'],
  ['All artists are musicians. Which text-only Venn description is required?', ['Artists are entirely inside musicians.', 'Musicians are entirely inside artists.', 'Artists and musicians do not overlap.', 'An existential marker must appear in artists.'], 0, 'All places the artists region inside musicians without adding a marker. Distractors model reversed containment, false disjointness, and existential import.'],
  ['All clerks are employees. Some employees are artists. Is “Some clerks are artists” definite, possible, or impossible?', ['Possible but not definite.', 'Definitely follows.', 'Impossible.', 'The premises are inconsistent.'], 0, 'The artist employee may be inside or outside clerks, so one valid model supports the conclusion but not every model. Distractors model possible-as-definite and not-definite-as-impossible errors.'],
  ['Premise: All clerks are employees. Conclusions: Some clerks are artists / No clerks are artists. Do they form a valid either-or pair?', ['Yes, they are exact complements and neither follows alone.', 'No, both can be true.', 'No, both can be false.', 'No, they concern different category pairs.'], 0, 'The pair concerns the same relation, is exclusive and exhaustive, and neither statement follows independently. Distractors model invalid either-or tests.'],
]

export const quizQuestions = [
  ['What is a premise in a syllogism?', ['Information accepted as true for the problem.', 'A claim that is always accepted as the answer.', 'A real-world fact added by the solver.', 'A diagram that proves category existence.'], 0, 'A premise is accepted information for the problem. Distractors model confusion with conclusions, outside knowledge, and existential import.'],
  ['What makes a conclusion definitely valid?', ['It is true in every arrangement satisfying the premises.', 'It is true in at least one arrangement.', 'It sounds reasonable in real life.', 'It repeats a category from a premise.'], 0, 'Definite validity requires truth in every valid model. Distractors model possibility, outside knowledge, and superficial wording.'],
  ['All clerks are employees. All employees are supervisors. What follows?', ['All clerks are supervisors.', 'All supervisors are clerks.', 'Some clerks are supervisors.', 'No clerks are supervisors.'], 0, 'Transitive containment places clerks inside supervisors. Distractors model converse and existential-import errors.'],
  ['All artists are musicians. Which statement is an invalid converse?', ['All musicians are artists.', 'All artists are musicians.', 'No artist is outside musicians.', 'An artist, if one exists, is a musician.'], 0, 'Reversing All artists are musicians into All musicians are artists is invalid. Distractors model equivalent statements that preserve the original containment.'],
  ['No vehicles are plants. All tools are vehicles. What follows?', ['No tools are plants.', 'Some tools are not plants.', 'All plants are tools.', 'No tools are vehicles.'], 0, 'A subset of vehicles remains disjoint from plants. Distractors model existence assumptions and reversed relations.'],
  ['Some students are artists. Which conversion is valid?', ['Some artists are students.', 'All artists are students.', 'No artists are students.', 'Some artists are not students.'], 0, 'Some overlap is symmetric, so the same witness is both a student and an artist. Distractors model strengthening or changing the quantifier.'],
  ['Some students are artists. All artists are musicians. What follows?', ['Some students are musicians.', 'All students are musicians.', 'Some musicians are not students.', 'No students are musicians.'], 0, 'The same existential witness moves through the All relation. Distractors model strengthening, witness loss, and ignored inclusion.'],
  ['Some books are not folders. What is guaranteed?', ['At least one book lies outside folders.', 'No books are folders.', 'All books lie outside folders.', 'Some folders are not books.'], 0, 'The O-form requires one book outside folders and nothing stronger. Distractors model quantifier strengthening and invalid conversion.'],
  ['All clerks are employees. What existential claim follows?', ['No existential claim follows.', 'Some clerks are employees.', 'Some employees are clerks.', 'Some clerks are not employees.'], 0, 'Universal statements shape allowed regions without requiring members. Distractors model existential import and contradiction.'],
  ['All clerks are employees. All employees are supervisors. I: All clerks are supervisors. II: Some clerks are supervisors.', ['Only I follows.', 'Only II follows.', 'Both follow.', 'Neither follows.'], 0, 'I follows by transitivity; II assumes existence. Distractors model missed deduction and existential import.'],
  ['All artists are musicians. Which Venn relationship matches the premise?', ['Artists entirely inside musicians.', 'Musicians entirely inside artists.', 'Artists and musicians disjoint.', 'Artists partly outside musicians.'], 0, 'The A-form places the subject set wholly inside the predicate set. Distractors model reversed containment and incompatible regions.'],
  ['No folders are vehicles. Which diagram description is correct?', ['Folders and vehicles do not overlap.', 'Folders are inside vehicles.', 'Vehicles are inside folders.', 'A marker must appear outside both sets.'], 0, 'The E-form requires disjoint regions and no existential marker. Distractors model containment and existential import.'],
  ['All clerks are employees. Some employees are artists. “Some clerks are artists” is:', ['Possible but not definite.', 'Definitely true.', 'Impossible.', 'Evidence that the premises conflict.'], 0, 'The existing employee-artist may or may not be a clerk. Distractors model possible-as-definite and not-definite-as-impossible errors.'],
  ['When is an either-or conclusion pair valid?', ['When exact complements about the same relation are exclusive and exhaustive, and neither follows alone.', 'Whenever one statement is affirmative and one is negative.', 'Whenever the conclusions use any repeated category.', 'Whenever both conclusions are possible together.'], 0, 'Formal either-or requires same relation, complementarity, exclusivity, exhaustiveness, and no independent conclusion. Distractors model informal shortcut errors.'],
  ['Some clerks are employees. All employees are supervisors. No supervisors are artists. What follows?', ['Some clerks are not artists.', 'All clerks are not artists.', 'Some artists are clerks.', 'No clerks are employees.'], 0, 'The witnessed clerk enters supervisors and therefore remains outside artists. Distractors model quantifier strengthening, an ignored negative premise, or contradiction of the witness.'],
]

export function fixedQuestion([prompt, choices, correctIndex, explanation], position, quiz = false) {
  return { prompt, explanation, points: 1, position, status: 'active', ...(quiz ? { questionType: 'multiple_choice' } : {}), choices: choices.map((text, index) => ({ text, isCorrect: index === correctIndex, position: index + 1 })) }
}

export function validateQuestions(label, questions, expected) {
  const failures = []
  if (questions.length !== expected) failures.push(`${label} must have ${expected} questions.`)
  for (const question of questions) {
    if (question.choices.length !== 4) failures.push(`${label} question ${question.position} must have four choices.`)
    if (new Set(question.choices.map((choice) => choice.text.trim().toLowerCase().replace(/[.]$/u, ''))).size !== 4) failures.push(`${label} question ${question.position} has duplicate choices.`)
    if (question.choices.filter((choice) => choice.isCorrect).length !== 1) failures.push(`${label} question ${question.position} must have exactly one correct choice.`)
    if (!question.explanation.includes('Distractors model')) failures.push(`${label} question ${question.position} must document distractor errors.`)
  }
  return failures
}
