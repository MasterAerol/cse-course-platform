#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { averageSharingVisual } from './lib/visual-teaching-content.mjs'

const confirmation = 'create-validate-publish-average'
const csrfHeaderValue = 'same-origin-admin-mutation'
const topicSlug = 'average'

const generatedPracticeByLessonSlug = {
  'finding-the-average': 'finding-average',
  'finding-a-missing-value': 'missing-value-average',
  'combined-average': 'combined-average',
  'weighted-average': 'weighted-average',
  'average-after-adding-a-value': 'average-after-adding',
  'average-after-removing-a-value': 'average-after-removing',
  'average-age-problems': 'average-age',
  'average-score-and-salary-problems': 'average-score-salary',
}

const lessonSpecs = [
  ['Understanding Average', 'understanding-average', 'reading', 9],
  ['Sum, Count, and Mean', 'sum-count-and-mean', 'reading', 10],
  ['Finding the Average', 'finding-the-average', 'practice', 11],
  ['Finding a Missing Value', 'finding-a-missing-value', 'practice', 11],
  ['Combined Average', 'combined-average', 'practice', 12],
  ['Weighted Average', 'weighted-average', 'practice', 12],
  ['Average After Adding a Value', 'average-after-adding-a-value', 'practice', 11],
  ['Average After Removing a Value', 'average-after-removing-a-value', 'practice', 11],
  ['Average Age Problems', 'average-age-problems', 'practice', 12],
  ['Average Score and Salary Problems', 'average-score-and-salary-problems', 'practice', 13],
  ['Mixed Average Applications', 'mixed-average-applications', 'practice', 14],
  ['Average Topic Quiz', 'average-topic-quiz', 'quiz', 18],
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
const example = (title, problem, steps, answer, visual) => ({ blockType: 'example', content: { title, problem, steps, answer, ...(visual === undefined ? {} : { visual }) } })
const summary = (items) => ({ blockType: 'summary', content: { items } })

function practiceBlocks(title, concept, process, firstExample, secondExample, mistakes, transition) {
  return [
    heading(title), paragraph(concept), formula(process[0], process[1]),
    example(...firstExample), example(...secondExample),
    callout('Common mistakes', mistakes, 'warning'),
    summary([process[1], transition]), paragraph(transition),
  ]
}

function lessonBlocks(slug) {
  const blocks = {
    'understanding-average': [
      heading('What average represents'),
      paragraph('An average is a representative value for a group of observations. The arithmetic mean balances the total equally across all observations.'),
      formula('Average = Sum of values ÷ Number of values', 'Add every value, count the observations, then divide.'),
      example('Small values', 'Find the average of 4, 6, and 8.', ['Add: 4 + 6 + 8 = 18.', 'There are 3 values.', '18 ÷ 3 = 6.'], 'The average is 6.', averageSharingVisual),
      example('Scores', 'Find the average of 75, 80, and 85.', ['The total is 240.', 'There are 3 scores.', '240 ÷ 3 = 80.'], 'The average score is 80.'),
      example('Salary', 'Three daily salaries are ₱900, ₱1,000, and ₱1,100.', ['Total: ₱3,000.', 'Divide by 3 employees.'], 'The average salary is ₱1,000.'),
      callout('Equal-sharing idea', 'Imagine redistributing the total equally. Each observation would receive the average amount.'),
      callout('The mean need not appear in the list', 'The average can fall between observed values. Very high or low values pull the mean toward them.'),
      callout('Common mistakes', 'Do not use the total as the answer, divide by the wrong count, omit a value, or confuse the median with the mean.', 'warning'),
      summary(['Average represents equal sharing.', 'Use every value exactly once.', 'Divide the total by the number of observations.', 'Check how extreme values affect the result.']),
    ],
    'sum-count-and-mean': [
      heading('Connect sum, count, and mean'),
      paragraph('The average formula can be rearranged to recover a total or a number of observations.'),
      formula('Sum = Average × Number of values', 'Multiply when the average and count are known.'),
      formula('Number of values = Sum ÷ Average', 'Divide when the total and average are known.'),
      example('Total score', 'Five scores average 82.', ['Multiply 82 by 5.'], 'The total is 410.'),
      example('Find the count', 'A total is 240 and the average is 40.', ['Divide 240 by 40.'], 'There are 6 values.'),
      example('Allowances', 'Eight employees average ₱1,250 in allowance.', ['Multiply ₱1,250 by 8.'], 'The total allowance is ₱10,000.'),
      callout('Common mistakes', 'Check whether the question asks for a total, count, or average. Use the actual number of observations and choose multiplication or division accordingly.', 'warning'),
      summary(['Total equals mean times count.', 'Count equals total divided by mean.', 'Label the unknown before calculating.']),
    ],
    'finding-the-average': practiceBlocks(
      'Finding the Average',
      'Finding a mean requires a complete total and an accurate count. Money and decimal contexts use the same process.',
      ['mean = sum ÷ count', 'Add all observations, then divide by how many observations there are.'],
      ['Daily sales', 'Sales are ₱800, ₱900, and ₱1,000.', ['Total: ₱2,700.', 'Divide by 3.'], '₱900.'],
      ['Five scores', 'Scores are 72, 78, 80, 85, and 90.', ['Total: 405.', '405 ÷ 5 = 81.'], '81.'],
      'Avoid using the sum, an incorrect divisor, an omitted value, the median, or a prematurely rounded total.',
      'Practice averages in lists, scores, earnings, and short word problems.',
    ),
    'finding-a-missing-value': practiceBlocks(
      'Finding a Missing Value',
      'Use the target average and total count to find the required total, then subtract the sum of known values.',
      ['missing = target mean × total count - known total', 'Find the required total before subtracting known observations.'],
      ['Five numbers', 'Five numbers average 18; four are 12, 15, 20, and 23.', ['Required total: 18 × 5 = 90.', 'Known total: 70.', '90 - 70 = 20.'], 'The missing value is 20.'],
      ['Four scores', 'Four scores average 75; three are 70, 72, and 80.', ['Required total: 300.', 'Known total: 222.', '300 - 222 = 78.'], 'The missing score is 78.'],
      'Do not use the average directly, use the known-value count as the total count, reverse the subtraction, or omit a known value.',
      'Practice reconstructing one missing observation from a target mean.',
    ),
    'combined-average': practiceBlocks(
      'Combined Average',
      'Groups with different sizes must be combined through their totals. A simple average of group means is valid only when group sizes are equal.',
      ['combined mean = (mean₁ × count₁ + mean₂ × count₂) ÷ (count₁ + count₂)', 'Weight each group mean by its group size.'],
      ['Two classes', '20 students average 78 and 30 students average 84.', ['Totals: 1,560 and 2,520.', 'Combined total: 4,080; count: 50.'], 'Combined average = 81.6.'],
      ['Two teams', '10 workers average 40 units and 15 workers average 50 units.', ['Totals: 400 and 750.', '1,150 ÷ 25 = 46.'], 'Combined average = 46.'],
      'Do not average group means equally, reverse their sizes, or divide by only one group count.',
      'Practice combining groups with unequal weights.',
    ),
    'weighted-average': practiceBlocks(
      'Weighted Average',
      'A weighted mean gives some values more influence. Percentage weights must total 100%, while quantity weights divide by total units.',
      ['weighted mean = Σ(value × weight) ÷ Σweights', 'Multiply each value by its weight, add contributions, then divide by total weight.'],
      ['Grade components', 'A score of 80 has weight 40%; 90 has weight 60%.', ['80 × 0.40 = 32.', '90 × 0.60 = 54.'], 'Weighted average = 86.'],
      ['Purchase cost', 'Two items cost ₱50 and three cost ₱70.', ['Weighted total: 2 × 50 + 3 × 70 = 310.', 'Total units: 5.'], 'Average cost = ₱62.'],
      'Do not take a simple average, reverse weights, omit a component, or forget to divide by total weight.',
      'Practice percentage and quantity-weighted averages.',
    ),
    'average-after-adding-a-value': practiceBlocks(
      'Average After Adding a Value',
      'Recover the old total, add the new value, and divide by a count that is one larger.',
      ['new mean = (old mean × old count + new value) ÷ (old count + 1)', 'Update both the total and the count.'],
      ['Add 32', 'Five numbers average 20. Add 32.', ['Old total: 100.', 'New total: 132; new count: 6.'], 'New average = 22.'],
      ['New sale', 'Four days average ₱800. A fifth day earns ₱1,000.', ['Old total: ₱3,200.', 'New total: ₱4,200.'], 'New average = ₱840.'],
      'Do not average the old mean and new value directly, divide by the old count, or add the value to the mean.',
      'Practice recalculating means after a new observation.',
    ),
    'average-after-removing-a-value': practiceBlocks(
      'Average After Removing a Value',
      'Recover the original total, subtract the removed value, and divide by a count that is one smaller.',
      ['new mean = (old mean × old count - removed value) ÷ (old count - 1)', 'Reduce both the total and the count.'],
      ['Remove 40', 'Six numbers average 25. Remove 40.', ['Old total: 150.', 'Remaining total: 110; count: 5.'], 'New average = 22.'],
      ['Remove one score', 'Five scores average 80. Remove 92.', ['Old total: 400.', 'Remaining total: 308.'], 'New average = 77.'],
      'Do not divide by the original count, subtract directly from the mean, forget to reduce the count, or add the removed value.',
      'Practice recalculating means after an observation leaves.',
    ),
    'average-age-problems': practiceBlocks(
      'Average Age Problems',
      'Translate average ages into total ages before handling a person who joins, leaves, or has an unknown age.',
      ['total age = average age × number of people', 'Change total age and group count together.'],
      ['A person joins', 'Four employees average 30 years. A 40-year-old joins.', ['Old total: 120.', 'New total: 160; count: 5.'], 'New average age = 32 years.'],
      ['A person leaves', 'Six students average 20 years. A 25-year-old leaves.', ['Old total: 120.', 'Remaining total: 95; count: 5.'], 'New average age = 19 years.'],
      'Avoid ambiguous assumptions. Do not average an existing mean directly with a person’s age or use the wrong original/new count.',
      'Practice clear employee, student, team, and group age situations.',
    ),
    'average-score-and-salary-problems': practiceBlocks(
      'Average Score and Salary Problems',
      'Scores, salaries, allowances, sales, and earnings use totals. Target-average questions compare a required future total with the current total.',
      ['required next value = target mean × new count - current mean × current count', 'Subtract the current total from the target total.'],
      ['Daily earnings', 'Earnings are ₱750, ₱820, ₱780, ₱900, and ₱850.', ['Total: ₱4,100.', 'Divide by 5.'], 'Average = ₱820.'],
      ['Target score', 'Four games average 82. What fifth score gives an average of 85?', ['Target total: 85 × 5 = 425.', 'Current total: 82 × 4 = 328.'], 'Required score = 97.'],
      'Do not use the target mean as the required score, forget the previous total, use the old count, or subtract in reverse.',
      'Practice earnings, scores, salaries, allowances, and target means.',
    ),
    'mixed-average-applications': [
      heading('Mixed Average Applications'),
      paragraph('This fixed practice combines basic means, totals, missing values, combined and weighted averages, and changing averages.'),
      formula('identify the unknown → recover totals → update count → divide', 'Choose the formula that matches what changes.'),
      example('Choose a model', 'Two groups have different sizes.', ['Convert each group mean to a total.', 'Add totals and counts.'], 'Use a combined weighted average.'),
      example('Choose a model', 'One observation is removed.', ['Subtract it from the old total.', 'Reduce the count by one.'], 'Recalculate with the remaining count.'),
      callout('Reasonableness check', 'A mean should normally lie between the smallest and largest included values.', 'warning'),
      summary(['Use exact totals.', 'Track the observation count.', 'Round only at the requested final step.']),
    ],
    'average-topic-quiz': [
      heading('Average Topic Quiz'),
      paragraph('This 15-question quiz checks mean concepts, totals, counts, missing values, weighted and combined averages, changing averages, and applications.'),
      callout('Before starting', 'Identify the total and count before choosing a formula. Keep money and score units consistent.'),
      summary(['Use every included observation.', 'Weight unequal groups correctly.', 'Update totals and counts together.', 'Check the final mean for reasonableness.']),
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
  ['Find the average of 12, 18, 24, and 30.', '21', ['84', '28', '18'], 'The total is 84 and 84 ÷ 4 = 21.'],
  ['Seven attendance counts average 36. What is their total?', '252', ['43', '5.14', '216'], 'Sum = average × count = 36 × 7 = 252.'],
  ['Five scores average 80. Four scores total 310. Find the fifth score.', '90', ['80', '710', '70'], 'The required total is 400; 400 - 310 = 90.'],
  ['Ten workers average 40 units and 15 workers average 50 units. Find the combined average.', '46', ['45', '92', '50'], 'Weighted total is 1,150 across 25 workers, so 1,150 ÷ 25 = 46.'],
  ['A grade is 40% of 75 and 60% of 90. Find the weighted average.', '84', ['82.5', '66', '165'], '75 × 0.40 + 90 × 0.60 = 84.'],
  ['Five values average 20. After adding 32, what is the new average?', '22', ['26', '26.4', '52'], 'Old total 100 plus 32 gives 132; 132 ÷ 6 = 22.'],
  ['Six values average 25. After removing 40, what is the new average?', '22', ['18.33', '15', '38'], 'Old total 150 minus 40 gives 110; 110 ÷ 5 = 22.'],
  ['Four days average ₱800. What fifth-day earning is needed for a ₱840 average?', '₱1,000', ['₱840', '₱160', '₱4,200'], 'Target total is ₱4,200 and current total is ₱3,200, so the fifth day must be ₱1,000.'],
]

const quizQuestions = [
  ['What does an arithmetic mean represent?', 'The total shared equally among all observations', ['The largest observation', 'The middle observation only', 'The difference between extremes'], 'The arithmetic mean is the equal-share value of the total.'],
  ['Find the mean of 10, 15, and 20.', '15', ['45', '12.5', '20'], 'The total is 45 and 45 ÷ 3 = 15.'],
  ['Six scores average 75. Find their total.', '450', ['81', '12.5', '375'], '75 × 6 = 450.'],
  ['A total of 360 has an average of 45. How many observations are there?', '8', ['405', '315', '45'], 'Count = 360 ÷ 45 = 8.'],
  ['Four numbers average 25. Three numbers are 18, 24, and 30. Find the missing number.', '28', ['25', '72', '172'], 'Required total is 100; known total is 72; missing value is 28.'],
  ['20 students average 70 and 30 students average 80. Find the combined average.', '76', ['75', '150', '78'], 'Weighted total is 3,800 and total count is 50, giving 76.'],
  ['A score of 80 has weight 25% and 92 has weight 75%. Find the weighted average.', '89', ['86', '43', '172'], '80 × 0.25 + 92 × 0.75 = 89.'],
  ['Four values average 18. Add 28. What is the new average?', '20', ['23', '25', '100'], 'Old total 72 plus 28 is 100; divide by 5.'],
  ['Five values average 30. Remove 50. What is the new average?', '25', ['20', '40', '50'], 'Old total 150 minus 50 is 100; divide by 4.'],
  ['Four employees average 30 years. A 40-year-old joins. Find the new average age.', '32 years', ['35 years', '40 years', '25 years'], 'Total age becomes 160 for five employees, giving 32 years.'],
  ['Scores are 70, 80, 85, 90, and 95. Find the average.', '84', ['420', '85', '83'], 'The total is 420 and 420 ÷ 5 = 84.'],
  ['Three salaries are ₱18,000, ₱20,000, and ₱22,000. Find the average.', '₱20,000', ['₱60,000', '₱19,000', '₱22,000'], 'The total is ₱60,000 and dividing by 3 gives ₱20,000.'],
  ['A team averages 82 after four games. What fifth score is needed to average 85?', '97', ['85', '15', '425'], 'Target total 425 minus current total 328 gives 97.'],
  ['Three days average ₱900. A fourth day earns ₱1,100, then a fifth earns ₱1,200. Find the five-day average.', '₱1,000', ['₱5,000', '₱1,066.67', '₹20'], 'The first three days total ₱2,700; the five-day total is ₱5,000; divide by 5.'],
  ['Average inventory for four weeks is 125 units. The first three weeks total 360 units. What was the fourth week?', '140 units', ['125 units', '500 units', '15 units'], 'Required total is 500; 500 - 360 = 140 units.'],
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
  const result = spawnSync(process.execPath, [vitestEntry, 'run', 'tests/worker.test.ts', '-t', 'Dynamic average generator engine'], { stdio: 'inherit', shell: false })
  if (result.status !== 0) {
    const detail = result.error instanceof Error ? ` ${result.error.message}` : ''
    throw new Error(`The 1,000-question-per-generator quality gate failed.${detail}`)
  }
}

async function main() {
  const args = parseArgs()
  const baseUrl = args.get('base-url') ?? 'http://127.0.0.1:5173'
  if (args.get('confirm') !== confirmation) {
    throw new Error(`Pass --confirm ${confirmation} to continue.`)
  }

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
    if (!response.ok || body.success !== true) {
      throw new Error(`${options.method ?? 'GET'} ${path} failed: ${JSON.stringify(body)}`)
    }
    return body.data
  }

  if (cookie === null) {
    const email = args.get('email')
    const password = args.get('password') ?? process.env.CSE_AVERAGE_ADMIN_PASSWORD
    if (email === undefined || password === undefined) {
      throw new Error('Pass --cookie, or --email with --password or CSE_AVERAGE_ADMIN_PASSWORD.')
    }
    await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  }

  const dashboard = await request('/api/admin/dashboard')
  const courseId = dashboard.cseProfessional?.id
  if (courseId === undefined) throw new Error('CSE Professional course was not found.')

  let detail = await request(`/api/admin/courses/${courseId}`)
  let subject = detail.subjects.find((item) => item.slug === 'numerical-ability')
  if (subject === undefined) throw new Error('Numerical Ability subject was not found.')
  let topic = subject.topics.find((item) => item.slug === topicSlug)
  if (topic === undefined) {
    const ratioTopic = subject.topics.find((item) => item.slug === 'ratio-and-proportion')
    if (ratioTopic === undefined) throw new Error('Ratio and Proportion must exist before Average.')
    const created = await request(`/api/admin/subjects/${subject.id}/topics`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Average', slug: topicSlug,
        description: 'A structured course on arithmetic mean, totals, missing values, combined averages, weighted averages, changing averages, and practical applications.',
        position: ratioTopic.position + 1, status: 'draft',
      }),
    })
    topic = created.topic
  }

  for (const spec of lessonSpecs) {
    detail = await request(`/api/admin/courses/${courseId}`)
    subject = detail.subjects.find((item) => item.slug === 'numerical-ability')
    topic = subject?.topics.find((item) => item.slug === topicSlug)
    if (topic === undefined) throw new Error('Average disappeared during creation.')
    let lesson = topic.lessons.find((item) => item.slug === spec.slug)
    if (lesson === undefined) {
      const created = await request(`/api/admin/topics/${topic.id}/lessons`, {
        method: 'POST',
        body: JSON.stringify({
          title: spec.title, slug: spec.slug, lessonType: spec.lessonType,
          summary: `${spec.title} in the Average topic.`, estimatedMinutes: spec.minutes,
          position: spec.position, isPreview: false, requiresPrevious: true, status: 'draft',
        }),
      })
      lesson = created.lesson
    } else if (lesson.lessonType !== spec.lessonType) {
      throw new Error(`${spec.slug} has stored type ${lesson.lessonType}; expected ${spec.lessonType}.`)
    } else if (lesson.status !== 'published') {
      const updated = await request(`/api/admin/lessons/${lesson.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: spec.title, summary: `${spec.title} in the Average topic.`, estimatedMinutes: spec.minutes,
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
        method: 'PUT',
        body: JSON.stringify({
          title: spec.title, instructions: 'Answer five generated Average questions, then review the worked explanations.',
          passingScore: 60, questionCount: 5, maximumAttempts: null, showExplanations: true,
          status: lesson.status === 'published' ? 'published' : 'draft', questionSource: 'generated',
          generatorSlug, generatorVersion: 1, difficulty: { easy: 2, medium: 2, hard: 1 },
        }),
      })
    }

    if (spec.slug === 'mixed-average-applications') {
      const saved = await request(`/api/admin/lessons/${lesson.id}/practice-set`, {
        method: 'PUT', body: JSON.stringify({
          title: spec.title, instructions: 'Solve each application using totals, counts, and the appropriate average formula.',
          passingScore: 60, questionCount: 8, maximumAttempts: null, showExplanations: true,
          status: lesson.status === 'published' ? 'published' : 'draft', questionSource: 'fixed',
        }),
      })
      const current = await request(`/api/admin/lessons/${lesson.id}/practice-set`)
      for (const [index, item] of mixedQuestions.entries()) {
        const input = fixedQuestion(item[0], item[1], item[2], item[3], index + 1)
        const existing = current.questions.find((question) => question.position === input.position)
        const body = existing === undefined ? input : {
          ...input, updatedAt: existing.updatedAt,
          choices: input.choices.map((choice) => ({ ...choice, id: existing.choices.find((old) => old.position === choice.position)?.id })),
        }
        await request(existing === undefined ? `/api/admin/practice-sets/${saved.practiceSet.id}/questions` : `/api/admin/practice-questions/${existing.id}`, {
          method: existing === undefined ? 'POST' : 'PATCH', body: JSON.stringify(body),
        })
      }
    }

    if (spec.slug === 'average-topic-quiz') {
      const saved = await request(`/api/admin/lessons/${lesson.id}/quiz`, {
        method: 'PUT', body: JSON.stringify({
          title: spec.title, description: 'A fixed 15-question quiz covering the Average topic.', quizType: 'topic',
          passingScore: 70, timeLimitMinutes: null, maximumAttempts: null, shuffleQuestions: false,
          shuffleChoices: false, showExplanations: true,
          status: lesson.status === 'published' ? 'published' : 'draft',
        }),
      })
      const current = await request(`/api/admin/lessons/${lesson.id}/quiz`)
      for (const [index, item] of quizQuestions.entries()) {
        const input = { ...fixedQuestion(item[0], item[1], item[2], item[3], index + 1), questionType: 'multiple_choice' }
        const existing = current.questions.find((question) => question.position === input.position)
        const body = existing === undefined ? input : {
          ...input, updatedAt: existing.updatedAt,
          choices: input.choices.map((choice) => ({ ...choice, id: existing.choices.find((old) => old.position === choice.position)?.id })),
        }
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
  const ratioTopic = subject?.topics.find((item) => item.slug === 'ratio-and-proportion')
  topic = subject?.topics.find((item) => item.slug === topicSlug)
  if (topic === undefined) {
    failures.push('Average was not found under Numerical Ability.')
  } else {
    if (ratioTopic === undefined || topic.position !== ratioTopic.position + 1) failures.push('Average must be immediately after Ratio and Proportion.')
    if (topic.lessons.length !== 12) failures.push(`Expected 12 lessons; found ${topic.lessons.length}.`)
    if (new Set(topic.lessons.map((lesson) => lesson.position)).size !== topic.lessons.length) failures.push('Lesson positions must be unique.')
    for (const spec of lessonSpecs) {
      const lesson = topic.lessons.find((item) => item.slug === spec.slug)
      if (lesson === undefined) { failures.push(`Missing lesson ${spec.slug}.`); continue }
      if (lesson.lessonType !== spec.lessonType) failures.push(`${spec.slug} has an incorrect type.`)
      if (lesson.requiresPrevious !== true || lesson.isPreview !== false) failures.push(`${spec.slug} does not preserve sequential locking.`)
      const blocks = await request(`/api/admin/lessons/${lesson.id}/blocks`)
      if (blocks.blocks.length < 3) failures.push(`${spec.slug} lacks meaningful instructional blocks.`)
      if (blocks.blocks.some((block) => hasRawHtml(block.content))) failures.push(`${spec.slug} contains raw HTML.`)
      const generatorSlug = generatedPracticeByLessonSlug[spec.slug]
      if (generatorSlug !== undefined) {
        const practice = await request(`/api/admin/lessons/${lesson.id}/practice-set`)
        const set = practice.practiceSet
        if (
          set === null || set.questionSource !== 'generated' || set.generator?.slug !== generatorSlug ||
          set.generator?.version !== 1 || set.generator?.difficulty.easy !== 2 || set.generator?.difficulty.medium !== 2 ||
          set.generator?.difficulty.hard !== 1 || set.questionCount !== 5 || set.passingScore !== 60 ||
          set.maximumAttempts !== null || set.showExplanations !== true
        ) failures.push(`${spec.slug} has an invalid generated practice configuration.`)
      }
      if (spec.slug === 'mixed-average-applications') {
        const practice = await request(`/api/admin/lessons/${lesson.id}/practice-set`)
        failures.push(...validateFixedQuestions('Mixed Average Applications', practice.questions, 8))
      }
      if (spec.slug === 'average-topic-quiz') {
        const quiz = await request(`/api/admin/lessons/${lesson.id}/quiz`)
        failures.push(...validateFixedQuestions('Average Topic Quiz', quiz.questions, 15))
      }
    }
  }

  if (failures.length > 0) {
    console.error('Average validation failed. Nothing was published.')
    for (const failure of failures) console.error(`- ${failure}`)
    process.exitCode = 1
    return
  }

  const rollbackActions = []
  try {
    detail = await request(`/api/admin/courses/${courseId}`)
    topic = detail.subjects.find((item) => item.slug === 'numerical-ability')?.topics.find((item) => item.slug === topicSlug)
    if (topic === undefined) throw new Error('Average disappeared before publication.')
    for (const spec of lessonSpecs) {
      const lesson = topic.lessons.find((item) => item.slug === spec.slug)
      if (lesson === undefined) throw new Error(`${spec.slug} disappeared before publication.`)
      const generatorSlug = generatedPracticeByLessonSlug[spec.slug]
      if (generatorSlug !== undefined) {
        const current = await request(`/api/admin/lessons/${lesson.id}/practice-set`)
        if (current.practiceSet.status !== 'published') {
          const config = {
            title: spec.title, instructions: 'Answer five generated Average questions, then review the worked explanations.',
            passingScore: 60, questionCount: 5, maximumAttempts: null, showExplanations: true,
            questionSource: 'generated', generatorSlug, generatorVersion: 1, difficulty: { easy: 2, medium: 2, hard: 1 },
          }
          await request(`/api/admin/lessons/${lesson.id}/practice-set`, { method: 'PUT', body: JSON.stringify({ ...config, status: 'published' }) })
          rollbackActions.push(() => request(`/api/admin/lessons/${lesson.id}/practice-set`, { method: 'PUT', body: JSON.stringify({ ...config, status: current.practiceSet.status }) }))
        }
      }
      if (spec.slug === 'mixed-average-applications') {
        const current = await request(`/api/admin/lessons/${lesson.id}/practice-set`)
        if (current.practiceSet.status !== 'published') {
          const config = {
            title: spec.title, instructions: 'Solve each application using totals, counts, and the appropriate average formula.',
            passingScore: 60, questionCount: 8, maximumAttempts: null, showExplanations: true, questionSource: 'fixed',
          }
          await request(`/api/admin/lessons/${lesson.id}/practice-set`, { method: 'PUT', body: JSON.stringify({ ...config, status: 'published' }) })
          rollbackActions.push(() => request(`/api/admin/lessons/${lesson.id}/practice-set`, { method: 'PUT', body: JSON.stringify({ ...config, status: current.practiceSet.status }) }))
        }
      }
      if (spec.slug === 'average-topic-quiz') {
        const current = await request(`/api/admin/lessons/${lesson.id}/quiz`)
        if (current.quiz.status !== 'published') {
          const config = {
            title: spec.title, description: 'A fixed 15-question quiz covering the Average topic.', quizType: 'topic',
            passingScore: 70, timeLimitMinutes: null, maximumAttempts: null, shuffleQuestions: false,
            shuffleChoices: false, showExplanations: true,
          }
          await request(`/api/admin/lessons/${lesson.id}/quiz`, { method: 'PUT', body: JSON.stringify({ ...config, status: 'published' }) })
          rollbackActions.push(() => request(`/api/admin/lessons/${lesson.id}/quiz`, { method: 'PUT', body: JSON.stringify({ ...config, status: current.quiz.status }) }))
        }
      }
    }

    detail = await request(`/api/admin/courses/${courseId}`)
    topic = detail.subjects.find((item) => item.slug === 'numerical-ability')?.topics.find((item) => item.slug === topicSlug)
    if (topic === undefined) throw new Error('Average disappeared before lesson publication.')
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
    if (topic === undefined) throw new Error('Average disappeared before final publication.')
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
      try { await rollback() } catch (rollbackError) {
        console.error(`Rollback failed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`)
      }
    }
    process.exitCode = 1
    return
  }

  console.log('Average was created, validated, and published.')
  for (const spec of lessonSpecs) console.log(`- ${spec.position}. ${spec.title} (${spec.lessonType})`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
