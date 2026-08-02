#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const confirmation = 'create-validate-publish-age-problems'
const csrfHeaderValue = 'same-origin-admin-mutation'
const topicSlug = 'age-problems'

const generatedPracticeByLessonSlug = {
  'present-past-and-future-ages': 'present-age-equations',
  'age-difference': 'age-difference',
  'sum-of-ages': 'sum-of-ages',
  'age-ratios': 'age-ratios',
  'parent-and-child-problems': 'parent-child-ages',
  'sibling-and-group-age-problems': 'sibling-group-ages',
  'ages-after-several-years': 'future-age-problems',
  'ages-several-years-ago': 'past-age-problems',
  'mixed-age-relationships': 'mixed-age-relationships',
}

const lessonSpecs = [
  ['Understanding Age Relationships', 'understanding-age-relationships', 'reading', 12],
  ['Present, Past, and Future Ages', 'present-past-and-future-ages', 'practice', 13],
  ['Age Difference', 'age-difference', 'practice', 11],
  ['Sum of Ages', 'sum-of-ages', 'practice', 12],
  ['Age Ratios', 'age-ratios', 'practice', 13],
  ['Parent and Child Problems', 'parent-and-child-problems', 'practice', 14],
  ['Sibling and Group Age Problems', 'sibling-and-group-age-problems', 'practice', 13],
  ['Ages After Several Years', 'ages-after-several-years', 'practice', 13],
  ['Ages Several Years Ago', 'ages-several-years-ago', 'practice', 13],
  ['Mixed Age Relationships', 'mixed-age-relationships', 'practice', 15],
  ['Mixed Age Problems Practice', 'mixed-age-problems-practice', 'practice', 16],
  ['Age Problems Topic Quiz', 'age-problems-topic-quiz', 'quiz', 18],
].map(([title, slug, lessonType, minutes], index) => ({
  title, slug, lessonType, minutes, position: index + 1,
}))

function parseArgs() {
  const args = new Map()
  for (let index = 2; index < process.argv.length; index += 1) {
    const key = process.argv[index]
    const value = process.argv[index + 1]
    if (key?.startsWith('--') !== true || value === undefined) {
      throw new Error(`Invalid argument near ${key ?? '(end)'}.`)
    }
    args.set(key.slice(2), value)
    index += 1
  }
  return args
}

const heading = (text, level = 2) => ({ blockType: 'heading', content: { level, text } })
const paragraph = (text) => ({ blockType: 'paragraph', content: { text } })
const formula = (expression, description) => ({ blockType: 'formula', content: { expression, description } })
const callout = (title, text, variant = 'info') => ({ blockType: 'callout', content: { title, text, variant } })
const example = (title, problem, steps, answer) => ({ blockType: 'example', content: { title, problem, steps, answer } })
const summary = (items) => ({ blockType: 'summary', content: { items } })

function practiceBlocks(title, concept, equation, timeline, firstExample, secondExample, mistakes, transition) {
  return [
    heading(title), paragraph(concept), formula(equation[0], equation[1]),
    callout('Timeline guidance', timeline), example(...firstExample),
    example(...secondExample), callout('Common mistakes', mistakes, 'warning'),
    summary([equation[1], transition]),
  ]
}

function lessonBlocks(slug) {
  const blocks = {
    'understanding-age-relationships': [
      heading('Start with present ages'),
      paragraph('Represent each present age with a variable before moving along the timeline. If the present ages are x and y, every past or future statement must adjust both people by the same number of years.'),
      formula('present age = x', 'Use the present as the reference point.'),
      formula('future age = x + n', 'Add n years for “n years from now.”'),
      formula('past age = x - n', 'Subtract n years for “n years ago.”'),
      heading('Translation table', 3),
      formula('x is 8 years older than y → x = y + 8', 'Older means the larger present age.'),
      formula('x is twice y’s age → x = 2y', 'The ratio applies at the stated time only.'),
      example('Move everyone forward', 'A teacher is 35 and a student is 15. What are their ages in five years?', ['Add 5 to the teacher: 35 + 5 = 40.', 'Add 5 to the student: 15 + 5 = 20.'], 'Their future ages are 40 and 20.'),
      example('Move everyone backward', 'Two employees are 32 and 24. What were their ages four years ago?', ['Subtract 4 from both present ages.', '32 - 4 = 28 and 24 - 4 = 20.'], 'Their past ages were 28 and 20.'),
      callout('Age difference stays constant', 'Both people gain or lose the same number of years, so the difference between their ages never changes.', 'important'),
      callout('Age ratios change', 'A ratio such as 2:1 usually changes as both people age. Evaluate the ratio only at the time named in the problem.', 'warning'),
      callout('Common mistakes', 'Do not change only one age, change the age gap, reverse older and younger, carry a present ratio into another time, or answer with a past or future age when a present age is requested.', 'warning'),
      summary(['Define present ages first.', 'Apply the same time shift to everyone.', 'Keep the age difference constant.', 'Evaluate ratios at the stated time.', 'Return the value requested by the question.']),
    ],
    'present-past-and-future-ages': practiceBlocks(
      'Present, Past, and Future Ages',
      'Present ages are the anchor for every age equation. Translate older, younger, totals, and multiples before applying any past or future shift.',
      ['O = Y + d; past: O - n and Y - n; future: O + n and Y + n', 'Apply n to both ages and keep the requested timeline clear.'],
      'This practice uses the foundational present-age generator because the current engine supports one generator per practice set. Dedicated later lessons provide past- and future-focused generators.',
      ['Present total and difference', 'Two people total 42 years and differ by 8.', ['O + Y = 42.', 'O - Y = 8.', 'Add the equations to get 2O = 50.'], 'The ages are 25 and 17.'],
      ['Known present age', 'An employee aged 30 is 6 years older than a colleague.', ['Let the colleague be Y.', '30 = Y + 6.', 'Subtract 6.'], 'The colleague is 24.'],
      'Do not use the total as one age, reverse older and younger, adjust only one person, or return the other person’s age.',
      'Practice defining present variables before solving more complex timelines.',
    ),
    'age-difference': practiceBlocks(
      'Age Difference',
      'The difference between two ages is invariant because both people age at the same rate.',
      ['(O + n) - (Y + n) = O - Y', 'Equal time adjustments cancel in subtraction.'],
      'Find the present gap once; the same gap holds in the past and future whenever both ages are valid.',
      ['Future difference', 'Two people are 34 and 22. Find their difference after 10 years.', ['Present gap: 34 - 22 = 12.', 'Future gap: 44 - 32 = 12.'], 'The difference remains 12 years.'],
      ['Total and gap', 'Two siblings total 30 years and are 4 years apart.', ['O + Y = 30.', 'O - Y = 4.'], 'Their ages are 17 and 13.'],
      'Do not add elapsed years to the gap, subtract them from the gap, halve the gap without a total, or return a future total.',
      'Use the invariant gap as a dependable condition in every timeline.',
    ),
    'sum-of-ages': practiceBlocks(
      'Sum of Ages',
      'A group’s total changes once for every person. For k people over n years, the total changes by kn.',
      ['future total = present total + kn; past total = present total - kn', 'Count the people before adjusting the sum.'],
      'A four-year shift changes a three-person total by 12, not by only 4.',
      ['Three-person future total', 'In four years three students will total 60.', ['The total increase is 3 × 4 = 12.', '60 - 12 = 48.'], 'Their present total is 48.'],
      ['Two-person past total', 'Five years ago two people totaled 41.', ['The total has since increased by 2 × 5 = 10.', '41 + 10 = 51.'], 'Their present total is 51.'],
      'Do not adjust the total only once, divide by the wrong group size, confuse a total with one age, or return the referenced total.',
      'Match the total adjustment to both elapsed years and number of people.',
    ),
    'age-ratios': practiceBlocks(
      'Age Ratios',
      'A ratio describes ages at one stated moment. Convert ratio parts into actual ages using a sum or difference.',
      ['ages a:b → ak and bk', 'Use the total or difference to solve for k.'],
      'Never move a ratio across time without writing the shifted-age equation first.',
      ['Ratio and total', 'Two ages are 2:1 and total 45.', ['The total has 3 parts.', 'k = 45 ÷ 3 = 15.'], 'The ages are 30 and 15.'],
      ['Ratio and difference', 'A parent and child are in ratio 5:2 and differ by 24.', ['The difference is 3 parts.', 'k = 24 ÷ 3 = 8.'], 'The ages are 40 and 16.'],
      'Do not use ratio terms as ages, divide by one term, reverse the ratio, or assume the ratio remains unchanged over time.',
      'State the ratio’s timeline and verify the resulting ages.',
    ),
    'parent-and-child-problems': practiceBlocks(
      'Parent and Child Problems',
      'Use realistic present ages, a constant age gap, and a timeline equation. The parent must remain older throughout the problem.',
      ['P - C = d; future ratio: P + n = r(C + n)', 'Apply the same n to both parent and child.'],
      'Check that the child age is nonnegative at every referenced past time and that the gap is plausible.',
      ['Future multiple', 'A parent is 30 years older. In five years the parent will be three times the child.', ['P - C = 30.', 'P + 5 = 3(C + 5).'], 'The present ages are 40 and 10.'],
      ['Total relationship', 'Their total is 54 and P = 2C + 6.', ['Substitute into P + C = 54.', '3C + 6 = 54.'], 'The child is 16 and the parent is 38.'],
      'Do not reverse roles, adjust only one age, treat the gap as a ratio, return a referenced age, or answer for the wrong person.',
      'Solve with present variables, then verify both realism and the stated timeline.',
    ),
    'sibling-and-group-age-problems': practiceBlocks(
      'Sibling and Group Age Problems',
      'Small groups are modeled with a youngest age plus fixed gaps. Include every person exactly once in the total.',
      ['x, x + d, x + 2d', 'For three equally spaced ages, use one variable and a fixed step d.'],
      'Age gaps remain fixed when the entire sibling or employee group moves through time.',
      ['Three siblings', 'Three siblings are 2 years apart and total 36.', ['x + (x + 2) + (x + 4) = 36.', '3x + 6 = 36.'], 'Their ages are 10, 12, and 14.'],
      ['Unequal stated gaps', 'The middle is 2 years older than the youngest; the oldest is 6 years older.', ['Use x, x + 2, x + 6.', 'Insert all three into the total.'], 'Solve for x, then return the requested sibling.'],
      'Do not use the wrong spacing, omit a person, divide by the wrong group size, return the wrong member, or change gaps over time.',
      'Keep group age reasoning focused on totals, gaps, and requested roles.',
    ),
    'ages-after-several-years': practiceBlocks(
      'Ages After Several Years',
      'Future conditions add the same nonnegative elapsed time to every present age.',
      ['future ages: O + n and Y + n', 'Use a future ratio or sum only after shifting both ages.'],
      'For “in how many years,” solve for n and reject negative or fractional time when an integer answer is required.',
      ['Future total', 'Two people are 18 and 26. Find their total after 7 years.', ['Present total is 44.', 'Two people add 2 × 7 = 14.'], 'The future total is 58.'],
      ['Future ratio', 'Present gap is 12; in six years the older will be twice the younger.', ['O - Y = 12.', 'O + 6 = 2(Y + 6).'], 'The present ages are 18 and 6.'],
      'Do not add years to one person only, use a current ratio, subtract instead of add, or return a future age when present age is requested.',
      'Translate the future condition, solve present ages, and verify the future statement exactly.',
    ),
    'ages-several-years-ago': practiceBlocks(
      'Ages Several Years Ago',
      'Past conditions subtract the same positive number of years from every present age.',
      ['past ages: O - n and Y - n', 'All referenced past ages must remain nonnegative.'],
      'For “how many years ago,” verify that the solution is a positive integer and that neither past age becomes negative.',
      ['Past multiple', 'A parent is 40 and a child is 16. When was the parent three times the child?', ['40 - n = 3(16 - n).', '40 - n = 48 - 3n.'], 'n = 4 years ago.'],
      ['Past total', 'Five years ago two ages totaled 31.', ['Let current ages be O and Y.', '(O - 5) + (Y - 5) = 31.'], 'Their present total is 41.'],
      'Do not subtract from one person only, use a present ratio, add instead of subtract, return past age as present age, or permit a negative past age.',
      'Write present variables first, shift both ages backward, and verify the referenced time.',
    ),
    'mixed-age-relationships': practiceBlocks(
      'Mixed Age Relationships',
      'Multi-step age questions combine a timeline with a sum, difference, ratio, or elapsed-time condition.',
      ['define present ages → shift timeline → solve → verify', 'Keep every relationship tied to its stated time.'],
      'A valid answer preserves the age gap, keeps past ages nonnegative, and satisfies the exact ratio or total at the referenced time.',
      ['Years from now', 'A parent is 42 and a child is 14. When will the parent be twice the child?', ['42 + n = 2(14 + n).', '42 + n = 28 + 2n.'], 'n = 14 years from now.'],
      ['Years ago', 'Two people are 40 and 16. When was the older three times the younger?', ['40 - n = 3(16 - n).', 'Solve and substitute into both past ages.'], 'n = 4 years ago.'],
      'Do not use the gap as elapsed time, reverse timeline signs, change one age only, carry ratios between times, or return an age when time is requested.',
      'Identify present variables, translate the timeline, solve one unique integer result, and verify it.',
    ),
    'mixed-age-problems-practice': [
      heading('Mixed Age Problems Practice'),
      paragraph('This fixed practice reviews present relationships, past and future equations, invariant differences, totals, ratios, parent-child reasoning, and elapsed time.'),
      formula('present variables → timeline equation → solve → verify', 'Answer exactly the requested age, total, difference, or elapsed time.'),
      example('Check a timeline', 'A condition refers to five years ago.', ['Subtract five from every present age.', 'Keep the age difference unchanged.', 'Evaluate any ratio at that past time.'], 'Reject any solution with a negative past age.'),
      example('Check a group total', 'Several people move four years forward.', ['Count the people.', 'Multiply the count by four.', 'Adjust the total by that amount.'], 'Do not add four only once.'),
      callout('Realism check', 'Parents must be older than children, past ages cannot be negative, and every elapsed-time answer must match the direction named.', 'warning'),
      summary(['Define present ages.', 'Shift everyone equally.', 'Keep differences constant.', 'Evaluate ratios at the correct time.', 'Verify the requested value.']),
    ],
    'age-problems-topic-quiz': [
      heading('Age Problems Topic Quiz'),
      paragraph('This 15-question assessment covers translation, present, past, and future totals and ratios, family and sibling relationships, and elapsed-time equations.'),
      callout('Before starting', 'Use present-age variables, apply time shifts to everyone involved, and verify both the timeline and requested value.'),
      summary(['Keep age differences constant.', 'Adjust sums once per person.', 'Evaluate ratios only at the stated time.', 'Reject impossible timelines.']),
    ],
  }
  return blocks[slug]
}

function fixedQuestion(prompt, correct, distractors, explanation, position) {
  return {
    prompt, explanation, points: 1, position, status: 'active',
    choices: [correct, ...distractors].map((text, index) => ({
      text, isCorrect: index === 0, position: index + 1,
    })),
  }
}

const mixedQuestions = [
  ['Two people total 42 years and differ by 8. Find the older age.', '25 years', ['17 years', '21 years', '34 years'], 'Use O + Y = 42 and O - Y = 8. Adding gives 2O = 50, so O = 25.'],
  ['Five years ago, an older person was twice a younger person’s age. Their present age difference is 15. Find the older present age.', '35 years', ['30 years', '20 years', '40 years'], 'Let O - Y = 15 and O - 5 = 2(Y - 5). Solving gives Y = 20 and O = 35.'],
  ['In 6 years, an older person will be twice a younger person’s age. Their present difference is 12. Find the older present age.', '18 years', ['24 years', '6 years', '12 years'], 'O - Y = 12 and O + 6 = 2(Y + 6). Solving gives Y = 6 and O = 18.'],
  ['Two people are 34 and 22. What is their age difference after 10 years?', '12 years', ['22 years', '2 years', '76 years'], 'Both ages increase by 10, so 44 - 32 is still 12.'],
  ['In 4 years, the total age of three students will be 60. What is their present total?', '48 years', ['56 years', '60 years', '72 years'], 'The total increases by 3 × 4 = 12, so the present total is 60 - 12 = 48.'],
  ['Two ages are in the ratio 5:2 and differ by 24. Find the older age.', '40 years', ['16 years', '8 years', '60 years'], 'The three-part difference equals 24, so one part is 8 and the older age is 5 × 8 = 40.'],
  ['A parent and child total 54 years. The parent is twice the child’s age plus 6. Find the child’s age.', '16 years', ['38 years', '24 years', '20 years'], 'P = 2C + 6 and P + C = 54, so 3C + 6 = 54 and C = 16.'],
  ['A parent is 42 and a child is 14. In how many years will the parent be twice the child’s age?', '14 years from now', ['28 years from now', '2 years from now', '42 years from now'], 'Solve 42 + n = 2(14 + n). This gives n = 14, and 56 is twice 28.'],
]

const quizQuestions = [
  ['A parent is 8 years older than a person aged y. Which expression gives the parent’s present age?', 'y + 8', ['8y', 'y - 8', '8 - y'], 'Older by 8 means add 8 to the younger present age.'],
  ['If a person’s present age is x, which expression gives the age 5 years ago?', 'x - 5', ['x + 5', '5 - x', '5x'], 'Five years ago means subtract 5 from the present age.'],
  ['Two people are now x and y years old. Which expression gives their total age 4 years from now?', 'x + y + 8', ['x + y + 4', 'x + y - 8', '4x + 4y'], 'Each person gains 4 years, so the total gains 8.'],
  ['One person is 7 years older than another. What will their age difference be after 12 years?', '7 years', ['19 years', '5 years', '12 years'], 'Both ages gain 12, so their difference remains 7.'],
  ['Two present ages total 50 and differ by 12. Find the older age.', '31 years', ['19 years', '25 years', '38 years'], 'Add O + Y = 50 and O - Y = 12 to get 2O = 62, so O = 31.'],
  ['Five years ago, two people’s ages totaled 41. What is their present total?', '51 years', ['46 years', '41 years', '31 years'], 'Two people have each gained 5 years, so the total increased by 10 to 51.'],
  ['In 4 years, three siblings’ ages will total 48. What is their present total?', '36 years', ['44 years', '52 years', '32 years'], 'Three siblings add 3 × 4 = 12 years to the total, so 48 - 12 = 36.'],
  ['Two present ages are in ratio 2:1 and total 45. Find the younger age.', '15 years', ['30 years', '22 years', '2 years'], 'There are three ratio parts, so one part is 45 ÷ 3 = 15.'],
  ['Four years ago, two ages were in ratio 2:1. Their present total is 38. Find the older present age.', '24 years', ['14 years', '20 years', '28 years'], 'O - 4 = 2(Y - 4) and O + Y = 38. Solving gives O = 24 and Y = 14.'],
  ['In 6 years, two ages will be in ratio 3:2. Their present difference is 8. Find the older present age.', '18 years', ['10 years', '24 years', '14 years'], 'The future difference is still 8, one ratio part. Future ages are 24 and 16, so present ages are 18 and 10.'],
  ['A parent is 30 years older than a child. In 5 years the parent will be three times the child’s age. Find the child’s present age.', '10 years', ['40 years', '15 years', '30 years'], 'P - C = 30 and P + 5 = 3(C + 5). Solving gives C = 10 and P = 40.'],
  ['Three siblings are 2 years apart and total 36 years. Find the oldest age.', '14 years', ['10 years', '12 years', '16 years'], 'Use x, x + 2, x + 4. Then 3x + 6 = 36, so the oldest is 14.'],
  ['A parent is 42 and a child is 14. In how many years will the parent be twice the child’s age?', '14 years from now', ['28 years from now', '2 years from now', '7 years from now'], '42 + n = 2(14 + n), so n = 14.'],
  ['A parent is 40 and a child is 16. How many years ago was the parent three times the child’s age?', '4 years ago', ['8 years ago', '24 years ago', '3 years ago'], '40 - n = 3(16 - n), so 2n = 8 and n = 4.'],
  ['Five years ago, an older person was three times a younger person’s age. In five years their ages will total 72. Find the older present age.', '44 years', ['18 years', '39 years', '54 years'], 'O - 5 = 3(Y - 5) and O + Y + 10 = 72. Solving gives Y = 18 and O = 44.'],
]

function hasRawHtml(value) {
  if (typeof value === 'string') return /<\/?[a-z][^>]*>/iu.test(value)
  if (Array.isArray(value)) return value.some(hasRawHtml)
  if (value !== null && typeof value === 'object') return Object.values(value).some(hasRawHtml)
  return false
}

function validateFixedQuestions(label, questions, expectedCount) {
  const failures = []
  if (questions.length !== expectedCount) failures.push(`${label} expected ${expectedCount} questions, found ${questions.length}.`)
  for (const question of questions) {
    if (question.choices.length !== 4) failures.push(`${label} question ${question.position} must have four choices.`)
    if (question.choices.filter((choice) => choice.isCorrect).length !== 1) failures.push(`${label} question ${question.position} must have one correct choice.`)
    if (new Set(question.choices.map((choice) => choice.text.trim().toLowerCase())).size !== question.choices.length) failures.push(`${label} question ${question.position} has duplicate choices.`)
    if (question.explanation?.trim().length < 12) failures.push(`${label} question ${question.position} needs a meaningful explanation.`)
  }
  return failures
}

function runGeneratorQualityGate() {
  const vitestEntry = fileURLToPath(new URL('../node_modules/vitest/vitest.mjs', import.meta.url))
  const result = spawnSync(process.execPath, [vitestEntry, 'run', 'tests/worker.test.ts', '-t', 'Dynamic age-problem generator engine'], { stdio: 'inherit', shell: false })
  if (result.status !== 0) {
    const detail = result.error instanceof Error ? ` ${result.error.message}` : ''
    throw new Error(`The 1,000-question-per-generator age quality gate failed.${detail}`)
  }
}

async function main() {
  const args = parseArgs()
  const baseUrl = args.get('base-url') ?? 'http://127.0.0.1:5173'
  if (args.get('confirm') !== confirmation) throw new Error(`Pass --confirm ${confirmation} to continue.`)
  runGeneratorQualityGate()
  let cookie = args.get('cookie') ?? null

  async function request(path, options = {}) {
    const headers = new Headers(options.headers)
    headers.set('accept', 'application/json')
    if (cookie !== null) headers.set('cookie', cookie)
    if (options.body !== undefined) headers.set('content-type', 'application/json')
    if (options.method !== undefined && options.method !== 'GET') headers.set('x-cse-admin-csrf', csrfHeaderValue)
    const response = await fetch(`${baseUrl}${path}`, { ...options, headers })
    const setCookie = response.headers.get('set-cookie')
    if (setCookie !== null) cookie = setCookie.split(';')[0]
    const body = await response.json()
    if (!response.ok || body.success !== true) throw new Error(`${options.method ?? 'GET'} ${path} failed: ${JSON.stringify(body)}`)
    return body.data
  }

  if (cookie === null) {
    const email = args.get('email')
    const password = args.get('password') ?? process.env.CSE_AGE_PROBLEMS_ADMIN_PASSWORD
    if (email === undefined || password === undefined) throw new Error('Pass --cookie, or --email with --password or CSE_AGE_PROBLEMS_ADMIN_PASSWORD.')
    await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  }

  const dashboard = await request('/api/admin/dashboard')
  const courseId = dashboard.cseProfessional?.id
  if (courseId === undefined) throw new Error('CSE Professional course was not found.')
  let detail = await request(`/api/admin/courses/${courseId}`)
  let subject = detail.subjects.find((item) => item.slug === 'numerical-ability')
  if (subject === undefined) throw new Error('Numerical Ability subject was not found.')
  let numberTopic = subject.topics.find((item) => item.slug === 'number-problems')
  if (numberTopic === undefined || numberTopic.status !== 'published') throw new Error('Published Number Problems must exist before Age Problems.')
  let topic = subject.topics.find((item) => item.slug === topicSlug)
  if (topic === undefined) {
    const created = await request(`/api/admin/subjects/${subject.id}/topics`, {
      method: 'POST', body: JSON.stringify({
        title: 'Age Problems', slug: topicSlug,
        description: 'A structured course on translating age relationships into equations, solving present, past, and future age problems, and handling ratios, sums, and multi-person relationships.',
        position: numberTopic.position + 1, status: 'draft',
      }),
    })
    topic = created.topic
  }

  for (const spec of lessonSpecs) {
    detail = await request(`/api/admin/courses/${courseId}`)
    subject = detail.subjects.find((item) => item.slug === 'numerical-ability')
    topic = subject?.topics.find((item) => item.slug === topicSlug)
    if (topic === undefined) throw new Error('Age Problems disappeared during creation.')
    let lesson = topic.lessons.find((item) => item.slug === spec.slug)
    if (lesson === undefined) {
      const created = await request(`/api/admin/topics/${topic.id}/lessons`, {
        method: 'POST', body: JSON.stringify({
          title: spec.title, slug: spec.slug, lessonType: spec.lessonType,
          summary: `${spec.title} in the Age Problems topic.`, estimatedMinutes: spec.minutes,
          position: spec.position, isPreview: false, requiresPrevious: true, status: 'draft',
        }),
      })
      lesson = created.lesson
    } else if (lesson.lessonType !== spec.lessonType) {
      throw new Error(`${spec.slug} has stored type ${lesson.lessonType}; expected ${spec.lessonType}.`)
    } else if (lesson.status !== 'published') {
      const updated = await request(`/api/admin/lessons/${lesson.id}`, {
        method: 'PATCH', body: JSON.stringify({
          title: spec.title, summary: `${spec.title} in the Age Problems topic.`, estimatedMinutes: spec.minutes,
          position: spec.position, isPreview: false, requiresPrevious: true, status: 'draft', updatedAt: lesson.updatedAt,
        }),
      })
      lesson = updated.lesson
    }

    const desiredBlocks = lessonBlocks(spec.slug)
    if (!Array.isArray(desiredBlocks)) throw new Error(`No blocks defined for ${spec.slug}.`)
    const currentBlocks = await request(`/api/admin/lessons/${lesson.id}/blocks`)
    for (const [index, block] of desiredBlocks.entries()) {
      const position = index + 1
      const existing = currentBlocks.blocks.find((item) => item.position === position)
      await request(existing === undefined ? `/api/admin/lessons/${lesson.id}/blocks` : `/api/admin/lesson-blocks/${existing.id}`, {
        method: existing === undefined ? 'POST' : 'PATCH', body: JSON.stringify({ ...block, position }),
      })
    }

    const generatorSlug = generatedPracticeByLessonSlug[spec.slug]
    if (generatorSlug !== undefined) {
      await request(`/api/admin/lessons/${lesson.id}/practice-set`, {
        method: 'PUT', body: JSON.stringify({
          title: spec.title, instructions: 'Answer five generated Age Problems questions, then review the timeline-based explanations.',
          passingScore: 60, questionCount: 5, maximumAttempts: null, showExplanations: true,
          status: lesson.status === 'published' ? 'published' : 'draft', questionSource: 'generated',
          generatorSlug, generatorVersion: 1, difficulty: { easy: 2, medium: 2, hard: 1 },
        }),
      })
    }

    if (spec.slug === 'mixed-age-problems-practice') {
      const saved = await request(`/api/admin/lessons/${lesson.id}/practice-set`, {
        method: 'PUT', body: JSON.stringify({
          title: spec.title, instructions: 'Solve each fixed Age Problems application and verify every timeline condition.',
          passingScore: 60, questionCount: 8, maximumAttempts: null, showExplanations: true,
          status: lesson.status === 'published' ? 'published' : 'draft', questionSource: 'fixed',
        }),
      })
      const current = await request(`/api/admin/lessons/${lesson.id}/practice-set`)
      for (const [index, item] of mixedQuestions.entries()) {
        const input = fixedQuestion(item[0], item[1], item[2], item[3], index + 1)
        const existing = current.questions.find((question) => question.position === input.position)
        const body = existing === undefined ? input : { ...input, updatedAt: existing.updatedAt, choices: input.choices.map((choice) => ({ ...choice, id: existing.choices.find((old) => old.position === choice.position)?.id })) }
        await request(existing === undefined ? `/api/admin/practice-sets/${saved.practiceSet.id}/questions` : `/api/admin/practice-questions/${existing.id}`, {
          method: existing === undefined ? 'POST' : 'PATCH', body: JSON.stringify(body),
        })
      }
    }

    if (spec.slug === 'age-problems-topic-quiz') {
      const saved = await request(`/api/admin/lessons/${lesson.id}/quiz`, {
        method: 'PUT', body: JSON.stringify({
          title: spec.title, description: 'A fixed 15-question quiz covering the Age Problems topic.', quizType: 'topic',
          passingScore: 70, timeLimitMinutes: null, maximumAttempts: null, shuffleQuestions: false,
          shuffleChoices: false, showExplanations: true, status: lesson.status === 'published' ? 'published' : 'draft',
        }),
      })
      const current = await request(`/api/admin/lessons/${lesson.id}/quiz`)
      for (const [index, item] of quizQuestions.entries()) {
        const input = { ...fixedQuestion(item[0], item[1], item[2], item[3], index + 1), questionType: 'multiple_choice' }
        const existing = current.questions.find((question) => question.position === input.position)
        const body = existing === undefined ? input : { ...input, updatedAt: existing.updatedAt, choices: input.choices.map((choice) => ({ ...choice, id: existing.choices.find((old) => old.position === choice.position)?.id })) }
        await request(existing === undefined ? `/api/admin/quizzes/${saved.quiz.id}/questions` : `/api/admin/questions/${existing.id}`, {
          method: existing === undefined ? 'POST' : 'PATCH', body: JSON.stringify(body),
        })
      }
    }
  }

  const failures = []
  const registry = await request('/api/admin/practice-generators')
  const registered = new Set(registry.generators.map((generator) => `${generator.slug}@${generator.version}`))
  for (const generatorSlug of Object.values(generatedPracticeByLessonSlug)) {
    if (!registered.has(`${generatorSlug}@1`)) failures.push(`Generator ${generatorSlug}@1 is not registered.`)
  }
  detail = await request(`/api/admin/courses/${courseId}`)
  subject = detail.subjects.find((item) => item.slug === 'numerical-ability')
  numberTopic = subject?.topics.find((item) => item.slug === 'number-problems')
  topic = subject?.topics.find((item) => item.slug === topicSlug)
  if (topic === undefined) failures.push('Age Problems was not found under Numerical Ability.')
  else {
    if (numberTopic === undefined || numberTopic.status !== 'published' || topic.position !== numberTopic.position + 1) failures.push('Age Problems must be immediately after published Number Problems.')
    if (topic.lessons.length !== 12) failures.push(`Expected 12 lessons; found ${topic.lessons.length}.`)
    if (new Set(topic.lessons.map((lesson) => lesson.position)).size !== topic.lessons.length) failures.push('Lesson positions must be unique.')
    for (const spec of lessonSpecs) {
      const lesson = topic.lessons.find((item) => item.slug === spec.slug)
      if (lesson === undefined) { failures.push(`Missing lesson ${spec.slug}.`); continue }
      if (lesson.lessonType !== spec.lessonType) failures.push(`${spec.slug} has an incorrect type.`)
      if (lesson.requiresPrevious !== true || lesson.isPreview !== false) failures.push(`${spec.slug} does not preserve sequential locking.`)
      const blocks = await request(`/api/admin/lessons/${lesson.id}/blocks`)
      const minimumBlocks = spec.slug === 'understanding-age-relationships' ? 10 : 3
      if (blocks.blocks.length < minimumBlocks) failures.push(`${spec.slug} lacks meaningful instructional blocks.`)
      if (blocks.blocks.some((block) => hasRawHtml(block.content))) failures.push(`${spec.slug} contains raw HTML.`)
      const generatorSlug = generatedPracticeByLessonSlug[spec.slug]
      if (generatorSlug !== undefined) {
        if (blocks.blocks.length < 8) failures.push(`${spec.slug} lacks complete teaching content before practice.`)
        const practice = await request(`/api/admin/lessons/${lesson.id}/practice-set`)
        const set = practice.practiceSet
        if (set === null || set.questionSource !== 'generated' || set.generator?.slug !== generatorSlug || set.generator?.version !== 1 ||
          set.generator?.difficulty.easy !== 2 || set.generator?.difficulty.medium !== 2 || set.generator?.difficulty.hard !== 1 ||
          set.questionCount !== 5 || set.passingScore !== 60 || set.maximumAttempts !== null || set.showExplanations !== true) {
          failures.push(`${spec.slug} has an invalid generated practice configuration.`)
        }
      }
      if (spec.slug === 'mixed-age-problems-practice') {
        const practice = await request(`/api/admin/lessons/${lesson.id}/practice-set`)
        failures.push(...validateFixedQuestions('Mixed Age Problems Practice', practice.questions, 8))
      }
      if (spec.slug === 'age-problems-topic-quiz') {
        const quiz = await request(`/api/admin/lessons/${lesson.id}/quiz`)
        failures.push(...validateFixedQuestions('Age Problems Topic Quiz', quiz.questions, 15))
      }
    }
  }

  if (failures.length > 0) {
    console.error('Age Problems validation failed. Nothing was published.')
    for (const failure of failures) console.error(`- ${failure}`)
    process.exitCode = 1
    return
  }

  const rollbackActions = []
  try {
    detail = await request(`/api/admin/courses/${courseId}`)
    topic = detail.subjects.find((item) => item.slug === 'numerical-ability')?.topics.find((item) => item.slug === topicSlug)
    if (topic === undefined) throw new Error('Age Problems disappeared before publication.')
    for (const spec of lessonSpecs) {
      const lesson = topic.lessons.find((item) => item.slug === spec.slug)
      if (lesson === undefined) throw new Error(`${spec.slug} disappeared before publication.`)
      const generatorSlug = generatedPracticeByLessonSlug[spec.slug]
      if (generatorSlug !== undefined) {
        const current = await request(`/api/admin/lessons/${lesson.id}/practice-set`)
        if (current.practiceSet.status !== 'published') {
          const config = { title: spec.title, instructions: 'Answer five generated Age Problems questions, then review the timeline-based explanations.', passingScore: 60, questionCount: 5, maximumAttempts: null, showExplanations: true, questionSource: 'generated', generatorSlug, generatorVersion: 1, difficulty: { easy: 2, medium: 2, hard: 1 } }
          await request(`/api/admin/lessons/${lesson.id}/practice-set`, { method: 'PUT', body: JSON.stringify({ ...config, status: 'published' }) })
          rollbackActions.push(() => request(`/api/admin/lessons/${lesson.id}/practice-set`, { method: 'PUT', body: JSON.stringify({ ...config, status: current.practiceSet.status }) }))
        }
      }
      if (spec.slug === 'mixed-age-problems-practice') {
        const current = await request(`/api/admin/lessons/${lesson.id}/practice-set`)
        if (current.practiceSet.status !== 'published') {
          const config = { title: spec.title, instructions: 'Solve each fixed Age Problems application and verify every timeline condition.', passingScore: 60, questionCount: 8, maximumAttempts: null, showExplanations: true, questionSource: 'fixed' }
          await request(`/api/admin/lessons/${lesson.id}/practice-set`, { method: 'PUT', body: JSON.stringify({ ...config, status: 'published' }) })
          rollbackActions.push(() => request(`/api/admin/lessons/${lesson.id}/practice-set`, { method: 'PUT', body: JSON.stringify({ ...config, status: current.practiceSet.status }) }))
        }
      }
      if (spec.slug === 'age-problems-topic-quiz') {
        const current = await request(`/api/admin/lessons/${lesson.id}/quiz`)
        if (current.quiz.status !== 'published') {
          const config = { title: spec.title, description: 'A fixed 15-question quiz covering the Age Problems topic.', quizType: 'topic', passingScore: 70, timeLimitMinutes: null, maximumAttempts: null, shuffleQuestions: false, shuffleChoices: false, showExplanations: true }
          await request(`/api/admin/lessons/${lesson.id}/quiz`, { method: 'PUT', body: JSON.stringify({ ...config, status: 'published' }) })
          rollbackActions.push(() => request(`/api/admin/lessons/${lesson.id}/quiz`, { method: 'PUT', body: JSON.stringify({ ...config, status: current.quiz.status }) }))
        }
      }
    }

    detail = await request(`/api/admin/courses/${courseId}`)
    topic = detail.subjects.find((item) => item.slug === 'numerical-ability')?.topics.find((item) => item.slug === topicSlug)
    if (topic === undefined) throw new Error('Age Problems disappeared before lesson publication.')
    for (const spec of lessonSpecs) {
      const lesson = topic.lessons.find((item) => item.slug === spec.slug)
      if (lesson === undefined) throw new Error(`${spec.slug} disappeared before lesson publication.`)
      if (lesson.status !== 'published') {
        await request(`/api/admin/lessons/${lesson.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'published', updatedAt: lesson.updatedAt }) })
        rollbackActions.push(async () => {
          const refreshed = await request(`/api/admin/courses/${courseId}`)
          const current = refreshed.subjects.find((item) => item.slug === 'numerical-ability')?.topics.find((item) => item.slug === topicSlug)?.lessons.find((item) => item.id === lesson.id)
          if (current !== undefined) return request(`/api/admin/lessons/${lesson.id}`, { method: 'PATCH', body: JSON.stringify({ status: lesson.status, updatedAt: current.updatedAt }) })
        })
      }
    }

    detail = await request(`/api/admin/courses/${courseId}`)
    topic = detail.subjects.find((item) => item.slug === 'numerical-ability')?.topics.find((item) => item.slug === topicSlug)
    if (topic === undefined) throw new Error('Age Problems disappeared before final publication.')
    if (topic.status !== 'published') {
      const previousStatus = topic.status
      const topicId = topic.id
      await request(`/api/admin/topics/${topicId}`, { method: 'PATCH', body: JSON.stringify({ status: 'published', updatedAt: topic.updatedAt }) })
      rollbackActions.push(async () => {
        const refreshed = await request(`/api/admin/courses/${courseId}`)
        const current = refreshed.subjects.find((item) => item.slug === 'numerical-ability')?.topics.find((item) => item.slug === topicSlug)
        if (current !== undefined) return request(`/api/admin/topics/${topicId}`, { method: 'PATCH', body: JSON.stringify({ status: previousStatus, updatedAt: current.updatedAt }) })
      })
    }
  } catch (error) {
    console.error(`Publication failed: ${error instanceof Error ? error.message : String(error)}`)
    console.error('Rolling back statuses changed during this run.')
    for (const rollback of rollbackActions.reverse()) {
      try { await rollback() } catch (rollbackError) { console.error(`Rollback failed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`) }
    }
    process.exitCode = 1
    return
  }

  console.log('Age Problems was created, validated, and published.')
  for (const spec of lessonSpecs) console.log(`- ${spec.position}. ${spec.title} (${spec.lessonType})`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
