import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

import { app } from '../src/worker'

import type { Bindings } from '../src/worker/types/bindings'

const allowAllRateLimiter = {
  limit(): Promise<RateLimitOutcome> {
    return Promise.resolve({ success: true })
  },
}

function bindings(): Bindings {
  return {
    DB: env.DB,
    ENVIRONMENT: 'production',
    REGISTRATION_MODE: 'open',
    LOGIN_IP_RATE_LIMITER: allowAllRateLimiter,
    LOGIN_ACCOUNT_RATE_LIMITER: allowAllRateLimiter,
    REGISTRATION_RATE_LIMITER: allowAllRateLimiter,
    ATTEMPT_RATE_LIMITER: allowAllRateLimiter,
    AUTOSAVE_RATE_LIMITER: allowAllRateLimiter,
    ADMIN_RATE_LIMITER: allowAllRateLimiter,
  }
}

function cookieFrom(response: Response): string {
  const value = response.headers.get('set-cookie')?.split(';', 1)[0]
  if (value === undefined) throw new Error('Authentication cookie missing.')
  return value
}

async function register(email: string): Promise<{ cookie: string; userId: number }> {
  const response = await app.request(
    '/api/auth/register',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'SecurePassword123',
        firstName: 'Smart',
        lastName: 'Learner',
      }),
    },
    bindings(),
  )
  expect(response.status).toBe(201)
  const row = await env.DB.prepare('SELECT id FROM users WHERE email=?1')
    .bind(email)
    .first<{ id: number }>()
  if (row === null) throw new Error('Registered user missing.')
  return { cookie: cookieFrom(response), userId: row.id }
}

async function enroll(userId: number): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO course_enrollments(
      user_id,course_id,enrollment_status,access_starts_at,enrollment_source
    ) SELECT ?1,id,'active','2000-01-01T00:00:00.000Z','admin'
      FROM courses WHERE slug='cse-professional'`,
  )
    .bind(userId)
    .run()
}

async function seedFindingPercentageSkill(): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO skills(
      public_id,slug,taxonomy_version,subject_id,topic_id,title,description,status
    ) SELECT ?1,'finding-percentage',1,subjects.id,topics.id,
      'Finding Percentage','Questions that exercise Finding Percentage.','active'
    FROM topics
    INNER JOIN subjects ON subjects.id=topics.subject_id
    INNER JOIN courses ON courses.id=subjects.course_id
    WHERE courses.slug='cse-professional'
      AND subjects.slug='numerical-ability'
      AND topics.slug='percentages'
    ON CONFLICT(slug) DO NOTHING`,
  )
    .bind(`skill-${crypto.randomUUID()}`)
    .run()
}

async function seedGeneratedAttempt(
  userId: number,
  status: 'in_progress' | 'submitted',
  questionCount: number,
): Promise<void> {
  const practiceSet = await env.DB.prepare(
    `SELECT practice_sets.id
    FROM practice_sets
    INNER JOIN practice_set_generator_configs configs
      ON configs.practice_set_id=practice_sets.id
    WHERE configs.generator_slug='finding-percentage'
      AND configs.generator_version=1
    LIMIT 1`,
  ).first<{ id: number }>()
  if (practiceSet === null) throw new Error('Generated practice set missing.')
  const attemptPublicId = `smart-practice-${crypto.randomUUID()}`
  const attemptResult = await env.DB.prepare(
    `INSERT INTO practice_attempts(
      public_id,practice_set_id,user_id,attempt_number,status,total_points,
      earned_points,score_percent,passed,submitted_at
    ) VALUES(?1,?2,?3,?4,?5,?6,0,?7,?8,?9)`,
  )
    .bind(
      attemptPublicId,
      practiceSet.id,
      userId,
      status === 'submitted' ? 1 : 2,
      status,
      questionCount,
      status === 'submitted' ? 0 : null,
      status === 'submitted' ? 0 : null,
      status === 'submitted' ? new Date().toISOString() : null,
    )
    .run()
  const attemptId = Number(attemptResult.meta.last_row_id)

  for (let index = 0; index < questionCount; index += 1) {
    const snapshotPublicId = `smart-snapshot-${crypto.randomUUID()}`
    const snapshotResult = await env.DB.prepare(
      `INSERT INTO generated_question_snapshots(
        public_id,owner_user_id,practice_attempt_id,source_position,
        generator_slug,generator_version,seed,difficulty,prompt,
        explanation_json,parameters_json,metadata_json
      ) VALUES(?1,?2,?3,?4,'finding-percentage',1,?5,'easy',?6,'{}','{}','{}')`,
    )
      .bind(
        snapshotPublicId,
        userId,
        attemptId,
        index + 1,
        `seed-${attemptPublicId}-${index}`,
        `Smart Recovery test prompt ${attemptPublicId}-${index}`,
      )
      .run()
    const snapshotId = Number(snapshotResult.meta.last_row_id)
    await env.DB.prepare(
      `INSERT INTO generated_question_choices(
        snapshot_id,public_id,choice_text,is_correct,position,distractor_type
      ) VALUES(?1,?2,'Correct',1,1,NULL)`,
    )
      .bind(snapshotId, `smart-correct-${crypto.randomUUID()}`)
      .run()
    const wrongResult = await env.DB.prepare(
      `INSERT INTO generated_question_choices(
        snapshot_id,public_id,choice_text,is_correct,position,distractor_type
      ) VALUES(?1,?2,'Wrong',0,2,'wrong-base')`,
    )
      .bind(snapshotId, `smart-wrong-${crypto.randomUUID()}`)
      .run()
    if (status === 'submitted') {
      await env.DB.prepare(
        `INSERT INTO generated_practice_attempt_answers(
          attempt_id,snapshot_id,selected_choice_id,is_correct,points_awarded,answered_at
        ) VALUES(?1,?2,?3,0,0,CURRENT_TIMESTAMP)`,
      )
        .bind(attemptId, snapshotId, Number(wrongResult.meta.last_row_id))
        .run()
    }
  }
}

async function get(path: string, cookie?: string): Promise<Response> {
  return app.request(
    path,
    cookie === undefined ? undefined : { headers: { cookie } },
    bindings(),
  )
}

describe('Smart Recovery learner APIs', () => {
  it('requires authentication, learner role, and active enrollment', async () => {
    expect((await get('/api/student/smart-recovery')).status).toBe(401)

    const unenrolled = await register(`smart-unenrolled-${crypto.randomUUID()}@example.test`)
    expect((await get('/api/student/smart-recovery', unenrolled.cookie)).status).toBe(403)

    const administrator = await register(`smart-admin-${crypto.randomUUID()}@example.test`)
    await env.DB.prepare("UPDATE users SET role='admin' WHERE id=?1")
      .bind(administrator.userId)
      .run()
    expect((await get('/api/student/smart-recovery', administrator.cookie)).status).toBe(403)
  })

  it('derives weakness only from submitted direct generated evidence', async () => {
    const learner = await register(`smart-evidence-${crypto.randomUUID()}@example.test`)
    await enroll(learner.userId)
    await seedFindingPercentageSkill()
    await seedGeneratedAttempt(learner.userId, 'submitted', 5)
    await seedGeneratedAttempt(learner.userId, 'in_progress', 1)

    const first = await get('/api/student/smart-recovery', learner.cookie)
    const second = await get('/api/student/smart-recovery', learner.cookie)
    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    const firstBody = await first.json<{
      success: true
      data: {
        formulaVersion: number
        state: string
        eligibleEvidenceCount: number
        excludedEvidenceCount: number
        needsMorePractice: Array<{
          skill: { slug: string }
          evidenceCount: number
          status: string
          mistakePatterns: Array<{ distractorType: string; count: number }>
        }>
      }
    }>()
    const secondBody = await second.json<typeof firstBody>()
    expect(firstBody.data).toMatchObject({
      formulaVersion: 1,
      state: 'has_priorities',
      eligibleEvidenceCount: 5,
      excludedEvidenceCount: 0,
    })
    expect(firstBody.data.needsMorePractice).toHaveLength(1)
    expect(firstBody.data.needsMorePractice[0]?.skill.slug).toBe(
      'finding-percentage',
    )
    expect(firstBody.data.needsMorePractice[0]).toMatchObject({
      evidenceCount: 5,
      status: 'needs_more_practice',
    })
    expect(firstBody.data.needsMorePractice[0]?.mistakePatterns[0]).toEqual({
      distractorType: 'wrong-base',
      count: 5,
      percentOfClassifiedMistakes: 100,
    })
    expect(secondBody.data.eligibleEvidenceCount).toBe(5)
    expect(JSON.stringify(firstBody)).not.toMatch(/Correct|Wrong|test prompt/u)
    const recoveryCount = await env.DB.prepare(
      'SELECT COUNT(*) AS count FROM recovery_attempts',
    ).first<{ count: number }>()
    expect(recoveryCount?.count).toBe(0)
  })

  it('returns learner-owned details without leaking another learner evidence', async () => {
    const owner = await register(`smart-owner-${crypto.randomUUID()}@example.test`)
    const other = await register(`smart-other-${crypto.randomUUID()}@example.test`)
    await enroll(owner.userId)
    await enroll(other.userId)
    await seedFindingPercentageSkill()
    await seedGeneratedAttempt(owner.userId, 'submitted', 5)

    const ownerDetails = await get(
      '/api/student/smart-recovery/skills/finding-percentage',
      owner.cookie,
    )
    const otherDetails = await get(
      '/api/student/smart-recovery/skills/finding-percentage',
      other.cookie,
    )
    expect(ownerDetails.status).toBe(200)
    expect(otherDetails.status).toBe(200)
    const ownerBody = await ownerDetails.json<{
      data: { summary: { evidenceCount: number }; sourceBreakdown: unknown[] }
    }>()
    const otherBody = await otherDetails.json<{
      data: { summary: { evidenceCount: number; status: string } }
    }>()
    expect(ownerBody.data.summary.evidenceCount).toBe(5)
    expect(ownerBody.data.sourceBreakdown).toHaveLength(3)
    expect(otherBody.data.summary).toMatchObject({
      evidenceCount: 0,
      status: 'not_enough_data',
    })
  })

  it('validates skill slugs and returns a safe not-found response', async () => {
    const learner = await register(`smart-missing-${crypto.randomUUID()}@example.test`)
    await enroll(learner.userId)
    expect((await get('/api/student/smart-recovery/skills/INVALID!', learner.cookie)).status).toBe(400)
    const missing = await get(
      '/api/student/smart-recovery/skills/not-a-real-skill',
      learner.cookie,
    )
    expect(missing.status).toBe(404)
    expect(await missing.json()).toMatchObject({
      success: false,
      error: { code: 'SMART_RECOVERY_SKILL_NOT_FOUND' },
    })
  })
})
