import { env } from 'cloudflare:workers'
import { beforeAll, describe, expect, it } from 'vitest'

import {
  generateSubjectAssessmentQuestions,
  isGeneratorAllowedForTopic,
  numericalAbilityBlueprintV1,
  validateSubjectAssessmentBlueprint,
} from '../src/worker/domain/subject-assessment-blueprint'
import { calculateSubjectAssessmentBreakdown } from '../src/worker/domain/subject-assessment-results'
import { scoreAssessment } from '../src/worker/domain/assessment-scoring'
import { subjectAssessmentResultSchema } from '../src/shared/subject-assessment-result.schema'
import {
  findPublishedSubjectAssessmentForCourse,
} from '../src/worker/repositories/subject-assessment.repository'
import {
  getCourseDetailSubjectAssessment,
  getSubjectAssessmentAttempt,
  saveSubjectAssessmentAnswer,
  saveAdminSubjectAssessment,
  startSubjectAssessmentAttempt,
  submitSubjectAssessmentAttempt,
} from '../src/worker/services/subject-assessment.service'

describe('Numerical Ability subject assessment quality gate', () => {
  it('validates the versioned 50-question, ten-topic blueprint', () => {
    expect(validateSubjectAssessmentBlueprint(numericalAbilityBlueprintV1)).toEqual({ valid: true, errors: [] })
    expect(numericalAbilityBlueprintV1.topics).toHaveLength(10)
    for (const topic of numericalAbilityBlueprintV1.topics) {
      expect(topic.count).toBe(5)
      expect(topic.difficulty).toEqual({ easy: 2, medium: 2, hard: 1 })
      expect(topic.generators.length).toBeGreaterThan(1)
    }
  })

  it('rejects duplicate topics, invalid counts, and unregistered generator versions', () => {
    const duplicate = { ...numericalAbilityBlueprintV1, topics: [...numericalAbilityBlueprintV1.topics.slice(0, 9), numericalAbilityBlueprintV1.topics[0]] }
    expect(validateSubjectAssessmentBlueprint(duplicate).valid).toBe(false)
    const invalidCount = { ...numericalAbilityBlueprintV1, totalQuestions: 49 }
    expect(validateSubjectAssessmentBlueprint(invalidCount).valid).toBe(false)
    const invalidVersion = { ...numericalAbilityBlueprintV1, topics: numericalAbilityBlueprintV1.topics.map((topic, index) => index === 0 ? { ...topic, generators: topic.generators.map((generator, generatorIndex) => generatorIndex === 0 ? { ...generator, version: 999 } : generator) } : topic) }
    expect(validateSubjectAssessmentBlueprint(invalidVersion).valid).toBe(false)
  })

  it('generates 200 valid attempts (10,000 questions) without duplicate prompts or cross-topic generators', () => {
    for (let attempt = 1; attempt <= 200; attempt += 1) {
      const questions = generateSubjectAssessmentQuestions(numericalAbilityBlueprintV1, `quality-gate-${attempt}`)
      expect(questions).toHaveLength(50)
      expect(new Set(questions.map((item) => item.question.prompt.toLocaleLowerCase().trim())).size).toBe(50)
      expect(new Set(questions.map((item) => item.question.seed)).size).toBe(50)
      for (const topic of numericalAbilityBlueprintV1.topics) {
        const selected = questions.filter((question) => question.topicSlug === topic.topicSlug)
        expect(selected).toHaveLength(5)
        expect(selected.filter((item) => item.question.difficulty === 'easy')).toHaveLength(2)
        expect(selected.filter((item) => item.question.difficulty === 'medium')).toHaveLength(2)
        expect(selected.filter((item) => item.question.difficulty === 'hard')).toHaveLength(1)
        expect(selected.every((item) => isGeneratorAllowedForTopic(topic.topicSlug, item.question.generatorSlug))).toBe(true)
      }
    }
  }, 30_000)

  it('is deterministic for a seed and changes snapshots for a retry seed', () => {
    const first = generateSubjectAssessmentQuestions(numericalAbilityBlueprintV1, 'learner-attempt-1')
    const resumed = generateSubjectAssessmentQuestions(numericalAbilityBlueprintV1, 'learner-attempt-1')
    const retry = generateSubjectAssessmentQuestions(numericalAbilityBlueprintV1, 'learner-attempt-2')
    expect(resumed).toEqual(first)
    expect(retry.map((item) => item.question.prompt)).not.toEqual(first.map((item) => item.question.prompt))
  })

  it('scores selected snapshot choices server-side and reports deterministic strongest/weakest ties', () => {
    const generated = generateSubjectAssessmentQuestions(numericalAbilityBlueprintV1, 'scoring-attempt')
    const questions = generated.map((item, index) => ({ id: index + 1, points: 1, choices: item.question.choices.map((choice, choiceIndex) => ({ id: index * 4 + choiceIndex + 1, isCorrect: choice.isCorrect })) }))
    const answers = questions.map((question) => ({ question_id: question.id, selected_choice_id: question.choices.find((choice) => choice.isCorrect)!.id }))
    const score = scoreAssessment(questions, answers, 70)
    expect(score).toMatchObject({ earnedPoints: 50, totalPoints: 50, scorePercent: 100, passed: true })
    const breakdown = calculateSubjectAssessmentBreakdown(generated.map((item) => ({ topicSlug: item.topicSlug, topicTitle: item.topicTitle, topicPosition: item.topicPosition, selectedChoiceId: 1, isCorrect: item.topicSlug === 'percentages' })))
    expect(breakdown.strongestTopic.topicTitle).toBe('Percentages')
    expect(breakdown.weakestTopic.topicTitle).toBe('Fractions')
    expect(breakdown.topics).toHaveLength(10)
  })

  it('enforces the 35/50 passing boundary and unanswered scoring', () => {
    const generated = generateSubjectAssessmentQuestions(numericalAbilityBlueprintV1, 'boundary-attempt')
    const questions = generated.map((item, index) => ({ id: index + 1, points: 1, choices: item.question.choices.map((choice, choiceIndex) => ({ id: index * 4 + choiceIndex + 1, isCorrect: choice.isCorrect })) }))
    const answerFor = (question: (typeof questions)[number], correct: boolean) => ({ question_id: question.id, selected_choice_id: question.choices.find((choice) => choice.isCorrect === correct)!.id })
    expect(scoreAssessment(questions, questions.map((question, index) => answerFor(question, index < 35)), 70)).toMatchObject({ earnedPoints: 35, scorePercent: 70, passed: true })
    expect(scoreAssessment(questions, questions.map((question, index) => answerFor(question, index < 34)), 70)).toMatchObject({ earnedPoints: 34, scorePercent: 68, passed: false })
    expect(scoreAssessment(questions, [], 70)).toMatchObject({ earnedPoints: 0, scorePercent: 0, passed: false })
  })
})

describe('subject assessment discovery and learner state', () => {
  let courseId: number
  let assessmentId: number

  async function createLearner(suffix: string): Promise<number> {
    const result = await env.DB.prepare(
      `INSERT INTO users (public_id, email, password_hash, first_name, last_name)
       VALUES (?1, ?2, 'test-only', 'Assessment', 'Learner')`,
    ).bind(`assessment-learner-${suffix}`, `assessment-${suffix}@example.test`).run()
    const userId = Number(result.meta.last_row_id)
    await env.DB.prepare(
      `INSERT INTO course_enrollments (user_id, course_id, enrollment_status)
       VALUES (?1, ?2, 'active')`,
    ).bind(userId, courseId).run()
    return userId
  }

  async function answerAttempt(
    userId: number,
    attemptPublicId: string,
    correctAnswers: number,
    answerCount = 50,
  ): Promise<void> {
    const attempt = await env.DB.prepare(
      'SELECT id FROM subject_assessment_attempts WHERE public_id = ?1',
    ).bind(attemptPublicId).first<{ id: number }>()
    if (attempt === null) throw new Error('Attempt fixture is missing.')
    const choices = await env.DB.prepare(
      `SELECT snapshots.public_id AS snapshot_public_id,
        correct.public_id AS correct_public_id,
        incorrect.public_id AS incorrect_public_id
       FROM subject_assessment_question_snapshots AS snapshots
       INNER JOIN subject_assessment_question_choices AS correct
         ON correct.snapshot_id = snapshots.id AND correct.is_correct = 1
       INNER JOIN subject_assessment_question_choices AS incorrect
         ON incorrect.snapshot_id = snapshots.id AND incorrect.is_correct = 0
       WHERE snapshots.attempt_id = ?1
       GROUP BY snapshots.id
       ORDER BY snapshots.source_position`,
    ).bind(attempt.id).all<{
      snapshot_public_id: string
      correct_public_id: string
      incorrect_public_id: string
    }>()
    for (const [index, choice] of choices.results.slice(0, answerCount).entries()) {
      await saveSubjectAssessmentAnswer(env.DB, userId, {
        attemptPublicId,
        snapshotPublicId: choice.snapshot_public_id,
        selectedChoicePublicId:
          index < correctAnswers
            ? choice.correct_public_id
            : choice.incorrect_public_id,
      })
    }
  }

  beforeAll(async () => {
    const course = await env.DB.prepare(
      "SELECT id FROM courses WHERE slug = 'cse-professional'",
    ).first<{ id: number }>()
    if (course === null) throw new Error('Seeded course is missing.')
    courseId = course.id
    const subject = await env.DB.prepare(
      "SELECT id FROM subjects WHERE course_id = ?1 AND slug = 'numerical-ability'",
    ).bind(courseId).first<{ id: number }>()
    if (subject === null) throw new Error('Seeded subject is missing.')
    const existingTopics = await env.DB.prepare(
      'SELECT slug FROM topics WHERE subject_id = ?1',
    ).bind(subject.id).all<{ slug: string }>()
    const existingSlugs = new Set(existingTopics.results.map((topic) => topic.slug))
    for (const topic of numericalAbilityBlueprintV1.topics) {
      if (!existingSlugs.has(topic.topicSlug)) {
        await env.DB.prepare(
          `INSERT INTO topics (subject_id, title, slug, position, status)
           VALUES (?1, ?2, ?3, ?4, 'published')`,
        ).bind(subject.id, topic.topicTitle, topic.topicSlug, topic.position).run()
      } else {
        await env.DB.prepare(
          "UPDATE topics SET status = 'published' WHERE subject_id = ?1 AND slug = ?2",
        ).bind(subject.id, topic.topicSlug).run()
      }
    }

    const adminResult = await env.DB.prepare(
      `INSERT INTO users (public_id, email, password_hash, first_name, last_name, role)
       VALUES ('assessment-admin', 'assessment-admin@example.test', 'test-only', 'Assessment', 'Admin', 'admin')`,
    ).run()
    const adminId = Number(adminResult.meta.last_row_id)
    await saveAdminSubjectAssessment(env.DB, {
      id: 'assessment-admin',
      internalUserId: adminId,
      email: 'assessment-admin@example.test',
      firstName: 'Assessment',
      lastName: 'Admin',
      role: 'admin',
    }, {
      title: 'Numerical Ability Subject Assessment',
      slug: 'numerical-ability-subject-assessment',
      description: 'A cumulative Numerical Ability assessment.',
      position: 1,
      passingScore: 70,
      questionCount: 50,
      maximumAttempts: null,
      timeLimitMinutes: null,
      showExplanations: true,
      status: 'published',
      blueprint: numericalAbilityBlueprintV1,
    })
    const stored = await env.DB.prepare(
      "SELECT id FROM subject_assessments WHERE slug = 'numerical-ability-subject-assessment'",
    ).first<{ id: number }>()
    const blueprint = stored === null ? null : await env.DB.prepare(
      'SELECT id FROM subject_assessment_blueprints WHERE assessment_id = ?1 AND version = 1',
    ).bind(stored.id).first<{ id: number }>()
    if (stored === null || blueprint === null) throw new Error('Assessment fixture is missing.')
    assessmentId = stored.id
  })

  it('uses the subject relationship and hides a draft assessment', async () => {
    const published = await findPublishedSubjectAssessmentForCourse(env.DB, courseId)
    expect(published).toMatchObject({
      subject_slug: 'numerical-ability',
      course_slug: 'cse-professional',
      status: 'published',
    })
    await env.DB.prepare('UPDATE subject_assessments SET status = ?1 WHERE id = ?2').bind('draft', assessmentId).run()
    expect(await findPublishedSubjectAssessmentForCourse(env.DB, courseId)).toBeNull()
    await env.DB.prepare('UPDATE subject_assessments SET status = ?1 WHERE id = ?2').bind('published', assessmentId).run()
  })

  it('returns a published assessment for an enrolled learner with zero attempts', async () => {
    const userId = await createLearner('zero')
    const summary = await getCourseDetailSubjectAssessment(env.DB, userId, courseId)
    expect(summary?.assessment.publicId).toEqual(expect.stringContaining('subject-assessment-'))
    expect(summary).toMatchObject({
      assessment: { subjectSlug: 'numerical-ability', questionCount: 50, passingScore: 70, status: 'published' },
      availability: { available: true },
      state: 'not_started',
      attemptCount: 0,
    })
  })

  it.each([
    ['in_progress', 'in_progress', null, 'in_progress'],
    ['failed', 'submitted', 0, 'needs_improvement'],
    ['passed', 'submitted', 1, 'passed'],
  ] as const)('maps a %s learner attempt to the card state', async (suffix, status, passed, expectedState) => {
    const userId = await createLearner(suffix)
    const attempt = await startSubjectAssessmentAttempt(
      env.DB,
      userId,
      'numerical-ability-subject-assessment',
    )
    if (status === 'submitted') {
      await env.DB.prepare(
        `UPDATE subject_assessment_attempts
         SET status = 'submitted', earned_points = ?1, score_percent = ?2,
             passed = ?3, submitted_at = CURRENT_TIMESTAMP
         WHERE public_id = ?4`,
      ).bind(passed === 1 ? 40 : 20, passed === 1 ? 80 : 40, passed, attempt.attempt.publicId).run()
    }
    const summary = await getCourseDetailSubjectAssessment(env.DB, userId, courseId)
    expect(summary?.state).toBe(expectedState)
    if (status === 'in_progress') expect(summary?.inProgressAttemptPublicId).toBe(attempt.attempt.publicId)
  })

  it('does not allow a learner to retrieve another learner’s attempt', async () => {
    const ownerId = await createLearner('owner')
    const otherId = await createLearner('other')
    const attempt = await startSubjectAssessmentAttempt(
      env.DB,
      ownerId,
      'numerical-ability-subject-assessment',
    )
    await expect(getSubjectAssessmentAttempt(env.DB, otherId, attempt.attempt.publicId)).rejects.toMatchObject({ status: 403 })
    await expect(submitSubjectAssessmentAttempt(env.DB, otherId, attempt.attempt.publicId)).rejects.toMatchObject({ status: 403 })
  })

  it('submits all answered snapshots and returns the shared response shape', async () => {
    const userId = await createLearner('submit-all')
    const attempt = await startSubjectAssessmentAttempt(env.DB, userId, 'numerical-ability-subject-assessment')
    await answerAttempt(userId, attempt.attempt.publicId, 50)
    const result = await submitSubjectAssessmentAttempt(env.DB, userId, attempt.attempt.publicId)
    expect(subjectAssessmentResultSchema.safeParse(result).success).toBe(true)
    expect(result).toMatchObject({
      attempt: { publicId: attempt.attempt.publicId, status: 'submitted' },
      earnedPoints: 50,
      totalPoints: 50,
      scorePercent: 100,
      passed: true,
      resultUrl: `/assessment-attempts/${attempt.attempt.publicId}/results`,
    })
  })

  it('counts unanswered questions as zero', async () => {
    const userId = await createLearner('submit-unanswered')
    const attempt = await startSubjectAssessmentAttempt(env.DB, userId, 'numerical-ability-subject-assessment')
    await answerAttempt(userId, attempt.attempt.publicId, 10, 10)
    const result = await submitSubjectAssessmentAttempt(env.DB, userId, attempt.attempt.publicId)
    expect(result).toMatchObject({ earnedPoints: 10, totalPoints: 50, scorePercent: 20, passed: false })
    expect(result.breakdown.unansweredCount).toBe(40)
  })

  it('passes at the exact 35 of 50 boundary', async () => {
    const userId = await createLearner('submit-boundary')
    const attempt = await startSubjectAssessmentAttempt(env.DB, userId, 'numerical-ability-subject-assessment')
    await answerAttempt(userId, attempt.attempt.publicId, 35)
    const result = await submitSubjectAssessmentAttempt(env.DB, userId, attempt.attempt.publicId)
    expect(result).toMatchObject({ earnedPoints: 35, scorePercent: 70, passed: true })
  })

  it('is idempotent and keeps submitted answers immutable', async () => {
    const userId = await createLearner('submit-idempotent')
    const attempt = await startSubjectAssessmentAttempt(env.DB, userId, 'numerical-ability-subject-assessment')
    await answerAttempt(userId, attempt.attempt.publicId, 25)
    const first = await submitSubjectAssessmentAttempt(env.DB, userId, attempt.attempt.publicId)
    const second = await submitSubjectAssessmentAttempt(env.DB, userId, attempt.attempt.publicId)
    expect(second).toEqual(first)
    const stored = await env.DB.prepare(
      `SELECT COUNT(*) AS count FROM subject_assessment_answers
       WHERE attempt_id = (SELECT id FROM subject_assessment_attempts WHERE public_id = ?1)`,
    ).bind(attempt.attempt.publicId).first<{ count: number }>()
    expect(stored?.count).toBe(50)
    const restored = await getSubjectAssessmentAttempt(env.DB, userId, attempt.attempt.publicId)
    expect(restored).toMatchObject({ attempt: { publicId: attempt.attempt.publicId }, resultAvailable: true })
    await expect(saveSubjectAssessmentAnswer(env.DB, userId, {
      attemptPublicId: attempt.attempt.publicId,
      snapshotPublicId: attempt.questions[0].publicId,
      selectedChoicePublicId: attempt.questions[0].choices[0].publicId,
    })).rejects.toMatchObject({ status: 409, code: 'ASSESSMENT_ATTEMPT_SUBMITTED' })
  })

  it('rejects a choice that does not belong to the snapshot', async () => {
    const userId = await createLearner('submit-malformed')
    const attempt = await startSubjectAssessmentAttempt(env.DB, userId, 'numerical-ability-subject-assessment')
    await expect(saveSubjectAssessmentAnswer(env.DB, userId, {
      attemptPublicId: attempt.attempt.publicId,
      snapshotPublicId: attempt.questions[0].publicId,
      selectedChoicePublicId: attempt.questions[1].choices[0].publicId,
    })).rejects.toMatchObject({ status: 400, code: 'CHOICE_NOT_IN_QUESTION' })
  })
})
