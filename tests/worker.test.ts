import { env } from 'cloudflare:workers'
import { describe, expect, it, vi } from 'vitest'

import migration0008Sql from '../migrations/0008_upgrade_percentages_course_content.sql?raw'
import percentageGridSvg from '../public/images/percentage-grid-25.svg?raw'
import { app } from '../src/worker'
import {
  hashPassword,
  verifyPassword,
} from '../src/worker/auth/password'
import { hashSessionToken } from '../src/worker/auth/session'
import { parseLessonBlock } from '../src/worker/schemas/lesson-block.schemas'
import type { Bindings } from '../src/worker/types/bindings'

interface ApiErrorBody {
  success: false
  error: {
    code: string
    message: string
    requestId: string
    details: {
      fieldErrors: Partial<
        Record<
          | 'firstName'
          | 'lastName'
          | 'email'
          | 'password'
          | 'attemptPublicId'
          | 'questionId'
          | 'quizId'
          | 'practiceSetId'
          | 'selectedChoiceId',
          string[]
        >
      >
    } | null
  }
}

interface StoredAuthenticationRow {
  password_hash: string
  token_hash: string
  expires_at: string
  revoked_at: string | null
  role: string
  status: string
}

interface CourseListBody {
  success: true
  data: {
    courses: Array<{
      title: string
      slug: string
      shortDescription: string | null
      level: string | null
      thumbnailKey: string | null
      enrollment: EnrollmentBody | null
    }>
  }
}

interface CourseDetailBody {
  success: true
  data: {
    title: string
    slug: string
    description: string | null
    enrollment: EnrollmentBody | null
    curriculum: Array<{
      title: string
      slug: string
      topics: Array<{
        title: string
        slug: string
        publishedLessonCount: number
      }>
    }>
  }
}

interface DashboardBody {
  success: true
  data: {
    courses: DashboardCourseBody[]
  }
}

interface CourseProgressBody {
  success: true
  data: DashboardCourseBody
}

interface DashboardCourseBody {
  course: {
    title: string
    slug: string
  }
  enrollment: EnrollmentBody
  progressPercentage: number
  completedRequiredLessons: number
  totalRequiredLessons: number
  continueLearning: {
    courseCompleted: boolean
    lesson: {
      publicId: string
      title: string
      slug: string
      lessonType: string
        summary: string | null
        isLocked: boolean
    } | null
  }
}

interface EnrollmentBody {
  status: string
  accessStartsAt: string
  accessExpiresAt: string | null
  hasAccess: boolean
}

interface StudentCurriculumBody {
  success: true
  data: {
    course: {
      title: string
      slug: string
    }
    subjects: Array<{
      title: string
      slug: string
      position: number
      topics: Array<{
        title: string
        slug: string
        position: number
        publishedLessonCount: number
        lessons: Array<{
          publicId: string
          title: string
          slug: string
          lessonType: string
          position: number
          estimatedMinutes: number | null
          isPreview: boolean
          isRequired: boolean
          progressStatus: 'not_started' | 'in_progress' | 'completed'
          completedAt: string | null
          isAccessible: boolean
          isLocked: boolean
          lockReason: string | null
          accessibility: {
            canAccess: boolean
            reason: string
          }
        }>
      }>
    }>
  }
}

interface LessonDetailBody {
  success: true
  data: {
    publicId: string
    title: string
    lessonType: string
    estimatedMinutes: number | null
    blocks: Array<{
      type: string
      position: number
      content: unknown
    }>
    malformedBlockCount: number
    previousLesson: {
      publicId: string
      title: string
      isLocked: boolean
    } | null
    nextLesson: {
      publicId: string
      title: string
      isLocked: boolean
    } | null
    progress: {
      status: 'not_started' | 'in_progress' | 'completed'
      startedAt: string | null
      completedAt: string | null
      lastViewedAt: string | null
      progressPercent: number
    }
    manualCompletionAllowed: boolean
    navigation: {
      subjectPosition: number
      topicPosition: number
      lessonPosition: number
    }
  }
}

interface StoredLessonBlockRow {
  lesson_slug: string
  block_id: number
  block_type: string
  content_json: string
  position: number
}

interface SeededQuizChoiceRow {
  question_id: number
  question_position: number
  prompt: string
  choice_id: number
  choice_text: string
  is_correct: 0 | 1
  choice_position: number
}

interface StoredQuizAttemptAnswerRow {
  is_correct: 0 | 1 | null
  points_awarded: number
  selected_choice_id: number | null
}

interface LessonCompletionBody {
  success: true
  data: {
    completedLesson: {
      publicId: string
      title: string
      progress: {
        status: 'completed'
        completedAt: string | null
      }
    }
    newlyUnlockedNextLesson: {
      publicId: string
      title: string
      isLocked: boolean
    } | null
    topicProgress: {
      topicSlug: string
      completedRequiredLessons: number
      totalRequiredLessons: number
      progressPercentage: number
    }
    courseProgress: DashboardCourseBody
  }
}

interface QuizChoiceBody {
  id: number
  text: string
  position: number
}

interface QuizQuestionBody {
  id: number
  prompt: string
  points: number
  position: number
  selectedChoiceId: number | null
  choices: QuizChoiceBody[]
}

interface QuizSummaryBody {
  success: true
  data: {
    quiz: {
      id: number
      title: string
      passingScore: number
      questionCount: number
      timeLimitMinutes: number | null
      maximumAttempts: number | null
      attemptsRemaining: number | null
    }
    inProgressAttempt: {
      attemptPublicId: string
      status: string
    } | null
    attempts: Array<{
      attemptPublicId: string
      attemptNumber: number
      status: string
      scorePercent: number | null
      passed: boolean | null
    }>
  }
}

interface QuizAttemptBody {
  success: true
  data: {
    attempt: {
      publicId: string
      status: string
      attemptNumber: number
    }
    quiz: {
      id: number
      title: string
      passingScore: number
      questionCount: number
    }
    questions: QuizQuestionBody[]
  }
}

interface QuizAttemptFetchBody {
  success: true
  data:
    | QuizAttemptBody['data']
    | {
        attempt: {
          publicId: string
          status: string
          attemptNumber: number
        }
        resultAvailable: true
      }
}

interface QuizResultBody {
  success: true
  data: {
    quiz: {
      id: number
      title: string
      passingScore: number
    }
    attempt: {
      publicId: string
      status: string
      attemptNumber: number
    }
    totalPoints: number
    earnedPoints: number
    scorePercent: number
    passed: boolean
    questions: Array<{
      id: number
      prompt: string
      position: number
      selectedChoice: QuizChoiceBody | null
      correctChoice: QuizChoiceBody
      isCorrect: boolean
      pointsAwarded: number
      explanation: string | null
      choices: QuizChoiceBody[]
    }>
    newlyUnlockedNextLesson: {
      publicId: string
      title: string
      isLocked: boolean
    } | null
    courseProgress: DashboardCourseBody
  }
}

interface PracticeSummaryBody {
  success: true
  data: {
    practice: {
      id: number
      title: string
      passingScore: number
      questionCount: number
      maximumAttempts: number | null
      attemptsRemaining: number | null
    }
    lessonCompleted: boolean
    inProgressAttempt: {
      attemptPublicId: string
      status: string
    } | null
    attempts: Array<{
      attemptPublicId: string
      attemptNumber: number
      status: string
      scorePercent: number | null
      passed: boolean | null
    }>
  }
}

interface PracticeChoiceBody {
  id: number
  text: string
  position: number
}

interface PracticeQuestionBody {
  id: number
  prompt: string
  points: number
  position: number
  selectedChoiceId: number | null
  choices: PracticeChoiceBody[]
}

interface PracticeAttemptBody {
  success: true
  data: {
    attempt: {
      publicId: string
      status: string
      attemptNumber: number
    }
    practice: {
      id: number
      title: string
      passingScore: number
      questionCount: number
    }
    questions: PracticeQuestionBody[]
    answeredCount: number
    totalCount: number
  }
}

interface PracticeAttemptFetchBody {
  success: true
  data:
    | PracticeAttemptBody['data']
    | {
        attempt: {
          publicId: string
          status: string
          attemptNumber: number
        }
        resultAvailable: true
      }
}

interface PracticeResultBody {
  success: true
  data: {
    practice: {
      id: number
      title: string
      passingScore: number
    }
    attempt: {
      publicId: string
      status: string
      attemptNumber: number
    }
    totalPoints: number
    earnedPoints: number
    scorePercent: number
    passed: boolean
    questions: Array<{
      id: number
      prompt: string
      selectedChoice: PracticeChoiceBody | null
      correctChoice: PracticeChoiceBody
      isCorrect: boolean
      pointsAwarded: number
      explanation: string | null
      choices: PracticeChoiceBody[]
    }>
    newlyUnlockedNextLesson: {
      publicId: string
      title: string
      isLocked: boolean
    } | null
    courseProgress: DashboardCourseBody
  }
}

const validPassword = 'SecurePassword123'

const cseProfessionalLessonSlugs = [
  'introduction-to-percentages',
  'understanding-percentages',
  'fractions-decimals-and-percentages',
  'finding-the-percentage',
  'finding-the-base',
  'finding-the-rate',
  'percentage-increase-and-decrease',
  'discounts-and-markups',
  'worked-examples',
  'guided-practice',
  'percentages-topic-quiz',
] as const

const upgradedPercentagesContentExpectations = [
  {
    slug: 'introduction-to-percentages',
    publicId: 'lesson-introduction-to-percentages',
    minimumBlocks: 8,
    expectedText: 'Twenty-five highlighted squares out of one hundred squares represent 25%.',
  },
  {
    slug: 'understanding-percentages',
    publicId: 'lesson-understanding-percentages',
    minimumBlocks: 10,
    expectedText: 'Percentage points',
  },
  {
    slug: 'fractions-decimals-and-percentages',
    publicId: 'lesson-fractions-decimals-and-percentages',
    minimumBlocks: 12,
    expectedText: '12.5% = 1/8',
  },
  {
    slug: 'finding-the-percentage',
    publicId: 'lesson-finding-the-percentage',
    minimumBlocks: 8,
    expectedText: 'Percentage amount = Rate × Base',
  },
  {
    slug: 'finding-the-base',
    publicId: 'lesson-finding-the-base',
    minimumBlocks: 8,
    expectedText: 'Base = Percentage amount ÷ Rate',
  },
  {
    slug: 'finding-the-rate',
    publicId: 'lesson-finding-the-rate',
    minimumBlocks: 8,
    expectedText: 'Rate = Percentage amount ÷ Base',
  },
  {
    slug: 'percentage-increase-and-decrease',
    publicId: 'lesson-percentage-increase-and-decrease',
    minimumBlocks: 12,
    expectedText: '100 × 1.20 = 120',
  },
  {
    slug: 'discounts-and-markups',
    publicId: 'lesson-discounts-and-markups',
    minimumBlocks: 12,
    expectedText: 'The sale price is ₱900.',
  },
  {
    slug: 'worked-examples',
    publicId: 'lesson-worked-examples',
    minimumBlocks: 9,
    expectedText: 'The selling price is ₱575.',
  },
  {
    slug: 'guided-practice',
    publicId: 'lesson-guided-practice',
    minimumBlocks: 8,
    expectedText: 'Asked for the whole → use Base = Percentage amount ÷ Rate.',
  },
  {
    slug: 'percentages-topic-quiz',
    publicId: 'lesson-percentages-topic-quiz',
    minimumBlocks: 5,
    expectedText: 'Questions are original review questions, not official CSC material.',
  },
] as const

const passwordValidationCases = [
  {
    name: 'missing uppercase character',
    password: 'securepassword123',
    message: 'Password must include an uppercase letter.',
  },
  {
    name: 'missing lowercase character',
    password: 'SECUREPASSWORD123',
    message: 'Password must include a lowercase letter.',
  },
  {
    name: 'missing number',
    password: 'SecurePassword',
    message: 'Password must include a number.',
  },
  {
    name: 'shorter than 12 characters',
    password: 'Short1A',
    message: 'Password must contain at least 12 characters.',
  },
] satisfies ReadonlyArray<{
  name: string
  password: string
  message: string
}>

function createBindings(
  environment: Bindings['ENVIRONMENT'],
): Bindings {
  return {
    DB: env.DB,
    ENVIRONMENT: environment,
  }
}

function jsonRequest(
  body: Record<string, unknown>,
  cookie?: string,
): RequestInit {
  const headers = new Headers({
    'content-type': 'application/json',
  })

  if (cookie !== undefined) {
    headers.set('cookie', cookie)
  }

  return {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  }
}

function getCookieHeader(response: Response): string {
  const setCookie = response.headers.get('set-cookie')
  expect(setCookie).toBeTruthy()

  const cookie = setCookie?.split(';', 1)[0]
  expect(cookie).toMatch(/^cse_session=[A-Za-z0-9_-]+$/u)

  if (cookie === undefined) {
    throw new Error('The authentication cookie was not set.')
  }

  return cookie
}

async function expectRegistrationFieldError(
  body: Record<string, unknown>,
  field: 'firstName' | 'lastName' | 'email' | 'password',
  message: string,
): Promise<ApiErrorBody> {
  const response = await app.request(
    '/api/auth/register',
    jsonRequest(body),
    createBindings('production'),
  )
  const responseBody = await response.json<ApiErrorBody>()

  expect(response.status).toBe(400)
  expect(responseBody).toMatchObject({
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'The request contains invalid fields.',
    },
  })
  expect(responseBody.error.details).not.toBeNull()
  expect(responseBody.error.details?.fieldErrors[field]).toContain(
    message,
  )

  return responseBody
}

async function register(
  email: string,
  environment: Bindings['ENVIRONMENT'] = 'production',
): Promise<{ response: Response; cookie: string }> {
  const response = await app.request(
    '/api/auth/register',
    jsonRequest({
      email,
      password: validPassword,
      firstName: 'Ada',
      lastName: 'Lovelace',
    }),
    createBindings(environment),
  )

  return {
    response,
    cookie: getCookieHeader(response),
  }
}

async function getUserId(email: string): Promise<number> {
  const user = await env.DB.prepare(
    'SELECT id FROM users WHERE email = ?1 LIMIT 1',
  )
    .bind(email)
    .first<{ id: number }>()

  if (user === null) {
    throw new Error(`Test user was not found: ${email}`)
  }

  return user.id
}

async function getCourseId(courseSlug = 'cse-professional'): Promise<number> {
  const course = await env.DB.prepare(
    'SELECT id FROM courses WHERE slug = ?1 LIMIT 1',
  )
    .bind(courseSlug)
    .first<{ id: number }>()

  if (course === null) {
    throw new Error(`Test course was not found: ${courseSlug}`)
  }

  return course.id
}

async function getLessonId(lessonSlug: string): Promise<number> {
  const lesson = await env.DB.prepare(
    `SELECT lessons.id
    FROM lessons
    INNER JOIN topics ON topics.id = lessons.topic_id
    INNER JOIN subjects ON subjects.id = topics.subject_id
    INNER JOIN courses ON courses.id = subjects.course_id
    WHERE courses.slug = 'cse-professional'
      AND lessons.slug = ?1
    LIMIT 1`,
  )
    .bind(lessonSlug)
    .first<{ id: number }>()

  if (lesson === null) {
    throw new Error(`Test lesson was not found: ${lessonSlug}`)
  }

  return lesson.id
}

async function getPercentagesQuizId(): Promise<number> {
  const quiz = await env.DB.prepare(
    `SELECT quizzes.id
    FROM quizzes
    INNER JOIN lessons ON lessons.id = quizzes.lesson_id
    WHERE lessons.slug = 'percentages-topic-quiz'
      AND quizzes.title = 'Percentages Topic Quiz'
    LIMIT 1`,
  )
    .first<{ id: number }>()

  if (quiz === null) {
    throw new Error('Seeded percentages quiz was not found.')
  }

  return quiz.id
}

async function createTestQuiz(
  status: 'draft' | 'published',
  maximumAttempts: number | null = null,
): Promise<number> {
  const quiz = await env.DB.prepare(
    `INSERT INTO quizzes (
      lesson_id,
      topic_id,
      title,
      description,
      quiz_type,
      passing_score,
      maximum_attempts,
      status
    ) VALUES (
      (SELECT lessons.id FROM lessons WHERE lessons.slug = 'percentages-topic-quiz'),
      (SELECT lessons.topic_id FROM lessons WHERE lessons.slug = 'percentages-topic-quiz'),
      ?1,
      'Throwaway quiz used by the Worker test suite.',
      'topic',
      70,
      ?2,
      ?3
    )
    RETURNING id`,
  )
    .bind(`Test Quiz ${crypto.randomUUID()}`, maximumAttempts, status)
    .first<{ id: number }>()

  if (quiz === null) {
    throw new Error('Test quiz could not be created.')
  }

  const question = await env.DB.prepare(
    `INSERT INTO questions (
      quiz_id,
      question_type,
      prompt,
      explanation,
      points,
      position,
      status
    ) VALUES (?1, 'multiple_choice', 'What is 50% of 20?', '50% is one half.', 1, 1, 'active')
    RETURNING id`,
  )
    .bind(quiz.id)
    .first<{ id: number }>()

  if (question === null) {
    throw new Error('Test quiz question could not be created.')
  }

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO question_choices (
        question_id,
        choice_text,
        is_correct,
        position
      ) VALUES (?1, '10', 1, 1)`,
    ).bind(question.id),
    env.DB.prepare(
      `INSERT INTO question_choices (
        question_id,
        choice_text,
        is_correct,
        position
      ) VALUES (?1, '20', 0, 2)`,
    ).bind(question.id),
  ])

  return quiz.id
}

async function getPracticeSetId(lessonSlug: string): Promise<number> {
  const practiceSet = await env.DB.prepare(
    `SELECT practice_sets.id
    FROM practice_sets
    INNER JOIN lessons ON lessons.id = practice_sets.lesson_id
    WHERE lessons.slug = ?1
    LIMIT 1`,
  )
    .bind(lessonSlug)
    .first<{ id: number }>()

  if (practiceSet === null) {
    throw new Error(`Practice set was not found for ${lessonSlug}.`)
  }

  return practiceSet.id
}

async function createTestPracticeSet(
  status: 'draft' | 'published',
  maximumAttempts: number | null = null,
): Promise<number> {
  const topicId = await env.DB.prepare(
    `SELECT topics.id
    FROM topics
    WHERE topics.slug = 'percentages'
    LIMIT 1`,
  )
    .first<{ id: number }>()
  const unique = crypto.randomUUID()
  const position = Math.floor(Date.now() % 1_000_000)

  if (topicId === null) {
    throw new Error('Percentages topic was not found.')
  }

  const maxPosition = await env.DB.prepare(
    'SELECT COALESCE(MAX(position), 0) AS max_position FROM lessons WHERE topic_id = ?1',
  )
    .bind(topicId.id)
    .first<{ max_position: number }>()
  const lesson = await env.DB.prepare(
    `INSERT INTO lessons (
      topic_id,
      public_id,
      title,
      slug,
      lesson_type,
      position,
      is_preview,
      requires_previous,
      status
    ) VALUES (?1, ?2, 'Test Practice Lesson', ?3, 'practice', ?4, 1, 0, 'published')
    RETURNING id`,
  )
    .bind(
      topicId.id,
      `lesson-test-practice-${unique}`,
      `test-practice-${unique}`,
      (maxPosition?.max_position ?? position) + 1,
    )
    .first<{ id: number }>()

  if (lesson === null) {
    throw new Error('Test practice lesson could not be created.')
  }

  const practiceSet = await env.DB.prepare(
    `INSERT INTO practice_sets (
      lesson_id,
      title,
      instructions,
      passing_score,
      question_count,
      maximum_attempts,
      show_explanations,
      status
    ) VALUES (?1, 'Test Practice', 'Throwaway practice used by tests.', 60, 1, ?2, 1, ?3)
    RETURNING id`,
  )
    .bind(lesson.id, maximumAttempts, status)
    .first<{ id: number }>()

  if (practiceSet === null) {
    throw new Error('Test practice set could not be created.')
  }

  const question = await env.DB.prepare(
    `INSERT INTO practice_questions (
      practice_set_id,
      prompt,
      explanation,
      points,
      position,
      status
    ) VALUES (?1, 'What is 10% of 90?', '10% of 90 is 9.', 1, 1, 'active')
    RETURNING id`,
  )
    .bind(practiceSet.id)
    .first<{ id: number }>()

  if (question === null) {
    throw new Error('Test practice question could not be created.')
  }

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO practice_question_choices (
        question_id,
        choice_text,
        is_correct,
        position
      ) VALUES (?1, '9', 1, 1)`,
    ).bind(question.id),
    env.DB.prepare(
      `INSERT INTO practice_question_choices (
        question_id,
        choice_text,
        is_correct,
        position
      ) VALUES (?1, '19', 0, 2)`,
    ).bind(question.id),
  ])

  return practiceSet.id
}

async function enrollUser(
  email: string,
  options: {
    courseSlug?: string
    status?: 'active' | 'expired' | 'revoked' | 'completed'
    accessStartsAt?: string
    accessExpiresAt?: string | null
  } = {},
): Promise<void> {
  const [userId, courseId] = await Promise.all([
    getUserId(email),
    getCourseId(options.courseSlug),
  ])

  await env.DB.prepare(
    `INSERT INTO course_enrollments (
      user_id,
      course_id,
      enrollment_status,
      access_starts_at,
      access_expires_at,
      enrollment_source
    ) VALUES (?1, ?2, ?3, ?4, ?5, 'admin')
    ON CONFLICT(user_id, course_id) DO UPDATE SET
      enrollment_status = excluded.enrollment_status,
      access_starts_at = excluded.access_starts_at,
      access_expires_at = excluded.access_expires_at`,
  )
    .bind(
      userId,
      courseId,
      options.status ?? 'active',
      options.accessStartsAt ?? '2000-01-01T00:00:00.000Z',
      options.accessExpiresAt ?? null,
    )
    .run()
}

async function prepareUnlockedQuizUser(
  email: string,
  enrollmentOptions: Parameters<typeof enrollUser>[1] = {},
): Promise<{ cookie: string; quizId: number }> {
  const { cookie } = await register(email)
  await enrollUser(email, enrollmentOptions)
  await completeLessonsBefore(email, 'percentages-topic-quiz')

  return {
    cookie,
    quizId: await getPercentagesQuizId(),
  }
}

async function startQuiz(
  cookie: string,
  quizId: number,
): Promise<{ response: Response; body: QuizAttemptBody }> {
  const response = await app.request(
    `/api/student/quizzes/${quizId}/attempts`,
    { method: 'POST', headers: { cookie } },
    createBindings('production'),
  )
  const body = await response.json<QuizAttemptBody>()

  return { response, body }
}

async function saveQuizAttemptAnswer(input: {
  cookie: string
  attemptPublicId: string
  questionId: number
  selectedChoiceId: number
}): Promise<Response> {
  return app.request(
    `/api/student/quiz-attempts/${input.attemptPublicId}/answers/${input.questionId}`,
    {
      method: 'PUT',
      headers: {
        cookie: input.cookie,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ selectedChoiceId: input.selectedChoiceId }),
    },
    createBindings('production'),
  )
}

async function submitQuizAttemptForTest(
  cookie: string,
  attemptPublicId: string,
): Promise<{ response: Response; body: QuizResultBody }> {
  const response = await app.request(
    `/api/student/quiz-attempts/${attemptPublicId}/submit`,
    { method: 'POST', headers: { cookie } },
    createBindings('production'),
  )
  const body = await response.json<QuizResultBody>()

  return { response, body }
}

async function getSeededQuizChoices(): Promise<SeededQuizChoiceRow[]> {
  const rows = await env.DB.prepare(
    `SELECT
      questions.id AS question_id,
      questions.position AS question_position,
      questions.prompt,
      question_choices.id AS choice_id,
      question_choices.choice_text,
      question_choices.is_correct,
      question_choices.position AS choice_position
    FROM questions
    INNER JOIN quizzes ON quizzes.id = questions.quiz_id
    INNER JOIN lessons ON lessons.id = quizzes.lesson_id
    INNER JOIN topics ON topics.id = lessons.topic_id
    INNER JOIN subjects ON subjects.id = topics.subject_id
    INNER JOIN courses ON courses.id = subjects.course_id
    INNER JOIN question_choices ON question_choices.question_id = questions.id
    WHERE courses.slug = 'cse-professional'
      AND subjects.slug = 'numerical-ability'
      AND topics.slug = 'percentages'
      AND lessons.slug = 'percentages-topic-quiz'
      AND quizzes.title = 'Percentages Topic Quiz'
      AND questions.status = 'active'
    ORDER BY questions.position, question_choices.position, question_choices.id`,
  ).all<SeededQuizChoiceRow>()

  return rows.results
}

async function prepareUnlockedPracticeUser(
  email: string,
  lessonSlug: (typeof cseProfessionalLessonSlugs)[number] = 'finding-the-percentage',
  enrollmentOptions: Parameters<typeof enrollUser>[1] = {},
): Promise<{ cookie: string; practiceSetId: number }> {
  const { cookie } = await register(email)
  await enrollUser(email, enrollmentOptions)
  await completeLessonsBefore(email, lessonSlug)

  return {
    cookie,
    practiceSetId: await getPracticeSetId(lessonSlug),
  }
}

async function startPractice(
  cookie: string,
  practiceSetId: number,
): Promise<{ response: Response; body: PracticeAttemptBody }> {
  const response = await app.request(
    `/api/student/practice-sets/${practiceSetId}/attempts`,
    { method: 'POST', headers: { cookie } },
    createBindings('production'),
  )
  const body = await response.json<PracticeAttemptBody>()

  return { response, body }
}

async function setLessonProgress(
  email: string,
  lessonSlug: string,
  status: 'in_progress' | 'completed',
): Promise<void> {
  const [userId, lessonId] = await Promise.all([
    getUserId(email),
    getLessonId(lessonSlug),
  ])
  const now = new Date().toISOString()

  await env.DB.prepare(
    `INSERT INTO lesson_progress (
      user_id,
      lesson_id,
      status,
      started_at,
      completed_at,
      last_viewed_at,
      progress_percent
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?4, ?6)
    ON CONFLICT(user_id, lesson_id) DO UPDATE SET
      status = excluded.status,
      started_at = COALESCE(lesson_progress.started_at, excluded.started_at),
      completed_at = excluded.completed_at,
      last_viewed_at = excluded.last_viewed_at,
      progress_percent = excluded.progress_percent`,
  )
    .bind(
      userId,
      lessonId,
      status,
      now,
      status === 'completed' ? now : null,
      status === 'completed' ? 100 : 40,
    )
    .run()
}

async function completeLessonsBefore(
  email: string,
  lessonSlug: (typeof cseProfessionalLessonSlugs)[number],
): Promise<void> {
  const targetIndex = cseProfessionalLessonSlugs.indexOf(lessonSlug)

  if (targetIndex < 0) {
    throw new Error(`Unknown lesson slug: ${lessonSlug}`)
  }

  await Promise.all(
    cseProfessionalLessonSlugs
      .slice(0, targetIndex)
      .map((slug) => setLessonProgress(email, slug, 'completed')),
  )
}

async function getLessonProgress(
  email: string,
  lessonSlug: string,
): Promise<{
  status: 'in_progress' | 'completed'
  started_at: string
  completed_at: string | null
  progress_percent: number
} | null> {
  const [userId, lessonId] = await Promise.all([
    getUserId(email),
    getLessonId(lessonSlug),
  ])

  return env.DB.prepare(
    `SELECT status, started_at, completed_at, progress_percent
    FROM lesson_progress
    WHERE user_id = ?1
      AND lesson_id = ?2
    LIMIT 1`,
  )
    .bind(userId, lessonId)
    .first<{
      status: 'in_progress' | 'completed'
      started_at: string
      completed_at: string | null
      progress_percent: number
    }>()
}

async function completeAllPublishedRequiredLessons(
  email: string,
): Promise<void> {
  const userId = await getUserId(email)
  const now = new Date().toISOString()

  await env.DB.prepare(
    `INSERT INTO lesson_progress (
      user_id,
      lesson_id,
      status,
      started_at,
      completed_at,
      last_viewed_at,
      progress_percent
    )
    SELECT ?1, lessons.id, 'completed', ?2, ?2, ?2, 100
    FROM lessons
    INNER JOIN topics ON topics.id = lessons.topic_id
    INNER JOIN subjects ON subjects.id = topics.subject_id
    INNER JOIN courses ON courses.id = subjects.course_id
    WHERE courses.slug = 'cse-professional'
      AND subjects.status = 'published'
      AND topics.status = 'published'
      AND lessons.status = 'published'
      AND lessons.is_preview = 0
    ON CONFLICT(user_id, lesson_id) DO UPDATE SET
      status = 'completed',
      completed_at = COALESCE(lesson_progress.completed_at, excluded.completed_at),
      last_viewed_at = excluded.last_viewed_at,
      progress_percent = 100`,
  )
    .bind(userId, now)
    .run()
}

async function completeAllPublishedRequiredLessonsExcept(
  email: string,
  excludedLessonSlug: string,
): Promise<void> {
  const userId = await getUserId(email)
  const now = new Date().toISOString()

  await env.DB.prepare(
    `INSERT INTO lesson_progress (
      user_id,
      lesson_id,
      status,
      started_at,
      completed_at,
      last_viewed_at,
      progress_percent
    )
    SELECT ?1, lessons.id, 'completed', ?2, ?2, ?2, 100
    FROM lessons
    INNER JOIN topics ON topics.id = lessons.topic_id
    INNER JOIN subjects ON subjects.id = topics.subject_id
    INNER JOIN courses ON courses.id = subjects.course_id
    WHERE courses.slug = 'cse-professional'
      AND subjects.status = 'published'
      AND topics.status = 'published'
      AND lessons.status = 'published'
      AND lessons.is_preview = 0
      AND lessons.slug <> ?3
    ON CONFLICT(user_id, lesson_id) DO UPDATE SET
      status = 'completed',
      completed_at = COALESCE(lesson_progress.completed_at, excluded.completed_at),
      last_viewed_at = excluded.last_viewed_at,
      progress_percent = 100`,
  )
    .bind(userId, now, excludedLessonSlug)
    .run()
}

describe('Worker foundation', () => {
  it('returns the standard health response', async () => {
    const response = await app.request(
      '/api/health',
      undefined,
      createBindings('production'),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('x-request-id')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        status: 'ok',
      },
    })
  })

  it('keeps the database check available only in development', async () => {
    const productionResponse = await app.request(
      '/api/dev/database-check',
      undefined,
      createBindings('production'),
    )
    const developmentResponse = await app.request(
      '/api/dev/database-check',
      undefined,
      createBindings('development'),
    )

    expect(productionResponse.status).toBe(404)
    expect(developmentResponse.status).toBe(200)
    await expect(developmentResponse.json()).resolves.toEqual({
      success: true,
      data: {
        status: 'ok',
        database: 'connected',
      },
    })
  })

  it('does not expose internal errors', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    const brokenBindings: Bindings = {
      DB: null as unknown as D1Database,
      ENVIRONMENT: 'development',
    }

    const response = await app.request(
      '/api/dev/database-check',
      undefined,
      brokenBindings,
    )
    const responseText = await response.text()

    expect(response.status).toBe(500)
    expect(responseText).not.toContain('stack')
    expect(responseText).not.toContain('database.service')
    expect(JSON.parse(responseText)).toMatchObject({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred.',
        requestId: response.headers.get('x-request-id'),
        details: null,
      },
    })
    expect(consoleError).toHaveBeenCalledOnce()
  })
})

describe('Course catalog and student learning APIs', () => {
  it('hides draft courses from the public catalog', async () => {
    const draftSlug = `draft-${crypto.randomUUID()}`

    await env.DB.prepare(
      `INSERT INTO courses (
        public_id,
        title,
        slug,
        short_description,
        status
      ) VALUES (?1, 'Draft Course', ?2, 'Hidden draft', 'draft')`,
    )
      .bind(`course-${draftSlug}`, draftSlug)
      .run()

    const response = await app.request(
      '/api/courses',
      undefined,
      createBindings('production'),
    )
    const body = await response.json<CourseListBody>()

    expect(response.status).toBe(200)
    expect(body.data.courses.some((course) => course.slug === draftSlug)).toBe(
      false,
    )
  })

  it('returns the published CSE Professional course and safe curriculum summary', async () => {
    const response = await app.request(
      '/api/courses/cse-professional',
      undefined,
      createBindings('production'),
    )
    const body = await response.json<CourseDetailBody>()

    expect(response.status).toBe(200)
    expect(body.data).toMatchObject({
      title: 'CSE Professional',
      slug: 'cse-professional',
      enrollment: null,
      curriculum: [
        {
          title: 'Numerical Ability',
          slug: 'numerical-ability',
          topics: [
            {
              title: 'Percentages',
              slug: 'percentages',
              publishedLessonCount: 11,
            },
          ],
        },
      ],
    })
    expect(JSON.stringify(body)).not.toContain('content_json')
  })

  it('accepts active enrollments and returns the first lesson for Continue Learning', async () => {
    const email = 'active-enrollment@example.com'
    const { cookie } = await register(email)
    await enrollUser(email)

    const response = await app.request(
      '/api/student/courses/cse-professional/progress',
      { headers: { cookie } },
      createBindings('production'),
    )
    const body = await response.json<CourseProgressBody>()

    expect(response.status).toBe(200)
    expect(body.data.enrollment).toMatchObject({
      status: 'active',
      hasAccess: true,
    })
    expect(body.data.progressPercentage).toBe(0)
    expect(body.data.totalRequiredLessons).toBe(11)
    expect(body.data.continueLearning.lesson?.slug).toBe(
      'introduction-to-percentages',
    )
  })

  it.each([
    {
      name: 'expired',
      status: 'active',
      accessStartsAt: '2000-01-01T00:00:00.000Z',
      accessExpiresAt: '2001-01-01T00:00:00.000Z',
    },
    {
      name: 'revoked',
      status: 'revoked',
      accessStartsAt: '2000-01-01T00:00:00.000Z',
      accessExpiresAt: null,
    },
    {
      name: 'future access start',
      status: 'active',
      accessStartsAt: '2999-01-01T00:00:00.000Z',
      accessExpiresAt: null,
    },
  ] satisfies ReadonlyArray<{
    name: string
    status: 'active' | 'revoked'
    accessStartsAt: string
    accessExpiresAt: string | null
  }>)('denies progress for $name enrollments', async (enrollment) => {
    const email = `${enrollment.name.replaceAll(' ', '-')}@example.com`
    const { cookie } = await register(email)
    await enrollUser(email, enrollment)

    const response = await app.request(
      '/api/student/courses/cse-professional/progress',
      { headers: { cookie } },
      createBindings('production'),
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: 'COURSE_ACCESS_DENIED',
      },
    })
  })

  it('does not allow a student to read another student enrollment', async () => {
    const enrolledEmail = 'owner-enrollment@example.com'
    const otherEmail = 'other-student@example.com'
    await register(enrolledEmail)
    const { cookie: otherCookie } = await register(otherEmail)
    await enrollUser(enrolledEmail)

    const response = await app.request(
      '/api/student/courses/cse-professional/progress',
      { headers: { cookie: otherCookie } },
      createBindings('production'),
    )

    expect(response.status).toBe(403)
  })

  it('calculates progress from completed required published lessons', async () => {
    const email = 'progress-calculation@example.com'
    const { cookie } = await register(email)
    await enrollUser(email)
    await setLessonProgress(email, 'introduction-to-percentages', 'completed')
    await setLessonProgress(email, 'understanding-percentages', 'completed')

    const response = await app.request(
      '/api/student/courses/cse-professional/progress',
      { headers: { cookie } },
      createBindings('production'),
    )
    const body = await response.json<CourseProgressBody>()

    expect(response.status).toBe(200)
    expect(body.data.completedRequiredLessons).toBe(2)
    expect(body.data.totalRequiredLessons).toBe(11)
    expect(body.data.progressPercentage).toBe(18)
    expect(body.data.continueLearning.lesson?.slug).toBe(
      'fractions-decimals-and-percentages',
    )
  })

  it('prioritizes an in-progress lesson for Continue Learning', async () => {
    const email = 'in-progress-priority@example.com'
    const { cookie } = await register(email)
    await enrollUser(email)
    await completeLessonsBefore(email, 'finding-the-rate')
    await setLessonProgress(email, 'finding-the-rate', 'in_progress')

    const response = await app.request(
      '/api/student/courses/cse-professional/progress',
      { headers: { cookie } },
      createBindings('production'),
    )
    const body = await response.json<CourseProgressBody>()

    expect(response.status).toBe(200)
    expect(body.data.continueLearning.lesson?.slug).toBe('finding-the-rate')
  })

  it('returns completed course state when every required lesson is complete', async () => {
    const email = 'completed-course@example.com'
    const { cookie } = await register(email)

    await enrollUser(email)
    await Promise.all(
      cseProfessionalLessonSlugs.map((lessonSlug) =>
        setLessonProgress(email, lessonSlug, 'completed'),
      ),
    )

    const response = await app.request(
      '/api/student/courses/cse-professional/progress',
      { headers: { cookie } },
      createBindings('production'),
    )
    const body = await response.json<CourseProgressBody>()

    expect(response.status).toBe(200)
    expect(body.data.progressPercentage).toBe(100)
    expect(body.data.continueLearning).toEqual({
      courseCompleted: true,
      lesson: null,
    })
  })

  it('returns an empty dashboard state for students with no enrollments', async () => {
    const { cookie } = await register('empty-dashboard@example.com')

    const response = await app.request(
      '/api/student/dashboard',
      { headers: { cookie } },
      createBindings('production'),
    )
    const body = await response.json<DashboardBody>()

    expect(response.status).toBe(200)
    expect(body.data.courses).toEqual([])
  })

  it('returns protected published curriculum in position order', async () => {
    const email = 'curriculum-order@example.com'
    const { cookie } = await register(email)
    await enrollUser(email)

    const response = await app.request(
      '/api/student/courses/cse-professional/curriculum',
      { headers: { cookie } },
      createBindings('production'),
    )
    const body = await response.json<StudentCurriculumBody>()
    const lessons = body.data.subjects[0]?.topics[0]?.lessons

    expect(response.status).toBe(200)
    expect(body.data.course.slug).toBe('cse-professional')
    expect(body.data.subjects.map((subject) => subject.title)).toEqual([
      'Numerical Ability',
    ])
    expect(lessons?.map((lesson) => lesson.title)).toEqual([
      'Introduction to Percentages',
      'Understanding Percentages',
      'Fractions, Decimals and Percentages',
      'Finding the Percentage',
      'Finding the Base',
      'Finding the Rate',
      'Percentage Increase and Decrease',
      'Discounts and Markups',
      'Worked Examples',
      'Guided Practice',
      'Percentages Topic Quiz',
    ])
    expect(lessons?.[0]?.isAccessible).toBe(true)
    expect(lessons?.[0]?.isLocked).toBe(false)
    expect(lessons?.slice(1).every((lesson) => lesson.isLocked)).toBe(
      true,
    )
    expect(JSON.stringify(body)).not.toContain('content_json')
  })

  it('hides draft subjects, topics, and lessons from protected curriculum', async () => {
    const email = 'hidden-drafts@example.com'
    const { cookie } = await register(email)
    const courseId = await getCourseId()
    const subjectId = await env.DB.prepare(
      `INSERT INTO subjects (
        course_id,
        title,
        slug,
        position,
        status
      ) VALUES (?1, 'Draft Subject', ?2, 80, 'draft')
      RETURNING id`,
    )
      .bind(courseId, `draft-subject-${crypto.randomUUID()}`)
      .first<{ id: number }>()
    const publishedSubjectId = await env.DB.prepare(
      `SELECT subjects.id
      FROM subjects
      WHERE subjects.course_id = ?1
        AND subjects.slug = 'numerical-ability'
      LIMIT 1`,
    )
      .bind(courseId)
      .first<{ id: number }>()
    const topicId = await env.DB.prepare(
      `INSERT INTO topics (
        subject_id,
        title,
        slug,
        position,
        status
      ) VALUES (?1, 'Draft Topic', ?2, 80, 'draft')
      RETURNING id`,
    )
      .bind(publishedSubjectId?.id, `draft-topic-${crypto.randomUUID()}`)
      .first<{ id: number }>()

    await env.DB.prepare(
      `INSERT INTO topics (
        subject_id,
        title,
        slug,
        position,
        status
      ) VALUES (?1, 'Draft Subject Topic', ?2, 1, 'published')`,
    )
      .bind(subjectId?.id, `draft-subject-topic-${crypto.randomUUID()}`)
      .run()
    await env.DB.prepare(
      `INSERT INTO lessons (
        topic_id,
        public_id,
        title,
        slug,
        position,
        status
      ) VALUES (?1, ?2, 'Draft Topic Lesson', ?3, 1, 'published')`,
    )
      .bind(
        topicId?.id,
        `lesson-draft-topic-${crypto.randomUUID()}`,
        `draft-topic-lesson-${crypto.randomUUID()}`,
      )
      .run()
    await env.DB.prepare(
      `INSERT INTO lessons (
        topic_id,
        public_id,
        title,
        slug,
        position,
        status
      ) VALUES (
        (SELECT topics.id FROM topics WHERE topics.slug = 'percentages'),
        ?1,
        'Draft Percentages Lesson',
        ?2,
        80,
        'draft'
      )`,
    )
      .bind(
        `lesson-draft-${crypto.randomUUID()}`,
        `draft-percentages-lesson-${crypto.randomUUID()}`,
      )
      .run()
    await enrollUser(email)

    const response = await app.request(
      '/api/student/courses/cse-professional/curriculum',
      { headers: { cookie } },
      createBindings('production'),
    )
    const text = await response.text()

    expect(response.status).toBe(200)
    expect(text).not.toContain('Draft Subject')
    expect(text).not.toContain('Draft Topic')
    expect(text).not.toContain('Draft Percentages Lesson')
  })

  it('seeds polished Percentages lesson blocks with deterministic positions', async () => {
    const rows = await env.DB.prepare(
      `SELECT
        lessons.slug AS lesson_slug,
        lesson_blocks.id AS block_id,
        lesson_blocks.block_type,
        lesson_blocks.content_json,
        lesson_blocks.position
      FROM lesson_blocks
      INNER JOIN lessons ON lessons.id = lesson_blocks.lesson_id
      INNER JOIN topics ON topics.id = lessons.topic_id
      INNER JOIN subjects ON subjects.id = topics.subject_id
      INNER JOIN courses ON courses.id = subjects.course_id
      WHERE courses.slug = 'cse-professional'
        AND subjects.slug = 'numerical-ability'
        AND topics.slug = 'percentages'
        AND lessons.slug IN (${cseProfessionalLessonSlugs.map(() => '?').join(', ')})
      ORDER BY lessons.position ASC, lesson_blocks.position ASC`,
    )
      .bind(...cseProfessionalLessonSlugs)
      .all<StoredLessonBlockRow>()

    expect(rows.success).toBe(true)

    for (const expectation of upgradedPercentagesContentExpectations) {
      const lessonRows =
        rows.results?.filter((row) => row.lesson_slug === expectation.slug) ??
        []
      const positions = lessonRows.map((row) => row.position)

      expect(lessonRows.length).toBeGreaterThanOrEqual(
        expectation.minimumBlocks,
      )
      expect(positions).toEqual(
        Array.from({ length: lessonRows.length }, (_, index) => index + 1),
      )
      expect(new Set(positions).size).toBe(positions.length)
      expect(
        lessonRows.every((row) => {
          const parsed = parseLessonBlock({
            id: row.block_id,
            blockType: row.block_type,
            contentJson: row.content_json,
            position: row.position,
          })

          return !parsed.malformed && parsed.block !== null
        }),
      ).toBe(true)
      expect(lessonRows.map((row) => row.content_json).join(' ')).toContain(
        expectation.expectedText,
      )
    }
  })

  it('keeps the content migration scoped away from user progress and attempts', () => {
    expect(migration0008Sql).toContain('DELETE FROM lesson_blocks')
    expect(migration0008Sql).toContain('INSERT INTO lesson_blocks')
    expect(migration0008Sql).not.toMatch(/\blesson_progress\b/iu)
    expect(migration0008Sql).not.toMatch(/\bquiz_attempts?\b/iu)
    expect(migration0008Sql).not.toMatch(/\bpractice_attempts?\b/iu)
    expect(migration0008Sql).not.toMatch(/\bcourse_enrollments\b/iu)
  })

  it('includes the accessible twenty-five percent SVG asset source', () => {
    const highlightedCells = percentageGridSvg.match(/class="highlight"/gu)

    expect(percentageGridSvg).toContain('<svg')
    expect(percentageGridSvg).toContain('viewBox="0 0 120 120"')
    expect(percentageGridSvg).toContain(
      'exactly twenty-five highlighted squares',
    )
    expect(highlightedCells).toHaveLength(25)
    expect(percentageGridSvg).not.toMatch(/<script\b/iu)
    expect(percentageGridSvg).not.toMatch(
      /\b(?:href|src|xlink:href)=["']https?:\/\//iu,
    )
  })

  it('returns upgraded lesson detail blocks in order through the API', async () => {
    const email = 'content-api-order@example.com'
    const { cookie } = await register(email)

    await enrollUser(email)

    for (const expectation of upgradedPercentagesContentExpectations) {
      await completeLessonsBefore(email, expectation.slug)

      const response = await app.request(
        `/api/student/lessons/${expectation.publicId}`,
        { headers: { cookie } },
        createBindings('production'),
      )
      const body = await response.json<LessonDetailBody>()

      expect(response.status).toBe(200)
      expect(body.data.blocks.length).toBeGreaterThanOrEqual(
        expectation.minimumBlocks,
      )
      expect(body.data.blocks.map((block) => block.position)).toEqual(
        Array.from(
          { length: body.data.blocks.length },
          (_, index) => index + 1,
        ),
      )
      expect(body.data.malformedBlockCount).toBe(0)
      expect(JSON.stringify(body.data.blocks)).toContain(
        expectation.expectedText,
      )
      expect(JSON.stringify(body)).not.toContain('content_json')
    }
  })

  it('keeps practice and quiz lesson activity APIs available after content blocks', async () => {
    const { cookie: practiceCookie, practiceSetId } =
      await prepareUnlockedPracticeUser(
        'content-practice-api@example.com',
        'finding-the-percentage',
      )
    const { cookie: quizCookie, quizId } = await prepareUnlockedQuizUser(
      'content-quiz-api@example.com',
    )

    const practiceLessonResponse = await app.request(
      '/api/student/lessons/lesson-finding-the-percentage',
      { headers: { cookie: practiceCookie } },
      createBindings('production'),
    )
    const practiceSummaryResponse = await app.request(
      '/api/student/lessons/lesson-finding-the-percentage/practice',
      { headers: { cookie: practiceCookie } },
      createBindings('production'),
    )
    const quizLessonResponse = await app.request(
      '/api/student/lessons/lesson-percentages-topic-quiz',
      { headers: { cookie: quizCookie } },
      createBindings('production'),
    )
    const quizSummaryResponse = await app.request(
      '/api/student/lessons/lesson-percentages-topic-quiz/quiz',
      { headers: { cookie: quizCookie } },
      createBindings('production'),
    )
    const practiceLesson = await practiceLessonResponse.json<LessonDetailBody>()
    const quizLesson = await quizLessonResponse.json<LessonDetailBody>()

    expect(practiceLessonResponse.status).toBe(200)
    expect(practiceLesson.data.lessonType).toBe('practice')
    expect(practiceLesson.data.manualCompletionAllowed).toBe(false)
    expect(practiceLesson.data.blocks.length).toBeGreaterThan(0)
    expect(practiceSummaryResponse.status).toBe(200)
    expect(practiceSetId).toBeGreaterThan(0)
    expect(quizLessonResponse.status).toBe(200)
    expect(quizLesson.data.lessonType).toBe('quiz')
    expect(quizLesson.data.manualCompletionAllowed).toBe(false)
    expect(quizLesson.data.blocks.length).toBeGreaterThan(0)
    expect(quizSummaryResponse.status).toBe(200)
    expect(quizId).toBeGreaterThan(0)
  })

  it('allows an active enrolled student to access a lesson with ordered blocks', async () => {
    const email = 'lesson-reader-active@example.com'
    const { cookie } = await register(email)
    await enrollUser(email)

    const response = await app.request(
      '/api/student/lessons/lesson-introduction-to-percentages',
      { headers: { cookie } },
      createBindings('production'),
    )
    const body = await response.json<LessonDetailBody>()

    expect(response.status).toBe(200)
    expect(body.data.title).toBe('Introduction to Percentages')
    expect(body.data.progress.status).toBe('in_progress')
    expect(body.data.progress.startedAt).not.toBeNull()
    expect(body.data.manualCompletionAllowed).toBe(true)
    expect(body.data.blocks.map((block) => block.type)).toEqual([
      'heading',
      'paragraph',
      'callout',
      'formula',
      'image',
      'heading',
      'paragraph',
      'example',
      'callout',
      'summary',
      'paragraph',
    ])
    expect(body.data.blocks.map((block) => block.position)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
    ])
    expect(JSON.stringify(body.data.blocks)).toContain(
      '/images/percentage-grid-25.svg',
    )
    expect(JSON.stringify(body)).not.toContain('content_json')
  })

  it.each([
    {
      name: 'unenrolled',
      setup: () => Promise.resolve(),
    },
    {
      name: 'expired',
      setup: (email: string) =>
        enrollUser(email, {
          accessExpiresAt: '2001-01-01T00:00:00.000Z',
        }),
    },
    {
      name: 'revoked',
      setup: (email: string) =>
        enrollUser(email, {
          status: 'revoked',
        }),
    },
    {
      name: 'future',
      setup: (email: string) =>
        enrollUser(email, {
          accessStartsAt: '2999-01-01T00:00:00.000Z',
        }),
    },
  ] satisfies ReadonlyArray<{
    name: string
    setup: (email: string) => Promise<void>
  }>)('denies lesson access for $name enrollment state', async ({ name, setup }) => {
    const email = `lesson-denied-${name}@example.com`
    const { cookie } = await register(email)
    await setup(email)

    const response = await app.request(
      '/api/student/lessons/lesson-introduction-to-percentages',
      { headers: { cookie } },
      createBindings('production'),
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code:
          name === 'unenrolled'
            ? 'ENROLLMENT_REQUIRED'
            : 'COURSE_ACCESS_EXPIRED',
      },
    })
  })

  it('returns the proper error for a missing lesson', async () => {
    const email = 'missing-lesson@example.com'
    const { cookie } = await register(email)
    await enrollUser(email)

    const response = await app.request(
      '/api/student/lessons/lesson-does-not-exist',
      { headers: { cookie } },
      createBindings('production'),
    )

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: 'LESSON_NOT_FOUND',
      },
    })
  })

  it('returns no previous lesson for the first lesson and no next lesson for the last base lesson', async () => {
    const email = 'lesson-edges@example.com'
    const { cookie } = await register(email)
    await enrollUser(email)
    await completeLessonsBefore(email, 'percentages-topic-quiz')

    const firstResponse = await app.request(
      '/api/student/lessons/lesson-introduction-to-percentages',
      { headers: { cookie } },
      createBindings('production'),
    )
    const lastResponse = await app.request(
      '/api/student/lessons/lesson-percentages-topic-quiz',
      { headers: { cookie } },
      createBindings('production'),
    )
    const firstBody = await firstResponse.json<LessonDetailBody>()
    const lastBody = await lastResponse.json<LessonDetailBody>()

    expect(firstResponse.status).toBe(200)
    expect(lastResponse.status).toBe(200)
    expect(firstBody.data.previousLesson).toBeNull()
    expect(firstBody.data.nextLesson?.publicId).toBe(
      'lesson-understanding-percentages',
    )
    expect(lastBody.data.previousLesson?.publicId).toBe(
      'lesson-guided-practice',
    )
    expect(lastBody.data.nextLesson).toBeNull()
  })

  it('selects previous and next lessons across topic boundaries by position', async () => {
    const email = 'topic-boundary@example.com'
    const { cookie } = await register(email)
    const subjectId = await env.DB.prepare(
      `SELECT subjects.id
      FROM subjects
      INNER JOIN courses ON courses.id = subjects.course_id
      WHERE courses.slug = 'cse-professional'
        AND subjects.slug = 'numerical-ability'
      LIMIT 1`,
    )
      .first<{ id: number }>()
    const topicSlug = `ratios-${crypto.randomUUID()}`
    const lessonPublicId = `lesson-ratio-basics-${crypto.randomUUID()}`

    await env.DB.prepare(
      `INSERT INTO topics (
        subject_id,
        title,
        slug,
        position,
        status
      ) VALUES (?1, 'Ratios', ?2, 2, 'published')`,
    )
      .bind(subjectId?.id, topicSlug)
      .run()
    await env.DB.prepare(
      `INSERT INTO lessons (
        topic_id,
        public_id,
        title,
        slug,
        lesson_type,
        summary,
        estimated_minutes,
        position,
        status
      ) VALUES (
        (SELECT topics.id FROM topics WHERE topics.slug = ?1),
        ?2,
        'Ratio Basics',
        ?3,
        'reading',
        'Placeholder ratio lesson.',
        9,
        1,
        'published'
      )`,
    )
      .bind(topicSlug, lessonPublicId, `ratio-basics-${crypto.randomUUID()}`)
      .run()
    await enrollUser(email)
    await Promise.all(
      cseProfessionalLessonSlugs.map((lessonSlug) =>
        setLessonProgress(email, lessonSlug, 'completed'),
      ),
    )

    const response = await app.request(
      `/api/student/lessons/${lessonPublicId}`,
      { headers: { cookie } },
      createBindings('production'),
    )
    const body = await response.json<LessonDetailBody>()

    expect(response.status).toBe(200)
    expect(body.data.previousLesson?.publicId).toBe(
      'lesson-percentages-topic-quiz',
    )
    expect(body.data.nextLesson).toBeNull()
    expect(body.data.navigation.topicPosition).toBe(2)
    expect(body.data.navigation.lessonPosition).toBe(1)
  })

  it('safely skips malformed lesson block JSON and validates block-specific content', async () => {
    const email = 'malformed-block@example.com'
    const { cookie } = await register(email)
    await enrollUser(email)

    await env.DB.prepare(
      `INSERT INTO lesson_blocks (
        lesson_id,
        block_type,
        content_json,
        position
      ) VALUES (
        (SELECT id FROM lessons WHERE public_id = 'lesson-introduction-to-percentages'),
        'heading',
        '{"level":9,"text":"Invalid heading"}',
        99
      )`,
    )
      .run()

    const parserResult = parseLessonBlock({
      id: 1,
      blockType: 'heading',
      contentJson: '{"level":9,"text":"Invalid heading"}',
      position: 1,
    })
    const response = await app.request(
      '/api/student/lessons/lesson-introduction-to-percentages',
      { headers: { cookie } },
      createBindings('production'),
    )
    const body = await response.json<LessonDetailBody>()

    expect(parserResult).toEqual({
      block: null,
      malformed: true,
    })
    expect(response.status).toBe(200)
    expect(body.data.malformedBlockCount).toBeGreaterThanOrEqual(1)
    expect(body.data.blocks.some((block) => block.position === 99)).toBe(
      false,
    )
  })

  it('returns Continue Learning data that can link to the lesson reader route', async () => {
    const email = 'continue-learning-link@example.com'
    const { cookie } = await register(email)
    await enrollUser(email)

    const response = await app.request(
      '/api/student/courses/cse-professional/progress',
      { headers: { cookie } },
      createBindings('production'),
    )
    const body = await response.json<CourseProgressBody>()

    expect(response.status).toBe(200)
    expect(body.data.continueLearning.lesson?.publicId).toBe(
      'lesson-introduction-to-percentages',
    )
  })

  it('starts an accessible lesson as in progress and preserves the original start time', async () => {
    const email = 'lesson-start@example.com'
    const { cookie } = await register(email)
    await enrollUser(email)

    const firstResponse = await app.request(
      '/api/student/lessons/lesson-introduction-to-percentages/start',
      { method: 'POST', headers: { cookie } },
      createBindings('production'),
    )
    const firstProgress = await getLessonProgress(
      email,
      'introduction-to-percentages',
    )
    const secondResponse = await app.request(
      '/api/student/lessons/lesson-introduction-to-percentages/start',
      { method: 'POST', headers: { cookie } },
      createBindings('production'),
    )
    const secondProgress = await getLessonProgress(
      email,
      'introduction-to-percentages',
    )

    expect(firstResponse.status).toBe(200)
    expect(secondResponse.status).toBe(200)
    expect(firstProgress?.status).toBe('in_progress')
    expect(secondProgress?.status).toBe('in_progress')
    expect(secondProgress?.started_at).toBe(firstProgress?.started_at)
  })

  it('does not downgrade completed lesson progress when starting again', async () => {
    const email = 'start-completed-preserve@example.com'
    const { cookie } = await register(email)
    await enrollUser(email)
    await setLessonProgress(
      email,
      'introduction-to-percentages',
      'completed',
    )
    const before = await getLessonProgress(
      email,
      'introduction-to-percentages',
    )

    const response = await app.request(
      '/api/student/lessons/lesson-introduction-to-percentages/start',
      { method: 'POST', headers: { cookie } },
      createBindings('production'),
    )
    const after = await getLessonProgress(
      email,
      'introduction-to-percentages',
    )

    expect(response.status).toBe(200)
    expect(after?.status).toBe('completed')
    expect(after?.completed_at).toBe(before?.completed_at)
    expect(after?.progress_percent).toBe(100)
  })

  it('rejects direct access to a locked required lesson URL', async () => {
    const email = 'locked-direct-url@example.com'
    const { cookie } = await register(email)
    await enrollUser(email)

    const response = await app.request(
      '/api/student/lessons/lesson-understanding-percentages',
      { headers: { cookie } },
      createBindings('production'),
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: 'LESSON_LOCKED',
      },
    })
  })

  it('completes a started reading lesson and returns the next unlocked lesson', async () => {
    const email = 'complete-reading@example.com'
    const { cookie } = await register(email)
    await enrollUser(email)

    await app.request(
      '/api/student/lessons/lesson-introduction-to-percentages/start',
      { method: 'POST', headers: { cookie } },
      createBindings('production'),
    )
    const response = await app.request(
      '/api/student/lessons/lesson-introduction-to-percentages/complete',
      { method: 'POST', headers: { cookie } },
      createBindings('production'),
    )
    const body = await response.json<LessonCompletionBody>()

    expect(response.status).toBe(200)
    expect(body.data.completedLesson.publicId).toBe(
      'lesson-introduction-to-percentages',
    )
    expect(body.data.completedLesson.progress.status).toBe('completed')
    expect(body.data.newlyUnlockedNextLesson?.publicId).toBe(
      'lesson-understanding-percentages',
    )
    expect(body.data.newlyUnlockedNextLesson?.isLocked).toBe(false)
    expect(body.data.topicProgress).toMatchObject({
      topicSlug: 'percentages',
      completedRequiredLessons: 1,
      totalRequiredLessons: 11,
      progressPercentage: 9,
    })
    expect(body.data.courseProgress.continueLearning.lesson?.publicId).toBe(
      'lesson-understanding-percentages',
    )
  })

  it('keeps reading lesson completion idempotent', async () => {
    const email = 'complete-idempotent@example.com'
    const { cookie } = await register(email)
    await enrollUser(email)

    await app.request(
      '/api/student/lessons/lesson-introduction-to-percentages/start',
      { method: 'POST', headers: { cookie } },
      createBindings('production'),
    )
    await app.request(
      '/api/student/lessons/lesson-introduction-to-percentages/complete',
      { method: 'POST', headers: { cookie } },
      createBindings('production'),
    )
    const afterFirst = await getLessonProgress(
      email,
      'introduction-to-percentages',
    )
    const response = await app.request(
      '/api/student/lessons/lesson-introduction-to-percentages/complete',
      { method: 'POST', headers: { cookie } },
      createBindings('production'),
    )
    const afterSecond = await getLessonProgress(
      email,
      'introduction-to-percentages',
    )

    expect(response.status).toBe(200)
    expect(afterSecond?.status).toBe('completed')
    expect(afterSecond?.completed_at).toBe(afterFirst?.completed_at)
  })

  it('requires a lesson to be started before manual completion', async () => {
    const email = 'complete-without-start@example.com'
    const { cookie } = await register(email)
    await enrollUser(email)

    const response = await app.request(
      '/api/student/lessons/lesson-introduction-to-percentages/complete',
      { method: 'POST', headers: { cookie } },
      createBindings('production'),
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: 'LESSON_NOT_STARTED',
      },
    })
  })

  it.each([
    {
      publicId: 'lesson-finding-the-percentage',
      slug: 'finding-the-percentage',
      label: 'practice',
    },
    {
      publicId: 'lesson-percentages-topic-quiz',
      slug: 'percentages-topic-quiz',
      label: 'quiz',
    },
  ] satisfies ReadonlyArray<{
    publicId: string
    slug: (typeof cseProfessionalLessonSlugs)[number]
    label: string
  }>)('rejects manual completion for $label lessons', async ({ publicId, slug }) => {
    const email = `manual-${slug}@example.com`
    const { cookie } = await register(email)
    await enrollUser(email)
    await completeLessonsBefore(email, slug)

    await app.request(
      `/api/student/lessons/${publicId}/start`,
      { method: 'POST', headers: { cookie } },
      createBindings('production'),
    )
    const response = await app.request(
      `/api/student/lessons/${publicId}/complete`,
      { method: 'POST', headers: { cookie } },
      createBindings('production'),
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: 'COMPLETION_REQUIRES_ACTIVITY',
      },
    })
  })

  it.each([
    {
      name: 'expired',
      setup: (email: string) =>
        enrollUser(email, {
          accessExpiresAt: '2001-01-01T00:00:00.000Z',
        }),
    },
    {
      name: 'revoked',
      setup: (email: string) =>
        enrollUser(email, {
          status: 'revoked',
        }),
    },
    {
      name: 'future',
      setup: (email: string) =>
        enrollUser(email, {
          accessStartsAt: '2999-01-01T00:00:00.000Z',
        }),
    },
  ] satisfies ReadonlyArray<{
    name: string
    setup: (email: string) => Promise<void>
  }>)('denies start and completion for $name enrollments', async ({ name, setup }) => {
    const email = `progress-write-${name}@example.com`
    const { cookie } = await register(email)
    await setup(email)

    const startResponse = await app.request(
      '/api/student/lessons/lesson-introduction-to-percentages/start',
      { method: 'POST', headers: { cookie } },
      createBindings('production'),
    )
    const completeResponse = await app.request(
      '/api/student/lessons/lesson-introduction-to-percentages/complete',
      { method: 'POST', headers: { cookie } },
      createBindings('production'),
    )

    expect(startResponse.status).toBe(403)
    expect(completeResponse.status).toBe(403)
  })

  it('does not use another student progress to unlock curriculum', async () => {
    const ownerEmail = 'owner-progress@example.com'
    const otherEmail = 'other-progress@example.com'
    const { cookie: otherCookie } = await register(otherEmail)
    await register(ownerEmail)
    await enrollUser(ownerEmail)
    await enrollUser(otherEmail)
    await setLessonProgress(
      ownerEmail,
      'introduction-to-percentages',
      'completed',
    )

    const response = await app.request(
      '/api/student/courses/cse-professional/curriculum',
      { headers: { cookie: otherCookie } },
      createBindings('production'),
    )
    const body = await response.json<StudentCurriculumBody>()
    const secondLesson = body.data.subjects[0]?.topics[0]?.lessons[1]

    expect(response.status).toBe(200)
    expect(secondLesson?.publicId).toBe('lesson-understanding-percentages')
    expect(secondLesson?.isLocked).toBe(true)
    expect(secondLesson?.progressStatus).toBe('not_started')
  })

  it('skips draft lessons when unlocking the next published lesson', async () => {
    const email = 'draft-skip-unlock@example.com'
    const { cookie } = await register(email)
    await enrollUser(email)

    await env.DB.prepare(
      `INSERT INTO lessons (
        topic_id,
        public_id,
        title,
        slug,
        lesson_type,
        position,
        status
      ) VALUES (
        (SELECT topics.id FROM topics WHERE topics.slug = 'percentages'),
        ?1,
        'Draft Gate',
        ?2,
        'reading',
        12,
        'draft'
      )`,
    )
      .bind(
        `lesson-draft-gate-${crypto.randomUUID()}`,
        `draft-gate-${crypto.randomUUID()}`,
      )
      .run()
    await setLessonProgress(
      email,
      'introduction-to-percentages',
      'completed',
    )

    const response = await app.request(
      '/api/student/lessons/lesson-understanding-percentages',
      { headers: { cookie } },
      createBindings('production'),
    )

    expect(response.status).toBe(200)
  })

  it('allows a published lesson with requires_previous disabled', async () => {
    const email = 'requires-previous-off@example.com'
    const { cookie } = await register(email)
    const lessonPublicId = `lesson-open-sequence-${crypto.randomUUID()}`
    await enrollUser(email)
    await env.DB.prepare(
      `INSERT INTO lessons (
        topic_id,
        public_id,
        title,
        slug,
        lesson_type,
        summary,
        estimated_minutes,
        position,
        requires_previous,
        status
      ) VALUES (
        (SELECT topics.id FROM topics WHERE topics.slug = 'percentages'),
        ?1,
        'Open Sequence Lesson',
        ?2,
        'reading',
        'Accessible without the previous required lesson.',
        5,
        50,
        0,
        'published'
      )`,
    )
      .bind(lessonPublicId, `open-sequence-${crypto.randomUUID()}`)
      .run()

    const response = await app.request(
      `/api/student/lessons/${lessonPublicId}`,
      { headers: { cookie } },
      createBindings('production'),
    )

    expect(response.status).toBe(200)
  })

  it('unlocks required lessons across subject boundaries', async () => {
    const email = 'subject-boundary@example.com'
    const { cookie } = await register(email)
    const courseId = await getCourseId()
    const subjectSlug = `algebra-${crypto.randomUUID()}`
    const lessonPublicId = `lesson-algebra-basics-${crypto.randomUUID()}`
    await enrollUser(email)
    await completeAllPublishedRequiredLessons(email)
    await env.DB.prepare(
      `INSERT INTO subjects (
        course_id,
        title,
        slug,
        position,
        status
      ) VALUES (?1, 'Algebra', ?2, 2, 'published')`,
    )
      .bind(courseId, subjectSlug)
      .run()
    await env.DB.prepare(
      `INSERT INTO topics (
        subject_id,
        title,
        slug,
        position,
        status
      ) VALUES (
        (SELECT subjects.id FROM subjects WHERE subjects.slug = ?1),
        'Linear Equations',
        ?2,
        1,
        'published'
      )`,
    )
      .bind(subjectSlug, `linear-equations-${crypto.randomUUID()}`)
      .run()
    await env.DB.prepare(
      `INSERT INTO lessons (
        topic_id,
        public_id,
        title,
        slug,
        lesson_type,
        summary,
        estimated_minutes,
        position,
        status
      ) VALUES (
        (SELECT topics.id FROM topics WHERE topics.subject_id = (
          SELECT subjects.id FROM subjects WHERE subjects.slug = ?1
        )),
        ?2,
        'Algebra Basics',
        ?3,
        'reading',
        'Placeholder algebra lesson.',
        7,
        1,
        'published'
      )`,
    )
      .bind(subjectSlug, lessonPublicId, `algebra-basics-${crypto.randomUUID()}`)
      .run()

    const response = await app.request(
      `/api/student/lessons/${lessonPublicId}`,
      { headers: { cookie } },
      createBindings('production'),
    )
    const body = await response.json<LessonDetailBody>()

    expect(response.status).toBe(200)
    expect(body.data.previousLesson).not.toBeNull()
    expect(body.data.previousLesson?.isLocked).toBe(false)
    expect(body.data.navigation.subjectPosition).toBe(2)
  })
})

describe('Topic quiz APIs', () => {
  it('returns the seeded published quiz summary only after the quiz lesson is unlocked', async () => {
    const { cookie } = await prepareUnlockedQuizUser('quiz-summary@example.com')

    const response = await app.request(
      '/api/student/lessons/lesson-percentages-topic-quiz/quiz',
      { headers: { cookie } },
      createBindings('production'),
    )
    const body = await response.json<QuizSummaryBody>()

    expect(response.status).toBe(200)
    expect(body.data.quiz).toMatchObject({
      title: 'Percentages Topic Quiz',
      passingScore: 70,
      questionCount: 10,
      timeLimitMinutes: null,
      maximumAttempts: null,
      attemptsRemaining: null,
    })
    expect(body.data.inProgressAttempt).toBeNull()
    expect(body.data.attempts).toEqual([])
  })

  it('rejects direct quiz access while the quiz lesson is locked', async () => {
    const email = 'locked-quiz@example.com'
    const { cookie } = await register(email)
    await enrollUser(email)
    const quizId = await getPercentagesQuizId()

    const response = await app.request(
      `/api/student/quizzes/${quizId}/attempts`,
      { method: 'POST', headers: { cookie } },
      createBindings('production'),
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: 'LESSON_LOCKED',
      },
    })
  })

  it.each([
    {
      name: 'unenrolled',
      setup: () => Promise.resolve(),
      code: 'ENROLLMENT_REQUIRED',
    },
    {
      name: 'expired',
      setup: (email: string) =>
        enrollUser(email, {
          accessExpiresAt: '2001-01-01T00:00:00.000Z',
        }),
      code: 'COURSE_ACCESS_EXPIRED',
    },
    {
      name: 'revoked',
      setup: (email: string) =>
        enrollUser(email, {
          status: 'revoked',
        }),
      code: 'COURSE_ACCESS_EXPIRED',
    },
    {
      name: 'future start',
      setup: (email: string) =>
        enrollUser(email, {
          accessStartsAt: '2999-01-01T00:00:00.000Z',
        }),
      code: 'COURSE_ACCESS_EXPIRED',
    },
  ] satisfies ReadonlyArray<{
    name: string
    setup: (email: string) => Promise<void>
    code: string
  }>)('denies quiz attempts for $name enrollment state', async ({ name, setup, code }) => {
    const email = `quiz-access-${name.replaceAll(' ', '-')}@example.com`
    const { cookie } = await register(email)
    await setup(email)
    await completeLessonsBefore(email, 'percentages-topic-quiz')
    const quizId = await getPercentagesQuizId()

    const response = await app.request(
      `/api/student/quizzes/${quizId}/attempts`,
      { method: 'POST', headers: { cookie } },
      createBindings('production'),
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code,
      },
    })
  })

  it('does not start draft quizzes', async () => {
    const { cookie } = await prepareUnlockedQuizUser('draft-quiz@example.com')
    const draftQuizId = await createTestQuiz('draft')

    const response = await app.request(
      `/api/student/quizzes/${draftQuizId}/attempts`,
      { method: 'POST', headers: { cookie } },
      createBindings('production'),
    )

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: 'QUIZ_NOT_PUBLISHED',
      },
    })
  })

  it('starts a quiz attempt without exposing correct choices or explanations', async () => {
    const email = 'safe-start@example.com'
    const { cookie, quizId } = await prepareUnlockedQuizUser(email)

    const { response, body } = await startQuiz(cookie, quizId)
    const responseText = JSON.stringify(body)
    const progress = await getLessonProgress(email, 'percentages-topic-quiz')

    expect(response.status).toBe(201)
    expect(body.data.attempt).toMatchObject({
      status: 'in_progress',
      attemptNumber: 1,
    })
    expect(body.data.questions).toHaveLength(10)
    expect(body.data.questions[0]?.choices).toHaveLength(4)
    expect(progress?.status).toBe('in_progress')
    expect(responseText).not.toContain('is_correct')
    expect(responseText).not.toContain('isCorrect')
    expect(responseText).not.toContain('correctChoice')
    expect(responseText).not.toContain('explanation')
  })

  it('keeps seeded Question 10 choices unique with 6 as the only correct answer', async () => {
    const choices = (await getSeededQuizChoices()).filter(
      (choice) => choice.question_position === 10,
    )
    const visibleChoiceCounts = choices.reduce(
      (counts, choice) =>
        counts.set(
          choice.choice_text,
          (counts.get(choice.choice_text) ?? 0) + 1,
        ),
      new Map<string, number>(),
    )

    expect(choices.map((choice) => choice.choice_text)).toEqual([
      '6',
      '10',
      '15',
      '24',
    ])
    expect(
      choices.filter((choice) => choice.is_correct === 1).map((choice) => ({
        text: choice.choice_text,
        position: choice.choice_position,
      })),
    ).toEqual([{ text: '6', position: 1 }])
    expect([...visibleChoiceCounts.values()].every((count) => count === 1)).toBe(
      true,
    )
  })

  it('increments attempt numbers for repeated starts while attempts are unlimited', async () => {
    const { cookie, quizId } = await prepareUnlockedQuizUser(
      'attempt-number@example.com',
    )

    const firstAttempt = await startQuiz(cookie, quizId)
    const secondAttempt = await startQuiz(cookie, quizId)

    expect(firstAttempt.body.data.attempt.attemptNumber).toBe(1)
    expect(secondAttempt.body.data.attempt.attemptNumber).toBe(2)
  })

  it('saves and replaces answers idempotently', async () => {
    const { cookie, quizId } = await prepareUnlockedQuizUser(
      'save-answer@example.com',
    )
    const { body } = await startQuiz(cookie, quizId)
    const question = body.data.questions[0]

    if (question === undefined) {
      throw new Error('Seeded quiz question was not returned.')
    }

    const firstChoiceId = question.choices[0]?.id
    const replacementChoiceId = question.choices[1]?.id

    if (firstChoiceId === undefined || replacementChoiceId === undefined) {
      throw new Error('Seeded quiz choices were not returned.')
    }

    const firstSave = await app.request(
      `/api/student/quiz-attempts/${body.data.attempt.publicId}/answers/${question.id}`,
      {
        method: 'PUT',
        headers: {
          cookie,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ selectedChoiceId: firstChoiceId }),
      },
      createBindings('production'),
    )
    const replacementSave = await app.request(
      `/api/student/quiz-attempts/${body.data.attempt.publicId}/answers/${question.id}`,
      {
        method: 'PUT',
        headers: {
          cookie,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ selectedChoiceId: replacementChoiceId }),
      },
      createBindings('production'),
    )
    const reloadResponse = await app.request(
      `/api/student/quiz-attempts/${body.data.attempt.publicId}`,
      { headers: { cookie } },
      createBindings('production'),
    )
    const reloadBody = await reloadResponse.json<QuizAttemptFetchBody>()

    expect(firstSave.status).toBe(200)
    expect(replacementSave.status).toBe(200)
    expect('questions' in reloadBody.data).toBe(true)
    if ('questions' in reloadBody.data) {
      expect(reloadBody.data.questions[0]?.selectedChoiceId).toBe(
        replacementChoiceId,
      )
    }
  })

  it('rejects malformed answer bodies with safe field errors', async () => {
    const { cookie, quizId } = await prepareUnlockedQuizUser(
      'malformed-answer@example.com',
    )
    const { body } = await startQuiz(cookie, quizId)
    const question = body.data.questions[0]

    if (question === undefined) {
      throw new Error('Seeded quiz question was not returned.')
    }

    const response = await app.request(
      `/api/student/quiz-attempts/${body.data.attempt.publicId}/answers/${question.id}`,
      {
        method: 'PUT',
        headers: {
          cookie,
          'content-type': 'application/json',
        },
        body: JSON.stringify({}),
      },
      createBindings('production'),
    )
    const responseBody = await response.json<ApiErrorBody>()

    expect(response.status).toBe(400)
    expect(responseBody.error.code).toBe('VALIDATION_ERROR')
    expect(
      responseBody.error.details?.fieldErrors.selectedChoiceId,
    ).toBeDefined()
  })

  it('rejects questions and choices that do not belong to the attempt quiz', async () => {
    const { cookie, quizId } = await prepareUnlockedQuizUser(
      'wrong-question-choice@example.com',
    )
    const { body } = await startQuiz(cookie, quizId)
    const firstQuestion = body.data.questions[0]
    const secondQuestion = body.data.questions[1]

    if (firstQuestion === undefined || secondQuestion === undefined) {
      throw new Error('Seeded quiz questions were not returned.')
    }

    const wrongChoiceId = secondQuestion.choices[0]?.id
    const otherQuizId = await createTestQuiz('published')
    const otherQuestion = await env.DB.prepare(
      `SELECT questions.id
      FROM questions
      WHERE questions.quiz_id = ?1
      LIMIT 1`,
    )
      .bind(otherQuizId)
      .first<{ id: number }>()

    if (wrongChoiceId === undefined || otherQuestion === null) {
      throw new Error('Test question or choice was not found.')
    }

    const wrongChoiceResponse = await app.request(
      `/api/student/quiz-attempts/${body.data.attempt.publicId}/answers/${firstQuestion.id}`,
      {
        method: 'PUT',
        headers: {
          cookie,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ selectedChoiceId: wrongChoiceId }),
      },
      createBindings('production'),
    )
    const wrongQuestionResponse = await app.request(
      `/api/student/quiz-attempts/${body.data.attempt.publicId}/answers/${otherQuestion.id}`,
      {
        method: 'PUT',
        headers: {
          cookie,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ selectedChoiceId: wrongChoiceId }),
      },
      createBindings('production'),
    )

    expect(wrongChoiceResponse.status).toBe(400)
    await expect(wrongChoiceResponse.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: 'CHOICE_NOT_IN_QUESTION',
      },
    })
    expect(wrongQuestionResponse.status).toBe(400)
    await expect(wrongQuestionResponse.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: 'QUESTION_NOT_IN_QUIZ',
      },
    })
  })

  it('keeps in-progress attempts and results private to the owning student', async () => {
    const ownerEmail = 'quiz-owner@example.com'
    const otherEmail = 'quiz-other@example.com'
    const { cookie: ownerCookie, quizId } =
      await prepareUnlockedQuizUser(ownerEmail)
    const { cookie: otherCookie } = await prepareUnlockedQuizUser(otherEmail)
    const { body } = await startQuiz(ownerCookie, quizId)

    const readResponse = await app.request(
      `/api/student/quiz-attempts/${body.data.attempt.publicId}`,
      { headers: { cookie: otherCookie } },
      createBindings('production'),
    )
    const resultResponse = await app.request(
      `/api/student/quiz-attempts/${body.data.attempt.publicId}/results`,
      { headers: { cookie: otherCookie } },
      createBindings('production'),
    )

    expect(readResponse.status).toBe(403)
    expect(resultResponse.status).toBe(403)
  })

  it('does not expose results before submission', async () => {
    const { cookie, quizId } = await prepareUnlockedQuizUser(
      'result-before-submit@example.com',
    )
    const { body } = await startQuiz(cookie, quizId)

    const response = await app.request(
      `/api/student/quiz-attempts/${body.data.attempt.publicId}/results`,
      { headers: { cookie } },
      createBindings('production'),
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: 'QUIZ_NOT_SUBMITTED',
      },
    })
  })

  it('scores unanswered questions as zero and leaves the quiz lesson incomplete when failed', async () => {
    const email = 'failed-unanswered@example.com'
    const { cookie, quizId } = await prepareUnlockedQuizUser(email)
    const { body } = await startQuiz(cookie, quizId)

    const response = await app.request(
      `/api/student/quiz-attempts/${body.data.attempt.publicId}/submit`,
      { method: 'POST', headers: { cookie } },
      createBindings('production'),
    )
    const result = await response.json<QuizResultBody>()
    const progress = await getLessonProgress(email, 'percentages-topic-quiz')
    const summaryResponse = await app.request(
      '/api/student/lessons/lesson-percentages-topic-quiz/quiz',
      { headers: { cookie } },
      createBindings('production'),
    )
    const summary = await summaryResponse.json<QuizSummaryBody>()

    expect(response.status).toBe(200)
    expect(result.data).toMatchObject({
      earnedPoints: 0,
      totalPoints: 10,
      scorePercent: 0,
      passed: false,
    })
    expect(progress?.status).toBe('in_progress')
    expect(summary.data.attempts[0]).toMatchObject({
      status: 'submitted',
      scorePercent: 0,
      passed: false,
    })
  })

  it('scores Percentages Topic Quiz Question 10 choice 6 as correct', async () => {
    const email = 'question-ten-six-correct@example.com'
    const { cookie, quizId } = await prepareUnlockedQuizUser(email)
    const { body } = await startQuiz(cookie, quizId)
    const questionTen = body.data.questions.find(
      (question) => question.position === 10,
    )
    const sixChoice = questionTen?.choices.find(
      (choice) => choice.text === '6',
    )

    if (questionTen === undefined || sixChoice === undefined) {
      throw new Error('Question 10 choice 6 was not returned.')
    }

    const saveResponse = await saveQuizAttemptAnswer({
      cookie,
      attemptPublicId: body.data.attempt.publicId,
      questionId: questionTen.id,
      selectedChoiceId: sixChoice.id,
    })
    const { response, body: result } = await submitQuizAttemptForTest(
      cookie,
      body.data.attempt.publicId,
    )
    const questionResult = result.data.questions.find(
      (question) => question.position === 10,
    )
    const storedAnswer = await env.DB.prepare(
      `SELECT
        selected_choice_id,
        is_correct,
        points_awarded
      FROM quiz_attempt_answers
      INNER JOIN quiz_attempts ON quiz_attempts.id = quiz_attempt_answers.attempt_id
      WHERE quiz_attempts.public_id = ?1
        AND quiz_attempt_answers.question_id = ?2
      LIMIT 1`,
    )
      .bind(body.data.attempt.publicId, questionTen.id)
      .first<StoredQuizAttemptAnswerRow>()

    expect(saveResponse.status).toBe(200)
    expect(response.status).toBe(200)
    expect(questionResult).toMatchObject({
      selectedChoice: {
        id: sixChoice.id,
        text: '6',
      },
      correctChoice: {
        id: sixChoice.id,
        text: '6',
      },
      isCorrect: true,
      pointsAwarded: 1,
    })
    expect(storedAnswer).toEqual({
      selected_choice_id: sixChoice.id,
      is_correct: 1,
      points_awarded: 1,
    })
  })

  it('scores every seeded quiz correct choice consistently with result mapping', async () => {
    const email = 'seeded-quiz-consistency@example.com'
    const { cookie, quizId } = await prepareUnlockedQuizUser(email)
    const seededChoices = await getSeededQuizChoices()
    const choicesByQuestionPosition = new Map<number, SeededQuizChoiceRow[]>()

    for (const choice of seededChoices) {
      const existing =
        choicesByQuestionPosition.get(choice.question_position) ?? []
      existing.push(choice)
      choicesByQuestionPosition.set(choice.question_position, existing)
    }

    expect(choicesByQuestionPosition.size).toBe(10)

    for (const [questionPosition, choices] of choicesByQuestionPosition) {
      const correctChoices = choices.filter((choice) => choice.is_correct === 1)
      const visibleChoiceTexts = choices.map((choice) => choice.choice_text)

      expect(correctChoices).toHaveLength(1)
      expect(new Set(visibleChoiceTexts).size).toBe(visibleChoiceTexts.length)

      const correctChoice = correctChoices[0]

      if (correctChoice === undefined) {
        throw new Error(`Question ${questionPosition} has no correct choice.`)
      }

      const { body } = await startQuiz(cookie, quizId)
      const attemptQuestion = body.data.questions.find(
        (question) => question.position === questionPosition,
      )
      const attemptChoice = attemptQuestion?.choices.find(
        (choice) => choice.text === correctChoice.choice_text,
      )

      if (attemptQuestion === undefined || attemptChoice === undefined) {
        throw new Error(
          `Question ${questionPosition} correct choice was not returned.`,
        )
      }

      const saveResponse = await saveQuizAttemptAnswer({
        cookie,
        attemptPublicId: body.data.attempt.publicId,
        questionId: attemptQuestion.id,
        selectedChoiceId: attemptChoice.id,
      })
      const { response, body: result } = await submitQuizAttemptForTest(
        cookie,
        body.data.attempt.publicId,
      )
      const questionResult = result.data.questions.find(
        (question) => question.position === questionPosition,
      )
      const storedAnswer = await env.DB.prepare(
        `SELECT
          selected_choice_id,
          is_correct,
          points_awarded
        FROM quiz_attempt_answers
        INNER JOIN quiz_attempts ON quiz_attempts.id = quiz_attempt_answers.attempt_id
        WHERE quiz_attempts.public_id = ?1
          AND quiz_attempt_answers.question_id = ?2
        LIMIT 1`,
      )
        .bind(body.data.attempt.publicId, attemptQuestion.id)
        .first<StoredQuizAttemptAnswerRow>()

      expect(saveResponse.status).toBe(200)
      expect(response.status).toBe(200)
      expect(questionResult?.selectedChoice).toEqual(attemptChoice)
      expect(questionResult?.correctChoice).toEqual(attemptChoice)
      expect(questionResult?.isCorrect).toBe(true)
      expect(questionResult?.pointsAwarded).toBe(1)
      expect(storedAnswer).toEqual({
        selected_choice_id: attemptChoice.id,
        is_correct: 1,
        points_awarded: 1,
      })
    }
  })

  it('passes at 70%, completes the quiz lesson, and returns explanations after submission', async () => {
    const email = 'passing-quiz@example.com'
    const { cookie, quizId } = await prepareUnlockedQuizUser(email)
    await completeAllPublishedRequiredLessonsExcept(
      email,
      'percentages-topic-quiz',
    )
    const { body } = await startQuiz(cookie, quizId)

    for (const question of body.data.questions.slice(0, 7)) {
      const correctChoiceId = question.choices[0]?.id

      if (correctChoiceId === undefined) {
        throw new Error('Seeded quiz correct choice was not returned.')
      }

      const saveResponse = await app.request(
        `/api/student/quiz-attempts/${body.data.attempt.publicId}/answers/${question.id}`,
        {
          method: 'PUT',
          headers: {
            cookie,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ selectedChoiceId: correctChoiceId }),
        },
        createBindings('production'),
      )

      expect(saveResponse.status).toBe(200)
    }

    const firstSubmit = await app.request(
      `/api/student/quiz-attempts/${body.data.attempt.publicId}/submit`,
      { method: 'POST', headers: { cookie } },
      createBindings('production'),
    )
    const secondSubmit = await app.request(
      `/api/student/quiz-attempts/${body.data.attempt.publicId}/submit`,
      { method: 'POST', headers: { cookie } },
      createBindings('production'),
    )
    const result = await firstSubmit.json<QuizResultBody>()
    const idempotentResult = await secondSubmit.json<QuizResultBody>()
    const progress = await getLessonProgress(email, 'percentages-topic-quiz')
    const fetchAttempt = await app.request(
      `/api/student/quiz-attempts/${body.data.attempt.publicId}`,
      { headers: { cookie } },
      createBindings('production'),
    )
    const fetchAttemptBody = await fetchAttempt.json<QuizAttemptFetchBody>()

    expect(firstSubmit.status).toBe(200)
    expect(secondSubmit.status).toBe(200)
    expect(result.data).toMatchObject({
      earnedPoints: 7,
      totalPoints: 10,
      scorePercent: 70,
      passed: true,
    })
    expect(idempotentResult.data).toMatchObject({
      earnedPoints: 7,
      totalPoints: 10,
      scorePercent: 70,
      passed: true,
    })
    expect(result.data.questions[0]?.correctChoice).toBeDefined()
    expect(result.data.questions[0]?.explanation).not.toBeNull()
    expect(progress?.status).toBe('completed')
    expect(result.data.courseProgress.progressPercentage).toBe(100)
    expect(result.data.courseProgress.continueLearning).toEqual({
      courseCompleted: true,
      lesson: null,
    })
    expect(fetchAttemptBody.data).toMatchObject({
      attempt: {
        publicId: body.data.attempt.publicId,
        status: 'submitted',
      },
      resultAvailable: true,
    })
  })

  it('rejects edits after submission', async () => {
    const { cookie, quizId } = await prepareUnlockedQuizUser(
      'submitted-edit@example.com',
    )
    const { body } = await startQuiz(cookie, quizId)
    const question = body.data.questions[0]
    const choiceId = question?.choices[0]?.id

    if (question === undefined || choiceId === undefined) {
      throw new Error('Seeded quiz question or choice was not returned.')
    }

    await app.request(
      `/api/student/quiz-attempts/${body.data.attempt.publicId}/submit`,
      { method: 'POST', headers: { cookie } },
      createBindings('production'),
    )
    const response = await app.request(
      `/api/student/quiz-attempts/${body.data.attempt.publicId}/answers/${question.id}`,
      {
        method: 'PUT',
        headers: {
          cookie,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ selectedChoiceId: choiceId }),
      },
      createBindings('production'),
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: 'ATTEMPT_ALREADY_SUBMITTED',
      },
    })
  })

  it('expires in-progress attempts server-side', async () => {
    const { cookie, quizId } = await prepareUnlockedQuizUser(
      'expired-attempt@example.com',
    )
    const { body } = await startQuiz(cookie, quizId)

    await env.DB.prepare(
      `UPDATE quiz_attempts
      SET expires_at = '2001-01-01T00:00:00.000Z'
      WHERE public_id = ?1`,
    )
      .bind(body.data.attempt.publicId)
      .run()

    const response = await app.request(
      `/api/student/quiz-attempts/${body.data.attempt.publicId}/submit`,
      { method: 'POST', headers: { cookie } },
      createBindings('production'),
    )
    const storedAttempt = await env.DB.prepare(
      'SELECT status FROM quiz_attempts WHERE public_id = ?1',
    )
      .bind(body.data.attempt.publicId)
      .first<{ status: string }>()

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: 'ATTEMPT_EXPIRED',
      },
    })
    expect(storedAttempt?.status).toBe('expired')
  })

  it('enforces maximum attempts when a quiz policy sets a limit', async () => {
    const { cookie } = await prepareUnlockedQuizUser('max-attempt@example.com')
    const limitedQuizId = await createTestQuiz('published', 1)

    const firstResponse = await app.request(
      `/api/student/quizzes/${limitedQuizId}/attempts`,
      { method: 'POST', headers: { cookie } },
      createBindings('production'),
    )
    const secondResponse = await app.request(
      `/api/student/quizzes/${limitedQuizId}/attempts`,
      { method: 'POST', headers: { cookie } },
      createBindings('production'),
    )

    expect(firstResponse.status).toBe(201)
    expect(secondResponse.status).toBe(409)
    await expect(secondResponse.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: 'MAXIMUM_ATTEMPTS_REACHED',
      },
    })
  })
})

describe('Practice activity APIs', () => {
  it('returns all five seeded practice lessons with linked practice sets', async () => {
    const email = 'practice-linked@example.com'
    const { cookie } = await register(email)
    await enrollUser(email)
    await completeLessonsBefore(email, 'percentages-topic-quiz')

    for (const lessonSlug of [
      'finding-the-percentage',
      'finding-the-base',
      'finding-the-rate',
      'worked-examples',
      'guided-practice',
    ] as const) {
      const response = await app.request(
        `/api/student/lessons/lesson-${lessonSlug}/practice`,
        { headers: { cookie } },
        createBindings('production'),
      )
      const body = await response.json<PracticeSummaryBody>()

      expect(response.status).toBe(200)
      expect(body.data.practice).toMatchObject({
        passingScore: 60,
        questionCount: 5,
        maximumAttempts: null,
        attemptsRemaining: null,
      })
    }
  })

  it('starts an accessible practice without exposing answers or explanations', async () => {
    const email = 'practice-start@example.com'
    const { cookie, practiceSetId } =
      await prepareUnlockedPracticeUser(email)

    const { response, body } = await startPractice(cookie, practiceSetId)
    const responseText = JSON.stringify(body)
    const progress = await getLessonProgress(email, 'finding-the-percentage')

    expect(response.status).toBe(201)
    expect(body.data.attempt).toMatchObject({
      status: 'in_progress',
      attemptNumber: 1,
    })
    expect(body.data.practice).toMatchObject({
      passingScore: 60,
      questionCount: 5,
    })
    expect(body.data.questions).toHaveLength(5)
    expect(body.data.questions[0]?.choices).toHaveLength(4)
    expect(body.data.answeredCount).toBe(0)
    expect(body.data.totalCount).toBe(5)
    expect(progress?.status).toBe('in_progress')
    expect(responseText).not.toContain('is_correct')
    expect(responseText).not.toContain('isCorrect')
    expect(responseText).not.toContain('correctChoice')
    expect(responseText).not.toContain('explanation')
  })

  it('rejects locked practice access with LESSON_LOCKED', async () => {
    const email = 'locked-practice@example.com'
    const { cookie } = await register(email)
    await enrollUser(email)
    const practiceSetId = await getPracticeSetId('finding-the-percentage')

    const response = await app.request(
      `/api/student/practice-sets/${practiceSetId}/attempts`,
      { method: 'POST', headers: { cookie } },
      createBindings('production'),
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: 'LESSON_LOCKED',
      },
    })
  })

  it.each([
    {
      name: 'unenrolled',
      setup: () => Promise.resolve(),
      code: 'ENROLLMENT_REQUIRED',
    },
    {
      name: 'expired',
      setup: (email: string) =>
        enrollUser(email, {
          accessExpiresAt: '2001-01-01T00:00:00.000Z',
        }),
      code: 'COURSE_ACCESS_EXPIRED',
    },
    {
      name: 'revoked',
      setup: (email: string) =>
        enrollUser(email, {
          status: 'revoked',
        }),
      code: 'COURSE_ACCESS_EXPIRED',
    },
    {
      name: 'future',
      setup: (email: string) =>
        enrollUser(email, {
          accessStartsAt: '2999-01-01T00:00:00.000Z',
        }),
      code: 'COURSE_ACCESS_EXPIRED',
    },
  ] satisfies ReadonlyArray<{
    name: string
    setup: (email: string) => Promise<void>
    code: string
  }>)('denies practice start for $name enrollment state', async ({ name, setup, code }) => {
    const email = `practice-denied-${name}@example.com`
    const { cookie } = await register(email)
    await setup(email)
    await completeLessonsBefore(email, 'finding-the-percentage')
    const practiceSetId = await getPracticeSetId('finding-the-percentage')

    const response = await app.request(
      `/api/student/practice-sets/${practiceSetId}/attempts`,
      { method: 'POST', headers: { cookie } },
      createBindings('production'),
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code },
    })
  })

  it('does not start draft practice sets', async () => {
    const email = 'draft-practice@example.com'
    const { cookie } = await register(email)
    await enrollUser(email)
    const draftPracticeSetId = await createTestPracticeSet('draft')

    const response = await app.request(
      `/api/student/practice-sets/${draftPracticeSetId}/attempts`,
      { method: 'POST', headers: { cookie } },
      createBindings('production'),
    )

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: 'PRACTICE_NOT_PUBLISHED',
      },
    })
  })

  it('increments practice attempt numbers', async () => {
    const { cookie, practiceSetId } = await prepareUnlockedPracticeUser(
      'practice-attempt-number@example.com',
    )

    const firstAttempt = await startPractice(cookie, practiceSetId)
    const secondAttempt = await startPractice(cookie, practiceSetId)

    expect(firstAttempt.body.data.attempt.attemptNumber).toBe(1)
    expect(secondAttempt.body.data.attempt.attemptNumber).toBe(2)
  })

  it('lets the owner retrieve an in-progress attempt with saved answers', async () => {
    const { cookie, practiceSetId } = await prepareUnlockedPracticeUser(
      'practice-owner-read@example.com',
    )
    const { body } = await startPractice(cookie, practiceSetId)
    const question = body.data.questions[0]
    const choiceId = question?.choices[0]?.id

    if (question === undefined || choiceId === undefined) {
      throw new Error('Practice question or choice was not returned.')
    }

    await app.request(
      `/api/student/practice-attempts/${body.data.attempt.publicId}/answers/${question.id}`,
      {
        method: 'PUT',
        headers: {
          cookie,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ selectedChoiceId: choiceId }),
      },
      createBindings('production'),
    )
    const response = await app.request(
      `/api/student/practice-attempts/${body.data.attempt.publicId}`,
      { headers: { cookie } },
      createBindings('production'),
    )
    const responseBody = await response.json<PracticeAttemptFetchBody>()

    expect(response.status).toBe(200)
    expect('questions' in responseBody.data).toBe(true)
    if ('questions' in responseBody.data) {
      expect(responseBody.data.answeredCount).toBe(1)
      expect(responseBody.data.questions[0]?.selectedChoiceId).toBe(choiceId)
    }
  })

  it('keeps practice attempts private to the owner', async () => {
    const { cookie: ownerCookie, practiceSetId } =
      await prepareUnlockedPracticeUser('practice-private-owner@example.com')
    const { cookie: otherCookie } =
      await prepareUnlockedPracticeUser('practice-private-other@example.com')
    const { body } = await startPractice(ownerCookie, practiceSetId)

    const response = await app.request(
      `/api/student/practice-attempts/${body.data.attempt.publicId}`,
      { headers: { cookie: otherCookie } },
      createBindings('production'),
    )

    expect(response.status).toBe(403)
  })

  it('saves and replaces practice answers idempotently', async () => {
    const { cookie, practiceSetId } = await prepareUnlockedPracticeUser(
      'practice-save-replace@example.com',
    )
    const { body } = await startPractice(cookie, practiceSetId)
    const question = body.data.questions[0]

    if (question === undefined) {
      throw new Error('Practice question was not returned.')
    }

    const firstChoiceId = question.choices[0]?.id
    const replacementChoiceId = question.choices[1]?.id

    if (firstChoiceId === undefined || replacementChoiceId === undefined) {
      throw new Error('Practice choices were not returned.')
    }

    const firstSave = await app.request(
      `/api/student/practice-attempts/${body.data.attempt.publicId}/answers/${question.id}`,
      {
        method: 'PUT',
        headers: {
          cookie,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ selectedChoiceId: firstChoiceId }),
      },
      createBindings('production'),
    )
    const replacementSave = await app.request(
      `/api/student/practice-attempts/${body.data.attempt.publicId}/answers/${question.id}`,
      {
        method: 'PUT',
        headers: {
          cookie,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ selectedChoiceId: replacementChoiceId }),
      },
      createBindings('production'),
    )
    const reloadResponse = await app.request(
      `/api/student/practice-attempts/${body.data.attempt.publicId}`,
      { headers: { cookie } },
      createBindings('production'),
    )
    const reloadBody = await reloadResponse.json<PracticeAttemptFetchBody>()

    expect(firstSave.status).toBe(200)
    expect(replacementSave.status).toBe(200)
    if ('questions' in reloadBody.data) {
      expect(reloadBody.data.questions[0]?.selectedChoiceId).toBe(
        replacementChoiceId,
      )
    }
  })

  it('rejects invalid practice questions and choices', async () => {
    const { cookie, practiceSetId } = await prepareUnlockedPracticeUser(
      'practice-invalid-question-choice@example.com',
    )
    const { body } = await startPractice(cookie, practiceSetId)
    const firstQuestion = body.data.questions[0]
    const secondQuestion = body.data.questions[1]

    if (firstQuestion === undefined || secondQuestion === undefined) {
      throw new Error('Practice questions were not returned.')
    }

    const wrongChoiceId = secondQuestion.choices[0]?.id
    const otherPracticeSetId = await createTestPracticeSet('published')
    const otherQuestion = await env.DB.prepare(
      `SELECT practice_questions.id
      FROM practice_questions
      WHERE practice_questions.practice_set_id = ?1
      LIMIT 1`,
    )
      .bind(otherPracticeSetId)
      .first<{ id: number }>()

    if (wrongChoiceId === undefined || otherQuestion === null) {
      throw new Error('Test practice question or choice was not found.')
    }

    const wrongChoiceResponse = await app.request(
      `/api/student/practice-attempts/${body.data.attempt.publicId}/answers/${firstQuestion.id}`,
      {
        method: 'PUT',
        headers: {
          cookie,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ selectedChoiceId: wrongChoiceId }),
      },
      createBindings('production'),
    )
    const wrongQuestionResponse = await app.request(
      `/api/student/practice-attempts/${body.data.attempt.publicId}/answers/${otherQuestion.id}`,
      {
        method: 'PUT',
        headers: {
          cookie,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ selectedChoiceId: wrongChoiceId }),
      },
      createBindings('production'),
    )

    expect(wrongChoiceResponse.status).toBe(400)
    await expect(wrongChoiceResponse.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: 'CHOICE_NOT_IN_QUESTION',
      },
    })
    expect(wrongQuestionResponse.status).toBe(400)
    await expect(wrongQuestionResponse.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: 'QUESTION_NOT_IN_PRACTICE',
      },
    })
  })

  it('returns validation errors for malformed practice answer bodies', async () => {
    const { cookie, practiceSetId } = await prepareUnlockedPracticeUser(
      'practice-validation@example.com',
    )
    const { body } = await startPractice(cookie, practiceSetId)
    const question = body.data.questions[0]

    if (question === undefined) {
      throw new Error('Practice question was not returned.')
    }

    const response = await app.request(
      `/api/student/practice-attempts/${body.data.attempt.publicId}/answers/${question.id}`,
      {
        method: 'PUT',
        headers: {
          cookie,
          'content-type': 'application/json',
        },
        body: JSON.stringify({}),
      },
      createBindings('production'),
    )
    const responseBody = await response.json<ApiErrorBody>()

    expect(response.status).toBe(400)
    expect(responseBody.error.code).toBe('VALIDATION_ERROR')
    expect(
      responseBody.error.details?.fieldErrors.selectedChoiceId,
    ).toBeDefined()
  })

  it('scores unanswered practice questions as zero and keeps a failed lesson incomplete', async () => {
    const email = 'practice-failed-unanswered@example.com'
    const { cookie, practiceSetId } = await prepareUnlockedPracticeUser(email)
    const { body } = await startPractice(cookie, practiceSetId)

    const response = await app.request(
      `/api/student/practice-attempts/${body.data.attempt.publicId}/submit`,
      { method: 'POST', headers: { cookie } },
      createBindings('production'),
    )
    const result = await response.json<PracticeResultBody>()
    const progress = await getLessonProgress(email, 'finding-the-percentage')

    expect(response.status).toBe(200)
    expect(result.data).toMatchObject({
      earnedPoints: 0,
      totalPoints: 5,
      scorePercent: 0,
      passed: false,
    })
    expect(progress?.status).toBe('in_progress')
  })

  it('fails below 60%, passes at 60%, completes the lesson, and is idempotent', async () => {
    const failEmail = 'practice-below-sixty@example.com'
    const { cookie: failCookie, practiceSetId: failPracticeSetId } =
      await prepareUnlockedPracticeUser(failEmail)
    const failedAttempt = await startPractice(failCookie, failPracticeSetId)

    for (const question of failedAttempt.body.data.questions.slice(0, 2)) {
      const choiceId = question.choices[0]?.id

      if (choiceId === undefined) {
        throw new Error('Practice correct choice was not returned.')
      }

      await app.request(
        `/api/student/practice-attempts/${failedAttempt.body.data.attempt.publicId}/answers/${question.id}`,
        {
          method: 'PUT',
          headers: {
            cookie: failCookie,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ selectedChoiceId: choiceId }),
        },
        createBindings('production'),
      )
    }

    const failResponse = await app.request(
      `/api/student/practice-attempts/${failedAttempt.body.data.attempt.publicId}/submit`,
      { method: 'POST', headers: { cookie: failCookie } },
      createBindings('production'),
    )
    const failResult = await failResponse.json<PracticeResultBody>()
    const failProgress = await getLessonProgress(
      failEmail,
      'finding-the-percentage',
    )

    expect(failResponse.status).toBe(200)
    expect(failResult.data.scorePercent).toBe(40)
    expect(failResult.data.passed).toBe(false)
    expect(failProgress?.status).toBe('in_progress')

    const passEmail = 'practice-at-sixty@example.com'
    const { cookie: passCookie, practiceSetId: passPracticeSetId } =
      await prepareUnlockedPracticeUser(passEmail)
    const passingAttempt = await startPractice(passCookie, passPracticeSetId)

    for (const question of passingAttempt.body.data.questions.slice(0, 3)) {
      const choiceId = question.choices[0]?.id

      if (choiceId === undefined) {
        throw new Error('Practice correct choice was not returned.')
      }

      await app.request(
        `/api/student/practice-attempts/${passingAttempt.body.data.attempt.publicId}/answers/${question.id}`,
        {
          method: 'PUT',
          headers: {
            cookie: passCookie,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ selectedChoiceId: choiceId }),
        },
        createBindings('production'),
      )
    }

    const firstSubmit = await app.request(
      `/api/student/practice-attempts/${passingAttempt.body.data.attempt.publicId}/submit`,
      { method: 'POST', headers: { cookie: passCookie } },
      createBindings('production'),
    )
    const secondSubmit = await app.request(
      `/api/student/practice-attempts/${passingAttempt.body.data.attempt.publicId}/submit`,
      { method: 'POST', headers: { cookie: passCookie } },
      createBindings('production'),
    )
    const result = await firstSubmit.json<PracticeResultBody>()
    const idempotentResult = await secondSubmit.json<PracticeResultBody>()
    const progress = await getLessonProgress(
      passEmail,
      'finding-the-percentage',
    )
    const attemptReload = await app.request(
      `/api/student/practice-attempts/${passingAttempt.body.data.attempt.publicId}`,
      { headers: { cookie: passCookie } },
      createBindings('production'),
    )
    const attemptReloadBody =
      await attemptReload.json<PracticeAttemptFetchBody>()

    expect(firstSubmit.status).toBe(200)
    expect(secondSubmit.status).toBe(200)
    expect(result.data).toMatchObject({
      earnedPoints: 3,
      totalPoints: 5,
      scorePercent: 60,
      passed: true,
    })
    expect(idempotentResult.data.scorePercent).toBe(60)
    expect(result.data.questions[0]?.correctChoice).toBeDefined()
    expect(result.data.questions[0]?.explanation).not.toBeNull()
    expect(progress?.status).toBe('completed')
    expect(result.data.newlyUnlockedNextLesson?.publicId).toBe(
      'lesson-finding-the-base',
    )
    expect(result.data.courseProgress.continueLearning.lesson?.publicId).toBe(
      'lesson-finding-the-base',
    )
    expect(attemptReloadBody.data).toMatchObject({
      attempt: {
        publicId: passingAttempt.body.data.attempt.publicId,
        status: 'submitted',
      },
      resultAvailable: true,
    })
  })

  it('does not expose practice results before submission and restricts results to the owner', async () => {
    const { cookie, practiceSetId } = await prepareUnlockedPracticeUser(
      'practice-result-hidden@example.com',
    )
    const { cookie: otherCookie } = await prepareUnlockedPracticeUser(
      'practice-result-other@example.com',
    )
    const { body } = await startPractice(cookie, practiceSetId)

    const beforeSubmit = await app.request(
      `/api/student/practice-attempts/${body.data.attempt.publicId}/results`,
      { headers: { cookie } },
      createBindings('production'),
    )
    const otherResponse = await app.request(
      `/api/student/practice-attempts/${body.data.attempt.publicId}/results`,
      { headers: { cookie: otherCookie } },
      createBindings('production'),
    )

    expect(beforeSubmit.status).toBe(409)
    await expect(beforeSubmit.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: 'PRACTICE_NOT_SUBMITTED',
      },
    })
    expect(otherResponse.status).toBe(403)
  })

  it('rejects edits after a practice attempt is submitted', async () => {
    const { cookie, practiceSetId } = await prepareUnlockedPracticeUser(
      'practice-submitted-edit@example.com',
    )
    const { body } = await startPractice(cookie, practiceSetId)
    const question = body.data.questions[0]
    const choiceId = question?.choices[0]?.id

    if (question === undefined || choiceId === undefined) {
      throw new Error('Practice question or choice was not returned.')
    }

    await app.request(
      `/api/student/practice-attempts/${body.data.attempt.publicId}/submit`,
      { method: 'POST', headers: { cookie } },
      createBindings('production'),
    )
    const response = await app.request(
      `/api/student/practice-attempts/${body.data.attempt.publicId}/answers/${question.id}`,
      {
        method: 'PUT',
        headers: {
          cookie,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ selectedChoiceId: choiceId }),
      },
      createBindings('production'),
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: 'ATTEMPT_ALREADY_SUBMITTED',
      },
    })
  })

  it('enforces maximum attempts when configured', async () => {
    const email = 'practice-max-attempt@example.com'
    const { cookie } = await register(email)
    await enrollUser(email)
    const limitedPracticeSetId = await createTestPracticeSet('published', 1)

    const firstResponse = await app.request(
      `/api/student/practice-sets/${limitedPracticeSetId}/attempts`,
      { method: 'POST', headers: { cookie } },
      createBindings('production'),
    )
    const secondResponse = await app.request(
      `/api/student/practice-sets/${limitedPracticeSetId}/attempts`,
      { method: 'POST', headers: { cookie } },
      createBindings('production'),
    )

    expect(firstResponse.status).toBe(201)
    expect(secondResponse.status).toBe(409)
    await expect(secondResponse.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: 'MAXIMUM_ATTEMPTS_REACHED',
      },
    })
  })
})

describe('Password hashing', () => {
  it('uses the Worker-supported PBKDF2 work factor and verifies it', async () => {
    const storedHash = await hashPassword(validPassword)
    const secondStoredHash = await hashPassword(validPassword)

    expect(storedHash).toMatch(
      /^pbkdf2-sha256\$v1\$100000\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/u,
    )
    expect(secondStoredHash).not.toBe(storedHash)
    await expect(
      verifyPassword(validPassword, storedHash),
    ).resolves.toBe(true)
    await expect(
      verifyPassword('WrongPassword123', storedHash),
    ).resolves.toBe(false)
  })

  it('rejects malformed password records without throwing', async () => {
    const malformedHashes = [
      '',
      'pbkdf2-sha256$v1$not-a-number$salt$hash',
      'pbkdf2-sha256$v1$100000$salt',
      'unknown$v1$100000$salt$hash',
      'pbkdf2-sha256$v2$100000$salt$hash',
    ]

    for (const storedHash of malformedHashes) {
      await expect(
        verifyPassword(validPassword, storedHash),
      ).resolves.toBe(false)
    }
  })

  it('rejects excessive iteration values before deriving a hash', async () => {
    const supportedHash = await hashPassword(validPassword)
    const excessiveHash = supportedHash.replace(
      '$100000$',
      '$600000$',
    )

    await expect(
      verifyPassword(validPassword, excessiveHash),
    ).resolves.toBe(false)
  })
})

describe('Authentication API', () => {
  it('normalizes a valid mixed-case email before storing it', async () => {
    const password = validPassword
    const { response, cookie } = await register(
      'JuanDelaCruz@example.com',
    )
    const responseText = await response.text()
    const rawToken = cookie.slice('cse_session='.length)
    const expectedTokenHash = await hashSessionToken(rawToken)
    const stored = await env.DB.prepare(
      `SELECT
        users.password_hash,
        user_sessions.token_hash,
        user_sessions.expires_at,
        user_sessions.revoked_at,
        users.role,
        users.status
      FROM users
      INNER JOIN user_sessions ON user_sessions.user_id = users.id
      WHERE users.email = ?1`,
    )
      .bind('juandelacruz@example.com')
      .first<StoredAuthenticationRow>()
    const setCookie = response.headers.get('set-cookie')

    expect(response.status).toBe(201)
    expect(responseText).not.toContain('password')
    expect(responseText).not.toContain('token')
    expect(responseText).toContain('juandelacruz@example.com')
    expect(stored).not.toBeNull()
    expect(stored?.password_hash).toMatch(
      /^pbkdf2-sha256\$v1\$100000\$/u,
    )
    expect(stored?.password_hash).not.toContain(password)
    expect(stored?.token_hash).toBe(expectedTokenHash)
    expect(stored?.token_hash).not.toBe(rawToken)
    expect(stored?.role).toBe('student')
    expect(stored?.status).toBe('active')
    expect(setCookie).toContain('HttpOnly')
    expect(setCookie).toContain('Secure')
    expect(setCookie).toContain('SameSite=Lax')
    expect(setCookie).toContain('Path=/')
  })

  it('registers and logs in with a 100,000-iteration password record', async () => {
    const email = 'worker-limit-login@example.com'
    const { response: registrationResponse } = await register(email)
    const stored = await env.DB.prepare(
      'SELECT password_hash FROM users WHERE email = ?1',
    )
      .bind(email)
      .first<{ password_hash: string }>()
    const loginResponse = await app.request(
      '/api/auth/login',
      jsonRequest({
        email,
        password: validPassword,
      }),
      createBindings('production'),
    )

    expect(registrationResponse.status).toBe(201)
    expect(stored?.password_hash).toMatch(
      /^pbkdf2-sha256\$v1\$100000\$/u,
    )
    expect(loginResponse.status).toBe(200)
    expect(loginResponse.headers.get('set-cookie')).toContain(
      'cse_session=',
    )
  })

  it('trims leading and trailing email spaces before storing it', async () => {
    const email = 'spaced.email@example.com'
    const { response } = await register(`  ${email}  `)
    const stored = await env.DB.prepare(
      'SELECT email FROM users WHERE email = ?1',
    )
      .bind(email)
      .first<{ email: string }>()

    expect(response.status).toBe(201)
    expect(stored?.email).toBe(email)
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        user: {
          email,
        },
      },
    })
  })

  it('returns a field error for an invalid email', async () => {
    await expectRegistrationFieldError(
      {
        email: 'not-an-email',
        password: validPassword,
        firstName: 'Invalid',
        lastName: 'Email',
      },
      'email',
      'Enter a valid email address.',
    )
  })

  it.each(passwordValidationCases)(
    'returns a password field error when it is $name',
    async ({ password, message }) => {
      await expectRegistrationFieldError(
        {
          email: `password-validation-${crypto.randomUUID()}@example.com`,
          password,
          firstName: 'Password',
          lastName: 'Validation',
        },
        'password',
        message,
      )
    },
  )

  it('returns field errors for missing first and last names', async () => {
    const responseBody = await expectRegistrationFieldError(
      {
        email: 'missing-names@example.com',
        password: validPassword,
        firstName: '',
        lastName: '  ',
      },
      'firstName',
      'First name is required.',
    )

    expect(
      responseBody.error.details?.fieldErrors.lastName,
    ).toContain('Last name is required.')
  })

  it('restores a session with me and rejects expired sessions', async () => {
    const email = 'session-expiry@example.com'
    const { cookie } = await register(email)
    const authenticatedResponse = await app.request(
      '/api/auth/me',
      {
        headers: {
          cookie,
        },
      },
      createBindings('production'),
    )

    expect(authenticatedResponse.status).toBe(200)
    await expect(authenticatedResponse.json()).resolves.toMatchObject({
      success: true,
      data: {
        user: {
          email,
          role: 'student',
        },
      },
    })

    await env.DB.prepare(
      `UPDATE user_sessions
      SET expires_at = '2000-01-01T00:00:00.000Z'
      WHERE user_id = (SELECT id FROM users WHERE email = ?1)`,
    )
      .bind(email)
      .run()

    const expiredResponse = await app.request(
      '/api/auth/me',
      {
        headers: {
          cookie,
        },
      },
      createBindings('production'),
    )

    expect(expiredResponse.status).toBe(401)
    await expect(expiredResponse.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: 'UNAUTHENTICATED',
      },
    })
  })

  it('revokes the server session on logout', async () => {
    const email = 'logout@example.com'
    const { cookie } = await register(email)
    const logoutResponse = await app.request(
      '/api/auth/logout',
      jsonRequest({}, cookie),
      createBindings('production'),
    )
    const stored = await env.DB.prepare(
      `SELECT user_sessions.revoked_at
      FROM user_sessions
      INNER JOIN users ON users.id = user_sessions.user_id
      WHERE users.email = ?1`,
    )
      .bind(email)
      .first<{ revoked_at: string | null }>()
    const meResponse = await app.request(
      '/api/auth/me',
      {
        headers: {
          cookie,
        },
      },
      createBindings('production'),
    )

    expect(logoutResponse.status).toBe(200)
    expect(logoutResponse.headers.get('set-cookie')).toContain(
      'cse_session=',
    )
    expect(stored?.revoked_at).not.toBeNull()
    expect(meResponse.status).toBe(401)
  })

  it('uses the same generic failure for unknown email and wrong password', async () => {
    const email = 'generic-login@example.com'
    await register(email)

    const wrongPasswordResponse = await app.request(
      '/api/auth/login',
      jsonRequest({
        email,
        password: 'WrongPassword123',
      }),
      createBindings('production'),
    )
    const unknownEmailResponse = await app.request(
      '/api/auth/login',
      jsonRequest({
        email: 'unknown-login@example.com',
        password: 'WrongPassword123',
      }),
      createBindings('production'),
    )
    const wrongPasswordBody =
      await wrongPasswordResponse.json<ApiErrorBody>()
    const unknownEmailBody =
      await unknownEmailResponse.json<ApiErrorBody>()

    expect(wrongPasswordResponse.status).toBe(401)
    expect(unknownEmailResponse.status).toBe(401)
    expect({
      code: wrongPasswordBody.error.code,
      message: wrongPasswordBody.error.message,
    }).toEqual({
      code: unknownEmailBody.error.code,
      message: unknownEmailBody.error.message,
    })
    expect(wrongPasswordBody.error).toMatchObject({
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password.',
    })
  })

  it('rejects suspended accounts and revokes their active sessions', async () => {
    const email = 'suspended@example.com'
    const { cookie } = await register(email)

    await env.DB.prepare(
      `UPDATE users SET status = 'suspended' WHERE email = ?1`,
    )
      .bind(email)
      .run()

    const meResponse = await app.request(
      '/api/auth/me',
      {
        headers: {
          cookie,
        },
      },
      createBindings('production'),
    )
    const loginResponse = await app.request(
      '/api/auth/login',
      jsonRequest({
        email,
        password: validPassword,
      }),
      createBindings('production'),
    )
    const stored = await env.DB.prepare(
      `SELECT user_sessions.revoked_at
      FROM user_sessions
      INNER JOIN users ON users.id = user_sessions.user_id
      WHERE users.email = ?1`,
    )
      .bind(email)
      .first<{ revoked_at: string | null }>()

    expect(meResponse.status).toBe(403)
    expect(loginResponse.status).toBe(403)
    await expect(meResponse.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: 'ACCOUNT_SUSPENDED',
      },
    })
    expect(stored?.revoked_at).not.toBeNull()
  })

  it('enforces student and admin roles from D1', async () => {
    const email = 'role-check@example.com'
    const { cookie } = await register(email)
    const studentResponse = await app.request(
      '/api/admin/auth-check',
      {
        headers: {
          cookie,
        },
      },
      createBindings('production'),
    )

    expect(studentResponse.status).toBe(403)

    await env.DB.prepare(
      `UPDATE users SET role = 'admin' WHERE email = ?1`,
    )
      .bind(email)
      .run()

    const adminResponse = await app.request(
      '/api/admin/auth-check',
      {
        headers: {
          cookie,
        },
      },
      createBindings('production'),
    )
    const responseText = await adminResponse.text()

    expect(adminResponse.status).toBe(200)
    expect(responseText).toContain('"authorized":true')
    expect(responseText).toContain('"role":"admin"')
    expect(responseText).not.toContain('internalUserId')
  })

  it('rejects client attempts to choose a role', async () => {
    const response = await app.request(
      '/api/auth/register',
      jsonRequest({
        email: 'client-role@example.com',
        password: validPassword,
        firstName: 'Client',
        lastName: 'Role',
        role: 'admin',
      }),
      createBindings('production'),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        details: {
          fieldErrors: {},
        },
      },
    })
  })
})
