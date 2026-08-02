export const topicSlug = 'letter-series'
export const topicTitle = 'Letter Series'
export const topicDescription = 'A structured course on recognizing forward, backward, alternating, gap-based, grouped, and mixed alphabet patterns.'

export const generatedByLesson = {
  'forward-letter-patterns': 'forward-letter-series',
  'backward-letter-patterns': 'backward-letter-series',
  'skipping-letter-patterns': 'skipping-letter-series',
  'alternating-letter-patterns': 'alternating-letter-series',
  'increasing-and-decreasing-letter-gaps': 'increasing-gap-letter-series',
  'paired-and-grouped-letter-series': 'grouped-letter-series',
  'letter-and-number-combination-series': 'letter-number-series',
  'missing-term-letter-series': 'missing-term-letter-series',
  'mixed-letter-series-problems': 'mixed-letter-series',
}

export const lessonSpecs = [
  ['Understanding Alphabet Positions', 'understanding-alphabet-positions', 'reading', 14],
  ['Forward Letter Patterns', 'forward-letter-patterns', 'practice', 13],
  ['Backward Letter Patterns', 'backward-letter-patterns', 'practice', 13],
  ['Skipping Letter Patterns', 'skipping-letter-patterns', 'practice', 13],
  ['Alternating Letter Patterns', 'alternating-letter-patterns', 'practice', 15],
  ['Increasing and Decreasing Letter Gaps', 'increasing-and-decreasing-letter-gaps', 'practice', 15],
  ['Paired and Grouped Letter Series', 'paired-and-grouped-letter-series', 'practice', 15],
  ['Letter and Number Combination Series', 'letter-and-number-combination-series', 'practice', 15],
  ['Missing-Term Letter Series', 'missing-term-letter-series', 'practice', 15],
  ['Mixed Letter Series Problems', 'mixed-letter-series-problems', 'practice', 18],
  ['Mixed Letter Series Practice', 'mixed-letter-series-practice', 'practice', 20],
  ['Letter Series Topic Quiz', 'letter-series-topic-quiz', 'quiz', 25],
].map(([title, slug, lessonType, minutes], index) => ({ title, slug, lessonType, minutes, position: index + 1 }))

const heading = (text, level = 2) => ({ blockType: 'heading', content: { level, text } })
const paragraph = (text) => ({ blockType: 'paragraph', content: { text } })
const callout = (title, text, variant = 'info') => ({ blockType: 'callout', content: { title, text, variant } })
const example = (title, problem, steps, answer) => ({ blockType: 'example', content: { title, problem, steps, answer } })
const summary = (items) => ({ blockType: 'summary', content: { items } })

const teaching = {
  'forward-letter-patterns': ['Forward movement adds a fixed or repeating number of alphabet positions.', 'Write each letter position, subtract consecutive positions, and verify the same positive gap or explicit cycle from the beginning.', ['Constant forward step', 'A, D, G, J, ?', ['Positions are 1, 4, 7, 10.', 'Each transition adds 3.'], 'J + 3 positions is M.'], ['Explicit wraparound', 'T, W, Z, C, ?', ['The step is +3.', 'After Z, this stated wraparound pattern continues at A.'], 'C + 3 positions is F.'], 'Do not count the starting letter, move backward, reuse the previous letter, or wrap unless the question explicitly permits it.'],
  'backward-letter-patterns': ['Backward movement subtracts alphabet positions.', 'Convert letters to positions, preserve the negative sign, and verify every transition before answering.', ['Constant backward step', 'Z, W, T, Q, ?', ['Positions decrease by 3.', 'Subtract 3 from Q.'], 'The next letter is N.'], ['Explicit backward wraparound', 'D, A, X, U, ?', ['The step is −3.', 'The stated wraparound continues before A at Z.'], 'U − 3 positions is R.'], 'Do not reverse direction, subtract the wrong gap, stop at A when wrapping is stated, or assume wraparound when it is not stated.'],
  'skipping-letter-patterns': ['A skip describes letters passed over, while a step describes position difference.', 'A move of +2 skips one letter; a move of +3 skips two letters. Measure positions rather than counting inclusively.', ['One skipped letter', 'A, C, E, G, ?', ['Every step is +2.', 'One letter lies between consecutive terms.'], 'The next letter is I.'], ['Two skipped letters', 'B, E, H, K, ?', ['Every step is +3.', 'Two letters are skipped each time.'], 'The next letter is N.'], 'Do not confuse step size with skipped-letter count, include the starting letter, move one position too far, or reverse direction.'],
  'alternating-letter-patterns': ['Alternating series repeat two signed gaps or interleave two positional sequences.', 'Write the gap above every transition and confirm that the complete cycle repeats at least twice.', ['Two-gap cycle', 'A, C, F, H, K, ?', ['Gaps repeat +2, +3.', 'After +3, use +2.'], 'The next letter is M.'], ['Forward and backward cycle', 'B, F, E, I, H, ?', ['Gaps repeat +4, −1.', 'After −1, use +4.'], 'The next letter is L.'], 'Do not repeat only the latest gap, reverse cycle order, force one constant gap, or continue the wrong odd/even subseries.'],
  'increasing-and-decreasing-letter-gaps': ['Some letter series have positional gaps that change by a constant amount.', 'List signed gaps, inspect their change, and apply the next gap to the latest term.', ['Increasing gaps', 'A, B, D, G, K, ?', ['Gaps are +1, +2, +3, +4.', 'The next gap is +5.'], 'K + 5 positions is P.'], ['Decreasing movement', 'Z, Y, W, T, P, ?', ['Gaps are −1, −2, −3, −4.', 'The next gap is −5.'], 'P − 5 positions is K.'], 'Do not repeat the last gap, change it by the wrong amount, reverse the sign, or apply it to an earlier term.'],
  'paired-and-grouped-letter-series': ['Grouped terms keep a fixed width while each character column follows a clear progression.', 'Align the terms in columns and test each character position independently.', ['Letter pairs', 'AB, DE, GH, JK, ?', ['Both columns advance by 3.', 'J becomes M and K becomes N.'], 'The next pair is MN.'], ['Three-letter groups', 'ABC, DEF, GHI, ?', ['All three columns advance by 3.', 'GHI advances to JKL.'], 'The next group is JKL.'], 'Do not shift only one column, reverse group order, change group width, or treat the letters as hidden words.'],
  'letter-and-number-combination-series': ['Letter-number terms contain two independent, explicit progressions.', 'Separate the letter column from the number column, solve both, then recombine the results in the same format.', ['Both parts increase', 'A1, B3, C5, D7, ?', ['Letters move +1.', 'Numbers move +2.'], 'The next term is E9.'], ['Different increments', 'B1, D2, F3, H4, ?', ['Letters move +2.', 'Numbers move +1.'], 'The next term is J5.'], 'Do not solve only one part, reverse one progression, pair the correct letter with the wrong number, or change formatting.'],
  'missing-term-letter-series': ['A missing term must satisfy the same rule on both sides of its position.', 'Recover the candidate from the left, then verify that it produces the next visible term.', ['Missing middle letter', 'A, D, ?, J, M', ['The signed gap is +3.', 'D + 3 = G and G + 3 = J.'], 'The missing letter is G.'], ['Missing combined term', 'B2, D4, ?, H8', ['Letters move +2 and numbers move +2.', 'F6 connects both neighboring terms.'], 'The missing term is F6.'], 'Do not use only one side, insert a visual midpoint without proof, repeat a neighbor, or begin the correct rule from the wrong term.'],
  'mixed-letter-series-problems': ['Mixed items choose one primary family: fixed movement, alternating gaps, changing gaps, grouping, combined terms, or a missing term.', 'Check simple signed gaps first, then cycles, odd/even positions, groups, and independent letter-number progressions.', ['Identify increasing gaps', 'C, E, I, O, ?', ['Gaps are +2, +4, +6.', 'The next gap is +8.'], 'O + 8 positions is W.'], ['Identify interleaving', 'A, Z, C, X, E, V, ?', ['Odd positions are A, C, E.', 'Even positions are Z, X, V.'], 'The next odd-position letter is G.'], 'Do not accept a rule that explains only the final transitions, relies on a word, or has a simpler competing interpretation.'],
}

export function blocksFor(slug) {
  if (slug === 'understanding-alphabet-positions') return [
    heading('Alphabet positions make letter patterns measurable'), paragraph('Use A = 1, B = 2, and continue in order through Z = 26. Letter Series questions in this course use uppercase letters and explicit numerical movement, not vocabulary or hidden words.'),
    callout('Alphabet-position table', 'A 1, B 2, C 3, D 4, E 5, F 6, G 7, H 8, I 9, J 10, K 11, L 12, M 13, N 14, O 15, P 16, Q 17, R 18, S 19, T 20, U 21, V 22, W 23, X 24, Y 25, Z 26.'),
    heading('Measure signed gaps', 3), callout('Gap table', 'Subtract the earlier position from the later position. A to C is +2. Z to W is −3. A +2 step skips one intervening letter.'),
    example('Forward movement', 'A, C, E, G, ...', ['Positions are 1, 3, 5, 7.', 'Every gap is +2.'], 'The next letter is I.'),
    example('Backward movement', 'Z, W, T, Q, ...', ['Positions are 26, 23, 20, 17.', 'Every gap is −3.'], 'The next letter is N.'),
    example('Increasing gaps', 'B, E, I, N, ...', ['Gaps are +3, +4, +5.', 'The next gap is +6.'], 'The next letter is T.'),
    example('Interleaved positions', 'A, Z, B, Y, C, X, ...', ['Odd positions move A, B, C.', 'Even positions move Z, Y, X.'], 'The next odd-position letter is D.'),
    heading('Wrap only when stated', 3), paragraph('Without explicit permission, a move that passes Z or A is invalid. When wraparound is stated, Z + 1 becomes A and A − 1 becomes Z; the explanation must identify the wrap.'),
    callout('Common mistakes', 'Avoid inclusive counting, moving in the wrong direction, ignoring alternating positions, wrapping without permission, applying only the last gap, or choosing a rule that does not explain every transition.', 'warning'),
    summary(['Translate letters to positions 1–26.', 'Keep gap signs and cycles exact.', 'Check odd and even positions when needed.', 'Require one rule that explains the complete series.']),
  ]
  const item = teaching[slug]
  if (item !== undefined) return [heading(item[0]), paragraph(item[0]), callout('Alphabet-position strategy', item[1]), example(...item[2]), example(...item[3]), callout('Common mistakes', item[4], 'warning'), heading('Activity transition', 3), paragraph('Write positions or aligned columns, state the rule, verify every visible transition, and then choose the only supported answer.'), summary([item[1], item[4], 'Use uppercase formatting and one unique answer.'])]
  return [heading('Mixed Letter Series review'), paragraph('Review alphabet positions, signed movement, fixed skips, alternating cycles, changing gaps, groups, combined terms, and two-sided missing-term checks.'), callout('No vocabulary guessing', 'Every answer follows explicit positions and sequence rules. Hidden words, abbreviations, spelling, and visual font tricks are outside this topic.'), example('Gap review', 'A, D, G, J, ?', ['Positions increase by 3.', 'J + 3 = M.'], 'The next letter is M.'), example('Group review', 'AZ, BY, CX, DW, ?', ['First letters move forward by 1.', 'Second letters move backward by 1.'], 'The next pair is EV.'), callout('Common mistakes', 'Reject wrong directions, inclusive counts, repeated last gaps, wrong subseries, partial group shifts, and mismatched letter-number parts.', 'warning'), heading('Ready check', 3), paragraph('Confirm the rule across the entire series and make sure the requested term is unique.'), summary(['Use positions 1–26.', 'Wrap only when explicitly stated.', 'Choose the simplest complete rule.'])]
}

export const mixedQuestions = [
  ['What comes next: A, D, G, J, ?', ['M', 'L', 'G', 'P'], 0, 'Each term moves forward by 3 positions, so J + 3 = M.'],
  ['What comes next: Z, W, T, Q, ?', ['N', 'T', 'M', 'U'], 0, 'Each term moves backward by 3 positions, so Q − 3 = N.'],
  ['What comes next: B, E, H, K, ?', ['N', 'M', 'O', 'H'], 0, 'The +3 step skips two letters each time, so K + 3 = N.'],
  ['What comes next: A, C, F, H, K, ?', ['M', 'N', 'H', 'O'], 0, 'The gaps repeat +2, +3; after +3, apply +2 to K to get M.'],
  ['What comes next: A, B, D, G, K, ?', ['P', 'O', 'Q', 'N'], 0, 'The gaps are +1, +2, +3, +4, so the next gap is +5 and K becomes P.'],
  ['What comes next: AB, DE, GH, JK, ?', ['MN', 'MK', 'NM', 'NO'], 0, 'Both group columns advance by 3 positions, so JK becomes MN.'],
  ['What comes next: A1, B3, C5, D7, ?', ['E9', 'E7', 'D9', 'F9'], 0, 'Letters move +1 and numbers move +2, producing E9.'],
  ['Which term is missing: B, E, ?, K, N?', ['H', 'G', 'I', 'E'], 0, 'Every step is +3; E + 3 = H and H + 3 = K.'],
]

export const quizQuestions = [
  ['What is the alphabet position of M?', ['13', '12', '14', '26'], 0, 'Counting A as 1 gives M the position 13.'],
  ['What comes next: C, F, I, L, ?', ['O', 'N', 'P', 'I'], 0, 'Each term moves forward by 3 positions, so L becomes O.'],
  ['What comes next: P, M, J, G, ?', ['D', 'C', 'J', 'K'], 0, 'Each term moves backward by 3 positions, so G becomes D.'],
  ['What comes next: A, C, E, G, ?', ['I', 'H', 'J', 'E'], 0, 'The +2 step skips one letter, so G becomes I.'],
  ['With wraparound after Z, what comes next: T, W, Z, C, ?', ['F', 'E', 'Z', 'G'], 0, 'The explicit +3 rule wraps Z to C; applying +3 again makes F.'],
  ['With backward wraparound before A, what comes next: D, A, X, U, ?', ['R', 'S', 'X', 'Q'], 0, 'The explicit −3 rule wraps A to X; U − 3 is R.'],
  ['What comes next: A, C, F, H, K, ?', ['M', 'N', 'L', 'H'], 0, 'The gaps repeat +2, +3; the next +2 moves K to M.'],
  ['What comes next: C, E, I, O, ?', ['W', 'U', 'V', 'X'], 0, 'Gaps are +2, +4, +6, so the next +8 moves O to W.'],
  ['What comes next: Z, Y, W, T, P, ?', ['K', 'L', 'J', 'P'], 0, 'Gaps are −1, −2, −3, −4, so the next −5 moves P to K.'],
  ['What comes next: A, Z, C, X, E, V, ?', ['G', 'T', 'F', 'H'], 0, 'Odd-position letters are A, C, E, G while even positions are Z, X, V.'],
  ['What comes next: AZ, BY, CX, DW, ?', ['EV', 'EU', 'VE', 'EX'], 0, 'First letters move +1 and second letters move −1, producing EV.'],
  ['What comes next: ABC, DEF, GHI, ?', ['JKL', 'JLK', 'KLM', 'GHI'], 0, 'Each aligned column advances by 3 positions, producing JKL.'],
  ['What comes next: A2, C4, E6, G8, ?', ['I10', 'I8', 'H10', 'J10'], 0, 'Letters move +2 and numbers move +2, producing I10.'],
  ['Which term is missing: A, D, ?, J, M?', ['G', 'F', 'H', 'D'], 0, 'The +3 rule gives D + 3 = G and G + 3 = J.'],
  ['What comes next: B, F, E, I, H, ?', ['L', 'K', 'G', 'M'], 0, 'The gaps repeat +4, −1; after −1, H + 4 = L.'],
]

export function fixedQuestion(item, position, quiz = false) { return { ...(quiz ? { questionType: 'multiple_choice' } : {}), prompt: item[0], explanation: `${item[3]} Distractors model wrong direction, inclusive counting, wrong gap or cycle, wrong subseries, partial group shifts, or mismatched letter-number parts as applicable.`, points: 1, position, status: 'active', choices: item[1].map((text, index) => ({ text, isCorrect: index === item[2], position: index + 1 })) } }
export function validateQuestions(label, questions, expected) { const failures = []; if (questions.length !== expected) failures.push(`${label} must have ${expected} questions.`); for (const question of questions) { if (question.choices.length !== 4) failures.push(`${label} question ${question.position} needs four choices.`); if (question.choices.filter((choice) => choice.isCorrect).length !== 1) failures.push(`${label} question ${question.position} needs exactly one answer.`); if (new Set(question.choices.map((choice) => choice.text.trim().toUpperCase())).size !== 4) failures.push(`${label} question ${question.position} has duplicate visible choices.`); if ((question.explanation ?? '').trim().length < 20) failures.push(`${label} question ${question.position} lacks a verified explanation.`) } return failures }
