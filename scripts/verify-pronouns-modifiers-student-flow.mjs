#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:5173'
const email = `pronouns-student-${crypto.randomUUID()}@example.test`
const password = `Aa1!${crypto.randomUUID()}`
let cookie = null

function assert(condition, message) { if (!condition) throw new Error(message) }
async function api(path, options = {}) {
  const headers = new Headers(options.headers)
  headers.set('accept', 'application/json')
  if (cookie !== null) headers.set('cookie', cookie)
  if (options.body !== undefined) headers.set('content-type', 'application/json')
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers })
  const setCookie = response.headers.get('set-cookie')
  if (setCookie !== null) cookie = setCookie.split(';')[0]
  const body = await response.json()
  if (!response.ok || body.success !== true) throw new Error(`${options.method ?? 'GET'} ${path} failed (${response.status}): ${JSON.stringify(body)}`)
  return body.data
}
function localSql(sql) {
  const wrangler = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url))
  const result = spawnSync(process.execPath, [wrangler, 'd1', 'execute', 'DB', '--local', '--command', sql], { encoding: 'utf8', shell: false })
  if (result.status !== 0) throw new Error(`Local D1 setup failed: ${result.error?.message ?? result.stderr ?? result.stdout ?? 'unknown error'}`)
}
function pronounsTopic(curriculum) { return curriculum.subjects.find((subject) => subject.slug === 'verbal-ability')?.topics.find((topic) => topic.slug === 'pronouns-and-modifiers') }

await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password, firstName: 'Grammar', lastName: 'Student' }) })
localSql(`INSERT INTO course_enrollments (user_id,course_id,enrollment_status,enrollment_source) SELECT u.id,c.id,'active','admin' FROM users u CROSS JOIN courses c WHERE u.email='${email}' AND c.slug='cse-professional'; INSERT INTO lesson_progress (user_id,lesson_id,status,started_at,completed_at,last_viewed_at,progress_percent) SELECT u.id,l.id,'completed',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,100 FROM users u CROSS JOIN lessons l JOIN topics t ON t.id=l.topic_id JOIN subjects s ON s.id=t.subject_id WHERE u.email='${email}' AND s.slug='verbal-ability' AND t.position<7;`)

let topic = pronounsTopic(await api('/api/student/courses/cse-professional/curriculum'))
assert(topic?.position === 7 && topic.lessons.length === 12, 'Pronouns topic ordering or lesson count is invalid.')
assert(topic.lessons[0].isAccessible && !topic.lessons[0].isLocked && topic.lessons[1].isLocked, 'Initial sequential locking is invalid.')
const intro = await api(`/api/student/lessons/${topic.lessons[0].publicId}`)
assert(intro.blocks.length === 12 && intro.malformedBlockCount === 0, 'Intro block rendering data is invalid.')
await api(`/api/student/lessons/${topic.lessons[0].publicId}/complete`, { method: 'POST' })
topic = pronounsTopic(await api('/api/student/courses/cse-professional/curriculum'))
assert(topic?.lessons[1].isAccessible, 'Completing the intro did not unlock generated practice.')

const generatedSummary = await api(`/api/student/lessons/${topic.lessons[1].publicId}/practice`)
const generated = await api(`/api/student/practice-sets/${generatedSummary.practice.id}/attempts`, { method: 'POST' })
assert(generated.questions.length === 5, 'Generated practice did not return five questions.')
const refreshed = await api(`/api/student/practice-attempts/${generated.attempt.publicId}`)
assert(JSON.stringify(generated.questions) === JSON.stringify(refreshed.questions), 'Refresh changed the immutable generated snapshot.')
for (const question of generated.questions) {
  const expected = /employees submitted/iu.test(question.prompt) ? 'their' : /clerks completed/iu.test(question.prompt) ? 'their' : /clearest revision/iu.test(question.prompt) ? 'When Rosa spoke to Ana, Rosa clarified the schedule.' : null
  const choice = question.choices.find((item) => item.text === expected)
  assert(choice !== undefined, `Expected generated answer is absent for ${question.prompt}`)
  await api(`/api/student/practice-attempts/${generated.attempt.publicId}/answers/${question.id}`, { method: 'PUT', body: JSON.stringify({ selectedChoiceId: choice.id }) })
}
const generatedResult = await api(`/api/student/practice-attempts/${generated.attempt.publicId}/submit`, { method: 'POST' })
assert(generatedResult.scorePercent === 100 && generatedResult.passed && generatedResult.newlyUnlockedNextLesson !== null, 'Generated scoring or unlocking failed.')
assert(generatedResult.questions.every((question) => question.explanation?.length > 0), 'Generated review lacks explanations.')

localSql(`UPDATE lesson_progress SET status='completed',completed_at=CURRENT_TIMESTAMP,last_viewed_at=CURRENT_TIMESTAMP,progress_percent=100 WHERE user_id=(SELECT id FROM users WHERE email='${email}') AND lesson_id IN (SELECT l.id FROM lessons l JOIN topics t ON t.id=l.topic_id WHERE t.slug='pronouns-and-modifiers' AND l.position<=10); INSERT OR IGNORE INTO lesson_progress (user_id,lesson_id,status,started_at,completed_at,last_viewed_at,progress_percent) SELECT u.id,l.id,'completed',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,100 FROM users u CROSS JOIN lessons l JOIN topics t ON t.id=l.topic_id WHERE u.email='${email}' AND t.slug='pronouns-and-modifiers' AND l.position<=10;`)
topic = pronounsTopic(await api('/api/student/courses/cse-professional/curriculum'))
assert(topic?.lessons[10].isAccessible, 'Fixed practice did not unlock after its prerequisites.')
const fixedSummary = await api(`/api/student/lessons/${topic.lessons[10].publicId}/practice`)
const fixed = await api(`/api/student/practice-sets/${fixedSummary.practice.id}/attempts`, { method: 'POST' })
assert(fixed.questions.length === 8, 'Fixed practice did not return eight questions.')
for (const question of fixed.questions) {
  const choice = question.choices.toSorted((left, right) => left.position - right.position)[0]
  await api(`/api/student/practice-attempts/${fixed.attempt.publicId}/answers/${question.id}`, { method: 'PUT', body: JSON.stringify({ selectedChoiceId: choice.id }) })
}
const fixedResult = await api(`/api/student/practice-attempts/${fixed.attempt.publicId}/submit`, { method: 'POST' })
assert(fixedResult.scorePercent === 100 && fixedResult.passed && fixedResult.questions.every((question) => question.explanation?.length > 0), 'Fixed scoring or review failed.')

topic = pronounsTopic(await api('/api/student/courses/cse-professional/curriculum'))
assert(topic?.lessons[11].isAccessible, 'Quiz did not unlock after fixed practice.')
const quizSummary = await api(`/api/student/lessons/${topic.lessons[11].publicId}/quiz`)
const quiz = await api(`/api/student/quizzes/${quizSummary.quiz.id}/attempts`, { method: 'POST' })
assert(quiz.questions.length === 15, 'Quiz did not return fifteen questions.')
for (const question of quiz.questions) {
  const choice = question.choices.toSorted((left, right) => left.position - right.position)[0]
  await api(`/api/student/quiz-attempts/${quiz.attempt.publicId}/answers/${question.id}`, { method: 'PUT', body: JSON.stringify({ selectedChoiceId: choice.id }) })
}
const quizResult = await api(`/api/student/quiz-attempts/${quiz.attempt.publicId}/submit`, { method: 'POST' })
assert(quizResult.scorePercent === 100 && quizResult.passed && quizResult.questions.every((question) => question.explanation?.length > 0), 'Quiz scoring or review failed.')
console.log('STUDENT_FLOW_OK topic_position=7 lessons=12 intro_blocks=12 generated_questions=5 generated_refresh=stable generated_score=100 fixed_questions=8 fixed_score=100 quiz_questions=15 quiz_score=100 explanations=visible sequential_unlocking=verified')
