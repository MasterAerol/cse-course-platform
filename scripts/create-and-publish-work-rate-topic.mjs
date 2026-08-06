#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { workRateVisual } from './lib/visual-teaching-content.mjs'

const confirmation = 'create-validate-publish-work-rate'
const csrfHeaderValue = 'same-origin-admin-mutation'
const topicSlug = 'work-and-rate-problems'

const generatedPracticeByLessonSlug = {
  'individual-work-rate': 'individual-work-rate',
  'combined-work': 'combined-work-rate',
  'one-worker-joins-later': 'worker-joins-later',
  'one-worker-leaves-early': 'worker-leaves-early',
  'pipes-filling-a-tank': 'pipes-filling',
  'pipes-filling-and-draining': 'pipes-filling-draining',
  'efficiency-and-different-work-rates': 'efficiency-work-rates',
  'finding-an-unknown-work-time': 'unknown-work-time',
  'mixed-work-and-rate-problems': 'mixed-work-rate',
}

const lessonSpecs = [
  ['Understanding Work Rates', 'understanding-work-rates', 'reading', 12],
  ['Individual Work Rate', 'individual-work-rate', 'practice', 11],
  ['Combined Work', 'combined-work', 'practice', 12],
  ['One Worker Joins Later', 'one-worker-joins-later', 'practice', 13],
  ['One Worker Leaves Early', 'one-worker-leaves-early', 'practice', 13],
  ['Pipes Filling a Tank', 'pipes-filling-a-tank', 'practice', 12],
  ['Pipes Filling and Draining', 'pipes-filling-and-draining', 'practice', 13],
  ['Efficiency and Different Work Rates', 'efficiency-and-different-work-rates', 'practice', 13],
  ['Finding an Unknown Work Time', 'finding-an-unknown-work-time', 'practice', 14],
  ['Mixed Work and Rate Problems', 'mixed-work-and-rate-problems', 'practice', 15],
  ['Mixed Work and Rate Practice', 'mixed-work-and-rate-practice', 'practice', 16],
  ['Work and Rate Topic Quiz', 'work-and-rate-topic-quiz', 'quiz', 18],
].map(([title, slug, lessonType, minutes], index) => ({ title, slug, lessonType, minutes, position: index + 1 }))

const heading = (text, level = 2) => ({ blockType: 'heading', content: { level, text } })
const paragraph = (text) => ({ blockType: 'paragraph', content: { text } })
const formula = (expression, description) => ({ blockType: 'formula', content: { expression, description } })
const callout = (title, text, variant = 'info') => ({ blockType: 'callout', content: { title, text, variant } })
const example = (title, problem, steps, answer, visual) => ({ blockType: 'example', content: { title, problem, steps, answer, ...(visual === undefined ? {} : { visual }) } })
const summary = (items) => ({ blockType: 'summary', content: { items } })

function practiceBlocks(title, concept, equation, rateTable, firstExample, secondExample, mistakes, transition) {
  return [
    heading(title), paragraph(concept), formula(equation[0], equation[1]),
    callout('Rate table', rateTable), example(...firstExample), example(...secondExample),
    callout('Common mistakes', mistakes, 'warning'), summary([equation[1], transition]),
  ]
}

const blockData = {
  'individual-work-rate': [
    'Individual Work Rate', 'Treat one complete job as 1. A constant individual rate tells how much of that job is finished in one unit of time.',
    ['rate = work ÷ time', 'For one job completed in t hours, rate = 1/t job per hour.'],
    'Record work, time, and rate in separate columns and use one time unit throughout.',
    ['One complete job', 'A clerk finishes a batch in 8 hours.', ['Work = 1 and time = 8.', 'Rate = 1 ÷ 8.'], 'The rate is 1/8 job per hour.'],
    ['Several jobs', 'A printer finishes 4 jobs in 10 hours.', ['Rate = 4 ÷ 10.', 'Reduce 4/10 to 2/5.'], 'The rate is 2/5 job per hour.'],
    'Do not use completion time as the rate, invert the wrong quantities, forget the number of jobs, or mix hours and minutes.',
    'Practice finding rates and completion times from full and partial work.',
  ],
  'combined-work': [
    'Combined Work', 'When workers or machines perform the same job together at constant rates, add their work rates—not their completion times.',
    ['1/T = 1/a + 1/b', 'Add individual rates first, then invert the combined rate to find time.'],
    'List each worker, individual time, and rate; the combined row contains the sum of the rates.',
    ['Two workers', 'A needs 6 hours and B needs 3 hours.', ['Rates are 1/6 and 1/3.', 'Their sum is 1/2.'], 'Together they need 2 hours.'],
    ['Three machines', 'Times are 8, 12, and 24 hours.', ['Use denominator 24: 3/24 + 2/24 + 1/24.', 'Combined rate = 6/24 = 1/4.'], 'Together they need 4 hours.'],
    'Do not add or average times, subtract rates, stop at the combined rate, or use only the faster worker.',
    'Practice exact two-worker, three-worker, and missing-rate combinations.',
  ],
  'one-worker-joins-later': [
    'One Worker Joins Later', 'Split the timeline into a solo phase and a combined phase. Work already completed reduces the work remaining.',
    ['remaining time = remaining work ÷ combined rate', 'Compute solo work before applying the combined rate.'],
    'Create one row per phase with active workers, phase rate, time, and work completed.',
    ['Second worker joins', 'A needs 8 hours and works alone for 2 hours; B also needs 8 hours.', ['A completes 2/8 = 1/4.', 'The remaining 3/4 at rate 1/4 takes 3 hours.'], 'Three more hours are needed.'],
    ['Machine starts later', 'A 12-hour machine runs for 3 hours before a 6-hour machine joins.', ['Solo work is 1/4.', 'Combined rate is 1/4; remaining work is 3/4.'], 'The second phase takes 3 hours.'],
    'Do not use the combined rate for the full timeline, ignore solo work, subtract time from work, or divide the whole job instead of the remainder.',
    'Practice clear phase boundaries and exact remaining-work calculations.',
  ],
  'one-worker-leaves-early': [
    'One Worker Leaves Early', 'First calculate the work completed together. The continuing worker alone completes the remaining fraction.',
    ['remaining time = (1 − together work) ÷ continuing rate', 'The departing worker contributes only before leaving.'],
    'Mark who works in each phase so the continuing rate cannot be confused with the departing rate.',
    ['B leaves', 'A and B each need 8 hours and work together for 2 hours.', ['Together they finish 2 × 1/4 = 1/2.', 'A completes the remaining 1/2 at 1/8.'], 'A needs 4 more hours.'],
    ['Machine stops', 'A needs 10 hours and B needs 15 hours; both run for 3 hours.', ['Together they produce 3(1/10 + 1/15) = 1/2.', 'A alone completes the remaining half.'], 'A needs 5 more hours.'],
    'Do not keep using the combined rate, ignore completed work, use the departing worker’s rate, or subtract elapsed time from a completion time.',
    'Practice identifying the continuing worker and the exact remaining fraction.',
  ],
  'pipes-filling-a-tank': [
    'Pipes Filling a Tank', 'Treat a full tank as one whole unit. Filling pipes contribute positive rates that add when open together.',
    ['combined filling rate = 1/a + 1/b', 'Invert the combined filling rate to obtain the tank-filling time.'],
    'Use a row for each inlet with full-tank time and tank-per-hour rate.',
    ['Two inlets', 'Pipes fill a tank in 8 and 24 hours.', ['Rates are 1/8 and 1/24.', 'Together they fill 1/6 tank per hour.'], 'The tank fills in 6 hours.'],
    ['Partial tank', 'A pipe fills 3/4 of a tank in 6 hours.', ['Rate = (3/4) ÷ 6 = 1/8.', 'A whole tank at 1/8 takes 8 hours.'], 'The full-tank time is 8 hours.'],
    'Do not add filling times, average times, subtract two inlet rates, forget to invert, or confuse partial and full tank work.',
    'Practice treating every tank as exactly one whole unit.',
  ],
  'pipes-filling-and-draining': [
    'Pipes Filling and Draining', 'An inlet adds water while a drain removes it, so the drain rate opposes the filling rates.',
    ['net rate = total filling rate − total draining rate', 'A required fill time needs a strictly positive net rate.'],
    'Give inlet rows positive signs and drain rows negative signs before adding the rates.',
    ['One inlet and drain', 'An inlet fills in 6 hours and a drain empties in 12 hours.', ['Net rate = 1/6 − 1/12 = 1/12.', 'Invert 1/12.'], 'The tank fills in 12 hours.'],
    ['Check feasibility', 'An inlet fills in 12 hours and a drain empties in 6 hours.', ['Net rate = 1/12 − 1/6, which is negative.', 'The water level falls rather than reaches full.'], 'The tank cannot fill with both open.'],
    'Do not add the drain rate, subtract completion times, ignore the drain, reverse signs, or accept a zero or negative fill rate.',
    'Practice sign discipline and feasibility checks before finding time.',
  ],
  'efficiency-and-different-work-rates': [
    'Efficiency and Different Work Rates', 'Efficiency compares rates. For the same job, completion time changes in the inverse ratio.',
    ['rate ratio a:b → time ratio b:a', 'Greater efficiency means a shorter completion time for the same work.'],
    'Keep efficiency/rate ratios separate from the inverse completion-time ratio.',
    ['Twice as efficient', 'A is twice as efficient as B, who needs 12 hours.', ['A’s rate is twice B’s rate.', 'A’s time is half of B’s.'], 'A needs 6 hours.'],
    ['Ratio 3:2', 'A:B efficiency is 3:2 and B needs 15 hours.', ['Time ratio A:B is 2:3.', 'A = 15 × 2/3.'], 'A needs 10 hours.'],
    'Do not apply the efficiency ratio directly to time, reverse worker labels, add ratio terms as hours, or read “50% more” as half the original rate.',
    'Practice translating efficiency statements into rates and inverse times.',
  ],
  'finding-an-unknown-work-time': [
    'Finding an Unknown Work Time', 'Subtract known rates from a combined or net rate, then invert the positive unknown rate.',
    ['1/b = 1/T − 1/a', 'Subtract rates, not completion times.'],
    'Write the total rate first, then each known contribution with its correct sign.',
    ['Unknown worker', 'Together A and B need 4 hours; A alone needs 6.', ['B’s rate = 1/4 − 1/6 = 1/12.', 'Invert B’s rate.'], 'B alone needs 12 hours.'],
    ['Unknown drain', 'An inlet fills in 6 hours and the net fill time is 12 hours.', ['Drain rate = 1/6 − 1/12 = 1/12.', 'Invert the drain rate.'], 'The drain empties a full tank in 12 hours.'],
    'Do not subtract times directly, forget reciprocal conversion, reverse inlet and drain signs, return a rate when time is requested, or accept a nonpositive unknown rate.',
    'Practice verifying every inferred rate is positive and uniquely determined.',
  ],
  'mixed-work-and-rate-problems': [
    'Mixed Work and Rate Problems', 'Organize multi-stage work in chronological phases. Each phase has a clear active team, rate, duration, and work amount.',
    ['phase work = phase rate × phase time', 'Subtract completed phase work before solving the next phase.'],
    'A phase table prevents solo, combined, inlet, drain, and efficiency contributions from being mixed across time periods.',
    ['Solo then team', 'A 8-hour clerk works 2 hours, then an 8-hour clerk joins.', ['Phase 1 work is 1/4.', 'Phase 2 rate is 1/4 and remaining work is 3/4.'], 'Total time is 2 + 3 = 5 hours.'],
    ['Pump and drain phases', 'A 6-hour inlet works alone for 2 hours, then a 12-hour drain opens.', ['First phase fills 1/3.', 'Net rate afterward is 1/12; remaining work is 2/3.'], 'The second phase takes 8 hours.'],
    'Do not blur phase boundaries, let remaining work leave 0–1, use an inactive rate, accept a nonpositive net rate, or answer for only one phase when total time is requested.',
    'Practice exact phase-by-phase work accounting with one unambiguous job.',
  ],
}

function lessonBlocks(slug) {
  if (slug === 'understanding-work-rates') return [
    heading('Represent one whole job'), paragraph('Work-and-rate problems become consistent when one completed task, batch, project, or full tank is represented by exactly 1.'),
    formula('Rate = Work ÷ Time', 'Rate measures the fraction of a job completed per unit of time.'),
    formula('Work = Rate × Time', 'Multiply a constant rate by elapsed time to find completed work.'),
    formula('Time = Work ÷ Rate', 'Divide the required work by a positive rate to find duration.'),
    formula('Individual rate = 1 ÷ completion time', 'For a worker who completes one job in t hours, rate is 1/t job per hour.'),
    heading('Rate table', 3), callout('Recommended columns', 'List worker or machine, work definition, time, signed rate, and work completed. Use one time unit throughout.'),
    example('Individual rate', 'A worker finishes a job in 6 hours.', ['Work = 1 and time = 6.', 'Rate = 1 ÷ 6.'], 'The rate is 1/6 job per hour.', workRateVisual),
    example('Combined rate', 'A and B work at 1/6 and 1/3 job per hour.', ['Add the rates: 1/6 + 1/3 = 1/2.', 'Time = 1 ÷ 1/2.'], 'Together they finish in 2 hours.'),
    callout('Assumptions', 'Rates are constant, the job definition is unchanged, there are no interruptions unless stated, workers begin together unless a timeline says otherwise, and drains oppose filling rates.', 'important'),
    callout('Common mistakes', 'Do not add completion times, confuse rate and time, forget the whole job is 1, multiply where division is required, add a drain rate, or mix time units.', 'warning'),
    summary(['Represent the whole job as 1.', 'Keep work, rate, and time distinct.', 'Add cooperating rates and subtract opposing rates.', 'Use exact fractions until final display.']),
  ]
  const data = blockData[slug]
  if (data !== undefined) return practiceBlocks(...data)
  return practiceBlocks(
    slug === 'mixed-work-and-rate-practice' ? 'Mixed Work and Rate Practice' : 'Work and Rate Topic Quiz',
    'Review individual rates, combined rates, staged work, pipes and drains, efficiency, and unknown times before starting the assessment.',
    ['work = rate × time', 'Use exact fractions and a separate row for every timeline phase.'],
    'Check each worker or pipe, signed rate, active duration, completed work, and remaining work.',
    ['Combined review', 'Workers need 6 and 3 hours alone.', ['Add 1/6 + 1/3 = 1/2.', 'Invert the combined rate.'], 'Together they need 2 hours.'],
    ['Stage review', 'An 8-hour worker works 2 hours before another 8-hour worker joins.', ['Solo work = 1/4.', 'Remaining 3/4 at rate 1/4 takes 3 hours.'], 'Total elapsed time is 5 hours.'],
    'Do not add times, lose the remaining-work fraction, reverse a drain sign, or return a rate when the question asks for time.',
    'Read the requested quantity and timeline carefully before selecting an answer.',
  )
}

const mixedQuestions = [
  ['A worker finishes one job in 8 hours. What is the rate?', ['1/8 job per hour', '8 jobs per hour', '1/4 job per hour', '8 hours per job'], 0, 'Rate = 1 ÷ 8 = 1/8 job per hour.'],
  ['A needs 6 hours and B needs 3 hours for the same job. How long together?', ['2 hours', '9 hours', '4.5 hours', '1/2 hour'], 0, '1/6 + 1/3 = 1/2 job per hour, so time is 2 hours.'],
  ['A and B together finish in 4 hours. A alone needs 6 hours. How long does B need alone?', ['12 hours', '2 hours', '10 hours', '4 hours'], 0, 'B’s rate is 1/4 − 1/6 = 1/12, so B needs 12 hours.'],
  ['A needs 8 hours and works alone for 2 hours. B, who also needs 8 hours, joins. How much longer is needed?', ['3 hours', '5 hours', '2 hours', '6 hours'], 0, 'A completes 1/4. The remaining 3/4 at combined rate 1/4 takes 3 hours.'],
  ['A and B each need 8 hours. After working together for 2 hours, B leaves. How much longer does A need?', ['4 hours', '2 hours', '6 hours', '8 hours'], 0, 'Together they complete 1/2. A completes the remaining half at 1/8, requiring 4 hours.'],
  ['Pipes fill a tank in 8 and 24 hours. How long together?', ['6 hours', '32 hours', '16 hours', '3 hours'], 0, '1/8 + 1/24 = 1/6, so the tank fills in 6 hours.'],
  ['An inlet fills in 6 hours and a drain empties in 12 hours. How long to fill with both open?', ['12 hours', '4 hours', '6 hours', '18 hours'], 0, 'Net rate is 1/6 − 1/12 = 1/12, so fill time is 12 hours.'],
  ['A is twice as efficient as B. If B needs 12 hours, how long does A need?', ['6 hours', '24 hours', '12 hours', '4 hours'], 0, 'Twice the rate means half the time, so A needs 6 hours.'],
]

const quizQuestions = [
  ['A worker completes a job in 6 hours. What does 1/6 represent?', ['The fraction of the job completed per hour', 'The number of jobs completed', 'The hours already worked', 'The work remaining after one hour'], 0, 'A completion time of 6 hours corresponds to a rate of 1/6 job per hour.'],
  ['A machine finishes one job in 10 hours. What is its rate?', ['1/10 job per hour', '10 jobs per hour', '1/5 job per hour', '10 hours per job as a rate'], 0, 'Rate = 1 ÷ 10 = 1/10 job per hour.'],
  ['At 1/12 job per hour, how long does one job take?', ['12 hours', '1/12 hour', '6 hours', '24 hours'], 0, 'Time = 1 ÷ 1/12 = 12 hours.'],
  ['A machine completes 3/5 of a job in 6 hours. What is its rate?', ['1/10 job per hour', '2/5 job per hour', '3/11 job per hour', '10 jobs per hour'], 0, '(3/5) ÷ 6 = 3/30 = 1/10 job per hour.'],
  ['A needs 6 hours and B needs 3 hours. How long together?', ['2 hours', '9 hours', '4.5 hours', '1/2 hour'], 0, 'The combined rate is 1/2 job per hour, so the time is 2 hours.'],
  ['Machines need 8, 12, and 24 hours individually. How long together?', ['4 hours', '44 hours', '14 2/3 hours', '6 hours'], 0, '1/8 + 1/12 + 1/24 = 1/4, so time is 4 hours.'],
  ['Together A and B need 4 hours; A alone needs 6. How long does B need?', ['12 hours', '2 hours', '10 hours', '4 hours'], 0, '1/B = 1/4 − 1/6 = 1/12, so B needs 12 hours.'],
  ['A needs 8 hours, works alone for 2, then an 8-hour worker joins. How much longer?', ['3 hours', '5 hours', '2 hours', '6 hours'], 0, 'The remaining 3/4 at rate 1/4 requires 3 hours.'],
  ['Two 8-hour workers work together for 2 hours, then one leaves. How much longer for the other?', ['4 hours', '2 hours', '6 hours', '8 hours'], 0, 'They finish half together; the continuing worker needs 4 hours for the remaining half.'],
  ['Two inlets fill in 8 and 24 hours. How long together?', ['6 hours', '32 hours', '16 hours', '3 hours'], 0, 'Their rate is 1/8 + 1/24 = 1/6, giving 6 hours.'],
  ['An inlet fills in 6 hours and a drain empties in 12. How long with both open?', ['12 hours', '4 hours', '6 hours', '18 hours'], 0, 'Net rate is 1/12 tank per hour, so the time is 12 hours.'],
  ['A is twice as efficient as B, who needs 12 hours. How long does A need?', ['6 hours', '24 hours', '12 hours', '4 hours'], 0, 'Twice the rate gives half the completion time: 6 hours.'],
  ['A printer completes 4 jobs in 10 hours. What is its production rate?', ['2/5 job per hour', '5/2 jobs per hour', '1/10 job per hour', '40 jobs per hour'], 0, '4 ÷ 10 = 2/5 job per hour.'],
  ['An 8-hour worker works alone for 2 hours, then an 8-hour worker joins. What is the total elapsed time?', ['5 hours', '3 hours', '4 hours', '8 hours'], 0, 'The solo phase is 2 hours; the remaining work takes 3 hours, for a 5-hour total.'],
  ['A 12-hour worker works alone for 3 hours, then a 6-hour worker joins. What is the total completion time?', ['6 hours', '3 hours', '9 hours', '4 hours'], 0, 'Solo work is 1/4. The remaining 3/4 at combined rate 1/4 takes 3 more hours, totaling 6.'],
]

function parseArgs() {
  const args = new Map()
  for (let index = 2; index < process.argv.length; index += 1) {
    const key = process.argv[index]; const value = process.argv[index + 1]
    if (key?.startsWith('--') !== true || value === undefined) throw new Error(`Invalid argument near ${key ?? '(end)'}.`)
    args.set(key.slice(2), value); index += 1
  }
  return args
}

function fixedQuestion(prompt, choices, correctIndex, explanation, position) {
  return { prompt, explanation, points: 1, position, status: 'active', choices: choices.map((text, index) => ({ text, isCorrect: index === correctIndex, position: index + 1 })) }
}

function validateFixedQuestions(label, questions, expectedCount) {
  const failures = []
  if (questions.length !== expectedCount) failures.push(`${label} must have exactly ${expectedCount} questions; found ${questions.length}.`)
  for (const question of questions) {
    if (question.choices.length !== 4) failures.push(`${label} question ${question.position} must have four choices.`)
    if (question.choices.filter((choice) => choice.isCorrect).length !== 1) failures.push(`${label} question ${question.position} must have exactly one correct choice.`)
    if (new Set(question.choices.map((choice) => choice.text.trim())).size !== 4) failures.push(`${label} question ${question.position} has duplicate visible choices.`)
    if (question.explanation?.trim().length < 15) failures.push(`${label} question ${question.position} needs an explanation.`)
  }
  return failures
}

const hasRawHtml = (value) => /<\/?[a-z][^>]*>/iu.test(JSON.stringify(value))

function runGeneratorQualityGate() {
  const vitestEntry = fileURLToPath(new URL('../node_modules/vitest/vitest.mjs', import.meta.url))
  const result = spawnSync(process.execPath, [vitestEntry, 'run', 'tests/worker.test.ts', '-t', 'Dynamic work-rate generator engine'], { stdio: 'inherit', shell: false })
  if (result.status !== 0) throw new Error(`The 1,000-question-per-generator work-rate quality gate failed.${result.error instanceof Error ? ` ${result.error.message}` : ''}`)
}

async function main() {
  const args = parseArgs(); const baseUrl = args.get('base-url') ?? 'http://127.0.0.1:5173'
  if (args.get('confirm') !== confirmation) throw new Error(`Pass --confirm ${confirmation} to continue.`)
  runGeneratorQualityGate()
  let cookie = args.get('cookie') ?? null
  async function request(path, options = {}) {
    const headers = new Headers(options.headers); headers.set('accept', 'application/json')
    if (cookie !== null) headers.set('cookie', cookie)
    if (options.body !== undefined) headers.set('content-type', 'application/json')
    if (options.method !== undefined && options.method !== 'GET') headers.set('x-cse-admin-csrf', csrfHeaderValue)
    const response = await fetch(`${baseUrl}${path}`, { ...options, headers })
    const setCookie = response.headers.get('set-cookie'); if (setCookie !== null) cookie = setCookie.split(';')[0]
    const body = await response.json()
    if (!response.ok || body.success !== true) throw new Error(`${options.method ?? 'GET'} ${path} failed: ${JSON.stringify(body)}`)
    return body.data
  }
  if (cookie === null) {
    const email = args.get('email'); const password = args.get('password') ?? process.env.CSE_WORK_RATE_ADMIN_PASSWORD
    if (email === undefined || password === undefined) throw new Error('Pass --cookie, or --email with --password or CSE_WORK_RATE_ADMIN_PASSWORD.')
    await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  }
  const dashboard = await request('/api/admin/dashboard'); const courseId = dashboard.cseProfessional?.id
  if (courseId === undefined) throw new Error('CSE Professional course was not found.')
  let detail = await request(`/api/admin/courses/${courseId}`)
  let subject = detail.subjects.find((item) => item.slug === 'numerical-ability')
  if (subject === undefined) throw new Error('Numerical Ability subject was not found.')
  let ageTopic = subject.topics.find((item) => item.slug === 'age-problems')
  if (ageTopic === undefined || ageTopic.status !== 'published') throw new Error('Published Age Problems must exist before Work and Rate Problems.')
  let topic = subject.topics.find((item) => item.slug === topicSlug)
  if (topic === undefined) {
    topic = (await request(`/api/admin/subjects/${subject.id}/topics`, { method: 'POST', body: JSON.stringify({
      title: 'Work and Rate Problems', slug: topicSlug,
      description: 'A structured course on individual work rates, combined work, changing work teams, pipes and tanks, efficiency, and unknown completion times.',
      position: ageTopic.position + 1, status: 'draft',
    }) })).topic
  }
  for (const spec of lessonSpecs) {
    detail = await request(`/api/admin/courses/${courseId}`); subject = detail.subjects.find((item) => item.slug === 'numerical-ability'); topic = subject?.topics.find((item) => item.slug === topicSlug)
    if (topic === undefined) throw new Error('Work and Rate Problems disappeared during creation.')
    let lesson = topic.lessons.find((item) => item.slug === spec.slug)
    if (lesson === undefined) lesson = (await request(`/api/admin/topics/${topic.id}/lessons`, { method: 'POST', body: JSON.stringify({
      title: spec.title, slug: spec.slug, lessonType: spec.lessonType, summary: `${spec.title} in the Work and Rate Problems topic.`,
      estimatedMinutes: spec.minutes, position: spec.position, isPreview: false, requiresPrevious: true, status: 'draft',
    }) })).lesson
    else if (lesson.lessonType !== spec.lessonType) throw new Error(`${spec.slug} has stored type ${lesson.lessonType}; expected ${spec.lessonType}.`)
    else if (lesson.status !== 'published') lesson = (await request(`/api/admin/lessons/${lesson.id}`, { method: 'PATCH', body: JSON.stringify({
      title: spec.title, summary: `${spec.title} in the Work and Rate Problems topic.`, estimatedMinutes: spec.minutes,
      position: spec.position, isPreview: false, requiresPrevious: true, status: 'draft', updatedAt: lesson.updatedAt,
    }) })).lesson
    const desiredBlocks = lessonBlocks(spec.slug); const currentBlocks = await request(`/api/admin/lessons/${lesson.id}/blocks`)
    for (const [index, block] of desiredBlocks.entries()) {
      const position = index + 1; const existing = currentBlocks.blocks.find((item) => item.position === position)
      await request(existing === undefined ? `/api/admin/lessons/${lesson.id}/blocks` : `/api/admin/lesson-blocks/${existing.id}`, { method: existing === undefined ? 'POST' : 'PATCH', body: JSON.stringify({ ...block, position }) })
    }
    const generatorSlug = generatedPracticeByLessonSlug[spec.slug]
    if (generatorSlug !== undefined) await request(`/api/admin/lessons/${lesson.id}/practice-set`, { method: 'PUT', body: JSON.stringify({
      title: spec.title, instructions: 'Answer five generated Work and Rate questions, then review the exact rate-table explanations.', passingScore: 60,
      questionCount: 5, maximumAttempts: null, showExplanations: true, status: lesson.status === 'published' ? 'published' : 'draft',
      questionSource: 'generated', generatorSlug, generatorVersion: 1, difficulty: { easy: 2, medium: 2, hard: 1 },
    }) })
    if (spec.slug === 'mixed-work-and-rate-practice') {
      const saved = await request(`/api/admin/lessons/${lesson.id}/practice-set`, { method: 'PUT', body: JSON.stringify({ title: spec.title, instructions: 'Solve eight fixed work-rate applications using exact phase calculations.', passingScore: 60, questionCount: 8, maximumAttempts: null, showExplanations: true, status: lesson.status === 'published' ? 'published' : 'draft', questionSource: 'fixed' }) })
      const current = await request(`/api/admin/lessons/${lesson.id}/practice-set`)
      for (const [index, item] of mixedQuestions.entries()) {
        const input = fixedQuestion(item[0], item[1], item[2], item[3], index + 1); const existing = current.questions.find((question) => question.position === input.position)
        const body = existing === undefined ? input : { ...input, updatedAt: existing.updatedAt, choices: input.choices.map((choice) => ({ ...choice, id: existing.choices.find((old) => old.position === choice.position)?.id })) }
        await request(existing === undefined ? `/api/admin/practice-sets/${saved.practiceSet.id}/questions` : `/api/admin/practice-questions/${existing.id}`, { method: existing === undefined ? 'POST' : 'PATCH', body: JSON.stringify(body) })
      }
    }
    if (spec.slug === 'work-and-rate-topic-quiz') {
      const saved = await request(`/api/admin/lessons/${lesson.id}/quiz`, { method: 'PUT', body: JSON.stringify({ title: spec.title, description: 'A fixed 15-question quiz covering Work and Rate Problems.', quizType: 'topic', passingScore: 70, timeLimitMinutes: null, maximumAttempts: null, shuffleQuestions: false, shuffleChoices: false, showExplanations: true, status: lesson.status === 'published' ? 'published' : 'draft' }) })
      const current = await request(`/api/admin/lessons/${lesson.id}/quiz`)
      for (const [index, item] of quizQuestions.entries()) {
        const input = { ...fixedQuestion(item[0], item[1], item[2], item[3], index + 1), questionType: 'multiple_choice' }; const existing = current.questions.find((question) => question.position === input.position)
        const body = existing === undefined ? input : { ...input, updatedAt: existing.updatedAt, choices: input.choices.map((choice) => ({ ...choice, id: existing.choices.find((old) => old.position === choice.position)?.id })) }
        await request(existing === undefined ? `/api/admin/quizzes/${saved.quiz.id}/questions` : `/api/admin/questions/${existing.id}`, { method: existing === undefined ? 'POST' : 'PATCH', body: JSON.stringify(body) })
      }
    }
  }
  const failures = []; const registry = await request('/api/admin/practice-generators'); const registered = new Set(registry.generators.map((generator) => `${generator.slug}@${generator.version}`))
  for (const generatorSlug of Object.values(generatedPracticeByLessonSlug)) if (!registered.has(`${generatorSlug}@1`)) failures.push(`Generator ${generatorSlug}@1 is not registered.`)
  detail = await request(`/api/admin/courses/${courseId}`); subject = detail.subjects.find((item) => item.slug === 'numerical-ability'); ageTopic = subject?.topics.find((item) => item.slug === 'age-problems'); topic = subject?.topics.find((item) => item.slug === topicSlug)
  if (topic === undefined) failures.push('Work and Rate Problems was not found under Numerical Ability.')
  else {
    if (ageTopic === undefined || ageTopic.status !== 'published' || topic.position !== ageTopic.position + 1) failures.push('Work and Rate Problems must be immediately after published Age Problems.')
    if (topic.lessons.length !== 12) failures.push(`Expected 12 lessons; found ${topic.lessons.length}.`)
    if (new Set(topic.lessons.map((lesson) => lesson.position)).size !== 12) failures.push('Lesson positions must be unique.')
    for (const spec of lessonSpecs) {
      const lesson = topic.lessons.find((item) => item.slug === spec.slug); if (lesson === undefined) { failures.push(`Missing lesson ${spec.slug}.`); continue }
      if (lesson.lessonType !== spec.lessonType) failures.push(`${spec.slug} has an incorrect type.`)
      if (lesson.requiresPrevious !== true || lesson.isPreview !== false) failures.push(`${spec.slug} does not preserve sequential locking.`)
      const blocks = await request(`/api/admin/lessons/${lesson.id}/blocks`); if (blocks.blocks.length < 8) failures.push(`${spec.slug} lacks meaningful teaching blocks.`)
      if (blocks.blocks.some((block) => hasRawHtml(block.content))) failures.push(`${spec.slug} contains raw HTML.`)
      const generatorSlug = generatedPracticeByLessonSlug[spec.slug]
      if (generatorSlug !== undefined) {
        const practice = await request(`/api/admin/lessons/${lesson.id}/practice-set`); const set = practice.practiceSet
        if (set === null || set.questionSource !== 'generated' || set.generator?.slug !== generatorSlug || set.generator?.version !== 1 || set.generator?.difficulty.easy !== 2 || set.generator?.difficulty.medium !== 2 || set.generator?.difficulty.hard !== 1 || set.questionCount !== 5 || set.passingScore !== 60 || set.maximumAttempts !== null || set.showExplanations !== true) failures.push(`${spec.slug} has an invalid generated configuration.`)
      }
      if (spec.slug === 'mixed-work-and-rate-practice') failures.push(...validateFixedQuestions('Mixed Work and Rate Practice', (await request(`/api/admin/lessons/${lesson.id}/practice-set`)).questions, 8))
      if (spec.slug === 'work-and-rate-topic-quiz') failures.push(...validateFixedQuestions('Work and Rate Topic Quiz', (await request(`/api/admin/lessons/${lesson.id}/quiz`)).questions, 15))
    }
  }
  if (failures.length > 0) { console.error('Work and Rate Problems validation failed. Nothing was published.'); for (const failure of failures) console.error(`- ${failure}`); process.exitCode = 1; return }
  const rollbackActions = []
  try {
    detail = await request(`/api/admin/courses/${courseId}`); topic = detail.subjects.find((item) => item.slug === 'numerical-ability')?.topics.find((item) => item.slug === topicSlug)
    if (topic === undefined) throw new Error('Work and Rate Problems disappeared before publication.')
    for (const spec of lessonSpecs) {
      const lesson = topic.lessons.find((item) => item.slug === spec.slug); if (lesson === undefined) throw new Error(`${spec.slug} disappeared before publication.`)
      const generatorSlug = generatedPracticeByLessonSlug[spec.slug]
      if (generatorSlug !== undefined) {
        const current = await request(`/api/admin/lessons/${lesson.id}/practice-set`); const config = { title: spec.title, instructions: 'Answer five generated Work and Rate questions, then review the exact rate-table explanations.', passingScore: 60, questionCount: 5, maximumAttempts: null, showExplanations: true, questionSource: 'generated', generatorSlug, generatorVersion: 1, difficulty: { easy: 2, medium: 2, hard: 1 } }
        if (current.practiceSet.status !== 'published') { await request(`/api/admin/lessons/${lesson.id}/practice-set`, { method: 'PUT', body: JSON.stringify({ ...config, status: 'published' }) }); rollbackActions.push(() => request(`/api/admin/lessons/${lesson.id}/practice-set`, { method: 'PUT', body: JSON.stringify({ ...config, status: current.practiceSet.status }) })) }
      }
      if (spec.slug === 'mixed-work-and-rate-practice') {
        const current = await request(`/api/admin/lessons/${lesson.id}/practice-set`); const config = { title: spec.title, instructions: 'Solve eight fixed work-rate applications using exact phase calculations.', passingScore: 60, questionCount: 8, maximumAttempts: null, showExplanations: true, questionSource: 'fixed' }
        if (current.practiceSet.status !== 'published') { await request(`/api/admin/lessons/${lesson.id}/practice-set`, { method: 'PUT', body: JSON.stringify({ ...config, status: 'published' }) }); rollbackActions.push(() => request(`/api/admin/lessons/${lesson.id}/practice-set`, { method: 'PUT', body: JSON.stringify({ ...config, status: current.practiceSet.status }) })) }
      }
      if (spec.slug === 'work-and-rate-topic-quiz') {
        const current = await request(`/api/admin/lessons/${lesson.id}/quiz`); const config = { title: spec.title, description: 'A fixed 15-question quiz covering Work and Rate Problems.', quizType: 'topic', passingScore: 70, timeLimitMinutes: null, maximumAttempts: null, shuffleQuestions: false, shuffleChoices: false, showExplanations: true }
        if (current.quiz.status !== 'published') { await request(`/api/admin/lessons/${lesson.id}/quiz`, { method: 'PUT', body: JSON.stringify({ ...config, status: 'published' }) }); rollbackActions.push(() => request(`/api/admin/lessons/${lesson.id}/quiz`, { method: 'PUT', body: JSON.stringify({ ...config, status: current.quiz.status }) })) }
      }
    }
    detail = await request(`/api/admin/courses/${courseId}`); topic = detail.subjects.find((item) => item.slug === 'numerical-ability')?.topics.find((item) => item.slug === topicSlug)
    for (const spec of lessonSpecs) {
      const lesson = topic?.lessons.find((item) => item.slug === spec.slug); if (lesson === undefined) throw new Error(`${spec.slug} disappeared before lesson publication.`)
      if (lesson.status !== 'published') { await request(`/api/admin/lessons/${lesson.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'published', updatedAt: lesson.updatedAt }) }); rollbackActions.push(async () => { const refreshed = await request(`/api/admin/courses/${courseId}`); const current = refreshed.subjects.find((item) => item.slug === 'numerical-ability')?.topics.find((item) => item.slug === topicSlug)?.lessons.find((item) => item.id === lesson.id); if (current !== undefined) return request(`/api/admin/lessons/${lesson.id}`, { method: 'PATCH', body: JSON.stringify({ status: lesson.status, updatedAt: current.updatedAt }) }) }) }
    }
    detail = await request(`/api/admin/courses/${courseId}`); topic = detail.subjects.find((item) => item.slug === 'numerical-ability')?.topics.find((item) => item.slug === topicSlug)
    if (topic === undefined) throw new Error('Work and Rate Problems disappeared before final publication.')
    if (topic.status !== 'published') { const previousStatus = topic.status; const topicId = topic.id; await request(`/api/admin/topics/${topicId}`, { method: 'PATCH', body: JSON.stringify({ status: 'published', updatedAt: topic.updatedAt }) }); rollbackActions.push(async () => { const refreshed = await request(`/api/admin/courses/${courseId}`); const current = refreshed.subjects.find((item) => item.slug === 'numerical-ability')?.topics.find((item) => item.slug === topicSlug); if (current !== undefined) return request(`/api/admin/topics/${topicId}`, { method: 'PATCH', body: JSON.stringify({ status: previousStatus, updatedAt: current.updatedAt }) }) }) }
  } catch (error) {
    console.error(`Publication failed: ${error instanceof Error ? error.message : String(error)}`); console.error('Rolling back statuses changed during this run.')
    for (const rollback of rollbackActions.reverse()) try { await rollback() } catch (rollbackError) { console.error(`Rollback failed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`) }
    process.exitCode = 1; return
  }
  console.log('Work and Rate Problems was created, validated, and published.')
  for (const spec of lessonSpecs) console.log(`- ${spec.position}. ${spec.title} (${spec.lessonType})`)
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
