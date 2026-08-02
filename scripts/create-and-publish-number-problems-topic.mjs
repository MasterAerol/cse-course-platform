#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const confirmation = 'create-validate-publish-number-problems'
const csrfHeaderValue = 'same-origin-admin-mutation'
const topicSlug = 'number-problems'

const generatedPracticeByLessonSlug = {
  'consecutive-integers': 'consecutive-integers',
  'consecutive-odd-and-even-integers': 'consecutive-odd-even-integers',
  'sum-and-difference-of-numbers': 'sum-difference-numbers',
  'product-and-quotient-relationships': 'product-quotient-numbers',
  'two-digit-number-problems': 'two-digit-number-problems',
  'reversed-digit-problems': 'reversed-digit-problems',
  'number-and-remainder-problems': 'remainder-number-problems',
  'fractional-parts-of-numbers': 'fractional-part-number-problems',
  'mixed-number-relationship-problems': 'mixed-number-relationships',
}

const lessonSpecs = [
  ['Translating Number Statements', 'translating-number-statements', 'reading', 11],
  ['Consecutive Integers', 'consecutive-integers', 'practice', 11],
  ['Consecutive Odd and Even Integers', 'consecutive-odd-and-even-integers', 'practice', 12],
  ['Sum and Difference of Numbers', 'sum-and-difference-of-numbers', 'practice', 12],
  ['Product and Quotient Relationships', 'product-and-quotient-relationships', 'practice', 12],
  ['Two-Digit Number Problems', 'two-digit-number-problems', 'practice', 13],
  ['Reversed-Digit Problems', 'reversed-digit-problems', 'practice', 13],
  ['Number and Remainder Problems', 'number-and-remainder-problems', 'practice', 13],
  ['Fractional Parts of Numbers', 'fractional-parts-of-numbers', 'practice', 12],
  ['Mixed Number Relationship Problems', 'mixed-number-relationship-problems', 'practice', 14],
  ['Mixed Number Problems Practice', 'mixed-number-problems-practice', 'practice', 15],
  ['Number Problems Topic Quiz', 'number-problems-topic-quiz', 'quiz', 18],
].map(([title, slug, lessonType, minutes], index) => ({ title, slug, lessonType, minutes, position: index + 1 }))

function parseArgs() {
  const args = new Map()
  for (let index = 2; index < process.argv.length; index += 1) {
    const key = process.argv[index]
    const value = process.argv[index + 1]
    if (key?.startsWith('--') !== true || value === undefined) throw new Error(`Invalid argument near ${key ?? '(end)'}.`)
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

function practiceBlocks(title, concept, equation, firstExample, secondExample, mistakes, transition) {
  return [
    heading(title), paragraph(concept), formula(equation[0], equation[1]),
    example(...firstExample), example(...secondExample),
    callout('Common mistakes', mistakes, 'warning'),
    summary([equation[1], transition]), paragraph(transition),
  ]
}

function lessonBlocks(slug) {
  const blocks = {
    'translating-number-statements': [
      heading('Translate before solving'),
      paragraph('Number problems become manageable when each phrase is converted into an expression or equation before any arithmetic begins. Use x for one unknown and x and y for two distinct unknowns.'),
      formula('a number increased by 7 → x + 7', 'Increased by means addition.'),
      formula('5 less than a number → x - 5', 'The phrase after “less than” comes first in the subtraction.'),
      formula('5 less than twice a number → 2x - 5', 'Translate twice the number before subtracting five.'),
      example('Multiplication language', 'Translate “three times a number is 24.”', ['Let the number be x.', 'Three times x is 3x.', 'The word “is” gives an equals sign.'], '3x = 24.'),
      example('Fractional language', 'Translate “one-half of a number is 9.”', ['“Of” indicates multiplication.', 'One-half of x is x/2.'], 'x/2 = 9.'),
      example('Two numbers', 'One number is 8 greater than another.', ['Let the numbers be x and y.', 'Choose x as the greater number.'], 'x = y + 8.'),
      example('Product statement', 'The product of two numbers is 48.', ['Use x and y for different unknowns.', 'Product means multiplication.'], 'xy = 48.'),
      callout('Phrase order matters', '“5 less than x” means x - 5, while “x less than 5” means 5 - x. Read the entire phrase before writing subtraction.', 'warning'),
      callout('Translation checklist', 'Circle relationship words such as twice, half, greater than, less than, sum, product, and is. Define variables, translate, then solve.'),
      summary(['Use variables consistently.', 'Translate “of” as multiplication.', 'Respect subtraction order.', 'Do not solve until the relationship is written clearly.']),
    ],
    'consecutive-integers': practiceBlocks(
      'Consecutive Integers',
      'Consecutive integers differ by one. Represent them as x, x + 1, x + 2, and so on, then use the given sum, average, or requested term.',
      ['x, x + 1, x + 2, …', 'Use a step of exactly one for ordinary consecutive integers.'],
      ['Three integers', 'Three consecutive integers sum to 72.', ['x + (x + 1) + (x + 2) = 72.', '3x + 3 = 72, so x = 23.'], 'The integers are 23, 24, and 25.'],
      ['Four integers', 'The largest of four consecutive integers is 19.', ['Write x, x + 1, x + 2, x + 3.', 'Set x + 3 = 19.'], 'The smallest is 16.'],
      'Do not use a step of two, omit a term, divide a sum by the wrong count, or return x when another term is requested.',
      'Practice identifying sums and requested terms in positive and occasional negative sequences.',
    ),
    'consecutive-odd-and-even-integers': practiceBlocks(
      'Consecutive Odd and Even Integers',
      'Consecutive odd numbers and consecutive even numbers both differ by two. The parity of the starting value determines the whole sequence.',
      ['x, x + 2, x + 4, …', 'Use an odd x for odd integers and an even x for even integers.'],
      ['Odd integers', 'Three consecutive odd integers sum to 45.', ['x + (x + 2) + (x + 4) = 45.', '3x + 6 = 45, so x = 13.'], 'The integers are 13, 15, and 17.'],
      ['Even integers', 'Three consecutive even integers sum to 66.', ['3x + 6 = 66.', 'x = 20.'], 'The integers are 20, 22, and 24.'],
      'Do not use a step of one, start with the wrong parity, divide by the wrong count, or move two one time too many or too few.',
      'Practice odd and even sums, averages, smallest terms, and largest terms.',
    ),
    'sum-and-difference-of-numbers': practiceBlocks(
      'Sum and Difference of Numbers',
      'Two relationships can determine two unknown numbers. Label the larger and smaller numbers, then use substitution or add the equations to eliminate one variable.',
      ['x + y = S and x - y = D', 'Adding the equations gives 2x = S + D.'],
      ['Sum and difference', 'Two numbers sum to 42 and differ by 8.', ['x + y = 42; x - y = 8.', '2x = 50, so x = 25 and y = 17.'], 'The numbers are 25 and 17.'],
      ['Greater than', 'One number is 7 greater than another; their sum is 39.', ['Let the smaller be y; the larger is y + 7.', 'y + y + 7 = 39.'], 'The larger number is 23.'],
      'Do not reverse larger and smaller, use the sum as one number, halve only the difference, or solve correctly but return the wrong requested value.',
      'Practice translating totals and comparison relationships into a simple system.',
    ),
    'product-and-quotient-relationships': practiceBlocks(
      'Product and Quotient Relationships',
      'When one number is a multiple of another, represent the smaller by x and the larger by kx. A sum or difference supplies the second condition.',
      ['larger = kx', 'Use the stated total or difference to solve for x.'],
      ['Multiple and sum', 'One number is four times another; their sum is 45.', ['x + 4x = 45.', '5x = 45, so x = 9.'], 'The numbers are 9 and 36.'],
      ['Quotient and difference', 'The larger divided by the smaller is 3; their difference is 18.', ['Let the smaller be x and larger be 3x.', '3x - x = 18.'], 'The numbers are 9 and 27.'],
      'Do not treat “times” as addition, reverse quotient order, use the multiplier as a number, ignore the second condition, or return the smaller value when the larger is requested.',
      'Practice controlled positive-integer multiplier and quotient relationships.',
    ),
    'two-digit-number-problems': practiceBlocks(
      'Two-Digit Number Problems',
      'A two-digit number is determined by place value, not by simply adding its digits. The tens digit cannot be zero.',
      ['number = 10a + b', 'Use a for the tens digit and b for the ones digit.'],
      ['Digit sum and difference', 'The digits sum to 11; the tens digit is 3 greater.', ['a + b = 11; a = b + 3.', '2b + 3 = 11, so b = 4 and a = 7.'], 'The number is 74.'],
      ['Multiple digit', 'The tens digit is twice the ones digit; their sum is 9.', ['a = 2b and a + b = 9.', '3b = 9, so b = 3 and a = 6.'], 'The number is 63.'],
      'Do not use a + b as the number, write a + 10b, reverse the digits, or satisfy only one of the stated conditions.',
      'Practice constructing a unique two-digit number from two digit relationships.',
    ),
    'reversed-digit-problems': practiceBlocks(
      'Reversed-Digit Problems',
      'Reversing a two-digit number exchanges its tens and ones digits. Both original and reversed forms must remain valid two-digit numbers.',
      ['original = 10a + b; reverse = 10b + a', 'Track which form the question asks for.'],
      ['Original is greater', 'A number is 27 greater than its reverse; digit sum is 11.', ['9(a - b) = 27, so a - b = 3.', 'With a + b = 11, a = 7 and b = 4.'], 'The original number is 74.'],
      ['Reverse is greater', 'Reversing increases a number by 36; digit sum is 10.', ['9(b - a) = 36, so b - a = 4.', 'Together with a + b = 10, a = 3 and b = 7.'], 'The original number is 37.'],
      'Do not return the wrong orientation, reverse subtraction, ignore place value, or allow a leading zero in a required two-digit reverse.',
      'Practice using digit sums and signed differences to identify one unique number.',
    ),
    'number-and-remainder-problems': practiceBlocks(
      'Number and Remainder Problems',
      'Division with remainder separates a number into complete groups and a leftover amount. The remainder must be at least zero and less than the divisor.',
      ['n = dq + r, with 0 ≤ r < d', 'Multiply divisor by quotient, then add the remainder.'],
      ['Known quotient', 'A number divided by 5 has quotient 7 and remainder 3.', ['n = 5(7) + 3.', 'n = 38.'], 'The number is 38.'],
      ['Two remainder conditions', 'Find the smallest positive number leaving remainder 2 by 4 and remainder 1 by 3.', ['Values 2 mod 4 are 2, 6, 10, …', '10 also leaves remainder 1 by 3.'], 'The smallest number is 10.'],
      'Do not omit the remainder, add d + q + r, swap divisor and quotient, accept r ≥ d, or ignore the “smallest positive” condition.',
      'Practice quotient-and-remainder reconstruction and small bounded searches.',
    ),
    'fractional-parts-of-numbers': practiceBlocks(
      'Fractional Parts of Numbers',
      'Translate a fractional part as multiplication. To recover the whole, divide by the fraction or multiply by its reciprocal.',
      ['(a/b)x = p → x = p(b/a)', 'Use exact rational arithmetic and prefer integer solutions.'],
      ['One-third', 'One-third of a number is 18.', ['x/3 = 18.', 'Multiply by 3.'], 'The number is 54.'],
      ['Three-fourths', 'Three-fourths of a number is 45.', ['(3/4)x = 45.', 'x = 45(4/3).'], 'The number is 60.'],
      'Do not return the fractional part, reverse the fraction incorrectly, multiply when division is required, or use only a numerator or denominator.',
      'Practice recovering whole numbers from exact fractional relationships.',
    ),
    'mixed-number-relationship-problems': practiceBlocks(
      'Mixed Number Relationship Problems',
      'Multi-step questions combine translation with a controlled integer, digit, fraction, quotient, or remainder condition. Write every condition before solving.',
      ['translate → solve → verify every condition', 'A valid answer must satisfy all stated relationships and the requested value.'],
      ['Multiple relationship', 'The larger is three times the smaller and their difference is 20.', ['3x - x = 20.', 'x = 10.'], 'The larger number is 30.'],
      ['Remainder with range', 'A number from 35 to 40 has quotient 7 and remainder 3 when divided by 5.', ['Use n = 5(7) + 3.', 'n = 38, which is in range.'], 'The number is 38.'],
      'Do not solve only one condition, return an unrequested value, ignore a range, or accept a digit or remainder solution that violates its bounds.',
      'Practice translating, solving, and checking multi-step number relationships.',
    ),
    'mixed-number-problems-practice': [
      heading('Mixed Number Problems Practice'),
      paragraph('This fixed practice reviews translation, consecutive integers, two-number relationships, digit problems, and fractional or remainder reasoning.'),
      formula('define variables → translate conditions → solve → verify', 'Use every condition and answer exactly what is requested.'),
      example('Plan a solution', 'Two numbers have a sum and a difference.', ['Label larger and smaller.', 'Write two equations.', 'Eliminate one variable.'], 'Verify both the sum and difference.'),
      example('Check digits', 'A two-digit number is found from digit conditions.', ['Check each digit is valid.', 'Construct 10a + b.', 'Test both conditions.'], 'Reject any competing solution.'),
      callout('Reasonableness check', 'Integers, digits, fractions, and remainders have different constraints. Apply the correct bounds before accepting an answer.', 'warning'),
      summary(['Translate carefully.', 'Keep place value explicit.', 'Check parity and remainder bounds.', 'Return the requested value.']),
    ],
    'number-problems-topic-quiz': [
      heading('Number Problems Topic Quiz'),
      paragraph('This 15-question quiz checks translation, integer sequences, two-number relationships, digit place value, remainders, fractions, and mixed applications.'),
      callout('Before starting', 'Define variables, write all conditions, solve with manageable arithmetic, and verify the requested value.'),
      summary(['Respect phrase order.', 'Use exact integer and digit constraints.', 'Check remainder bounds.', 'Verify every relationship.']),
    ],
  }
  return blocks[slug]
}

function fixedQuestion(prompt, correct, distractors, explanation, position) {
  return {
    prompt, explanation, points: 1, position, status: 'active',
    choices: [correct, ...distractors].map((text, index) => ({ text, isCorrect: index === 0, position: index + 1 })),
  }
}

const mixedQuestions = [
  ['Translate “5 less than twice a number.”', '2x - 5', ['2(x - 5)', '5 - 2x', '2x + 5'], 'Twice a number is 2x; five less than that is 2x - 5.'],
  ['Three consecutive integers sum to 72. Find the integers.', '23, 24, and 25', ['22, 24, and 26', '24, 25, and 26', '21, 22, and 23'], 'Let the integers be x, x + 1, x + 2. Then 3x + 3 = 72, so x = 23.'],
  ['Three consecutive even integers sum to 66. Find the integers.', '20, 22, and 24', ['21, 22, and 23', '18, 20, and 22', '22, 24, and 26'], 'Use x, x + 2, x + 4. Then 3x + 6 = 66, so x = 20.'],
  ['Two numbers sum to 42 and differ by 8. Find the larger number.', '25', ['17', '21', '34'], 'Adding x + y = 42 and x - y = 8 gives 2x = 50, so x = 25.'],
  ['One number is four times another and their sum is 45. Find the larger number.', '36', ['9', '41', '180'], 'Let the smaller be x. Then x + 4x = 45, so x = 9 and the larger is 36.'],
  ['The digits of a number sum to 11; the tens digit is 3 greater. Find the number.', '74', ['47', '11', '73'], 'a + b = 11 and a = b + 3 give a = 7, b = 4; 10a + b = 74.'],
  ['A number is 27 greater than its reverse and its digits sum to 11. Find the original.', '74', ['47', '27', '83'], '9(a - b) = 27 and a + b = 11 give a = 7 and b = 4, so the original is 74.'],
  ['Three-fourths of a number is 45. Find the number.', '60', ['33.75', '48', '180'], '(3/4)x = 45, so x = 45 × 4/3 = 60.'],
]

const quizQuestions = [
  ['Translate “a number increased by 7.”', 'x + 7', ['7x', 'x - 7', '7 - x'], 'Increased by means add seven to x.'],
  ['Translate “one number is 8 greater than another.”', 'x = y + 8', ['x + y = 8', 'x = 8 - y', '8x = y'], 'If x is the greater number, x equals y plus 8.'],
  ['Three consecutive integers sum to 72. Find the smallest.', '23', ['24', '22', '72'], 'x + x + 1 + x + 2 = 72 gives x = 23.'],
  ['Three consecutive odd integers sum to 45. Find the largest.', '17', ['13', '15', '19'], 'The integers are 13, 15, and 17.'],
  ['Three consecutive even integers sum to 66. Find the largest.', '24', ['20', '22', '26'], 'The integers are 20, 22, and 24.'],
  ['Two numbers sum to 42 and differ by 8. Find the smaller.', '17', ['25', '21', '34'], 'The system gives larger 25 and smaller 17.'],
  ['One number is 7 greater than another; their sum is 39. Find the larger.', '23', ['16', '32', '46'], 'Let the smaller be y. Then y + y + 7 = 39, so y = 16 and the larger is 23.'],
  ['One number is four times another; their sum is 45. Find the larger.', '36', ['9', '41', '180'], 'x + 4x = 45 gives x = 9 and 4x = 36.'],
  ['The larger number divided by the smaller is 3; their difference is 18. Find the larger.', '27', ['9', '21', '54'], 'Let the smaller be x. Then 3x - x = 18, so x = 9 and the larger is 27.'],
  ['Which expression represents a two-digit number with tens digit a and ones digit b?', '10a + b', ['a + 10b', 'a + b', '10(a + b)'], 'Place value makes the tens digit worth 10a and the ones digit worth b.'],
  ['The digits sum to 9 and the tens digit is twice the ones digit. Find the number.', '63', ['36', '9', '62'], 'a = 2b and a + b = 9 give b = 3, a = 6, so the number is 63.'],
  ['A number is 36 greater than its reverse and its digits sum to 10. Find the original.', '73', ['37', '36', '82'], '9(a - b) = 36 gives a - b = 4; with a + b = 10, a = 7 and b = 3.'],
  ['A number divided by 5 has quotient 7 and remainder 3. Find the number.', '38', ['35', '15', '42'], 'n = dq + r = 5 × 7 + 3 = 38.'],
  ['One-third of a number is 18. Find the number.', '54', ['6', '18', '36'], 'x/3 = 18, so x = 54.'],
  ['Four consecutive integers sum to 70. Find the largest.', '19', ['16', '17', '18'], 'The integers are 16, 17, 18, and 19; their sum is 70.'],
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
  const result = spawnSync(process.execPath, [vitestEntry, 'run', 'tests/worker.test.ts', '-t', 'Dynamic number-problem generator engine'], { stdio: 'inherit', shell: false })
  if (result.status !== 0) {
    const detail = result.error instanceof Error ? ` ${result.error.message}` : ''
    throw new Error(`The 1,000-question-per-generator quality gate failed.${detail}`)
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
    const password = args.get('password') ?? process.env.CSE_NUMBER_PROBLEMS_ADMIN_PASSWORD
    if (email === undefined || password === undefined) throw new Error('Pass --cookie, or --email with --password or CSE_NUMBER_PROBLEMS_ADMIN_PASSWORD.')
    await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  }

  const dashboard = await request('/api/admin/dashboard')
  const courseId = dashboard.cseProfessional?.id
  if (courseId === undefined) throw new Error('CSE Professional course was not found.')
  let detail = await request(`/api/admin/courses/${courseId}`)
  let subject = detail.subjects.find((item) => item.slug === 'numerical-ability')
  if (subject === undefined) throw new Error('Numerical Ability subject was not found.')
  let averageTopic = subject.topics.find((item) => item.slug === 'average')
  if (averageTopic === undefined || averageTopic.status !== 'published') throw new Error('Published Average must exist before Number Problems.')
  let topic = subject.topics.find((item) => item.slug === topicSlug)
  if (topic === undefined) {
    const created = await request(`/api/admin/subjects/${subject.id}/topics`, {
      method: 'POST', body: JSON.stringify({
        title: 'Number Problems', slug: topicSlug,
        description: 'A structured course on translating number relationships into equations, solving integer and digit problems, and applying arithmetic reasoning to practical CSE-style questions.',
        position: averageTopic.position + 1, status: 'draft',
      }),
    })
    topic = created.topic
  }

  for (const spec of lessonSpecs) {
    detail = await request(`/api/admin/courses/${courseId}`)
    subject = detail.subjects.find((item) => item.slug === 'numerical-ability')
    topic = subject?.topics.find((item) => item.slug === topicSlug)
    if (topic === undefined) throw new Error('Number Problems disappeared during creation.')
    let lesson = topic.lessons.find((item) => item.slug === spec.slug)
    if (lesson === undefined) {
      const created = await request(`/api/admin/topics/${topic.id}/lessons`, {
        method: 'POST', body: JSON.stringify({
          title: spec.title, slug: spec.slug, lessonType: spec.lessonType,
          summary: `${spec.title} in the Number Problems topic.`, estimatedMinutes: spec.minutes,
          position: spec.position, isPreview: false, requiresPrevious: true, status: 'draft',
        }),
      })
      lesson = created.lesson
    } else if (lesson.lessonType !== spec.lessonType) {
      throw new Error(`${spec.slug} has stored type ${lesson.lessonType}; expected ${spec.lessonType}.`)
    } else if (lesson.status !== 'published') {
      const updated = await request(`/api/admin/lessons/${lesson.id}`, {
        method: 'PATCH', body: JSON.stringify({
          title: spec.title, summary: `${spec.title} in the Number Problems topic.`, estimatedMinutes: spec.minutes,
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
          title: spec.title, instructions: 'Answer five generated Number Problems questions, then review the worked explanations.',
          passingScore: 60, questionCount: 5, maximumAttempts: null, showExplanations: true,
          status: lesson.status === 'published' ? 'published' : 'draft', questionSource: 'generated',
          generatorSlug, generatorVersion: 1, difficulty: { easy: 2, medium: 2, hard: 1 },
        }),
      })
    }

    if (spec.slug === 'mixed-number-problems-practice') {
      const saved = await request(`/api/admin/lessons/${lesson.id}/practice-set`, {
        method: 'PUT', body: JSON.stringify({
          title: spec.title, instructions: 'Solve each fixed Number Problems application and verify every condition.',
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

    if (spec.slug === 'number-problems-topic-quiz') {
      const saved = await request(`/api/admin/lessons/${lesson.id}/quiz`, {
        method: 'PUT', body: JSON.stringify({
          title: spec.title, description: 'A fixed 15-question quiz covering the Number Problems topic.', quizType: 'topic',
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
  averageTopic = subject?.topics.find((item) => item.slug === 'average')
  topic = subject?.topics.find((item) => item.slug === topicSlug)
  if (topic === undefined) failures.push('Number Problems was not found under Numerical Ability.')
  else {
    if (averageTopic === undefined || averageTopic.status !== 'published' || topic.position !== averageTopic.position + 1) failures.push('Number Problems must be immediately after published Average.')
    if (topic.lessons.length !== 12) failures.push(`Expected 12 lessons; found ${topic.lessons.length}.`)
    if (new Set(topic.lessons.map((lesson) => lesson.position)).size !== topic.lessons.length) failures.push('Lesson positions must be unique.')
    for (const spec of lessonSpecs) {
      const lesson = topic.lessons.find((item) => item.slug === spec.slug)
      if (lesson === undefined) { failures.push(`Missing lesson ${spec.slug}.`); continue }
      if (lesson.lessonType !== spec.lessonType) failures.push(`${spec.slug} has an incorrect type.`)
      if (lesson.requiresPrevious !== true || lesson.isPreview !== false) failures.push(`${spec.slug} does not preserve sequential locking.`)
      const blocks = await request(`/api/admin/lessons/${lesson.id}/blocks`)
      const minimumBlocks = spec.slug === 'translating-number-statements' ? 10 : 3
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
      if (spec.slug === 'mixed-number-problems-practice') {
        const practice = await request(`/api/admin/lessons/${lesson.id}/practice-set`)
        failures.push(...validateFixedQuestions('Mixed Number Problems Practice', practice.questions, 8))
      }
      if (spec.slug === 'number-problems-topic-quiz') {
        const quiz = await request(`/api/admin/lessons/${lesson.id}/quiz`)
        failures.push(...validateFixedQuestions('Number Problems Topic Quiz', quiz.questions, 15))
      }
    }
  }

  if (failures.length > 0) {
    console.error('Number Problems validation failed. Nothing was published.')
    for (const failure of failures) console.error(`- ${failure}`)
    process.exitCode = 1
    return
  }

  const rollbackActions = []
  try {
    detail = await request(`/api/admin/courses/${courseId}`)
    topic = detail.subjects.find((item) => item.slug === 'numerical-ability')?.topics.find((item) => item.slug === topicSlug)
    if (topic === undefined) throw new Error('Number Problems disappeared before publication.')
    for (const spec of lessonSpecs) {
      const lesson = topic.lessons.find((item) => item.slug === spec.slug)
      if (lesson === undefined) throw new Error(`${spec.slug} disappeared before publication.`)
      const generatorSlug = generatedPracticeByLessonSlug[spec.slug]
      if (generatorSlug !== undefined) {
        const current = await request(`/api/admin/lessons/${lesson.id}/practice-set`)
        if (current.practiceSet.status !== 'published') {
          const config = { title: spec.title, instructions: 'Answer five generated Number Problems questions, then review the worked explanations.', passingScore: 60, questionCount: 5, maximumAttempts: null, showExplanations: true, questionSource: 'generated', generatorSlug, generatorVersion: 1, difficulty: { easy: 2, medium: 2, hard: 1 } }
          await request(`/api/admin/lessons/${lesson.id}/practice-set`, { method: 'PUT', body: JSON.stringify({ ...config, status: 'published' }) })
          rollbackActions.push(() => request(`/api/admin/lessons/${lesson.id}/practice-set`, { method: 'PUT', body: JSON.stringify({ ...config, status: current.practiceSet.status }) }))
        }
      }
      if (spec.slug === 'mixed-number-problems-practice') {
        const current = await request(`/api/admin/lessons/${lesson.id}/practice-set`)
        if (current.practiceSet.status !== 'published') {
          const config = { title: spec.title, instructions: 'Solve each fixed Number Problems application and verify every condition.', passingScore: 60, questionCount: 8, maximumAttempts: null, showExplanations: true, questionSource: 'fixed' }
          await request(`/api/admin/lessons/${lesson.id}/practice-set`, { method: 'PUT', body: JSON.stringify({ ...config, status: 'published' }) })
          rollbackActions.push(() => request(`/api/admin/lessons/${lesson.id}/practice-set`, { method: 'PUT', body: JSON.stringify({ ...config, status: current.practiceSet.status }) }))
        }
      }
      if (spec.slug === 'number-problems-topic-quiz') {
        const current = await request(`/api/admin/lessons/${lesson.id}/quiz`)
        if (current.quiz.status !== 'published') {
          const config = { title: spec.title, description: 'A fixed 15-question quiz covering the Number Problems topic.', quizType: 'topic', passingScore: 70, timeLimitMinutes: null, maximumAttempts: null, shuffleQuestions: false, shuffleChoices: false, showExplanations: true }
          await request(`/api/admin/lessons/${lesson.id}/quiz`, { method: 'PUT', body: JSON.stringify({ ...config, status: 'published' }) })
          rollbackActions.push(() => request(`/api/admin/lessons/${lesson.id}/quiz`, { method: 'PUT', body: JSON.stringify({ ...config, status: current.quiz.status }) }))
        }
      }
    }

    detail = await request(`/api/admin/courses/${courseId}`)
    topic = detail.subjects.find((item) => item.slug === 'numerical-ability')?.topics.find((item) => item.slug === topicSlug)
    if (topic === undefined) throw new Error('Number Problems disappeared before lesson publication.')
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
    if (topic === undefined) throw new Error('Number Problems disappeared before final publication.')
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

  console.log('Number Problems was created, validated, and published.')
  for (const spec of lessonSpecs) console.log(`- ${spec.position}. ${spec.title} (${spec.lessonType})`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
