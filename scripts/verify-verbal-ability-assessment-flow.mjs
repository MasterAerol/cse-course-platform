#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:5173'
const wrangler = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url))
let cookie = null

function assert(condition, message) { if (!condition) throw new Error(message) }
async function api(path, options = {}, expectedStatus = null) {
  const headers = new Headers(options.headers)
  headers.set('accept', 'application/json')
  if (cookie !== null) headers.set('cookie', cookie)
  if (options.body !== undefined) headers.set('content-type', 'application/json')
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers })
  const setCookie = response.headers.get('set-cookie')
  if (setCookie !== null) cookie = setCookie.split(';')[0]
  const body = await response.json()
  if (expectedStatus !== null) { assert(response.status === expectedStatus, `Expected ${expectedStatus} from ${path}, received ${response.status}.`); return body }
  if (!response.ok || body.success !== true) throw new Error(`${options.method ?? 'GET'} ${path} failed (${response.status}): ${JSON.stringify(body)}`)
  return body.data
}
function d1(sql, json = false) {
  const args = [wrangler, 'd1', 'execute', 'DB', '--local', '--command', sql]
  if (json) args.push('--json')
  const result = spawnSync(process.execPath, args, { encoding: 'utf8', shell: false })
  if (result.status !== 0) throw new Error(`Local D1 command failed: ${result.stderr || result.stdout}`)
  return json ? JSON.parse(result.stdout)[0].results : undefined
}
function enroll(email) { d1(`INSERT INTO course_enrollments (user_id,course_id,enrollment_status,enrollment_source) SELECT u.id,c.id,'active','admin' FROM users u CROSS JOIN courses c WHERE u.email='${email}' AND c.slug='cse-professional';`) }
async function register(label) {
  const email = `verbal-assessment-${label}-${crypto.randomUUID()}@example.test`
  const password = `Aa1!${crypto.randomUUID()}`
  cookie = null
  await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password, firstName: 'Verbal', lastName: label }) })
  enroll(email)
  return { email, cookie }
}

const owner = await register('Owner')
let summary = await api('/api/student/subject-assessments/verbal-ability-subject-assessment')
assert(summary.assessment.title === 'Verbal Ability Subject Assessment' && summary.assessment.questionCount === 50 && summary.assessment.passingScore === 70, 'Assessment identity is invalid.')
assert(summary.state === 'not_started' && summary.attemptCount === 0 && summary.availability.available, 'Zero-attempt assessment card state is invalid.')
const started = await api('/api/student/subject-assessments/verbal-ability-subject-assessment/attempts', { method: 'POST' })
assert(started.questions.length === 50 && started.answeredCount === 0 && started.totalCount === 50, 'Attempt did not create exactly 50 snapshots.')
assert(started.questions.every((question) => !('isCorrect' in question) && !('explanation' in question) && !('difficulty' in question) && !('topic' in question) && question.choices.every((choice) => !('isCorrect' in choice))), 'Pre-submit response leaks hidden assessment fields.')
const restored = await api(`/api/student/subject-assessment-attempts/${started.attempt.publicId}`)
assert(JSON.stringify(restored.questions) === JSON.stringify(started.questions), 'Reload changed immutable question snapshots.')
const first = started.questions[0]
assert(first.choices.length === 4, 'Question choices are incomplete.')
await api(`/api/student/subject-assessment-attempts/${started.attempt.publicId}/answers/${first.publicId}`, { method: 'PUT', body: JSON.stringify({ selectedChoicePublicId: first.choices[0].publicId }) })
await api(`/api/student/subject-assessment-attempts/${started.attempt.publicId}/answers/${first.publicId}`, { method: 'PUT', body: JSON.stringify({ selectedChoicePublicId: first.choices[1].publicId }) })
const afterReplace = await api(`/api/student/subject-assessment-attempts/${started.attempt.publicId}`)
assert(afterReplace.answeredCount === 1 && afterReplace.questions[0].selectedChoicePublicId === first.choices[1].publicId, 'Answer replacement or resume failed.')
const other = await register('Other')
await api(`/api/student/subject-assessment-attempts/${started.attempt.publicId}`, {}, 403)
cookie = owner.cookie
const correctRows = d1(`SELECT s.public_id AS snapshot_id, c.public_id AS choice_id FROM subject_assessment_attempts a JOIN subject_assessment_question_snapshots s ON s.attempt_id=a.id JOIN subject_assessment_question_choices c ON c.snapshot_id=s.id AND c.is_correct=1 WHERE a.public_id='${started.attempt.publicId}' ORDER BY s.source_position;`, true)
assert(correctRows.length === 50, 'Stored attempt does not have 50 correct-choice snapshots.')
for (const row of correctRows) await api(`/api/student/subject-assessment-attempts/${started.attempt.publicId}/answers/${row.snapshot_id}`, { method: 'PUT', body: JSON.stringify({ selectedChoicePublicId: row.choice_id }) })
const result = await api(`/api/student/subject-assessment-attempts/${started.attempt.publicId}/submit`, { method: 'POST' })
assert(result.earnedPoints === 50 && result.totalPoints === 50 && result.scorePercent === 100 && result.passed, 'Server-side all-correct scoring failed.')
assert(result.breakdown.topics.length === 10 && result.breakdown.topics.every((topic) => topic.totalQuestions === 5), 'Ten-topic result distribution is invalid.')
const repeated = await api(`/api/student/subject-assessment-attempts/${started.attempt.publicId}/submit`, { method: 'POST' })
assert(JSON.stringify(repeated) === JSON.stringify(result), 'Repeated submission was not idempotent.')
await api(`/api/student/subject-assessment-attempts/${started.attempt.publicId}/answers/${first.publicId}`, { method: 'PUT', body: JSON.stringify({ selectedChoicePublicId: first.choices[0].publicId }) }, 409)
const review = await api(`/api/student/subject-assessment-attempts/${started.attempt.publicId}/review`)
assert(review.questions.length === 50 && review.questions.every((question) => question.explanation?.length > 0 && question.correctChoice !== undefined), 'Submitted review is incomplete.')
const reading = review.questions.filter((question) => question.topic.slug === 'reading-comprehension')
assert(reading.length === 5 && reading.every((question) => question.prompt.includes('Passage:') && question.prompt.includes('\n\nQuestion:')), 'Reading passage snapshots were not preserved in review.')
const paragraph = review.questions.filter((question) => question.topic.slug === 'paragraph-organization')
assert(paragraph.length === 5 && paragraph.every((question) => /A\. .+ B\. .+ C\. .+ D\./u.test(question.prompt)), 'Paragraph labels were not preserved in review.')
summary = await api('/api/student/subject-assessments/verbal-ability-subject-assessment')
assert(summary.state === 'passed' && summary.latestScore === 100 && summary.bestScore === 100 && summary.attemptCount === 1 && summary.history[0].strongestTopic !== null && summary.history[0].weakestTopic !== null, 'History or assessment-card summary is invalid.')
const retry = await api('/api/student/subject-assessments/verbal-ability-subject-assessment/attempts', { method: 'POST' })
assert(retry.attempt.publicId !== started.attempt.publicId && retry.attempt.attemptNumber === 2 && retry.questions.length === 50, 'Retake did not create a new 50-question attempt.')
const audit = d1(`SELECT (SELECT COUNT(*) FROM subject_assessment_question_snapshots s JOIN subject_assessment_attempts a ON a.id=s.attempt_id WHERE a.public_id='${started.attempt.publicId}') AS snapshots, (SELECT COUNT(*) FROM (SELECT s.topic_slug,COUNT(*) count FROM subject_assessment_question_snapshots s JOIN subject_assessment_attempts a ON a.id=s.attempt_id WHERE a.public_id='${started.attempt.publicId}' GROUP BY s.topic_slug HAVING count<>5)) AS bad_topics, (SELECT COUNT(*) FROM (SELECT s.topic_slug,s.difficulty,COUNT(*) count FROM subject_assessment_question_snapshots s JOIN subject_assessment_attempts a ON a.id=s.attempt_id WHERE a.public_id='${started.attempt.publicId}' GROUP BY s.topic_slug,s.difficulty HAVING count<>CASE s.difficulty WHEN 'hard' THEN 1 ELSE 2 END)) AS bad_difficulty;`, true)[0]
assert(audit.snapshots === 50 && audit.bad_topics === 0 && audit.bad_difficulty === 0, 'Persisted snapshot allocation audit failed.')
console.log(`VERBAL_ASSESSMENT_FLOW_OK questions=50 topics=10 difficulty=2/2/1 refresh=stable saved=replaceable ownership=protected pre_submit=hidden score=50/50 review=50 passages=5 paragraphs=5 history=verified retry=verified other=${other.email}`)