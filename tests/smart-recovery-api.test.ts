import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

import { app } from '../src/worker'
import { createRecoveryAttemptWithSnapshots } from '../src/worker/repositories/smart-recovery-attempt.repository'


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
  const nextAttempt = await env.DB.prepare(
    `SELECT COALESCE(MAX(attempt_number), 0) + 1 AS attempt_number
    FROM practice_attempts
    WHERE practice_set_id=?1 AND user_id=?2`,
  )
    .bind(practiceSet.id, userId)
    .first<{ attempt_number: number }>()
  if (nextAttempt === null) throw new Error('Practice attempt number missing.')
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
      nextAttempt.attempt_number,
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
    expect((await get('/api/student/smart-recovery/history')).status).toBe(401)

    const unenrolled = await register(`smart-unenrolled-${crypto.randomUUID()}@example.test`)
    expect((await get('/api/student/smart-recovery', unenrolled.cookie)).status).toBe(403)
    expect((await get('/api/student/smart-recovery/history', unenrolled.cookie)).status).toBe(403)

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
      formulaVersion: 2,
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

  it('deduplicates and bounds evidence to the latest 50 rows per skill in D1', async () => {
    const learner = await register(`smart-bound-${crypto.randomUUID()}@example.test`)
    await enroll(learner.userId)
    await seedFindingPercentageSkill()
    for (let attempt = 0; attempt < 11; attempt += 1) {
      await seedGeneratedAttempt(learner.userId, 'submitted', 5)
    }

    const summary = await get('/api/student/smart-recovery', learner.cookie)
    expect(summary.status).toBe(200)
    const summaryBody = await summary.json<{
      data: { eligibleEvidenceCount: number; skillsWithEvidence: number }
    }>()
    expect(summaryBody.data).toMatchObject({
      eligibleEvidenceCount: 50,
      skillsWithEvidence: 1,
    })

    const details = await get(
      '/api/student/smart-recovery/skills/finding-percentage',
      learner.cookie,
    )
    expect(details.status).toBe(200)
    expect(
      (await details.json<{ data: { summary: { evidenceCount: number } } }>())
        .data.summary.evidenceCount,
    ).toBe(50)
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
    expect(ownerBody.data.sourceBreakdown).toHaveLength(4)
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
  it('creates, resumes, saves, submits, and protects an immutable recovery attempt', async () => {
    const owner = await register(`recovery-owner-${crypto.randomUUID()}@example.test`)
    const other = await register(`recovery-other-${crypto.randomUUID()}@example.test`)
    await enroll(owner.userId)
    await enroll(other.userId)
    await seedFindingPercentageSkill()
    await seedGeneratedAttempt(owner.userId, 'submitted', 5)

    const beforeFixed = await env.DB.batch([
      env.DB.prepare('SELECT COUNT(*) AS count FROM practice_question_skills'),
      env.DB.prepare('SELECT COUNT(*) AS count FROM quiz_question_skills'),
    ])
    const idempotencyKey = crypto.randomUUID()
    const create = await app.request(
      '/api/student/smart-recovery/attempts',
      {
        method: 'POST',
        headers: { cookie: owner.cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ idempotencyKey }),
      },
      bindings(),
    )
    expect(create.status).toBe(201)
    const created = await create.json<{
      data: {
        attempt: { publicId: string; status: string }
        questions: Array<{
          publicId: string
          choices: Array<{ publicId: string; text: string }>
        }>
        totalCount: number
      }
    }>()
    expect(created.data.totalCount).toBe(8)
    expect(created.data.questions).toHaveLength(8)
    expect(JSON.stringify(created)).not.toMatch(
      /correctChoice|isCorrect|explanation|generatorSeed|attemptSeed/u,
    )

    const retry = await app.request(
      '/api/student/smart-recovery/attempts',
      {
        method: 'POST',
        headers: { cookie: owner.cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ idempotencyKey }),
      },
      bindings(),
    )
    const retried = await retry.json<typeof created>()
    expect(retried.data.attempt.publicId).toBe(created.data.attempt.publicId)

    const activeRetry = await app.request(
      '/api/student/smart-recovery/attempts',
      {
        method: 'POST',
        headers: { cookie: owner.cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }),
      },
      bindings(),
    )
    const activeRetried = await activeRetry.json<typeof created>()
    expect(activeRetried.data.attempt.publicId).toBe(created.data.attempt.publicId)

    const injected = await app.request(
      '/api/student/smart-recovery/attempts',
      {
        method: 'POST',
        headers: { cookie: owner.cookie, 'content-type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
          skillSlug: 'finding-base',
          generatorSlug: 'finding-base',
        }),
      },
      bindings(),
    )
    expect(injected.status).toBe(400)

    const attemptId = created.data.attempt.publicId
    const activeSummary = await get('/api/student/smart-recovery', owner.cookie)
    const activeSummaryPayload = await activeSummary.json<{
      data: { eligibleEvidenceCount: number; activeRecoveryAttemptPublicId: string | null }
    }>()
    expect(activeSummaryPayload.data).toMatchObject({
      eligibleEvidenceCount: 5,
      activeRecoveryAttemptPublicId: attemptId,
    })

    const ownerGet = await get(
      `/api/student/smart-recovery/attempts/${attemptId}`,
      owner.cookie,
    )
    const otherGet = await get(
      `/api/student/smart-recovery/attempts/${attemptId}`,
      other.cookie,
    )
    expect(ownerGet.status).toBe(200)
    expect(otherGet.status).toBe(403)

    const firstQuestion = created.data.questions[0]
    const secondQuestion = created.data.questions[1]
    if (firstQuestion === undefined || secondQuestion === undefined) {
      throw new Error('Recovery questions missing.')
    }
    const correct = await env.DB.prepare(
      `SELECT choices.public_id
      FROM recovery_question_choices choices
      INNER JOIN recovery_question_snapshots snapshots
        ON snapshots.id=choices.snapshot_id
      WHERE snapshots.public_id=?1 AND choices.is_correct=1`,
    )
      .bind(firstQuestion.publicId)
      .first<{ public_id: string }>()
    if (correct === null) throw new Error('Correct recovery choice missing.')

    const save = await app.request(
      `/api/student/smart-recovery/attempts/${attemptId}/answers/${firstQuestion.publicId}`,
      {
        method: 'PUT',
        headers: { cookie: owner.cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ selectedChoicePublicId: correct.public_id }),
      },
      bindings(),
    )
    expect(save.status).toBe(200)
    const saved = await save.json<{ data: { saved: true; answeredCount: number } }>()
    expect(saved.data).toMatchObject({ saved: true, answeredCount: 1 })
    expect(JSON.stringify(saved)).not.toMatch(/correct|isCorrect/u)

    const crossUserSave = await app.request(
      `/api/student/smart-recovery/attempts/${attemptId}/answers/${firstQuestion.publicId}`,
      {
        method: 'PUT',
        headers: { cookie: other.cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ selectedChoicePublicId: correct.public_id }),
      },
      bindings(),
    )
    expect(crossUserSave.status).toBe(403)

    const duplicateSave = await app.request(
      `/api/student/smart-recovery/attempts/${attemptId}/answers/${firstQuestion.publicId}`,
      {
        method: 'PUT',
        headers: { cookie: owner.cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ selectedChoicePublicId: correct.public_id }),
      },
      bindings(),
    )
    expect(duplicateSave.status).toBe(200)

    const wrongSnapshot = await app.request(
      `/api/student/smart-recovery/attempts/${attemptId}/answers/${secondQuestion.publicId}`,
      {
        method: 'PUT',
        headers: { cookie: owner.cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ selectedChoicePublicId: correct.public_id }),
      },
      bindings(),
    )
    expect(wrongSnapshot.status).toBe(400)

    for (const question of created.data.questions.slice(1)) {
      const incorrect = await env.DB.prepare(
        `SELECT choices.public_id
        FROM recovery_question_choices choices
        INNER JOIN recovery_question_snapshots snapshots
          ON snapshots.id=choices.snapshot_id
        WHERE snapshots.public_id=?1 AND choices.is_correct=0
        ORDER BY choices.position
        LIMIT 1`,
      )
        .bind(question.publicId)
        .first<{ public_id: string }>()
      if (incorrect === null) throw new Error('Incorrect recovery choice missing.')
      const answer = await app.request(
        `/api/student/smart-recovery/attempts/${attemptId}/answers/${question.publicId}`,
        {
          method: 'PUT',
          headers: { cookie: owner.cookie, 'content-type': 'application/json' },
          body: JSON.stringify({ selectedChoicePublicId: incorrect.public_id }),
        },
        bindings(),
      )
      expect(answer.status).toBe(200)
    }

    const crossUserSubmit = await app.request(
      `/api/student/smart-recovery/attempts/${attemptId}/submit`,
      { method: 'POST', headers: { cookie: other.cookie } },
      bindings(),
    )
    expect(crossUserSubmit.status).toBe(403)

    const submit = await app.request(
      `/api/student/smart-recovery/attempts/${attemptId}/submit`,
      { method: 'POST', headers: { cookie: owner.cookie } },
      bindings(),
    )
    expect(submit.status).toBe(200)
    const result = await submit.json<{
      data: {
        formulaVersion: number
        attempt: { formulaVersion: number }
        interpretation: { code: string }
        scorePercent: number
        correctCount: number
        questionCount: number
        skillBreakdown: Array<{
          questions: number
          correct: number
          statusBefore: string
          evidenceCountBefore: number
          statusAfter: string
          evidenceCountAfter: number
          trend: string
        }>
        questions: Array<{ correctChoice: { text: string } }>
      }
    }>()
    expect(result.data).toMatchObject({
      scorePercent: 12.5,
      correctCount: 1,
      questionCount: 8,
    })
    expect(result.data).toMatchObject({
      formulaVersion: 2,
      attempt: { formulaVersion: 2 },
      interpretation: { code: 'still_needs_practice' },
    })
    expect(result.data.skillBreakdown).toEqual([
      expect.objectContaining({
        questions: 8,
        correct: 1,
        statusBefore: 'needs_more_practice',
        evidenceCountBefore: 5,
        statusAfter: 'needs_more_practice',
        evidenceCountAfter: 13,
      }),
    ])
    expect(result.data.questions).toHaveLength(8)

    const submittedAttempt = await get(
      `/api/student/smart-recovery/attempts/${attemptId}`,
      owner.cookie,
    )
    expect(submittedAttempt.status).toBe(200)
    const submittedAttemptPayload = await submittedAttempt.json<{
      data: { attempt: { status: string }; resultAvailable: boolean }
    }>()
    expect(submittedAttemptPayload.data.attempt.status).toBe('submitted')
    expect(submittedAttemptPayload.data.resultAvailable).toBe(true)

    const summaryAfterSubmit = await get('/api/student/smart-recovery', owner.cookie)
    expect(summaryAfterSubmit.status).toBe(200)
    const summaryAfterSubmitPayload = await summaryAfterSubmit.json<{
      data: {
        activeRecoveryAttemptPublicId: string | null
        latestRecoveryResult: { attemptPublicId: string } | null
      }
    }>()
    expect(summaryAfterSubmitPayload.data.activeRecoveryAttemptPublicId).toBeNull()
    expect(summaryAfterSubmitPayload.data.latestRecoveryResult?.attemptPublicId).toBe(
      attemptId,
    )

    const duplicateSubmit = await app.request(
      `/api/student/smart-recovery/attempts/${attemptId}/submit`,
      { method: 'POST', headers: { cookie: owner.cookie } },
      bindings(),
    )
    expect(duplicateSubmit.status).toBe(200)
    const duplicateResult = await duplicateSubmit.json<typeof result>()
    expect(duplicateResult.data.scorePercent).toBe(result.data.scorePercent)
    expect(duplicateResult.data.formulaVersion).toBe(result.data.formulaVersion)
    expect(duplicateResult.data.attempt.formulaVersion).toBe(
      result.data.attempt.formulaVersion,
    )
    const persisted = await env.DB.prepare(
      `SELECT
        COUNT(DISTINCT attempts.id) AS attempt_count,
        COUNT(DISTINCT answers.id) AS answer_count
      FROM recovery_attempts attempts
      LEFT JOIN recovery_question_snapshots snapshots ON snapshots.attempt_id=attempts.id
      LEFT JOIN recovery_answers answers ON answers.snapshot_id=snapshots.id
      WHERE attempts.public_id=?1 AND attempts.status='submitted'`,
    )
      .bind(attemptId)
      .first<{ attempt_count: number; answer_count: number }>()
    expect(persisted).toEqual({ attempt_count: 1, answer_count: 8 })

    const detailsAfterSubmit = await get(
      '/api/student/smart-recovery/skills/finding-percentage',
      owner.cookie,
    )
    const detailsAfterSubmitPayload = await detailsAfterSubmit.json<{
      data: {
        summary: { evidenceCount: number }
        sourceBreakdown: Array<{ sourceType: string; evidenceCount: number }>
      }
    }>()
    expect(detailsAfterSubmitPayload.data.summary.evidenceCount).toBe(13)
    expect(detailsAfterSubmitPayload.data.sourceBreakdown).toContainEqual(
      expect.objectContaining({ sourceType: 'recovery', evidenceCount: 8 }),
    )

    const ownerHistory = await get('/api/student/smart-recovery/history', owner.cookie)
    expect(ownerHistory.status).toBe(200)
    const ownerHistoryPayload = await ownerHistory.json<{
      data: {
        formulaVersion: number
        totalSubmittedAttempts: number
        attempts: Array<{
          attempt: { publicId: string; formulaVersion: number }
          interpretation: { code: string }
          skillProgress: Array<{
            progress: { evidenceCountBefore: number; evidenceCountAfter: number }
          }>
        }>
      }
    }>()
    expect(ownerHistoryPayload.data).toMatchObject({
      formulaVersion: 2,
      totalSubmittedAttempts: 1,
      attempts: [
        {
          attempt: { publicId: attemptId, formulaVersion: 2 },
          interpretation: { code: 'still_needs_practice' },
          skillProgress: [
            { progress: { evidenceCountBefore: 5, evidenceCountAfter: 13 } },
          ],
        },
      ],
    })
    const otherHistory = await get('/api/student/smart-recovery/history', other.cookie)
    expect(otherHistory.status).toBe(200)
    expect((await otherHistory.json<{ data: { attempts: unknown[] } }>()).data.attempts)
      .toEqual([])
    expect(
      (await get(`/api/student/smart-recovery/attempts/${attemptId}/result`, other.cookie)).status,
    ).toBe(403)
    expect(
      (await get(`/api/student/smart-recovery/attempts/${attemptId}/result`, owner.cookie)).status,
    ).toBe(200)

    const closedSave = await app.request(
      `/api/student/smart-recovery/attempts/${attemptId}/answers/${firstQuestion.publicId}`,
      {
        method: 'PUT',
        headers: { cookie: owner.cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ selectedChoicePublicId: correct.public_id }),
      },
      bindings(),
    )
    expect(closedSave.status).toBe(409)
    expect(
      (
        await get(
          `/api/student/smart-recovery/attempts/${attemptId}/results`,
          other.cookie,
        )
      ).status,
    ).toBe(403)

    const course = await env.DB.prepare(
      "SELECT id FROM courses WHERE slug='cse-professional'",
    ).first<{ id: number }>()
    if (course === null) throw new Error('CSE course missing.')
    const failedPublicId = `recovery-attempt-${crypto.randomUUID()}`
    await expect(
      createRecoveryAttemptWithSnapshots(env.DB, {
        attemptPublicId: failedPublicId,
        userId: owner.userId,
        courseId: course.id,
        attemptSeed: 'failure-seed',
        idempotencyKey: crypto.randomUUID(),
        taxonomyVersion: 1,
        formulaVersion: 2,
        questions: [
          {
            position: 1,
            skill: {
              skill: {
                slug: 'missing-skill', title: 'Missing Skill', description: null,
                taxonomyVersion: 1, subjectSlug: 'numerical-ability',
                subjectTitle: 'Numerical Ability', topicSlug: 'percentages',
                topicTitle: 'Percentages', relatedLessonSlug: null,
                relatedLessonTitle: null,
              },
              status: 'needs_more_practice', trend: 'stable', evidenceCount: 5,
              answeredCount: 5, correctCount: 0, incorrectCount: 5,
              unansweredCount: 0, accuracyPercent: 0, recentAccuracyPercent: 0,
              previousAccuracyPercent: 0, lastPracticedAt: null,
              mistakePatterns: [],
            },
            question: {
              generatorSlug: 'finding-percentage', generatorVersion: 1,
              difficulty: 'easy', seed: 'failure-question-seed',
              prompt: 'This batch must roll back.', parameters: {},
              choices: [
                { text: 'Correct', isCorrect: true, distractorType: null, mistakeType: null, derivation: null, qualityScore: 1, numericValue: 1 },
                { text: 'Wrong', isCorrect: false, distractorType: 'test', mistakeType: null, derivation: null, qualityScore: 1, numericValue: 2 },
              ],
              explanation: { title: 'Test', steps: ['Test.'], finalAnswer: 'Correct' },
              metadata: { answerKind: 'text', unit: null, canonicalSignature: 'rollback-test' },
            },
          },
        ],
      }),
    ).rejects.toThrow()
    const partial = await env.DB.prepare(
      'SELECT COUNT(*) AS count FROM recovery_attempts WHERE public_id=?1',
    ).bind(failedPublicId).first<{ count: number }>()
    expect(partial?.count).toBe(0)
    const counts = await env.DB.batch([
      env.DB.prepare('SELECT COUNT(*) AS count FROM recovery_attempts WHERE user_id=?1').bind(owner.userId),
      env.DB.prepare('SELECT COUNT(*) AS count FROM recovery_question_snapshots'),
      env.DB.prepare('SELECT COUNT(*) AS count FROM recovery_question_choices'),
      env.DB.prepare('SELECT COUNT(*) AS count FROM practice_question_skills'),
      env.DB.prepare('SELECT COUNT(*) AS count FROM quiz_question_skills'),
    ])
    expect(counts[0]?.results[0]).toEqual({ count: 1 })
    expect(counts[1]?.results[0]).toEqual({ count: 8 })
    expect(counts[2]?.results[0]).toEqual({ count: 32 })
    expect(counts[3]?.results[0]).toEqual(beforeFixed[0]?.results[0])
    expect(counts[4]?.results[0]).toEqual(beforeFixed[1]?.results[0])

    const secondCreate = await app.request(
      '/api/student/smart-recovery/attempts',
      {
        method: 'POST',
        headers: { cookie: owner.cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }),
      },
      bindings(),
    )
    expect(secondCreate.status).toBe(201)
    const secondCreated = await secondCreate.json<typeof created>()
    const secondAttemptId = secondCreated.data.attempt.publicId
    expect(secondAttemptId).not.toBe(attemptId)
    expect(
      (
        await app.request(
          `/api/student/smart-recovery/attempts/${secondAttemptId}/submit`,
          { method: 'POST', headers: { cookie: owner.cookie } },
          bindings(),
        )
      ).status,
    ).toBe(200)
    const orderedHistory = await get('/api/student/smart-recovery/history', owner.cookie)
    const orderedHistoryPayload = await orderedHistory.json<{
      data: {
        totalSubmittedAttempts: number
        attempts: Array<{ attempt: { publicId: string } }>
      }
    }>()
    expect(orderedHistoryPayload.data.totalSubmittedAttempts).toBe(2)
    expect(orderedHistoryPayload.data.attempts.map((item) => item.attempt.publicId))
      .toEqual([secondAttemptId, attemptId])
  })
})
