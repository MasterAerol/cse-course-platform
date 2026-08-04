#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:5173'
const email = `philippine-constitution-student-${crypto.randomUUID()}@example.test`
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
function localQuery(sql) {
  const wrangler = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url))
  const result = spawnSync(process.execPath, [wrangler, 'd1', 'execute', 'DB', '--local', '--json', '--command', sql], { encoding: 'utf8', shell: false })
  if (result.status !== 0) throw new Error(`Local D1 query failed: ${result.stderr ?? result.stdout}`)
  return JSON.parse(result.stdout)[0]?.results ?? []
}function localSql(sql) {
  const wrangler = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url))
  const result = spawnSync(process.execPath, [wrangler, 'd1', 'execute', 'DB', '--local', '--command', sql], { encoding: 'utf8', shell: false })
  if (result.status !== 0) throw new Error(`Local D1 setup failed: ${result.error?.message ?? result.stderr ?? result.stdout ?? 'unknown error'}`)
}
function constitutionTopic(curriculum) { return curriculum.subjects.find((subject) => subject.slug === 'general-information')?.topics.find((topic) => topic.slug === 'philippine-constitution-fundamentals') }

await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password, firstName: 'Constitution', lastName: 'Student' }) })
localSql(`INSERT INTO course_enrollments (user_id,course_id,enrollment_status,enrollment_source) SELECT u.id,c.id,'active','admin' FROM users u CROSS JOIN courses c WHERE u.email='${email}' AND c.slug='cse-professional'; INSERT INTO lesson_progress (user_id,lesson_id,status,started_at,completed_at,last_viewed_at,progress_percent) SELECT u.id,l.id,'completed',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,100 FROM users u CROSS JOIN lessons l JOIN topics t ON t.id=l.topic_id JOIN subjects s ON s.id=t.subject_id WHERE u.email='${email}' AND s.position<4;`)

let topic = constitutionTopic(await api('/api/student/courses/cse-professional/curriculum'))
assert(topic?.position === 1 && topic.lessons.length === 12, 'Philippine Constitution topic ordering or lesson count is invalid.')
assert(topic.lessons[0].isAccessible && !topic.lessons[0].isLocked && topic.lessons[1].isLocked, 'Initial sequential locking is invalid.')
const intro = await api(`/api/student/lessons/${topic.lessons[0].publicId}`)
assert(intro.blocks.length === 13 && intro.malformedBlockCount === 0, 'Intro block rendering data is invalid.')
await api(`/api/student/lessons/${topic.lessons[0].publicId}/complete`, { method: 'POST' })
topic = constitutionTopic(await api('/api/student/courses/cse-professional/curriculum'))
assert(topic?.lessons[1].isAccessible, 'Completing the intro did not unlock generated practice.')

const generatedSummary = await api(`/api/student/lessons/${topic.lessons[1].publicId}/practice`)
const generated = await api(`/api/student/practice-sets/${generatedSummary.practice.id}/attempts`, { method: 'POST' })
assert(generated.questions.length === 5, 'Generated practice did not return five questions.')
assert(generated.questions.every((question) => question.choices.length === 4), 'Generated Constitution choices are invalid.')
const refreshed = await api(`/api/student/practice-attempts/${generated.attempt.publicId}`)
assert(JSON.stringify(generated.questions) === JSON.stringify(refreshed.questions), 'Refresh changed the immutable generated snapshot.')
const correctRows = localQuery(`SELECT gqs.id AS question_id,gqc.id AS choice_id FROM generated_question_snapshots gqs JOIN generated_question_choices gqc ON gqc.snapshot_id=gqs.id JOIN practice_attempts pa ON pa.id=gqs.practice_attempt_id WHERE pa.public_id='${generated.attempt.publicId}' AND gqc.is_correct=1 ORDER BY gqs.source_position;`)
assert(correctRows.length===5,'Local immutable snapshots did not contain five correct choices.')
const correctByQuestion=new Map(correctRows.map((row)=>[row.question_id,row.choice_id]))
for (const question of generated.questions) {
  const choiceId=correctByQuestion.get(question.id); assert(choiceId!==undefined,`Correct snapshot choice missing for ${question.id}`)
  await api(`/api/student/practice-attempts/${generated.attempt.publicId}/answers/${question.id}`, { method: 'PUT', body: JSON.stringify({ selectedChoiceId: choiceId }) })
}const generatedResult = await api(`/api/student/practice-attempts/${generated.attempt.publicId}/submit`, { method: 'POST' })
assert(generatedResult.scorePercent === 100 && generatedResult.passed && generatedResult.newlyUnlockedNextLesson !== null, 'Generated scoring or unlocking failed.')
assert(generatedResult.questions.every((question) => /(Article|Preamble)/u.test(JSON.stringify(question.explanation))), 'Generated review lacks passages or explanations.')

localSql(`UPDATE lesson_progress SET status='completed',completed_at=CURRENT_TIMESTAMP,last_viewed_at=CURRENT_TIMESTAMP,progress_percent=100 WHERE user_id=(SELECT id FROM users WHERE email='${email}') AND lesson_id IN (SELECT l.id FROM lessons l JOIN topics t ON t.id=l.topic_id WHERE t.slug='philippine-constitution-fundamentals' AND l.position<=10); INSERT OR IGNORE INTO lesson_progress (user_id,lesson_id,status,started_at,completed_at,last_viewed_at,progress_percent) SELECT u.id,l.id,'completed',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,100 FROM users u CROSS JOIN lessons l JOIN topics t ON t.id=l.topic_id WHERE u.email='${email}' AND t.slug='philippine-constitution-fundamentals' AND l.position<=10;`)
topic = constitutionTopic(await api('/api/student/courses/cse-professional/curriculum'))
assert(topic?.lessons[10].isAccessible, 'Fixed practice did not unlock after its prerequisites.')
const fixedSummary = await api(`/api/student/lessons/${topic.lessons[10].publicId}/practice`)
const fixed = await api(`/api/student/practice-sets/${fixedSummary.practice.id}/attempts`, { method: 'POST' })
assert(fixed.questions.length === 12, 'Fixed practice did not return twelve questions.')
for (const question of fixed.questions) {
  const choice = question.choices.toSorted((left, right) => left.position - right.position)[0]
  await api(`/api/student/practice-attempts/${fixed.attempt.publicId}/answers/${question.id}`, { method: 'PUT', body: JSON.stringify({ selectedChoiceId: choice.id }) })
}
const fixedResult = await api(`/api/student/practice-attempts/${fixed.attempt.publicId}/submit`, { method: 'POST' })
assert(fixedResult.scorePercent === 100 && fixedResult.passed && fixedResult.questions.every((question) => /(Article|Preamble)/u.test(JSON.stringify(question.explanation))), 'Fixed scoring or review failed.')

topic = constitutionTopic(await api('/api/student/courses/cse-professional/curriculum'))
assert(topic?.lessons[11].isAccessible, 'Quiz did not unlock after fixed practice.')
const quizSummary = await api(`/api/student/lessons/${topic.lessons[11].publicId}/quiz`)
const quiz = await api(`/api/student/quizzes/${quizSummary.quiz.id}/attempts`, { method: 'POST' })
assert(quiz.questions.length === 20, 'Quiz did not return twenty questions.')
for (const question of quiz.questions) {
  const choice = question.choices.toSorted((left, right) => left.position - right.position)[0]
  await api(`/api/student/quiz-attempts/${quiz.attempt.publicId}/answers/${question.id}`, { method: 'PUT', body: JSON.stringify({ selectedChoiceId: choice.id }) })
}
const quizResult = await api(`/api/student/quiz-attempts/${quiz.attempt.publicId}/submit`, { method: 'POST' })
assert(quizResult.scorePercent === 100 && quizResult.passed && quizResult.questions.every((question) => /(Article|Preamble)/u.test(JSON.stringify(question.explanation))), 'Quiz scoring or review failed.')
console.log('STUDENT_FLOW_OK topic_position=1 lessons=12 intro_blocks=13 generated_questions=5 source_metadata=preserved generated_refresh=stable generated_score=100 fixed_questions=12 fixed_score=100 quiz_questions=20 quiz_score=100 explanations=visible sequential_unlocking=verified')
