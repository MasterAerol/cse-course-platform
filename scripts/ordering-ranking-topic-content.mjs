export const topicSlug = 'ordering-and-ranking'
export const topicTitle = 'Ordering and Ranking'
export const topicDescription = 'A structured course on positions from either end, total-person formulas, rearrangements, comparative order, middle positions, multi-rank clues, and queue changes.'

export const lessonSpecs = [
  ['Understanding Ordering and Ranking', 'understanding-ordering-and-ranking', 'reading', 16],
  ['Rank from the Left or Right', 'rank-from-left-or-right', 'practice', 15],
  ['Total Persons from Two Ranks', 'total-persons-from-two-ranks', 'practice', 15],
  ['Position After Rearrangement', 'position-after-rearrangement', 'practice', 16],
  ['Comparative Ordering', 'comparative-ordering', 'practice', 16],
  ['Before-and-After Relationships', 'before-and-after-relationships', 'practice', 16],
  ['Middle Position Problems', 'middle-position-problems', 'practice', 15],
  ['Comparing Multiple Ranks', 'comparing-multiple-ranks', 'practice', 18],
  ['Queue and Line Problems', 'queue-and-line-problems', 'practice', 18],
  ['Mixed Ordering and Ranking Problems', 'mixed-ordering-and-ranking-problems', 'practice', 20],
  ['Mixed Ordering and Ranking Practice', 'mixed-ordering-and-ranking-practice', 'practice', 20],
  ['Ordering and Ranking Topic Quiz', 'ordering-and-ranking-topic-quiz', 'quiz', 25],
].map(([title, slug, lessonType, minutes], index) => ({ title, slug, lessonType, minutes, position: index + 1 }))

export const generatedByLesson = {
  'rank-from-left-or-right': 'left-right-ranking',
  'total-persons-from-two-ranks': 'total-from-two-ranks',
  'position-after-rearrangement': 'rearranged-position',
  'comparative-ordering': 'comparative-ordering',
  'before-and-after-relationships': 'before-after-order',
  'middle-position-problems': 'middle-position',
  'comparing-multiple-ranks': 'multi-rank-comparison',
  'queue-and-line-problems': 'queue-line-ranking',
  'mixed-ordering-and-ranking-problems': 'mixed-ordering-ranking',
}

const heading = (text, level = 2) => ({ blockType: 'heading', content: { text, level } })
const paragraph = (text) => ({ blockType: 'paragraph', content: { text } })
const callout = (title, text, variant = 'info') => ({ blockType: 'callout', content: { title, text, variant } })
const example = (title, problem, steps, answer) => ({ blockType: 'example', content: { title, problem, steps, answer } })
const summary = (items) => ({ blockType: 'summary', content: { items } })

const teaching = {
  'understanding-ordering-and-ranking': ['A rank is a one-based position measured from a named end or direction.', 'Mark the direction, named person, and total before choosing a formula.', 'In a line of 20, 6th from the left is 15th from the right.', 'Seven people before a student means the student is ranked 8th.'],
  'rank-from-left-or-right': ['Opposite rank counts the same item from the other end.', 'Use opposite rank = total - known rank + 1.', 'The 8th book from the left among 30 is 23rd from the right.', 'Check that the two ranks add to total + 1.'],
  'total-persons-from-two-ranks': ['Two ranks of one person overlap at that person.', 'Use total = front rank + back rank - 1.', 'A runner 8th from the front and 12th from the back is among 19 runners.', 'Subtract one exactly once to remove the overlap.'],
  'position-after-rearrangement': ['Movement changes a position according to the stated direction.', 'Overtaking improves a front rank; being overtaken worsens it.', 'A runner ranked 11th who overtakes four runners becomes 7th.', 'A book moving three places right from 9th becomes 12th from the left.'],
  'comparative-ordering': ['Comparison clues form a directed chain from higher to lower.', 'Link every clue and reject conclusions not forced by the chain.', 'If Ana is above Ben and Ben is above Carlo, Ana is above Carlo.', 'A complete chain identifies unique highest and lowest members.'],
  'before-and-after-relationships': ['People between two positions do not include either endpoint.', 'A gap with n people between has a position difference of n + 1.', 'If D is 6th and three people are between D and E after D, E is 10th.', 'Add for after and subtract for before when ranks use the same direction.'],
  'middle-position-problems': ['Odd totals have one middle; even totals have two central positions.', 'For odd n use (n + 1) / 2; for even n use n/2 and n/2 + 1.', 'The middle of 21 positions is 11th.', 'The central positions among 20 are 10th and 11th.'],
  'comparing-multiple-ranks': ['Multi-rank questions are solved one clue at a time on one scale.', 'Write each intermediate rank before applying the next clue.', 'P is 5th, Q is four below P, and R is two above Q, so R is 7th.', 'Words such as above and below change front ranks in opposite directions.'],
  'queue-and-line-problems': ['A front rank changes only when people join or leave ahead.', 'Update the total separately from the named person’s rank.', 'If three people ahead of the 9th person leave, the new rank is 6th.', 'People leaving behind reduce the total but do not change the front rank.'],
  'mixed-ordering-and-ranking-problems': ['Mixed questions first require identifying the relationship type.', 'Choose among opposite-rank, overlap, movement, chain, middle, or queue rules.', 'Front and back ranks signal the overlap formula.', 'Recompute from the original wording before selecting an answer.'],
}

export function blocksFor(slug) {
  const item = teaching[slug] ?? ['Review the core Ordering and Ranking relationships.', 'Translate every phrase into a one-based position before calculating.', 'Opposite ranks add to total + 1.', 'Verify direction and whether endpoints are counted.']
  return [
    heading(lessonSpecs.find((lesson) => lesson.slug === slug)?.title ?? topicTitle),
    paragraph(item[0]),
    callout('Method', item[1]),
    heading('Worked examples', 3),
    example('Direct relationship', item[2], ['Identify the reference direction.', 'Apply the matching rank relationship.'], item[2]),
    example('Verification', item[3], ['Recompute the rank from the wording.', 'Confirm the answer is a valid one-based position.'], item[3]),
    callout('Common mistakes', 'Avoid omitting the plus one, counting the named person twice, reversing movement, confusing people-between with position difference, and changing a rank for events behind the person.', 'warning'),
    heading('Check before answering', 3),
    paragraph('Confirm the reference end, count overlap once, and keep every intermediate rank within the stated line or queue.'),
    summary(['Ranks start at one.', 'Direction controls addition or subtraction.', 'Verify the final position against the total.']),
  ]
}

export const mixedQuestions = [
  ['A student is 9th from the front in a line of 28. What is the rank from the back?', ['20th', '19th', '9th', '37th'], 0, 'Use 28 - 9 + 1 = 20. Distractors model omitting the plus one, reversing direction, or adding the rank.'],
  ['A runner is 7th from the front and 11th from the back. How many runners are there?', ['17', '18', '11', '4'], 0, 'Use 7 + 11 - 1 = 17. Distractors model counting the runner twice, using one rank, or subtracting ranks.'],
  ['A runner ranked 12th overtakes five runners. What is the new rank?', ['7th', '17th', '8th', '5th'], 0, 'Overtaking improves the front rank: 12 - 5 = 7. Distractors model the wrong direction, counting the start, or returning the number overtaken.'],
  ['Ana ranks above Ben, Ben above Carlo, and Carlo above Dina. Who ranks highest?', ['Ana', 'Ben', 'Carlo', 'Dina'], 0, 'The complete chain is Ana, Ben, Carlo, Dina. Distractors model stopping early or reversing the comparison.'],
  ['There are four people between P and Q. P is 6th and Q is after P. What is Q’s position?', ['11th', '10th', '2nd', '7th'], 0, 'Four people between means a difference of five, so 6 + 5 = 11. Distractors model forgetting an endpoint, reversing direction, or treating Q as immediate.'],
  ['Which position is the middle of a line of 25?', ['13th', '12th', '14th', '26th'], 0, 'For an odd total use (25 + 1) / 2 = 13. Distractors model using half incorrectly or shifting the middle.'],
  ['P is ranked 5th. Q is four places below P, and R is two places above Q. What is R’s rank?', ['7th', '9th', '3rd', '11th'], 0, 'Q is 9th, then R is 7th. Distractors model stopping at Q or reversing above and below.'],
  ['A student is 10th in a queue. Three people ahead leave. What is the new front rank?', ['7th', '13th', '10th', '8th'], 0, 'Only changes ahead affect the front rank, so 10 - 3 = 7. Distractors model adding, ignoring the change, or counting the named person.'],
]

export const quizQuestions = [
  ...mixedQuestions,
  ['A book is 14th from the right on a shelf of 35 books. What is its position from the left?', ['22nd', '21st', '14th', '49th'], 0, 'Use 35 - 14 + 1 = 22. Distractors model omitting the plus one, keeping the same rank, or adding.'],
  ['A person is 16th from the left and 9th from the right. How many people are in the row?', ['24', '25', '16', '7'], 0, 'Use 16 + 9 - 1 = 24 because the same person appears in both counts. Distractors model double counting, using one rank, or subtracting.'],
  ['A book moves four places right from the 8th position. What is its new position from the left?', ['12th', '4th', '11th', '8th'], 0, 'Moving right increases a left-based position: 8 + 4 = 12. Distractors model reversing direction, an off-by-one count, or ignoring movement.'],
  ['Faye is below Eli, Eli is below Dina, and Dina is below Carlo. Who is highest?', ['Carlo', 'Dina', 'Eli', 'Faye'], 0, 'Reading the complete chain from highest gives Carlo, Dina, Eli, Faye. Distractors model stopping early or reversing the chain.'],
  ['Which two positions are central in a line of 30?', ['15th and 16th', '14th and 15th', '15th only', '16th and 17th'], 0, 'For an even total use n/2 and n/2 + 1, giving 15th and 16th. Distractors model shifting or choosing only one middle.'],
  ['A student is 8th in a queue. Four people join ahead. What is the new front rank?', ['12th', '4th', '8th', '13th'], 0, 'Joining ahead worsens the front rank: 8 + 4 = 12. Distractors model reversing the update, ignoring it, or counting the student.'],
  ['A student is 8th in a queue of 20. Four people behind leave. What is the new front rank?', ['8th', '4th', '12th', '13th'], 0, 'People leaving behind change the total but not the student’s front rank. Distractors model changing the rank in either direction or counting the student.'],
]

export function fixedQuestion([prompt, choices, correctIndex, explanation], position, quiz = false) {
  return { prompt, explanation, points: 1, position, status: 'active', ...(quiz ? { questionType: 'multiple_choice' } : {}), choices: choices.map((text, index) => ({ text, isCorrect: index === correctIndex, position: index + 1 })) }
}

export function validateQuestions(label, questions, expected) {
  const failures = []
  if (questions.length !== expected) failures.push(`${label} must have ${expected} questions.`)
  for (const question of questions) {
    if (question.choices.length !== 4) failures.push(`${label} question ${question.position} must have four choices.`)
    if (new Set(question.choices.map((choice) => choice.text.trim().toUpperCase())).size !== 4) failures.push(`${label} question ${question.position} has duplicate choices.`)
    if (question.choices.filter((choice) => choice.isCorrect).length !== 1) failures.push(`${label} question ${question.position} must have exactly one correct choice.`)
  }
  return failures
}
