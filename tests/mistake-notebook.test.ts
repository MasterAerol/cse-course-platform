import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

import { app } from '../src/worker'
import {
  normalizeMistakeNotebookRow,
  type MistakeNotebookRow,
  type MistakeNotebookSourceType,
} from '../src/worker/domain/mistake-notebook'
import type { Bindings } from '../src/worker/types/bindings'

const allowAllRateLimiter = { limit: (): Promise<RateLimitOutcome> => Promise.resolve({ success: true }) }
function bindings(): Bindings {
  return {
    DB: env.DB, ENVIRONMENT: 'production', REGISTRATION_MODE: 'open',
    LOGIN_IP_RATE_LIMITER: allowAllRateLimiter,
    LOGIN_ACCOUNT_RATE_LIMITER: allowAllRateLimiter,
    REGISTRATION_RATE_LIMITER: allowAllRateLimiter,
    ATTEMPT_RATE_LIMITER: allowAllRateLimiter,
    AUTOSAVE_RATE_LIMITER: allowAllRateLimiter,
    ADMIN_RATE_LIMITER: allowAllRateLimiter,
  }
}
function cookieFrom(response: Response): string {
  const cookie = response.headers.get('set-cookie')?.split(';', 1)[0]
  if (cookie === undefined) throw new Error('Authentication cookie missing.')
  return cookie
}
async function register(email: string) {
  const response = await app.request('/api/auth/register', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'SecurePassword123', firstName: 'Notebook', lastName: 'Learner' }),
  }, bindings())
  expect(response.status).toBe(201)
  const user = await env.DB.prepare('SELECT id FROM users WHERE email=?1').bind(email).first<{ id: number }>()
  if (user === null) throw new Error('Registered user missing.')
  await env.DB.prepare('DELETE FROM course_enrollments WHERE user_id=?1')
    .bind(user.id).run()
  return { cookie: cookieFrom(response), userId: user.id }
}
async function enroll(userId: number) {
  await env.DB.prepare(`INSERT INTO course_enrollments(
    user_id,course_id,enrollment_status,access_starts_at,enrollment_source
  ) SELECT ?1,id,'active','2000-01-01T00:00:00.000Z','admin'
    FROM courses WHERE slug='cse-professional'`).bind(userId).run()
}
async function seedSkill() {
  await env.DB.prepare(`INSERT INTO skills(
    public_id,slug,taxonomy_version,subject_id,topic_id,related_lesson_id,
    title,description,status
  ) SELECT ?1,'finding-percentage',1,subjects.id,topics.id,lessons.id,
    'Finding Percentage','Find a percentage of a whole.','active'
  FROM lessons
  INNER JOIN topics ON topics.id=lessons.topic_id
  INNER JOIN subjects ON subjects.id=topics.subject_id
  INNER JOIN courses ON courses.id=subjects.course_id
  WHERE courses.slug='cse-professional' AND topics.slug='percentages'
    AND lessons.slug='finding-the-percentage'
  ON CONFLICT(slug) DO UPDATE SET related_lesson_id=excluded.related_lesson_id`).bind(`skill-${crypto.randomUUID()}`).run()
}
async function practiceSetId(): Promise<number> {
  const row = await env.DB.prepare(`SELECT practice_sets.id FROM practice_sets
    INNER JOIN practice_set_generator_configs configs ON configs.practice_set_id=practice_sets.id
    WHERE configs.generator_slug='finding-percentage' LIMIT 1`).first<{ id: number }>()
  if (row === null) throw new Error('Generated practice set missing.')
  return row.id
}
async function seedGeneratedPractice(userId: number, status: 'submitted' | 'in_progress') {
  const setId = await practiceSetId()
  const publicId = `notebook-attempt-${crypto.randomUUID()}`
  const next = await env.DB.prepare(`SELECT COALESCE(MAX(attempt_number),0)+1 AS value
    FROM practice_attempts WHERE practice_set_id=?1 AND user_id=?2`).bind(setId, userId).first<{ value: number }>()
  const attempt = await env.DB.prepare(`INSERT INTO practice_attempts(
    public_id,practice_set_id,user_id,attempt_number,status,total_points,
    earned_points,score_percent,passed,submitted_at
  ) VALUES(?1,?2,?3,?4,?5,4,1,25,0,?6)`).bind(
    publicId, setId, userId, next?.value ?? 1, status,
    status === 'submitted' ? new Date().toISOString() : null,
  ).run()
  const attemptId = Number(attempt.meta.last_row_id)
  const snapshots: Array<{ publicId: string; id: number; wrongId: number; correctId: number }> = []
  for (let index = 0; index < 4; index += 1) {
    const snapshotPublicId = `notebook-question-${crypto.randomUUID()}`
    const snapshot = await env.DB.prepare(`INSERT INTO generated_question_snapshots(
      public_id,owner_user_id,practice_attempt_id,source_position,generator_slug,
      generator_version,seed,difficulty,prompt,explanation_json,parameters_json,metadata_json
    ) VALUES(?1,?2,?3,?4,'finding-percentage',1,?5,'easy',?6,?7,'{}','{}')`).bind(
      snapshotPublicId, userId, attemptId, index + 1, `seed-${crypto.randomUUID()}`,
      `What is ${index + 1}0% of 100?`,
      JSON.stringify({ title: 'Use the percentage rate', steps: ['Convert the percent.', 'Multiply by the whole.'], finalAnswer: String((index + 1) * 10) }),
    ).run()
    const snapshotId = Number(snapshot.meta.last_row_id)
    const correct = await env.DB.prepare(`INSERT INTO generated_question_choices(
      snapshot_id,public_id,choice_text,is_correct,position,distractor_type
    ) VALUES(?1,?2,?3,1,1,NULL)`).bind(snapshotId, `correct-${crypto.randomUUID()}`, String((index + 1) * 10)).run()
    const wrong = await env.DB.prepare(`INSERT INTO generated_question_choices(
      snapshot_id,public_id,choice_text,is_correct,position,distractor_type
    ) VALUES(?1,?2,?3,0,2,'wrong_percentage_base')`).bind(snapshotId, `wrong-${crypto.randomUUID()}`, String(index + 1)).run()
    snapshots.push({ publicId: snapshotPublicId, id: snapshotId, correctId: Number(correct.meta.last_row_id), wrongId: Number(wrong.meta.last_row_id) })
  }
  if (status === 'submitted') {
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO generated_practice_attempt_answers(attempt_id,snapshot_id,selected_choice_id,is_correct,points_awarded,answered_at) VALUES(?1,?2,?3,0,0,CURRENT_TIMESTAMP)`).bind(attemptId, snapshots[0]?.id, snapshots[0]?.wrongId),
      env.DB.prepare(`INSERT INTO generated_practice_attempt_answers(attempt_id,snapshot_id,selected_choice_id,is_correct,points_awarded,answered_at) VALUES(?1,?2,?3,1,1,CURRENT_TIMESTAMP)`).bind(attemptId, snapshots[1]?.id, snapshots[1]?.correctId),
      env.DB.prepare(`INSERT INTO generated_practice_attempt_answers(attempt_id,snapshot_id,selected_choice_id,is_correct,points_awarded,answered_at) VALUES(?1,?2,NULL,0,0,NULL)`).bind(attemptId, snapshots[2]?.id),
      env.DB.prepare(`INSERT INTO generated_practice_attempt_answers(attempt_id,snapshot_id,selected_choice_id,is_correct,points_awarded,answered_at) VALUES(?1,?2,?3,0,0,CURRENT_TIMESTAMP)`).bind(attemptId, snapshots[3]?.id, snapshots[3]?.wrongId),
    ])
  }
  return { publicId, snapshots }
}
async function get(path: string, cookie?: string) {
  return app.request(path, cookie === undefined ? undefined : { headers: { cookie } }, bindings())
}

const normalizedRow: MistakeNotebookRow = {
  entry_id: 'practice:attempt-public:snapshot-public', source_type: 'practice',
  attempt_public_id: 'attempt-public', snapshot_public_id: 'snapshot-public',
  submitted_at: '2026-08-10T00:00:00.000Z', prompt: 'A valid prompt?', selected_answer: 'Wrong',
  correct_answer: 'Correct', explanation_json: JSON.stringify({ title: 'Reason', steps: ['Step one.'], finalAnswer: 'Correct' }),
  was_unanswered: 0, subject_slug: 'numerical-ability', subject_title: 'Numerical Ability',
  topic_slug: 'percentages', topic_title: 'Percentages', skill_slug: 'finding-percentage',
  skill_title: 'Finding Percentage', skill_status: 'active', mistake_pattern: 'wrong_percentage_base',
  related_lesson_title: 'Finding the Percentage', related_lesson_route: '/courses/cse-professional/lessons/lesson-finding-the-percentage',
  practice_route: '/courses/cse-professional/lessons/lesson-finding-the-percentage',
}

describe('Mistake Notebook normalization', () => {
  it.each<MistakeNotebookSourceType>(['practice', 'subject_assessment', 'mock_exam', 'smart_recovery'])(
    'normalizes immutable %s review rows without numeric IDs', (sourceType) => {
      const entry = normalizeMistakeNotebookRow({ ...normalizedRow, source_type: sourceType, entry_id: `${sourceType}:attempt-public:snapshot-public` })
      expect(entry).toMatchObject({ sourceType, selectedAnswer: 'Wrong', correctAnswer: 'Correct', mistakePattern: 'Wrong Percentage Base' })
      expect(entry?.explanation).toContain('Step one.')
      expect(JSON.stringify(entry)).not.toMatch(/"id":\d/u)
    },
  )
  it('handles unanswered and optional historical metadata', () => {
    const entry = normalizeMistakeNotebookRow({ ...normalizedRow, selected_answer: null, was_unanswered: 1, skill_slug: null, skill_title: null, mistake_pattern: null, related_lesson_title: null, related_lesson_route: null })
    expect(entry).toMatchObject({ selectedAnswer: null, wasUnanswered: true, skill: null, mistakePattern: null, relatedLesson: null })
  })
  it('rejects corrupt immutable rows', () => {
    expect(normalizeMistakeNotebookRow({ ...normalizedRow, prompt: '' })).toBeNull()
    expect(normalizeMistakeNotebookRow({ ...normalizedRow, correct_answer: '' })).toBeNull()
  })
})

describe('Mistake Notebook learner APIs', () => {
  it('requires authentication, learner role, and active enrollment', async () => {
    expect((await get('/api/student/mistake-notebook/summary')).status).toBe(401)
    const learner = await register(`notebook-unenrolled-${crypto.randomUUID()}@example.test`)
    expect((await get('/api/student/mistake-notebook', learner.cookie)).status).toBe(403)
    await env.DB.prepare("UPDATE users SET role='admin' WHERE id=?1").bind(learner.userId).run()
    expect((await get('/api/student/mistake-notebook', learner.cookie)).status).toBe(403)
  })

  it('returns only submitted mistakes with summary, filters, pagination, and safe detail', async () => {
    const learner = await register(`notebook-${crypto.randomUUID()}@example.test`)
    await enroll(learner.userId)
    await seedSkill()
    const submitted = await seedGeneratedPractice(learner.userId, 'submitted')
    await seedGeneratedPractice(learner.userId, 'in_progress')

    const summaryResponse = await get('/api/student/mistake-notebook/summary', learner.cookie)
    expect(summaryResponse.status).toBe(200)
    const summary = await summaryResponse.json<{ data: { totalMistakes: number; topMistakeSkills: Array<{ slug: string }>; repeatedMistakePatterns: Array<{ count: number }> } }>()
    expect(summary.data.totalMistakes).toBe(3)
    expect(summary.data.topMistakeSkills[0]?.slug).toBe('finding-percentage')

    const listResponse = await get('/api/student/mistake-notebook?source=practice&subject=numerical-ability&limit=1&page=1', learner.cookie)
    expect(listResponse.status).toBe(200)
    const list = await listResponse.json<{ data: { entries: Array<{ id: string; wasUnanswered: boolean; correctAnswer: string; explanation: string }>; pagination: { total: number; hasNextPage: boolean } } }>()
    expect(list.data.entries).toHaveLength(1)
    expect(list.data.pagination).toMatchObject({ total: 3, hasNextPage: true })
    expect(list.data.entries[0]?.id).toMatch(/^practice:/u)
    expect(list.data.entries[0]?.explanation).toContain('Convert the percent.')

    const unanswered = await get('/api/student/mistake-notebook?unansweredOnly=true', learner.cookie)
    const unansweredBody = await unanswered.json<{ data: { entries: Array<{ wasUnanswered: boolean }> } }>()
    expect(unansweredBody.data.entries).toHaveLength(1)
    expect(unansweredBody.data.entries[0]?.wasUnanswered).toBe(true)

    const repeated = await get('/api/student/mistake-notebook?repeatedPatternOnly=true', learner.cookie)
    const repeatedBody = await repeated.json<{ data: { entries: Array<{ mistakePattern: string }> } }>()
    expect(repeatedBody.data.entries).toHaveLength(2)
    expect(repeatedBody.data.entries.every((item) => item.mistakePattern === 'Wrong Percentage Base')).toBe(true)

    const detailId = `practice:${submitted.publicId}:${submitted.snapshots[0]?.publicId}`
    const detail = await get(`/api/student/mistake-notebook/${encodeURIComponent(detailId)}`, learner.cookie)
    expect(detail.status).toBe(200)
    const detailBody = await detail.text()
    expect(detailBody).toContain('Wrong Percentage Base')
    expect(detailBody).not.toContain('generatorVersion')
    expect((await get('/api/student/mistake-notebook/274', learner.cookie)).status).toBe(400)

    const other = await register(`notebook-other-${crypto.randomUUID()}@example.test`)
    await enroll(other.userId)
    expect((await get(`/api/student/mistake-notebook/${encodeURIComponent(detailId)}`, other.cookie)).status).toBe(404)
  })
})