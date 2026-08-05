import { env } from 'cloudflare:workers'
import { beforeAll, describe, expect, it } from 'vitest'

import { mockExamSimulationLabel } from '../src/shared/mock-exam-copy'

import {
  createMockExamAttempt,
  getMockExamAttempt,
  getMockExamResult,
  getMockExamReview,
  getMockExamSummary,
  markMockExamQuestion,
  saveMockExamAnswer,
  startMockExamProper,
  submitMockExam,
} from '../src/worker/services/mock-exam.service'

describe('Full CSE mock student lifecycle QA', () => {
  let courseId = 0
  let primaryUserId = 0
  let expiryUserId = 0
  let dashboardExpiryUserId = 0
  let raceUserId = 0
  let malformedUserId = 0
  const mockSlug = 'qa-full-cse-mock'

  async function createLearner(suffix: string): Promise<number> {
    const inserted = await env.DB.prepare(
      `INSERT INTO users (
        public_id, email, password_hash, first_name, last_name
      ) VALUES (?1, ?2, 'test-only', 'QA', 'Learner')`,
    ).bind(`mock-qa-${suffix}`, `mock-qa-${suffix}@example.test`).run()
    const userId = Number(inserted.meta.last_row_id)
    await env.DB.prepare(
      `INSERT INTO course_enrollments (
        user_id, course_id, enrollment_status
      ) VALUES (?1, ?2, 'active')`,
    ).bind(userId, courseId).run()
    return userId
  }

  beforeAll(async () => {
    const course = await env.DB.prepare(
      "SELECT id FROM courses WHERE slug = 'cse-professional'",
    ).first<{ id: number }>()
    if (course === null) throw new Error('Seeded CSE Professional course missing.')
    courseId = course.id

    const mock = await env.DB.prepare(
      `INSERT INTO mock_examinations (
        public_id, course_id, title, slug, description, simulation_label,
        position, passing_score, question_count, timed_duration_minutes,
        maximum_attempts, show_explanations, current_blueprint_version,
        status, source_url
      ) VALUES (
        'mock-qa-exam', ?1, 'Full CSE Professional Mock Examination', ?2,
        'QA fixture', 'Platform-Designed Subject Distribution v1',
        100, 80, 150, 190, NULL, 1, 1, 'published', 'https://csc.gov.ph'
      )`,
    ).bind(courseId, mockSlug).run()
    const mockId = Number(mock.meta.last_row_id)
    await env.DB.prepare(
      `INSERT INTO mock_exam_blueprints (
        mock_exam_id, version, label, total_questions,
        passing_score_percent, timed_duration_minutes,
        easy_count, medium_count, hard_count
      ) VALUES (
        ?1, 1, 'Platform-Designed Subject Distribution v1',
        150, 80, 190, 45, 75, 30
      )`,
    ).bind(mockId).run()

    primaryUserId = await createLearner('primary')
    expiryUserId = await createLearner('expiry')
    dashboardExpiryUserId = await createLearner('dashboard-expiry')
    raceUserId = await createLearner('race')
    malformedUserId = await createLearner('malformed')
  })

  it('creates one resumable immutable attempt and denies cross-user access', async () => {
    const created = await createMockExamAttempt(
      env.DB,
      primaryUserId,
      mockSlug,
      'untimed',
    )
    expect(created).toMatchObject({
      attempt: { mode: 'untimed', status: 'instructions' },
      totalCount: 150,
      questions: [],
    })

    const duplicateStart = await createMockExamAttempt(
      env.DB,
      primaryUserId,
      mockSlug,
      'untimed',
    )
    expect(duplicateStart.attempt.publicId).toBe(created.attempt.publicId)

    await expect(
      getMockExamAttempt(env.DB, expiryUserId, created.attempt.publicId),
    ).rejects.toMatchObject({ status: 403, code: 'MOCK_ATTEMPT_FORBIDDEN' })
    await expect(
      submitMockExam(env.DB, expiryUserId, created.attempt.publicId),
    ).rejects.toMatchObject({ status: 403, code: 'MOCK_ATTEMPT_FORBIDDEN' })

    const started = await startMockExamProper(
      env.DB,
      primaryUserId,
      created.attempt.publicId,
      new Date('2026-08-05T00:00:00.000Z'),
    )
    if ('resultAvailable' in started) throw new Error('Attempt closed unexpectedly.')
    expect(started.questions).toHaveLength(150)
    expect(started.attempt.deadlineAt).toBeNull()
    expect(JSON.stringify(started.questions)).not.toMatch(
      /isCorrect|explanation|generatorSlug|topicSlug/u,
    )

    const firstQuestion = started.questions[0]
    if (firstQuestion === undefined) throw new Error('Question fixture missing.')
    const storedSnapshot = await env.DB.prepare(
      `SELECT id FROM mock_exam_question_snapshots
       WHERE public_id = ?1`,
    ).bind(firstQuestion.publicId).first<{ id: number }>()
    if (storedSnapshot === null) throw new Error('Stored snapshot missing.')
    const storedChoices = await env.DB.prepare(
      `SELECT public_id, is_correct FROM mock_exam_question_choices
       WHERE snapshot_id = ?1 ORDER BY position`,
    ).bind(storedSnapshot.id).all<{ public_id: string; is_correct: 0 | 1 }>()
    const correct = storedChoices.results.find((choice) => choice.is_correct === 1)
    const incorrect = storedChoices.results.find((choice) => choice.is_correct === 0)
    if (correct === undefined || incorrect === undefined) {
      throw new Error('Stored choice fixtures missing.')
    }

    await saveMockExamAnswer(env.DB, primaryUserId, {
      attemptPublicId: created.attempt.publicId,
      snapshotPublicId: firstQuestion.publicId,
      selectedChoicePublicId: correct.public_id,
    })
    await saveMockExamAnswer(env.DB, primaryUserId, {
      attemptPublicId: created.attempt.publicId,
      snapshotPublicId: firstQuestion.publicId,
      selectedChoicePublicId: incorrect.public_id,
    })
    await markMockExamQuestion(env.DB, primaryUserId, {
      attemptPublicId: created.attempt.publicId,
      snapshotPublicId: firstQuestion.publicId,
      markedForReview: true,
    })

    const resumed = await getMockExamAttempt(
      env.DB,
      primaryUserId,
      created.attempt.publicId,
    )
    if ('resultAvailable' in resumed) throw new Error('Attempt closed unexpectedly.')
    expect(resumed).toMatchObject({ answeredCount: 1, markedForReviewCount: 1 })
    expect(resumed.questions[0]?.selectedChoicePublicId).toBe(incorrect.public_id)
    expect(resumed.questions[0]?.markedForReview).toBe(true)

    await expect(
      env.DB.prepare(
        `UPDATE mock_exam_question_snapshots SET prompt = 'mutated'
         WHERE id = ?1`,
      ).bind(storedSnapshot.id).run(),
    ).rejects.toThrow(/immutable/u)
  }, 30_000)

  it('submits server-side once, preserves history, and makes answers immutable', async () => {
    const active = await env.DB.prepare(
      `SELECT public_id FROM mock_exam_attempts
       WHERE user_id = ?1 AND status = 'in_progress'`,
    ).bind(primaryUserId).first<{ public_id: string }>()
    if (active === null) throw new Error('Primary attempt missing.')

    const first = await submitMockExam(env.DB, primaryUserId, active.public_id)
    const second = await submitMockExam(env.DB, primaryUserId, active.public_id)
    expect(second).toEqual(first)
    expect(first).toMatchObject({
      totalPoints: 150,
      earnedPoints: 0,
      scorePercent: 0,
      passed: false,
      correctCount: 0,
      incorrectCount: 1,
      unansweredCount: 149,
    })
    expect(first.subjects).toHaveLength(4)
    expect(first.topics).toHaveLength(33)

    const review = await getMockExamReview(env.DB, primaryUserId, active.public_id)
    expect(review.questions).toHaveLength(150)
    expect(review.questions.filter((question) => question.markedForReview)).toHaveLength(1)
    expect(review.questions.filter((question) => question.unanswered)).toHaveLength(149)

    const selected = review.questions.find((question) => !question.unanswered)
    if (selected === undefined || selected.selectedChoice === null) {
      throw new Error('Selected answer missing from review.')
    }
    await expect(
      saveMockExamAnswer(env.DB, primaryUserId, {
        attemptPublicId: active.public_id,
        snapshotPublicId: selected.publicId,
        selectedChoicePublicId: selected.selectedChoice.publicId,
      }),
    ).rejects.toMatchObject({ status: 409, code: 'MOCK_ATTEMPT_CLOSED' })

    const resultRows = await env.DB.prepare(
      `SELECT
        (SELECT COUNT(*) FROM mock_exam_subject_results WHERE attempt_id = a.id) AS subjects,
        (SELECT COUNT(*) FROM mock_exam_topic_results WHERE attempt_id = a.id) AS topics,
        (SELECT COUNT(*) FROM mock_exam_answers WHERE attempt_id = a.id) AS answers
       FROM mock_exam_attempts a WHERE a.public_id = ?1`,
    ).bind(active.public_id).first<{ subjects: number; topics: number; answers: number }>()
    expect(resultRows).toEqual({ subjects: 4, topics: 33, answers: 150 })

    const summary = await getMockExamSummary(env.DB, primaryUserId, mockSlug)
    expect(summary).toMatchObject({
      attemptCount: 1,
      latestScore: 0,
      bestScore: 0,
      activeAttempt: null,
    })
    expect(summary.history).toHaveLength(1)
  }, 30_000)

  it('uses the authoritative deadline, autosubmits, and rejects post-expiry edits', async () => {
    const created = await createMockExamAttempt(
      env.DB,
      expiryUserId,
      mockSlug,
      'timed',
    )
    const startedAt = new Date('2026-08-05T02:00:00.000Z')
    const started = await startMockExamProper(
      env.DB,
      expiryUserId,
      created.attempt.publicId,
      startedAt,
    )
    if ('resultAvailable' in started) throw new Error('Timed attempt closed unexpectedly.')
    expect(started.attempt.deadlineAt).toBe('2026-08-05T05:10:00.000Z')

    const question = started.questions[0]
    const choice = question?.choices[0]
    if (question === undefined || choice === undefined) throw new Error('Timed question missing.')
    await saveMockExamAnswer(env.DB, expiryUserId, {
      attemptPublicId: created.attempt.publicId,
      snapshotPublicId: question.publicId,
      selectedChoicePublicId: choice.publicId,
    }, new Date('2026-08-05T05:09:59.000Z'))

    const expired = await getMockExamAttempt(
      env.DB,
      expiryUserId,
      created.attempt.publicId,
      new Date('2026-08-05T05:10:00.000Z'),
    )
    expect(expired).toMatchObject({
      attempt: { status: 'expired' },
      resultAvailable: true,
    })
    const result = await getMockExamResult(
      env.DB,
      expiryUserId,
      created.attempt.publicId,
    )
    expect(result.attempt).toMatchObject({
      mode: 'timed',
      status: 'expired',
      autoSubmitted: true,
      durationSeconds: 11_400,
    })
    await expect(
      saveMockExamAnswer(env.DB, expiryUserId, {
        attemptPublicId: created.attempt.publicId,
        snapshotPublicId: question.publicId,
        selectedChoicePublicId: choice.publicId,
      }, new Date('2026-08-05T05:10:01.000Z')),
    ).rejects.toMatchObject({ status: 409, code: 'MOCK_ATTEMPT_CLOSED' })

    const summary = await getMockExamSummary(env.DB, expiryUserId, mockSlug)
    expect(summary.history[0]).toMatchObject({ mode: 'timed', status: 'expired' })
  }, 30_000)

  it('expires a timed attempt from the dashboard summary at the exact deadline', async () => {
    const created = await createMockExamAttempt(
      env.DB,
      dashboardExpiryUserId,
      mockSlug,
      'timed',
    )
    await startMockExamProper(
      env.DB,
      dashboardExpiryUserId,
      created.attempt.publicId,
      new Date('2020-01-01T00:00:00.000Z'),
    )

    await env.DB.prepare(
      'UPDATE mock_examinations SET simulation_label = ?1 WHERE slug = ?2',
    ).bind('Legacy local label', mockSlug).run()
    const summary = await getMockExamSummary(
      env.DB,
      dashboardExpiryUserId,
      mockSlug,
    )
    expect(summary.examination.simulationLabel).toBe(mockExamSimulationLabel)
    expect(summary.activeAttempt).toBeNull()
    expect(summary.history[0]).toMatchObject({
      status: 'expired',
      auto_submitted: 1,
      duration_seconds: 11_400,
      submitted_at: '2020-01-01T03:10:00.000Z',
    })
  }, 30_000)

  it('returns one resumable attempt when duplicate creates race', async () => {
    const [first, second] = await Promise.all([
      createMockExamAttempt(env.DB, raceUserId, mockSlug, 'untimed'),
      createMockExamAttempt(env.DB, raceUserId, mockSlug, 'untimed'),
    ])

    expect(second.attempt.publicId).toBe(first.attempt.publicId)
    const rows = await env.DB.prepare(
      `SELECT public_id FROM mock_exam_attempts
       WHERE user_id = ?1 AND mock_exam_id = (
         SELECT id FROM mock_examinations WHERE slug = ?2
       )`,
    ).bind(raceUserId, mockSlug).all<{ public_id: string }>()
    expect(rows.results).toEqual([{ public_id: first.attempt.publicId }])
  }, 30_000)
  it('fails safely when an immutable attempt snapshot is incomplete', async () => {
    const created = await createMockExamAttempt(
      env.DB,
      malformedUserId,
      mockSlug,
      'untimed',
    )
    await startMockExamProper(env.DB, malformedUserId, created.attempt.publicId)
    await env.DB.prepare(
      `DELETE FROM mock_exam_question_snapshots
       WHERE id = (
         SELECT s.id FROM mock_exam_question_snapshots s
         INNER JOIN mock_exam_attempts a ON a.id = s.attempt_id
         WHERE a.public_id = ?1 ORDER BY s.source_position LIMIT 1
       )`,
    ).bind(created.attempt.publicId).run()

    await expect(
      submitMockExam(env.DB, malformedUserId, created.attempt.publicId),
    ).rejects.toMatchObject({ status: 409, code: 'MOCK_SNAPSHOT_INVALID' })
    const row = await env.DB.prepare(
      `SELECT status, submitted_at FROM mock_exam_attempts WHERE public_id = ?1`,
    ).bind(created.attempt.publicId).first<{ status: string; submitted_at: string | null }>()
    expect(row).toEqual({ status: 'in_progress', submitted_at: null })
  }, 30_000)
})
