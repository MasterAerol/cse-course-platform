export const topicSlug = 'number-series'
export const topicTitle = 'Number Series'
export const topicDescription = 'A structured course on recognizing arithmetic, geometric, alternating, difference-based, power-based, recursive, and mixed number patterns.'

export const generatedByLesson = {
  'addition-and-subtraction-series': 'addition-subtraction-series',
  'multiplication-and-division-series': 'multiplication-division-series',
  'alternating-operation-series': 'alternating-operation-series',
  'increasing-and-decreasing-differences': 'increasing-difference-series',
  'squares-cubes-and-power-patterns': 'squares-cubes-powers-series',
  'fibonacci-type-and-recursive-series': 'fibonacci-recursive-series',
  'interleaved-and-two-pattern-series': 'interleaved-two-pattern-series',
  'missing-term-number-series': 'missing-term-series',
  'mixed-number-series-problems': 'mixed-number-series',
}

export const lessonSpecs = [
  ['Understanding Number Patterns', 'understanding-number-patterns', 'reading', 14],
  ['Addition and Subtraction Series', 'addition-and-subtraction-series', 'practice', 13],
  ['Multiplication and Division Series', 'multiplication-and-division-series', 'practice', 13],
  ['Alternating Operation Series', 'alternating-operation-series', 'practice', 14],
  ['Increasing and Decreasing Differences', 'increasing-and-decreasing-differences', 'practice', 15],
  ['Squares, Cubes, and Power Patterns', 'squares-cubes-and-power-patterns', 'practice', 14],
  ['Fibonacci-Type and Recursive Series', 'fibonacci-type-and-recursive-series', 'practice', 15],
  ['Interleaved and Two-Pattern Series', 'interleaved-and-two-pattern-series', 'practice', 15],
  ['Missing-Term Number Series', 'missing-term-number-series', 'practice', 15],
  ['Mixed Number Series Problems', 'mixed-number-series-problems', 'practice', 18],
  ['Mixed Number Series Practice', 'mixed-number-series-practice', 'practice', 20],
  ['Number Series Topic Quiz', 'number-series-topic-quiz', 'quiz', 25],
].map(([title, slug, lessonType, minutes], index) => ({ title, slug, lessonType, minutes, position: index + 1 }))

const heading = (text, level = 2) => ({ blockType: 'heading', content: { level, text } })
const paragraph = (text) => ({ blockType: 'paragraph', content: { text } })
const callout = (title, text, variant = 'info') => ({ blockType: 'callout', content: { title, text, variant } })
const example = (title, problem, steps, answer) => ({ blockType: 'example', content: { title, problem, steps, answer } })
const summary = (items) => ({ blockType: 'summary', content: { items } })

const teaching = {
  'addition-and-subtraction-series': ['Arithmetic series use signed differences between consecutive terms.', 'Subtract each term from the next, preserve the sign, and verify the same difference or stated cycle across every transition.', ['Constant addition', '8, 13, 18, 23, ?', ['The differences are +5, +5, +5.', 'Apply +5 once more to 23.'], 'The next term is 28.'], ['Alternating differences', '10, 14, 12, 16, 14, ?', ['The differences repeat +4, −2.', 'After −2, apply +4.'], 'The next term is 18.'], 'Do not reverse a subtraction sign, skip a transition, repeat the previous term, or follow only one side of an alternating cycle.'],
  'multiplication-and-division-series': ['Geometric series use a constant ratio, while alternating ratio series repeat multiplication and division operations.', 'Divide each term by the preceding term when possible and verify the ratio across the entire list.', ['Constant multiplication', '3, 9, 27, 81, ?', ['Each term is multiplied by 3.', 'Apply ×3 to 81.'], 'The next term is 243.'], ['Constant division', '256, 128, 64, 32, ?', ['Each term is divided by 2.', 'Apply ÷2 to 32.'], 'The next term is 16.'], 'Do not add the factor, invert the ratio, multiply neighboring terms, or accept a long inexact decimal.'],
  'alternating-operation-series': ['Alternating series repeat a visible operation cycle such as +3, ×2.', 'Write each transition above the terms, locate the cycle boundary, and apply only the next operation.', ['Two-operation cycle', '2, 5, 10, 13, 26, ?', ['Transitions are +3, ×2, +3, ×2.', 'The next operation is +3.'], 'The next term is 29.'], ['Multiply then subtract', '4, 12, 10, 30, 28, ?', ['Transitions repeat ×3, −2.', 'After −2, apply ×3.'], 'The next term is 84.'], 'Do not repeat only the latest operation, reverse the cycle, apply both operations at once, or force a constant difference.'],
  'increasing-and-decreasing-differences': ['Some series have differences that form their own arithmetic pattern.', 'Build a first-difference row, then inspect how those differences change.', ['Increasing differences', '5, 7, 10, 14, 19, ?', ['First differences are +2, +3, +4, +5.', 'The next difference is +6.'], 'The next term is 25.'], ['Decreasing differences', '100, 97, 91, 82, 70, ?', ['First differences are −3, −6, −9, −12.', 'The next difference is −15.'], 'The next term is 55.'], 'Do not repeat the last difference, average unrelated differences, change the growth incorrectly, or add a difference to the wrong term.'],
  'squares-cubes-and-power-patterns': ['Power patterns use exact indexed values such as consecutive squares, cubes, or powers of a small base.', 'Label term positions and test the same exponent and offset for every term.', ['Consecutive squares', '1, 4, 9, 16, 25, ?', ['These are 1² through 5².', 'The next term is 6².'], 'The next term is 36.'], ['Square plus a constant', '3, 6, 11, 18, 27, ?', ['Each term is n² + 2.', 'For n = 6, compute 36 + 2.'], 'The next term is 38.'], 'Do not double instead of square, square the previous term, confuse squares with cubes, or lose the fixed offset.'],
  'fibonacci-type-and-recursive-series': ['Recursive series define a term using earlier terms, commonly the previous two.', 'Test the same recurrence across at least three generated terms before using it.', ['Previous two terms', '2, 3, 5, 8, 13, ?', ['5 = 2 + 3, 8 = 3 + 5, and 13 = 5 + 8.', 'Add 8 and 13.'], 'The next term is 21.'], ['Adjusted recursion', '1, 2, 4, 7, 12, ?', ['Each term is the previous two terms plus 1.', 'Compute 7 + 12 + 1.'], 'The next term is 20.'], 'Do not double only the latest term, add the wrong pair, reuse the latest difference, or omit a constant adjustment.'],
  'interleaved-and-two-pattern-series': ['Interleaved series place one sequence in odd positions and another in even positions.', 'Split the list by position, verify both subseries, and continue only the subseries that owns the blank.', ['Two arithmetic subseries', '2, 10, 4, 20, 6, 30, ?', ['Odd positions are 2, 4, 6.', 'Even positions are 10, 20, 30.'], 'The next odd-position term is 8.'], ['Two doubling subseries', '3, 5, 6, 10, 12, 20, ?', ['Odd positions double: 3, 6, 12.', 'Even positions double: 5, 10, 20.'], 'The next odd-position term is 24.'], 'Do not treat the whole list as one progression, continue the wrong positional sequence, swap odd and even positions, or average neighbors.'],
  'missing-term-number-series': ['A missing-term question must satisfy transitions on both sides of the blank.', 'Identify the family from the visible terms, recover the blank, then verify both adjacent transitions.', ['Missing arithmetic term', '4, 9, ?, 19, 24', ['The constant difference is +5.', '9 + 5 = 14 and 14 + 5 = 19.'], 'The missing term is 14.'], ['Missing geometric term', '3, 6, 12, ?, 48', ['Each term doubles.', '12 × 2 = 24 and 24 × 2 = 48.'], 'The missing term is 24.'], 'Do not use only the left or right side, insert an average without proving it, repeat a neighbor, or start the correct rule from the wrong term.'],
  'mixed-number-series-problems': ['Mixed questions may use arithmetic, ratios, cycles, changing differences, powers, recursion, interleaving, or a missing term.', 'Check families in a consistent order and accept the simplest rule that explains every visible transition.', ['Family selection', '2, 5, 9, 14, 20, ?', ['Constant differences fail.', 'Differences 3, 4, 5, 6 reveal a changing-difference rule.'], 'The next term is 27.'], ['Interleaving check', '20, 2, 18, 4, 16, 6, ?', ['Odd positions decrease by 2.', 'Even positions increase by 2.'], 'The next odd-position term is 14.'], 'Do not choose a rule because it fits only the last two terms or prefer a complicated rule over a complete simpler one.'],
}

export function blocksFor(slug) {
  if (slug === 'understanding-number-patterns') return [
    heading('A systematic way to read number patterns'), paragraph('A defensible Number Series rule explains every visible transition. The simplest complete rule is normally preferred over a complicated rule that merely fits the last terms.'),
    callout('Pattern-checking order', 'Check consecutive differences, second differences, ratios, repeating operations, odd/even positions, squares or cubes, and sums of earlier terms. Verify the chosen rule across the entire series.'),
    heading('Pattern-checking table', 3), callout('What each check reveals', 'Equal first differences suggest arithmetic change. Equal ratios suggest geometric change. Patterned differences suggest a second layer. Repeating operations suggest a cycle. Separate odd and even positions can reveal interleaving.'),
    example('Constant difference', '4, 7, 10, 13, ...', ['Differences are +3 throughout.', 'Continue with one more +3.'], 'The next term is 16.'),
    example('Constant ratio', '3, 6, 12, 24, ...', ['Each term is twice the preceding term.', 'Continue with ×2.'], 'The next term is 48.'),
    example('Changing differences', '2, 5, 9, 14, 20, ...', ['Differences are +3, +4, +5, +6.', 'The next difference is +7.'], 'The next term is 27.'),
    example('Interleaved patterns', '2, 4, 3, 6, 4, 8, ...', ['Odd positions are 2, 3, 4.', 'Even positions are 4, 6, 8.'], 'The next odd-position term is 5.'),
    example('Recursive pattern', '1, 1, 2, 3, 5, 8, ...', ['Each new term is the sum of the previous two.', 'Add 5 and 8.'], 'The next term is 13.'),
    heading('Verify every transition', 3), paragraph('Never accept a pattern based only on the last two terms. Apply the proposed rule from the beginning, confirm operation order, and make sure the requested term is unique.'),
    callout('Common mistakes', 'Avoid checking only one transition, assuming every rule uses addition, averaging unrelated terms, ignoring alternating positions, using a rule that misses a term, or choosing needless complexity.', 'warning'),
    summary(['Check differences before ratios.', 'Split odd and even positions when one rule fails.', 'Look for exact powers and recurrences.', 'Verify the complete rule before answering.']),
  ]
  const item = teaching[slug]
  if (item !== undefined) return [heading(item[0]), paragraph(item[0]), callout('Recognition method', item[1]), example(...item[2]), example(...item[3]), callout('Common mistakes', item[4], 'warning'), heading('Activity transition', 3), paragraph('State the rule in words, verify it from the first term, and recompute the requested value before choosing an answer.'), summary([item[1], item[4], 'Choose the only value supported by the complete rule.'])]
  return [heading('Mixed Number Series review'), paragraph('Review differences, ratios, operation cycles, difference tables, indexed powers, recursive rules, interleaving, and two-sided missing-term checks.'), callout('Exact arithmetic only', 'Every item has one defensible integer rule. Do not estimate, round, or infer a rule from visual spacing.'), example('Difference review', '6, 10, 15, 21, 28, ?', ['Differences are 4, 5, 6, 7.', 'The next difference is 8.'], 'The next term is 36.'), example('Recursive review', '3, 4, 7, 11, 18, ?', ['Each term is the sum of the preceding two.', '11 + 18 = 29.'], 'The next term is 29.'), callout('Common mistakes', 'Reject repeated last steps, inverse ratios, reversed cycles, wrong subseries, and one-sided missing-term guesses.', 'warning'), heading('Ready check', 3), paragraph('For every answer, name the family and verify every visible transition.'), summary(['Use the simplest complete rule.', 'Keep arithmetic exact.', 'Require one unique answer.'])]
}

export const mixedQuestions = [
  ['What comes next: 7, 12, 17, 22, ?', ['27', '22', '32', '17'], 0, 'The constant difference is +5, so 22 + 5 = 27.'],
  ['What comes next: 160, 80, 40, 20, ?', ['10', '40', '18', '5'], 0, 'Each term is divided by 2, so 20 ÷ 2 = 10.'],
  ['What comes next: 3, 6, 8, 16, 18, ?', ['36', '20', '21', '34'], 0, 'The operations repeat ×2, +2; after +2 the next operation is ×2, giving 36.'],
  ['What comes next: 4, 7, 11, 16, 22, ?', ['29', '28', '34', '7'], 0, 'Differences are +3, +4, +5, +6, so the next difference is +7 and the answer is 29.'],
  ['What comes next: 1, 8, 27, 64, 125, ?', ['216', '250', '36', '625'], 0, 'These are 1³ through 5³; 6³ = 216.'],
  ['What comes next: 3, 5, 8, 13, 21, ?', ['34', '42', '29', '26'], 0, 'Each term is the sum of the previous two, so 13 + 21 = 34.'],
  ['What comes next: 2, 20, 5, 18, 8, 16, ?', ['11', '14', '18', '9'], 0, 'Odd positions increase by 3 while even positions decrease by 2; the next odd term is 11.'],
  ['Which number is missing: 2, 5, 10, 17, ?, 37?', ['26', '25', '27', '20'], 0, 'The terms are n² + 1: 1²+1 through 6²+1, so the missing fifth term is 26.'],
]

export const quizQuestions = [
  ['What constant difference appears in 9, 14, 19, 24?', ['5', '4', '9', '15'], 0, 'Subtract adjacent terms: each difference is 5.'],
  ['What comes next: 6, 10, 14, 18, ?', ['22', '24', '18', '20'], 0, 'The series adds 4 each time, so 18 + 4 = 22.'],
  ['What comes next: 50, 43, 36, 29, ?', ['22', '36', '21', '15'], 0, 'The series subtracts 7 each time, so 29 − 7 = 22.'],
  ['What comes next: 2, 6, 18, 54, ?', ['162', '108', '57', '27'], 0, 'Each term is multiplied by 3, so 54 × 3 = 162.'],
  ['What comes next: 625, 125, 25, 5, ?', ['1', '25', '0', '5'], 0, 'Each term is divided by 5, so 5 ÷ 5 = 1.'],
  ['What comes next: 4, 12, 10, 30, 28, ?', ['84', '26', '82', '58'], 0, 'The cycle is ×3, −2; after −2, apply ×3 to 28.'],
  ['What comes next: 3, 5, 8, 12, 17, ?', ['23', '22', '27', '6'], 0, 'Differences are 2, 3, 4, 5; the next difference is 6, giving 23.'],
  ['What comes next: 90, 88, 84, 78, 70, ?', ['60', '62', '68', '50'], 0, 'Differences are −2, −4, −6, −8; the next is −10, giving 60.'],
  ['What comes next: 4, 9, 16, 25, 36, ?', ['49', '42', '72', '64'], 0, 'These are consecutive squares 2² through 6²; 7² = 49.'],
  ['What comes next: 1, 8, 27, 64, ?', ['125', '81', '128', '100'], 0, 'These are consecutive cubes; 5³ = 125.'],
  ['What comes next: 4, 6, 10, 16, 26, ?', ['42', '52', '36', '32'], 0, 'Each term is the sum of the previous two, so 16 + 26 = 42.'],
  ['What comes next: 3, 20, 6, 18, 9, 16, ?', ['12', '14', '19', '10'], 0, 'Odd terms increase by 3; even terms decrease by 2. The next odd term is 12.'],
  ['What comes next: 2, 3, 4, 9, 8, 27, ?', ['16', '81', '12', '32'], 0, 'Odd positions double 2, 4, 8, 16 while even positions triple 3, 9, 27.'],
  ['Which number is missing: 5, 11, ?, 23, 29?', ['17', '16', '18', '12'], 0, 'The constant difference is +6; 11 + 6 = 17 and 17 + 6 = 23.'],
  ['What comes next: 2, 6, 7, 21, 22, 66, ?', ['67', '132', '198', '68'], 0, 'The operations alternate ×3, +1. After 66, apply +1 to get 67.'],
]

export function fixedQuestion(item, position, quiz = false) { return { ...(quiz ? { questionType: 'multiple_choice' } : {}), prompt: item[0], explanation: `${item[3]} Distractors model the visible wrong-operation, wrong-step, repeated-value, or wrong-series-family interpretations as applicable.`, points: 1, position, status: 'active', choices: item[1].map((text, index) => ({ text, isCorrect: index === item[2], position: index + 1 })) } }
export function validateQuestions(label, questions, expected) { const failures = []; if (questions.length !== expected) failures.push(`${label} must have ${expected} questions.`); for (const question of questions) { if (question.choices.length !== 4) failures.push(`${label} question ${question.position} needs four choices.`); if (question.choices.filter((choice) => choice.isCorrect).length !== 1) failures.push(`${label} question ${question.position} needs exactly one answer.`); if (new Set(question.choices.map((choice) => choice.text.trim().toLowerCase())).size !== 4) failures.push(`${label} question ${question.position} has duplicate visible choices.`); if ((question.explanation ?? '').trim().length < 15) failures.push(`${label} question ${question.position} lacks a verified explanation.`) } return failures }
