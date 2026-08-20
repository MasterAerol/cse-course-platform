import { env } from 'cloudflare:workers'
import { describe, expect, it, vi } from 'vitest'

import migration0008Sql from '../migrations/0008_upgrade_percentages_course_content.sql?raw'
import percentageGridSvg from '../public/images/percentage-grid-25.svg?raw'
import { percentageExampleContent } from '../scripts/lib/visual-teaching-content.mjs'
import { percentageLessonSpecs } from '../scripts/lib/percentage-teaching-system-content.mjs'
import { fractionsLessonSpecs } from '../scripts/lib/fractions-teaching-system-content.mjs'
import { decimalsLessonSpecs } from '../scripts/lib/decimals-teaching-system-content.mjs'
import { ratioProportionLessonSpecs } from '../scripts/lib/ratio-proportion-teaching-system-content.mjs'
import { app } from '../src/worker'
import {
  hashPassword,
  verifyPassword,
} from '../src/worker/auth/password'
import { hashSessionToken } from '../src/worker/auth/session'
import {
  generateValidatedQuestion,
  getRegisteredGenerators,
} from '../src/worker/generators/generator.registry'
import { getPracticeEditorVisibility } from '../src/react-app/pages/admin/practice-editor-visibility'
import {
  addFractions,
  compareFractions,
  divideFractions,
  fractionIdentity,
  fractionsEqual,
  greatestCommonDivisor,
  improperToMixed,
  leastCommonMultiple,
  mixedToImproper,
  multiplyFractions,
  normalizeFraction,
  simplifyFraction,
  subtractFractions,
} from '../src/worker/domain/fractions/fraction-math'
import {
  calculateDirectProportion,
  calculateInverseProportion,
  compareRatios,
  greatestCommonDivisor as ratioGreatestCommonDivisor,
  normalizeRatio,
  normalizeUnitQuantity,
  ratioIdentity,
  ratiosEqual,
  shareInRatio,
  simplifyRatio,
  solveProportion,
} from '../src/worker/domain/ratios/ratio-math'
import {
  arithmeticMean,
  averagesEqual,
  combinedMean,
  meanAfterAdding,
  meanAfterRemoving,
  missingValueForMean,
  requiredValueForTargetMean,
  roundAverage,
  sumValues,
  weightedMean,
} from '../src/worker/domain/averages/average-math'
import {
  consecutiveSequence,
  constructTwoDigitNumber,
  divideByRational,
  hasParity,
  hasRemainder,
  isConsecutiveParitySequence,
  quotientAndRemainder,
  rational,
  rationalToInteger,
  reverseTwoDigitNumber,
  smallestPositiveWithRemainders,
  solveLinearPair,
  uniqueIntegerSolutions,
} from '../src/worker/domain/number-problems/number-problem-math'
import {
  ageDifference,
  ageInFuture,
  ageInPast,
  ageSum,
  reduceAgeRatio,
  representPresentAge,
  solveElapsedTimeForRatio,
  solveTwoPersonAgeSystem,
  uniqueIntegerAgeSolutions,
} from '../src/worker/domain/age-problems/age-problem-math'
import {
  hasConstantAgeDifference,
  hasUniqueAgeSolution,
  isRealisticAge,
  ratioMatchesAtTime,
  validateParentChildAges,
} from '../src/worker/domain/age-problems/age-problem-validation'
import { recomputeAgeProblemAnswer } from '../src/worker/generators/age-problems/age-problem-generators'
import {
  WHOLE_JOB,
  combinedRates as combineWorkRates,
  evaluateWorkTimeline,
  individualRate,
  opposingNetRate,
  rateFromWorkAndTime,
  rational as workRational,
  remainingWork,
  solveUnknownRate,
  timeFromWorkAndRate,
  workFromRateAndTime,
} from '../src/worker/domain/work-rates/work-rate-math'
import { validateTimeline } from '../src/worker/domain/work-rates/work-rate-validation'
import { recomputeWorkRateAnswer } from '../src/worker/generators/work-rates/work-rate-generators'
import {
  averageSpeed as calculateAverageSpeed,
  catchTimeAfterDeparture,
  distanceFromSpeedTime,
  headStartDistance,
  kilometersPerHourToMetersPerSecond,
  meetingTime,
  metersPerSecondToKilometersPerHour,
  sameDirectionRelativeSpeed,
  speedFromDistanceTime,
  timeFromDistanceSpeed,
  travelRational,
} from '../src/worker/domain/distance-speed-time/distance-speed-time-math'
import { recomputeDistanceSpeedTimeAnswer } from '../src/worker/generators/distance-speed-time/distance-speed-time-generators'
import {
  annualRateFromInterest,
  compareInterestOptions,
  daysToYears,
  interestFromMaturity,
  interestRational,
  maturityValue as calculateMaturityValue,
  monthsToYears as interestMonthsToYears,
  percentToAnnualRate,
  principalFromInterest,
  roundMoneyCentavos,
  simpleInterest,
  timeFromInterest,
} from '../src/worker/domain/simple-interest/simple-interest-math'
import { recomputeSimpleInterestAnswer } from '../src/worker/generators/simple-interest/simple-interest-generators'
import { parseLessonBlock } from '../src/worker/schemas/lesson-block.schemas'
import type { Bindings } from '../src/worker/types/bindings'
import type {
  GeneratedQuestion,
  GeneratorDifficulty,
  GeneratorSlug,
} from '../src/worker/generators/generator.types'

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
  public_id: string
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

interface SeededPracticeChoiceRow {
  lesson_slug: string
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
      position: number
      selectedChoice: PracticeChoiceBody | null
      correctChoice: PracticeChoiceBody
      isCorrect: boolean
      pointsAwarded: number
      explanation: string | null
      generator?: {
        slug: string
        version: number
        difficulty: GeneratorDifficulty
      } | null
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
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u


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

const expectedFixedPracticeChoices = {
  'worked-examples': [
    ['84', '35', '240', '8.4'],
    ['180', '36', '1.8', '7.2'],
    ['25%', '24%', '96%', '75%'],
    ['20%', '16.67%', '30%', '120%'],
    ['₱600', '₱200', '₱1,000', '₱775'],
  ],
  'guided-practice': [
    ['81', '18', '450', '8.1'],
    ['160', '64', '1.6', '25.6'],
    ['30%', '27%', '90%', '70%'],
    ['20%', '25%', '50%', '80%'],
    ['₱575', '₱75', '₱425', '₱515'],
  ],
} as const

const expectedQuizChoicesByPosition = [
  ['60%', '35%', '53%', '0.6%'],
  ['37.5%', '3.75%', '375%', '0.375%'],
  ['45', '250', '18', '4.5'],
  ['200', '30', '2', '15'],
  ['15%', '12%', '85%', '0.15%'],
  ['25%', '20%', '30%', '125%'],
  ['15%', '17.65%', '75%', '85%'],
  ['₱960', '₱240', '₱1,440', '₱1,180'],
  ['₱1,000', '₱200', '₱600', '₱825'],
  ['6', '10', '16', '24'],
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

const allowAllRateLimiter: RateLimit = {
  limit() {
    return Promise.resolve({ success: true })
  },
}

function createBindings(
  environment: Bindings['ENVIRONMENT'],
): Bindings {
  return {
    DB: env.DB,
    ENVIRONMENT: environment,
    REGISTRATION_MODE: 'open',
    LOGIN_IP_RATE_LIMITER: allowAllRateLimiter,
    LOGIN_ACCOUNT_RATE_LIMITER: allowAllRateLimiter,
    REGISTRATION_RATE_LIMITER: allowAllRateLimiter,
    ATTEMPT_RATE_LIMITER: allowAllRateLimiter,
    AUTOSAVE_RATE_LIMITER: allowAllRateLimiter,
    ADMIN_RATE_LIMITER: allowAllRateLimiter,
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

  const registeredUser = await env.DB.prepare(
    'SELECT id FROM users WHERE email = ?1',
  )
    .bind(email)
    .first<{ id: number }>()
  if (registeredUser !== null) {
    await env.DB.prepare(
      'DELETE FROM course_enrollments WHERE user_id = ?1',
    ).bind(registeredUser.id).run()
  }

  return {
    response,
    cookie: getCookieHeader(response),
  }
}

async function registerAdmin(email: string): Promise<{ cookie: string }> {
  const { cookie } = await register(email)

  await env.DB.prepare(
    `UPDATE users SET role = 'admin' WHERE email = ?1`,
  )
    .bind(email)
    .run()

  return { cookie }
}

function adminJsonRequest(
  body: Record<string, unknown>,
  cookie: string,
  method = 'POST',
): RequestInit {
  const request = jsonRequest(body, cookie)
  const headers = new Headers(request.headers)
  headers.set('x-cse-admin-csrf', 'same-origin-admin-mutation')

  return {
    ...request,
    method,
    headers,
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

async function getSeededFixedPracticeChoices(): Promise<SeededPracticeChoiceRow[]> {
  const rows = await env.DB.prepare(
    `SELECT
      lessons.slug AS lesson_slug,
      practice_questions.id AS question_id,
      practice_questions.position AS question_position,
      practice_questions.prompt,
      practice_question_choices.id AS choice_id,
      practice_question_choices.choice_text,
      practice_question_choices.is_correct,
      practice_question_choices.position AS choice_position
    FROM practice_questions
    INNER JOIN practice_sets
      ON practice_sets.id = practice_questions.practice_set_id
    INNER JOIN lessons
      ON lessons.id = practice_sets.lesson_id
    INNER JOIN practice_question_choices
      ON practice_question_choices.question_id = practice_questions.id
    WHERE lessons.slug IN ('worked-examples', 'guided-practice')
      AND practice_questions.status = 'active'
    ORDER BY
      lessons.slug,
      practice_questions.position,
      practice_question_choices.position`,
  ).all<SeededPracticeChoiceRow>()

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

async function savePracticeAttemptAnswer(input: {
  cookie: string
  attemptPublicId: string
  questionId: number
  selectedChoiceId: number
}): Promise<Response> {
  return app.request(
    `/api/student/practice-attempts/${input.attemptPublicId}/answers/${input.questionId}`,
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

async function submitPracticeAttemptForTest(
  cookie: string,
  attemptPublicId: string,
): Promise<{ response: Response; body: PracticeResultBody }> {
  const response = await app.request(
    `/api/student/practice-attempts/${attemptPublicId}/submit`,
    { method: 'POST', headers: { cookie } },
    createBindings('production'),
  )
  const body = await response.json<PracticeResultBody>()

  return { response, body }
}

async function getGeneratedCorrectChoiceIds(
  attemptPublicId: string,
): Promise<Map<number, number>> {
  const rows = await env.DB.prepare(
    `SELECT
      generated_question_snapshots.id AS snapshot_id,
      generated_question_choices.id AS choice_id
    FROM generated_question_snapshots
    INNER JOIN practice_attempts
      ON practice_attempts.id = generated_question_snapshots.practice_attempt_id
    INNER JOIN generated_question_choices
      ON generated_question_choices.snapshot_id = generated_question_snapshots.id
    WHERE practice_attempts.public_id = ?1
      AND generated_question_choices.is_correct = 1`,
  )
    .bind(attemptPublicId)
    .all<{ snapshot_id: number; choice_id: number }>()

  return new Map(
    rows.results.map((row) => [row.snapshot_id, row.choice_id]),
  )
}

async function getGeneratedCanonicalSignatures(
  attemptPublicId: string,
): Promise<string[]> {
  const rows = await env.DB.prepare(
    `SELECT generated_question_snapshots.metadata_json
    FROM generated_question_snapshots
    INNER JOIN practice_attempts
      ON practice_attempts.id = generated_question_snapshots.practice_attempt_id
    WHERE practice_attempts.public_id = ?1
    ORDER BY generated_question_snapshots.source_position`,
  )
    .bind(attemptPublicId)
    .all<{ metadata_json: string }>()

  return rows.results.map((row) => {
    const metadata = JSON.parse(row.metadata_json) as {
      canonicalSignature: string
    }

    return metadata.canonicalSignature
  })
}

function expectedGeneratedAnswer(question: GeneratedQuestion): number {
  const parameters = question.parameters

  if (question.generatorSlug === 'finding-percentage') {
    return (
      (parameters.ratePercent as number) /
      100 *
      (parameters.base as number)
    )
  }

  if (question.generatorSlug === 'finding-base') {
    return (
      (parameters.percentageAmount as number) /
      ((parameters.ratePercent as number) / 100)
    )
  }

  return (
    (parameters.percentageAmount as number) /
    (parameters.base as number) *
    100
  )
}

function normalizedGeneratedNumber(value: number): string {
  return value.toFixed(4)
}

function generatedChoiceNumericIdentity(choiceText: string): string {
  const normalizedText = choiceText.replace('₱', '').replaceAll(',', '')
  const numericText = normalizedText.endsWith('%')
    ? normalizedText.slice(0, -1)
    : normalizedText
  const numericValue = Number(numericText)

  return normalizedGeneratedNumber(numericValue)
}

const percentageGeneratorSlugs = new Set<GeneratorSlug>([
  'finding-percentage',
  'finding-base',
  'finding-rate',
])

const fractionGeneratorSlugs = new Set<GeneratorSlug>([
  'equivalent-fractions',
  'simplifying-fractions',
  'comparing-fractions',
  'adding-fractions',
  'subtracting-fractions',
  'multiplying-fractions',
  'dividing-fractions',
])

const decimalGeneratorSlugs = new Set<GeneratorSlug>([
  'comparing-decimals',
  'rounding-decimals',
  'adding-decimals',
  'subtracting-decimals',
  'multiplying-decimals',
  'dividing-decimals',
  'decimal-conversions',
])

const ratioGeneratorSlugs = new Set<GeneratorSlug>([
  'simplifying-ratios',
  'equivalent-ratios',
  'comparing-ratios',
  'solving-proportions',
  'direct-proportion',
  'inverse-proportion',
  'ratio-sharing',
  'ratio-word-problems',
])

const averageGeneratorSlugs = new Set<GeneratorSlug>([
  'finding-average',
  'missing-value-average',
  'combined-average',
  'weighted-average',
  'average-after-adding',
  'average-after-removing',
  'average-age',
  'average-score-salary',
])

const numberProblemGeneratorSlugs = new Set<GeneratorSlug>([
  'consecutive-integers',
  'consecutive-odd-even-integers',
  'sum-difference-numbers',
  'product-quotient-numbers',
  'two-digit-number-problems',
  'reversed-digit-problems',
  'remainder-number-problems',
  'fractional-part-number-problems',
  'mixed-number-relationships',
])

const ageProblemGeneratorSlugs = new Set<GeneratorSlug>([
  'present-age-equations',
  'past-age-problems',
  'future-age-problems',
  'age-difference',
  'sum-of-ages',
  'age-ratios',
  'parent-child-ages',
  'sibling-group-ages',
  'mixed-age-relationships',
])

const workRateGeneratorSlugs = new Set<GeneratorSlug>([
  'individual-work-rate',
  'combined-work-rate',
  'worker-joins-later',
  'worker-leaves-early',
  'pipes-filling',
  'pipes-filling-draining',
  'efficiency-work-rates',
  'unknown-work-time',
  'mixed-work-rate',
])

const distanceSpeedTimeGeneratorSlugs = new Set<GeneratorSlug>([
  'distance-from-speed-time',
  'speed-from-distance-time',
  'time-from-distance-speed',
  'travel-unit-conversions',
  'average-speed',
  'same-direction-relative-speed',
  'opposite-direction-relative-speed',
  'meeting-and-overtaking',
  'mixed-distance-speed-time',
])

const simpleInterestGeneratorSlugs = new Set<GeneratorSlug>([
  'simple-interest',
  'principal-from-interest',
  'rate-from-interest',
  'time-from-interest',
  'maturity-value',
  'interest-time-conversions',
  'compare-interest-options',
  'loan-savings-applications',
  'mixed-simple-interest',
])

function registeredPercentageGenerators() {
  return getRegisteredGenerators().filter((generator) =>
    percentageGeneratorSlugs.has(generator.slug),
  )
}

function registeredFractionGenerators() {
  return getRegisteredGenerators().filter((generator) =>
    fractionGeneratorSlugs.has(generator.slug),
  )
}

function registeredDecimalGenerators() {
  return getRegisteredGenerators().filter((generator) =>
    decimalGeneratorSlugs.has(generator.slug),
  )
}

function registeredRatioGenerators() {
  return getRegisteredGenerators().filter((generator) =>
    ratioGeneratorSlugs.has(generator.slug),
  )
}

function registeredAverageGenerators() {
  return getRegisteredGenerators().filter((generator) =>
    averageGeneratorSlugs.has(generator.slug),
  )
}

function registeredNumberProblemGenerators() {
  return getRegisteredGenerators().filter((generator) =>
    numberProblemGeneratorSlugs.has(generator.slug),
  )
}

function registeredAgeProblemGenerators() {
  return getRegisteredGenerators().filter((generator) =>
    ageProblemGeneratorSlugs.has(generator.slug),
  )
}

function registeredWorkRateGenerators() {
  return getRegisteredGenerators().filter((generator) =>
    workRateGeneratorSlugs.has(generator.slug),
  )
}

function registeredDistanceSpeedTimeGenerators() {
  return getRegisteredGenerators().filter((generator) => distanceSpeedTimeGeneratorSlugs.has(generator.slug))
}

function registeredSimpleInterestGenerators() {
  return getRegisteredGenerators().filter((generator) => simpleInterestGeneratorSlugs.has(generator.slug))
}

function expectGeneratedQuestionValid(question: GeneratedQuestion): void {
  const correctChoices = question.choices.filter((choice) => choice.isCorrect)
  const choiceTexts = new Set(question.choices.map((choice) => choice.text))
  const numericIdentities = new Set(
    question.choices.map((choice) =>
      normalizedGeneratedNumber(choice.numericValue),
    ),
  )
  const expectedAnswer = normalizedGeneratedNumber(
    expectedGeneratedAnswer(question),
  )

  expect(question.choices).toHaveLength(4)
  expect(correctChoices).toHaveLength(1)
  expect(choiceTexts.size).toBe(4)
  expect(numericIdentities.size).toBe(4)
  expect(Number.isFinite(expectedGeneratedAnswer(question))).toBe(true)
  expect(correctChoices[0]?.text).toBe(question.explanation.finalAnswer)
  for (const choice of question.choices.filter((candidate) => !candidate.isCorrect)) {
    expect(choice.mistakeType).not.toBeNull()
    expect(choice.distractorType).toBe(choice.mistakeType)
    expect(choice.derivation?.operation).toEqual(expect.any(String))
    expect(choice.derivation?.inputs.length).toBeGreaterThan(0)
    expect(choice.qualityScore).toBeGreaterThanOrEqual(35)
    expect(choice.distractorType).not.toBe('nearby_value')
  }
  expect(
    normalizedGeneratedNumber(correctChoices[0]?.numericValue ?? Number.NaN),
  ).toBe(expectedAnswer)
  expect(generatedChoiceNumericIdentity(question.explanation.finalAnswer)).toBe(
    expectedAnswer,
  )
  if (question.generatorSlug !== 'finding-rate') {
    const ratePercent = question.parameters.ratePercent as number

    expect(question.explanation.steps.join(' ')).toContain(
      String(ratePercent / 100),
    )
  }
  expect(question.metadata.canonicalSignature).toContain(question.generatorSlug)
}

function expectFractionGeneratedQuestionValid(question: GeneratedQuestion): void {
  const correctChoices = question.choices.filter((choice) => choice.isCorrect)
  const choiceTexts = new Set(question.choices.map((choice) => choice.text))
  const parameters = question.parameters as {
    correctIdentity?: unknown
    choiceIdentities?: unknown
  }

  expect(question.metadata.answerKind).toBe('fraction')
  expect(question.choices).toHaveLength(4)
  expect(correctChoices).toHaveLength(1)
  expect(choiceTexts.size).toBe(4)
  expect(Array.isArray(parameters.choiceIdentities)).toBe(true)
  expect(parameters.choiceIdentities).toHaveLength(4)
  expect(new Set(parameters.choiceIdentities as string[]).size).toBe(4)
  expect(parameters.correctIdentity).toEqual(expect.any(String))
  expect(parameters.choiceIdentities).toContain(parameters.correctIdentity)
  expect(correctChoices[0]?.text).toBe(question.explanation.finalAnswer)

  for (const choice of question.choices) {
    expect(Number.isFinite(choice.numericValue)).toBe(true)

    if (!choice.isCorrect) {
      expect(choice.mistakeType).not.toBeNull()
      expect(choice.distractorType).toBe(choice.mistakeType)
      expect(choice.derivation?.operation).toEqual(expect.any(String))
      expect(choice.derivation?.inputs.length).toBeGreaterThan(0)
      expect(choice.qualityScore).toBeGreaterThanOrEqual(35)
    }
  }

  expect(question.metadata.canonicalSignature).toContain(question.generatorSlug)
}

function expectDecimalGeneratedQuestionValid(question: GeneratedQuestion): void {
  const correctChoices = question.choices.filter((choice) => choice.isCorrect)
  const choiceTexts = new Set(question.choices.map((choice) => choice.text))
  const numericIdentities = new Set(
    question.choices.map((choice) => normalizedGeneratedNumber(choice.numericValue)),
  )
  const validation = getRegisteredGenerators()
    .find(
      (generator) =>
        generator.slug === question.generatorSlug &&
        generator.version === question.generatorVersion,
    )
    ?.validate(question)

  expect(validation).toEqual({ valid: true, reason: null })
  expect(question.choices).toHaveLength(4)
  expect(correctChoices).toHaveLength(1)
  expect(choiceTexts.size).toBe(4)
  expect(numericIdentities.size).toBe(4)
  expect(correctChoices[0]?.text).toBe(question.explanation.finalAnswer)
  expect(question.metadata.canonicalSignature).toContain(question.generatorSlug)
  expect(Number.isFinite(correctChoices[0]?.numericValue)).toBe(true)

  for (const choice of question.choices) {
    expect(Number.isFinite(choice.numericValue)).toBe(true)
    expect(Number.isNaN(choice.numericValue)).toBe(false)

    if (question.metadata.answerKind === 'money') {
      expect(choice.text).toMatch(/^\u20b1\d+(?:\.\d{1,2})?$/u)
    }

    if (!choice.isCorrect) {
      expect(choice.mistakeType).not.toBeNull()
      expect(choice.distractorType).toBe(choice.mistakeType)
      expect(choice.derivation?.operation).toEqual(expect.any(String))
      expect(choice.derivation?.inputs.length).toBeGreaterThan(0)
      expect(choice.qualityScore).toBeGreaterThanOrEqual(35)
    }
  }
}

function expectRatioGeneratedQuestionValid(question: GeneratedQuestion): void {
  const generator = getRegisteredGenerators().find(
    (item) =>
      item.slug === question.generatorSlug &&
      item.version === question.generatorVersion,
  )
  const correctChoices = question.choices.filter((choice) => choice.isCorrect)
  const choiceIdentities = question.parameters.choiceIdentities

  expect(generator?.validate(question)).toEqual({ valid: true, reason: null })
  expect(question.choices).toHaveLength(4)
  expect(correctChoices).toHaveLength(1)
  expect(new Set(question.choices.map((choice) => choice.text)).size).toBe(4)
  expect(Array.isArray(choiceIdentities)).toBe(true)
  expect(new Set(choiceIdentities as string[]).size).toBe(4)
  expect(choiceIdentities).toContain(question.parameters.correctIdentity)
  expect(correctChoices[0]?.text).toBe(question.explanation.finalAnswer)
  expect(question.metadata.canonicalSignature).toContain(question.generatorSlug)

  for (const choice of question.choices) {
    expect(Number.isFinite(choice.numericValue)).toBe(true)

    if (!choice.isCorrect) {
      expect(choice.mistakeType).not.toBeNull()
      expect(choice.distractorType).toBe(choice.mistakeType)
      expect(choice.derivation?.operation).toEqual(expect.any(String))
      expect(choice.derivation?.inputs.length).toBeGreaterThan(0)
      expect(choice.qualityScore).toBeGreaterThanOrEqual(35)
    }
  }
}

function expectAverageGeneratedQuestionValid(question: GeneratedQuestion): void {
  const generator = getRegisteredGenerators().find(
    (item) => item.slug === question.generatorSlug && item.version === question.generatorVersion,
  )
  const correctChoices = question.choices.filter((choice) => choice.isCorrect)
  const identities = question.parameters.choiceIdentities

  expect(generator?.validate(question)).toEqual({ valid: true, reason: null })
  expect(question.choices).toHaveLength(4)
  expect(correctChoices).toHaveLength(1)
  expect(new Set(question.choices.map((choice) => choice.text)).size).toBe(4)
  expect(Array.isArray(identities)).toBe(true)
  expect(new Set(identities as string[]).size).toBe(4)
  expect(identities).toContain(question.parameters.correctIdentity)
  expect(correctChoices[0]?.text).toBe(question.explanation.finalAnswer)
  expect(question.metadata.canonicalSignature).toContain(question.generatorSlug)

  for (const choice of question.choices) {
    expect(Number.isFinite(choice.numericValue)).toBe(true)
    if (!choice.isCorrect) {
      expect(choice.mistakeType).not.toBeNull()
      expect(choice.distractorType).toBe(choice.mistakeType)
      expect(choice.derivation?.operation).toEqual(expect.any(String))
      expect(choice.derivation?.inputs.length).toBeGreaterThan(0)
      expect(choice.qualityScore).toBeGreaterThanOrEqual(35)
    }
  }
}

function expectNumberProblemGeneratedQuestionValid(question: GeneratedQuestion): void {
  const generator = getRegisteredGenerators().find(
    (item) => item.slug === question.generatorSlug && item.version === question.generatorVersion,
  )
  const correctChoices = question.choices.filter((choice) => choice.isCorrect)
  const identities = question.parameters.choiceIdentities

  expect(generator?.validate(question)).toEqual({ valid: true, reason: null })
  expect(question.choices).toHaveLength(4)
  expect(correctChoices).toHaveLength(1)
  expect(new Set(question.choices.map((choice) => choice.text)).size).toBe(4)
  expect(new Set(question.choices.map((choice) => choice.numericValue)).size).toBe(4)
  expect(Array.isArray(identities)).toBe(true)
  expect(new Set(identities as string[]).size).toBe(4)
  expect(identities).toContain(question.parameters.correctIdentity)
  expect(correctChoices[0]?.text).toBe(question.explanation.finalAnswer)
  expect(question.metadata.canonicalSignature).toContain(question.generatorSlug)
  expect(question.prompt.trim().length).toBeGreaterThan(20)

  for (const choice of question.choices) {
    expect(Number.isFinite(choice.numericValue)).toBe(true)
    expect(Number.isInteger(choice.numericValue)).toBe(true)
    if (!choice.isCorrect) {
      expect(choice.mistakeType).not.toBeNull()
      expect(choice.distractorType).toBe(choice.mistakeType)
      expect(choice.derivation?.operation).toEqual(expect.any(String))
      expect(choice.derivation?.inputs.length).toBeGreaterThan(0)
      expect(choice.qualityScore).toBeGreaterThanOrEqual(35)
    }
  }
}

function expectAgeProblemGeneratedQuestionValid(question: GeneratedQuestion): void {
  const generator = getRegisteredGenerators().find(
    (item) => item.slug === question.generatorSlug && item.version === question.generatorVersion,
  )
  const correctChoices = question.choices.filter((choice) => choice.isCorrect)
  const identities = question.parameters.choiceIdentities
  const presentAges = question.parameters.presentAges
  const pastAges = question.parameters.pastAges

  expect(generator?.validate(question)).toEqual({ valid: true, reason: null })
  expect(recomputeAgeProblemAnswer(question)).toBe(correctChoices[0]?.numericValue)
  expect(question.choices).toHaveLength(4)
  expect(correctChoices).toHaveLength(1)
  expect(new Set(question.choices.map((choice) => choice.text)).size).toBe(4)
  expect(new Set(question.choices.map((choice) => choice.numericValue)).size).toBe(4)
  expect(Array.isArray(identities)).toBe(true)
  expect(new Set(identities as string[]).size).toBe(4)
  expect(correctChoices[0]?.text).toBe(question.explanation.finalAnswer)
  expect(question.metadata.canonicalSignature).toContain(question.generatorSlug)
  expect(question.prompt.trim().length).toBeGreaterThan(20)
  expect(Array.isArray(presentAges)).toBe(true)
  for (const age of presentAges as number[]) expect(isRealisticAge(age, 'general')).toBe(true)
  if (Array.isArray(pastAges)) {
    for (const age of pastAges) {
      expect(Number.isInteger(age)).toBe(true)
      expect(age).toBeGreaterThanOrEqual(0)
    }
  }

  for (const choice of question.choices) {
    expect(Number.isFinite(choice.numericValue)).toBe(true)
    expect(Number.isInteger(choice.numericValue)).toBe(true)
    expect(choice.numericValue).toBeGreaterThanOrEqual(0)
    if (!choice.isCorrect) {
      expect(choice.mistakeType).not.toBeNull()
      expect(choice.distractorType).toBe(choice.mistakeType)
      expect(choice.derivation?.operation).toEqual(expect.any(String))
      expect(choice.derivation?.inputs.length).toBeGreaterThan(0)
      expect(choice.qualityScore).toBeGreaterThanOrEqual(35)
    }
  }
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
      '16',
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

  it('uses mistake-derived distractors for every Percentages Topic Quiz question', async () => {
    const seededChoices = await getSeededQuizChoices()

    for (const [index, expectedChoices] of expectedQuizChoicesByPosition.entries()) {
      const questionPosition = index + 1
      const choices = seededChoices.filter(
        (choice) => choice.question_position === questionPosition,
      )

      expect(choices.map((choice) => choice.choice_text)).toEqual(
        expectedChoices,
      )
      expect(choices.filter((choice) => choice.is_correct === 1)).toHaveLength(
        1,
      )
      expect(choices[0]?.is_correct).toBe(1)
      expect(new Set(choices.map((choice) => choice.choice_text)).size).toBe(4)
    }
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

  it('scores every seeded quiz distractor as incorrect with consistent result text', async () => {
    const seededChoices = await getSeededQuizChoices()
    const choicesByQuestionPosition = new Map<number, SeededQuizChoiceRow[]>()

    for (const choice of seededChoices) {
      const existing =
        choicesByQuestionPosition.get(choice.question_position) ?? []
      existing.push(choice)
      choicesByQuestionPosition.set(choice.question_position, existing)
    }

    for (const [questionPosition, choices] of choicesByQuestionPosition) {
      const correctChoice = choices.find((choice) => choice.is_correct === 1)

      if (correctChoice === undefined) {
        throw new Error(`Question ${questionPosition} has no correct choice.`)
      }

      for (const distractor of choices.filter((choice) => choice.is_correct === 0)) {
        const email = `seeded-quiz-distractor-${questionPosition}-${distractor.choice_position}@example.com`
        const { cookie, quizId } = await prepareUnlockedQuizUser(email)
        const { body } = await startQuiz(cookie, quizId)
        const attemptQuestion = body.data.questions.find(
          (question) => question.position === questionPosition,
        )
        const attemptDistractor = attemptQuestion?.choices.find(
          (choice) => choice.text === distractor.choice_text,
        )

        if (attemptQuestion === undefined || attemptDistractor === undefined) {
          throw new Error(
            `Question ${questionPosition} distractor ${distractor.choice_text} was not returned.`,
          )
        }

        const saveResponse = await saveQuizAttemptAnswer({
          cookie,
          attemptPublicId: body.data.attempt.publicId,
          questionId: attemptQuestion.id,
          selectedChoiceId: attemptDistractor.id,
        })
        const { response, body: result } = await submitQuizAttemptForTest(
          cookie,
          body.data.attempt.publicId,
        )
        const questionResult = result.data.questions.find(
          (question) => question.position === questionPosition,
        )

        expect(saveResponse.status).toBe(200)
        expect(response.status).toBe(200)
        expect(questionResult?.selectedChoice).toEqual(attemptDistractor)
        expect(questionResult?.correctChoice.text).toBe(
          correctChoice.choice_text,
        )
        expect(questionResult?.selectedChoice?.text).not.toBe(
          questionResult?.correctChoice.text,
        )
        expect(questionResult?.isCorrect).toBe(false)
        expect(questionResult?.pointsAwarded).toBe(0)
      }
    }
  }, 20_000)

  it('keeps submitted quiz result text stable when choice rows later change', async () => {
    const { cookie } = await prepareUnlockedQuizUser(
      'quiz-choice-snapshot@example.com',
    )
    const quizId = await createTestQuiz('published')
    const { body } = await startQuiz(cookie, quizId)
    const question = body.data.questions[0]
    const correctChoice = question?.choices.find(
      (choice) => choice.text === '10',
    )

    if (question === undefined || correctChoice === undefined) {
      throw new Error('Seeded quiz question was not returned.')
    }

    await saveQuizAttemptAnswer({
      cookie,
      attemptPublicId: body.data.attempt.publicId,
      questionId: question.id,
      selectedChoiceId: correctChoice.id,
    })
    const submitted = await submitQuizAttemptForTest(
      cookie,
      body.data.attempt.publicId,
    )

    expect(submitted.response.status).toBe(200)

    await env.DB.prepare(
      `UPDATE question_choices
      SET choice_text = 'changed after submit'
      WHERE id = ?1`,
    )
      .bind(correctChoice.id)
      .run()

    const response = await app.request(
      `/api/student/quiz-attempts/${body.data.attempt.publicId}/results`,
      { headers: { cookie } },
      createBindings('production'),
    )
    const result = await response.json<QuizResultBody>()
    const questionResult = result.data.questions.find(
      (candidate) => candidate.position === question.position,
    )

    expect(response.status).toBe(200)
    expect(questionResult?.selectedChoice?.text).toBe('10')
    expect(questionResult?.correctChoice.text).toBe('10')
    expect(questionResult?.isCorrect).toBe(true)
  })

  it('passes at 70%, completes the quiz lesson, and returns explanations after submission', async () => {
    const email = 'passing-quiz@example.com'
    const { cookie, quizId } = await prepareUnlockedQuizUser(email)
    await completeAllPublishedRequiredLessonsExcept(
      email,
      'percentages-topic-quiz',
    )
    const { body } = await startQuiz(cookie, quizId)
    const seededChoices = await getSeededQuizChoices()

    for (const question of body.data.questions.slice(0, 7)) {
      const correctChoiceId = seededChoices.find(
        (choice) =>
          choice.question_id === question.id && choice.is_correct === 1,
      )?.choice_id

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

describe('Dynamic percentage generator engine', () => {
  it('is deterministic for the same seed and preserves generator versions', () => {
    for (const generator of registeredPercentageGenerators()) {
      const first = generator.generate({
        seed: `deterministic-${generator.slug}`,
        difficulty: 'medium',
      })
      const second = generator.generate({
        seed: `deterministic-${generator.slug}`,
        difficulty: 'medium',
      })
      const different = generator.generate({
        seed: `different-${generator.slug}`,
        difficulty: 'medium',
      })

      expect(first).toEqual(second)
      expect(JSON.stringify(first)).not.toBe(JSON.stringify(different))
      expect(first.generatorSlug).toBe(generator.slug)
      expect(first.generatorVersion).toBe(1)
    }
  })

  it('validates 1,000 mathematically correct generated questions per generator', () => {
    const difficulties: readonly GeneratorDifficulty[] = [
      'easy',
      'medium',
      'hard',
    ]

    for (const generator of registeredPercentageGenerators()) {
      for (let index = 0; index < 1_000; index += 1) {
        const difficulty = difficulties[index % difficulties.length]
        const question = generateValidatedQuestion({
          attemptSeed: `math-validation-${generator.slug}-${index}`,
          generatorSlug: generator.slug,
          generatorVersion: generator.version,
          difficulty,
          position: index + 1,
          existingSignatures: new Set<string>(),
        })
        const validation = generator.validate(question)

        expect(validation).toEqual({ valid: true, reason: null })
        expectGeneratedQuestionValid(question)
        expect(question.difficulty).toBe(difficulty)
      }
    }
  })

  it('prevents duplicate canonical signatures within one generated batch', () => {
    const signatures = new Set<string>()
    const questions = Array.from({ length: 5 }, (_, index) => {
      const question = generateValidatedQuestion({
        attemptSeed: 'duplicate-prevention',
        generatorSlug: 'finding-percentage',
        generatorVersion: 1,
        difficulty: index < 2 ? 'easy' : index < 4 ? 'medium' : 'hard',
        position: index + 1,
        existingSignatures: signatures,
      })

      signatures.add(question.metadata.canonicalSignature)

      return question
    })

    expect(questions).toHaveLength(5)
    expect(signatures.size).toBe(5)
  })
})

describe('Dynamic fractions generator engine', () => {
  it('performs exact fraction arithmetic and mixed-number conversions', () => {
    expect(greatestCommonDivisor(24, 36)).toBe(12)
    expect(leastCommonMultiple(6, 8)).toBe(24)
    expect(normalizeFraction({ numerator: 3, denominator: -9 })).toEqual({
      numerator: -3,
      denominator: 9,
    })
    expect(simplifyFraction({ numerator: 24, denominator: 36 })).toEqual({
      numerator: 2,
      denominator: 3,
    })
    expect(fractionIdentity({ numerator: 10, denominator: 15 })).toBe('2/3')
    expect(fractionsEqual(
      { numerator: 6, denominator: 9 },
      { numerator: 2, denominator: 3 },
    )).toBe(true)
    expect(compareFractions(
      { numerator: 3, denominator: 5 },
      { numerator: 5, denominator: 8 },
    )).toBe(-1)
    expect(addFractions(
      { numerator: 1, denominator: 4 },
      { numerator: 1, denominator: 6 },
    )).toEqual({ numerator: 5, denominator: 12 })
    expect(subtractFractions(
      { numerator: 5, denominator: 6 },
      { numerator: 1, denominator: 3 },
    )).toEqual({ numerator: 1, denominator: 2 })
    expect(multiplyFractions(
      { numerator: 2, denominator: 5 },
      { numerator: 3, denominator: 4 },
    )).toEqual({ numerator: 3, denominator: 10 })
    expect(divideFractions(
      { numerator: 3, denominator: 4 },
      { numerator: 2, denominator: 5 },
    )).toEqual({ numerator: 15, denominator: 8 })
    expect(improperToMixed({ numerator: 17, denominator: 5 })).toEqual({
      whole: 3,
      numerator: 2,
      denominator: 5,
    })
    expect(mixedToImproper({
      whole: 3,
      numerator: 2,
      denominator: 5,
    })).toEqual({ numerator: 17, denominator: 5 })
    expect(() =>
      normalizeFraction({ numerator: 1, denominator: 0 }),
    ).toThrow('denominator cannot be zero')
  })

  it('registers seven versioned fraction generators', () => {
    const generators = registeredFractionGenerators()

    expect(generators.map((generator) => generator.slug)).toEqual([
      'equivalent-fractions',
      'simplifying-fractions',
      'comparing-fractions',
      'adding-fractions',
      'subtracting-fractions',
      'multiplying-fractions',
      'dividing-fractions',
    ])

    for (const generator of generators) {
      expect(generator.version).toBe(1)
      expect(generator.supportedDifficulties).toEqual([
        'easy',
        'medium',
        'hard',
      ])
    }
  })

  it('is deterministic for the same seed and preserves generator versions', () => {
    for (const generator of registeredFractionGenerators()) {
      const first = generator.generate({
        seed: `deterministic-${generator.slug}`,
        difficulty: 'medium',
      })
      const second = generator.generate({
        seed: `deterministic-${generator.slug}`,
        difficulty: 'medium',
      })
      const different = generator.generate({
        seed: `different-${generator.slug}`,
        difficulty: 'medium',
      })

      expect(first).toEqual(second)
      expect(JSON.stringify(first)).not.toBe(JSON.stringify(different))
      expect(first.generatorSlug).toBe(generator.slug)
      expect(first.generatorVersion).toBe(1)
    }
  })

  it('validates 1,000 rationally unique generated questions per generator', () => {
    const difficulties: readonly GeneratorDifficulty[] = [
      'easy',
      'medium',
      'hard',
    ]

    for (const generator of registeredFractionGenerators()) {
      for (let index = 0; index < 1_000; index += 1) {
        const difficulty = difficulties[index % difficulties.length]
        const question = generateValidatedQuestion({
          attemptSeed: `fraction-math-validation-${generator.slug}-${index}`,
          generatorSlug: generator.slug,
          generatorVersion: generator.version,
          difficulty,
          position: index + 1,
          existingSignatures: new Set<string>(),
        })
        const validation = generator.validate(question)

        expect(validation).toEqual({ valid: true, reason: null })
        expectFractionGeneratedQuestionValid(question)
        expect(question.difficulty).toBe(difficulty)
      }
    }
  })
})

describe('Dynamic decimals generator engine', () => {
  it('registers seven versioned decimal generators', () => {
    const generators = registeredDecimalGenerators()

    expect(generators.map((generator) => generator.slug)).toEqual([
      'comparing-decimals',
      'rounding-decimals',
      'adding-decimals',
      'subtracting-decimals',
      'multiplying-decimals',
      'dividing-decimals',
      'decimal-conversions',
    ])

    for (const generator of generators) {
      expect(generator.version).toBe(1)
      expect(generator.supportedDifficulties).toEqual([
        'easy',
        'medium',
        'hard',
      ])
    }
  })

  it('is deterministic for the same seed and preserves immutable snapshots', () => {
    for (const generator of registeredDecimalGenerators()) {
      const first = generator.generate({
        seed: `deterministic-${generator.slug}`,
        difficulty: 'medium',
      })
      const second = generator.generate({
        seed: `deterministic-${generator.slug}`,
        difficulty: 'medium',
      })
      const different = generator.generate({
        seed: `different-${generator.slug}`,
        difficulty: 'medium',
      })

      expect(first).toEqual(second)
      expect(JSON.stringify(first)).not.toBe(JSON.stringify(different))
      expect(first.generatorSlug).toBe(generator.slug)
      expect(first.generatorVersion).toBe(1)
    }
  })

  it('validates 1,000 mathematically correct decimal questions per generator', () => {
    const difficulties: readonly GeneratorDifficulty[] = [
      'easy',
      'medium',
      'hard',
    ]

    for (const generator of registeredDecimalGenerators()) {
      for (let index = 0; index < 1_000; index += 1) {
        const difficulty = difficulties[index % difficulties.length]
        const question = generateValidatedQuestion({
          attemptSeed: `decimal-math-validation-${generator.slug}-${index}`,
          generatorSlug: generator.slug,
          generatorVersion: generator.version,
          difficulty,
          position: index + 1,
          existingSignatures: new Set<string>(),
        })

        expectDecimalGeneratedQuestionValid(question)
        expect(question.difficulty).toBe(difficulty)
      }
    }
  })

  it('prevents duplicate decimal question snapshots in one practice attempt', () => {
    const signatures = new Set<string>()
    const questions = Array.from({ length: 5 }, (_, index) => {
      const question = generateValidatedQuestion({
        attemptSeed: 'decimal-duplicate-prevention',
        generatorSlug: 'adding-decimals',
        generatorVersion: 1,
        difficulty: index < 2 ? 'easy' : index < 4 ? 'medium' : 'hard',
        position: index + 1,
        existingSignatures: signatures,
      })

      signatures.add(question.metadata.canonicalSignature)

      return question
    })

    expect(questions).toHaveLength(5)
    expect(signatures.size).toBe(5)
  })
})

describe('Dynamic ratio and proportion generator engine', () => {
  it('performs exact ratio and proportion arithmetic and rejects invalid values', () => {
    expect(ratioGreatestCommonDivisor(18, 24)).toBe(6)
    expect(normalizeRatio({ left: 3, right: 5 })).toEqual({
      left: 3,
      right: 5,
    })
    expect(simplifyRatio({ left: 18, right: 24 })).toEqual({
      left: 3,
      right: 4,
    })
    expect(ratioIdentity({ left: 12, right: 18 })).toBe('2:3')
    expect(ratiosEqual(
      { left: 3, right: 5 },
      { left: 12, right: 20 },
    )).toBe(true)
    expect(compareRatios(
      { left: 3, right: 5 },
      { left: 4, right: 7 },
    )).toBe(1)
    expect(solveProportion(3, 5, 12)).toBe(20)
    expect(calculateDirectProportion(4, 120, 10)).toBe(300)
    expect(calculateInverseProportion(6, 10, 12)).toBe(5)
    expect(shareInRatio(12_000, { left: 2, right: 3 })).toEqual({
      left: 4_800,
      right: 7_200,
    })
    expect(normalizeUnitQuantity(1, 'm', 'cm')).toBe(100)
    expect(() => normalizeRatio({ left: 0, right: 2 })).toThrow(
      'finite positive',
    )
    expect(() => normalizeRatio({ left: 2, right: 0 })).toThrow(
      'finite positive',
    )
    expect(() => normalizeUnitQuantity(1, 'kg', 'cm')).toThrow(
      'same kind of quantity',
    )
    expect(() => calculateDirectProportion(0, 10, 2)).toThrow(
      'finite positive',
    )
    expect(() => calculateInverseProportion(2, 10, 0)).toThrow(
      'finite positive',
    )
  })

  it('registers eight versioned ratio and proportion generators', () => {
    const generators = registeredRatioGenerators()

    expect(generators.map((generator) => generator.slug)).toEqual([
      'simplifying-ratios',
      'equivalent-ratios',
      'comparing-ratios',
      'solving-proportions',
      'direct-proportion',
      'inverse-proportion',
      'ratio-sharing',
      'ratio-word-problems',
    ])

    for (const generator of generators) {
      expect(generator.version).toBe(1)
      expect(generator.supportedDifficulties).toEqual([
        'easy',
        'medium',
        'hard',
      ])
    }
  })

  it('is deterministic and preserves versioned immutable snapshots', () => {
    for (const generator of registeredRatioGenerators()) {
      const first = generator.generate({
        seed: `ratio-deterministic-${generator.slug}`,
        difficulty: 'medium',
      })
      const second = generator.generate({
        seed: `ratio-deterministic-${generator.slug}`,
        difficulty: 'medium',
      })
      const different = generator.generate({
        seed: `ratio-different-${generator.slug}`,
        difficulty: 'medium',
      })

      expect(first).toEqual(second)
      expect(JSON.stringify(first)).not.toBe(JSON.stringify(different))
      expect(first.generatorVersion).toBe(1)
    }
  })

  it('validates 1,000 mathematically correct questions per ratio generator', () => {
    const difficulties: readonly GeneratorDifficulty[] = [
      'easy',
      'medium',
      'hard',
    ]

    for (const generator of registeredRatioGenerators()) {
      for (let index = 0; index < 1_000; index += 1) {
        const difficulty = difficulties[index % difficulties.length]
        const question = generateValidatedQuestion({
          attemptSeed: `ratio-math-validation-${generator.slug}-${index}`,
          generatorSlug: generator.slug,
          generatorVersion: generator.version,
          difficulty,
          position: index + 1,
          existingSignatures: new Set<string>(),
        })

        expectRatioGeneratedQuestionValid(question)
        expect(question.difficulty).toBe(difficulty)
      }
    }
  })

  it('prevents duplicate ratio snapshots in one generated attempt', () => {
    const signatures = new Set<string>()

    for (let index = 0; index < 5; index += 1) {
      const question = generateValidatedQuestion({
        attemptSeed: 'ratio-duplicate-prevention',
        generatorSlug: 'ratio-word-problems',
        generatorVersion: 1,
        difficulty: index < 2 ? 'easy' : index < 4 ? 'medium' : 'hard',
        position: index + 1,
        existingSignatures: signatures,
      })

      signatures.add(question.metadata.canonicalSignature)
    }

    expect(signatures.size).toBe(5)
  })
})

describe('Dynamic average generator engine', () => {
  it('performs average arithmetic with controlled precision and validation', () => {
    expect(sumValues([4, 6, 8])).toBe(18)
    expect(arithmeticMean([4, 6, 8])).toBe(6)
    expect(weightedMean([
      { value: 80, weight: 40 },
      { value: 90, weight: 60 },
    ])).toBe(86)
    expect(combinedMean([
      { mean: 78, count: 20 },
      { mean: 84, count: 30 },
    ])).toBe(81.6)
    expect(missingValueForMean(18, 5, [12, 15, 20, 23])).toBe(20)
    expect(meanAfterAdding(20, 5, 32)).toBe(22)
    expect(meanAfterRemoving(25, 6, 40)).toBe(22)
    expect(requiredValueForTargetMean(82, 4, 85)).toBe(97)
    expect(roundAverage(81.666, 2)).toBe(81.67)
    expect(averagesEqual(0.1 + 0.2, 0.3, 1e-9)).toBe(true)
    expect(() => arithmeticMean([])).toThrow('At least one value')
    expect(() => weightedMean([{ value: 80, weight: 0 }])).toThrow('positive')
    expect(() => combinedMean([{ mean: 80, count: 0 }])).toThrow('positive integer')
    expect(() => missingValueForMean(10, 4, [1, 2])).toThrow('exactly one fewer')
    expect(() => meanAfterRemoving(10, 1, 10)).toThrow('At least two')
    expect(() => roundAverage(Number.NaN, 2)).toThrow('finite')
  })

  it('registers eight versioned average generators', () => {
    const generators = registeredAverageGenerators()
    expect(generators.map((generator) => generator.slug)).toEqual([
      'finding-average',
      'missing-value-average',
      'combined-average',
      'weighted-average',
      'average-after-adding',
      'average-after-removing',
      'average-age',
      'average-score-salary',
    ])
    for (const generator of generators) {
      expect(generator.version).toBe(1)
      expect(generator.supportedDifficulties).toEqual(['easy', 'medium', 'hard'])
    }
  })

  it('is deterministic and preserves versioned immutable snapshots', () => {
    for (const generator of registeredAverageGenerators()) {
      const first = generator.generate({ seed: `average-deterministic-${generator.slug}`, difficulty: 'medium' })
      const second = generator.generate({ seed: `average-deterministic-${generator.slug}`, difficulty: 'medium' })
      const different = generator.generate({ seed: `average-different-${generator.slug}`, difficulty: 'medium' })
      expect(first).toEqual(second)
      expect(JSON.stringify(first)).not.toBe(JSON.stringify(different))
      expect(first.generatorVersion).toBe(1)
    }
  })

  it('validates 1,000 mathematically correct questions per average generator', () => {
    const difficulties: readonly GeneratorDifficulty[] = ['easy', 'medium', 'hard']
    for (const generator of registeredAverageGenerators()) {
      for (let index = 0; index < 1_000; index += 1) {
        const difficulty = difficulties[index % difficulties.length]
        const question = generateValidatedQuestion({
          attemptSeed: `average-math-validation-${generator.slug}-${index}`,
          generatorSlug: generator.slug,
          generatorVersion: generator.version,
          difficulty,
          position: index + 1,
          existingSignatures: new Set<string>(),
        })
        expectAverageGeneratedQuestionValid(question)
        expect(question.difficulty).toBe(difficulty)
      }
    }
  })

  it('prevents duplicate average snapshots within one attempt', () => {
    const signatures = new Set<string>()
    for (let index = 0; index < 5; index += 1) {
      const question = generateValidatedQuestion({
        attemptSeed: 'average-duplicate-prevention',
        generatorSlug: 'finding-average',
        generatorVersion: 1,
        difficulty: index < 2 ? 'easy' : index < 4 ? 'medium' : 'hard',
        position: index + 1,
        existingSignatures: signatures,
      })
      signatures.add(question.metadata.canonicalSignature)
    }
    expect(signatures.size).toBe(5)
  })
})

describe('Dynamic number-problem generator engine', () => {
  it('performs exact integer, digit, remainder, and rational arithmetic', () => {
    expect(consecutiveSequence(5, 4)).toEqual([5, 6, 7, 8])
    expect(consecutiveSequence(3, 3, 2)).toEqual([3, 5, 7])
    expect(hasParity(-3, 'odd')).toBe(true)
    expect(hasParity(8, 'even')).toBe(true)
    expect(isConsecutiveParitySequence([-3, -1, 1], 'odd')).toBe(true)
    expect(solveLinearPair(
      { xCoefficient: 1, yCoefficient: 1, constant: 42 },
      { xCoefficient: 1, yCoefficient: -1, constant: 8 },
    )).toEqual({ x: 25, y: 17 })
    expect(constructTwoDigitNumber(7, 4)).toBe(74)
    expect(reverseTwoDigitNumber(74)).toBe(47)
    expect(quotientAndRemainder(38, 5)).toEqual({ quotient: 7, remainder: 3 })
    expect(hasRemainder(38, 5, 3)).toBe(true)
    expect(smallestPositiveWithRemainders([
      { divisor: 4, remainder: 2 },
      { divisor: 3, remainder: 1 },
    ])).toBe(10)
    expect(rational(6, 8)).toEqual({ numerator: 3, denominator: 4 })
    expect(divideByRational(45, rational(3, 4))).toEqual({ numerator: 60, denominator: 1 })
    expect(rationalToInteger(rational(60, 1))).toBe(60)
    expect(uniqueIntegerSolutions(1, 20, (value) => value % 6 === 2)).toEqual([2, 8, 14, 20])
  })

  it('rejects invalid number-problem utility inputs', () => {
    expect(() => consecutiveSequence(1, 0)).toThrow('positive integer')
    expect(() => constructTwoDigitNumber(0, 8)).toThrow('Invalid')
    expect(() => reverseTwoDigitNumber(40)).toThrow('leading-zero')
    expect(() => quotientAndRemainder(10, 0)).toThrow('positive integer')
    expect(() => rational(1, 0)).toThrow('cannot be zero')
    expect(() => uniqueIntegerSolutions(5, 2, () => true)).toThrow('Minimum')
  })

  it('registers nine versioned number-problem generators', () => {
    const generators = registeredNumberProblemGenerators()
    expect(generators.map((generator) => generator.slug)).toEqual([
      'consecutive-integers',
      'consecutive-odd-even-integers',
      'sum-difference-numbers',
      'product-quotient-numbers',
      'two-digit-number-problems',
      'reversed-digit-problems',
      'remainder-number-problems',
      'fractional-part-number-problems',
      'mixed-number-relationships',
    ])
    for (const generator of generators) {
      expect(generator.version).toBe(1)
      expect(generator.supportedDifficulties).toEqual(['easy', 'medium', 'hard'])
    }
  })

  it('is deterministic and preserves versioned immutable snapshots', () => {
    for (const generator of registeredNumberProblemGenerators()) {
      const first = generator.generate({ seed: `number-problem-deterministic-${generator.slug}`, difficulty: 'medium' })
      const second = generator.generate({ seed: `number-problem-deterministic-${generator.slug}`, difficulty: 'medium' })
      const different = generator.generate({ seed: `number-problem-different-${generator.slug}`, difficulty: 'medium' })
      expect(first).toEqual(second)
      expect(JSON.stringify(first)).not.toBe(JSON.stringify(different))
      expect(first.generatorVersion).toBe(1)
    }
  })

  it('validates 1,000 mathematically correct questions per number-problem generator', () => {
    const difficulties: readonly GeneratorDifficulty[] = ['easy', 'medium', 'hard']
    for (const generator of registeredNumberProblemGenerators()) {
      for (let index = 0; index < 1_000; index += 1) {
        const difficulty = difficulties[index % difficulties.length]
        const question = generateValidatedQuestion({
          attemptSeed: `number-problem-math-validation-${generator.slug}-${index}`,
          generatorSlug: generator.slug,
          generatorVersion: generator.version,
          difficulty,
          position: index + 1,
          existingSignatures: new Set<string>(),
        })
        expectNumberProblemGeneratedQuestionValid(question)
        expect(question.difficulty).toBe(difficulty)
      }
    }
  }, 15_000)

  it('prevents duplicate number-problem snapshots within one attempt', () => {
    const signatures = new Set<string>()
    for (let index = 0; index < 5; index += 1) {
      const question = generateValidatedQuestion({
        attemptSeed: 'number-problem-duplicate-prevention',
        generatorSlug: 'mixed-number-relationships',
        generatorVersion: 1,
        difficulty: index < 2 ? 'easy' : index < 4 ? 'medium' : 'hard',
        position: index + 1,
        existingSignatures: signatures,
      })
      signatures.add(question.metadata.canonicalSignature)
    }
    expect(signatures.size).toBe(5)
  })
})

describe('Dynamic age-problem generator engine', () => {
  it('models present, past, future, sums, differences, ratios, and exact systems', () => {
    expect(representPresentAge(24)).toBe(24)
    expect(ageInPast(24, 5)).toBe(19)
    expect(ageInFuture(24, 5)).toBe(29)
    expect(ageDifference(42, 14)).toBe(28)
    expect(ageSum([12, 16, 20])).toBe(48)
    expect(reduceAgeRatio(45, 18)).toEqual({ olderPart: 5, youngerPart: 2 })
    expect(solveTwoPersonAgeSystem(
      { olderCoefficient: 1, youngerCoefficient: 1, constant: 42 },
      { olderCoefficient: 1, youngerCoefficient: -1, constant: 8 },
    )).toEqual({ older: 25, younger: 17 })
    expect(solveElapsedTimeForRatio({
      older: 42,
      younger: 14,
      ratio: { olderPart: 2, youngerPart: 1 },
      direction: 'future',
    })).toBe(14)
    expect(solveElapsedTimeForRatio({
      older: 40,
      younger: 16,
      ratio: { olderPart: 3, youngerPart: 1 },
      direction: 'past',
    })).toBe(4)
    expect(hasConstantAgeDifference({ older: 40, younger: 16, years: 4, direction: 'past' })).toBe(true)
    expect(ratioMatchesAtTime({ older: 40, younger: 16, years: 4, direction: 'past', olderPart: 3, youngerPart: 1 })).toBe(true)
    expect(validateParentChildAges(40, 12)).toBe(true)
    expect(uniqueIntegerAgeSolutions({ minimum: 5, maximum: 20, predicate: (age) => age + 8 === 25 })).toEqual([17])
    expect(hasUniqueAgeSolution({ minimum: 5, maximum: 20, predicate: (age) => age + 8 === 25 })).toBe(true)
  })

  it('rejects invalid ages, timelines, ratios, and non-unique systems', () => {
    expect(() => representPresentAge(-1)).toThrow('cannot be negative')
    expect(() => ageInPast(4, 5)).toThrow('past age')
    expect(() => ageInFuture(20, -1)).toThrow('cannot be negative')
    expect(() => ageDifference(12, 12)).toThrow('must exceed')
    expect(() => ageSum([])).toThrow('At least one')
    expect(() => reduceAgeRatio(20, 0)).toThrow('positive ages')
    expect(solveTwoPersonAgeSystem(
      { olderCoefficient: 1, youngerCoefficient: 1, constant: 20 },
      { olderCoefficient: 2, youngerCoefficient: 2, constant: 40 },
    )).toBeNull()
    expect(solveElapsedTimeForRatio({ older: 30, younger: 20, ratio: { olderPart: 2, youngerPart: 1 }, direction: 'future' })).toBeNull()
    expect(isRealisticAge(4, 'child')).toBe(false)
    expect(validateParentChildAges(24, 10)).toBe(false)
    expect(hasUniqueAgeSolution({ minimum: 1, maximum: 5, predicate: (age) => age % 2 === 0 })).toBe(false)
  })

  it('registers nine versioned age-problem generators', () => {
    const generators = registeredAgeProblemGenerators()
    expect(generators.map((generator) => generator.slug)).toEqual([
      'present-age-equations',
      'past-age-problems',
      'future-age-problems',
      'age-difference',
      'sum-of-ages',
      'age-ratios',
      'parent-child-ages',
      'sibling-group-ages',
      'mixed-age-relationships',
    ])
    for (const generator of generators) {
      expect(generator.version).toBe(1)
      expect(generator.supportedDifficulties).toEqual(['easy', 'medium', 'hard'])
    }
  })

  it('is deterministic and preserves versioned immutable snapshots', () => {
    for (const generator of registeredAgeProblemGenerators()) {
      const first = generator.generate({ seed: `age-deterministic-${generator.slug}`, difficulty: 'medium' })
      const second = generator.generate({ seed: `age-deterministic-${generator.slug}`, difficulty: 'medium' })
      const different = generator.generate({ seed: `age-different-${generator.slug}`, difficulty: 'medium' })
      expect(first).toEqual(second)
      expect(JSON.stringify(first)).not.toBe(JSON.stringify(different))
      expect(first.generatorVersion).toBe(1)
    }
  })

  it('validates 1,000 mathematically correct questions per age-problem generator', () => {
    const difficulties: readonly GeneratorDifficulty[] = ['easy', 'medium', 'hard']
    for (const generator of registeredAgeProblemGenerators()) {
      for (let index = 0; index < 1_000; index += 1) {
        const difficulty = difficulties[index % difficulties.length]
        const question = generateValidatedQuestion({
          attemptSeed: `age-math-validation-${generator.slug}-${index}`,
          generatorSlug: generator.slug,
          generatorVersion: generator.version,
          difficulty,
          position: index + 1,
          existingSignatures: new Set<string>(),
        })
        expectAgeProblemGeneratedQuestionValid(question)
        expect(question.difficulty).toBe(difficulty)
      }
    }
  }, 20_000)

  it('prevents duplicate age-problem snapshots within one attempt', () => {
    const signatures = new Set<string>()
    for (let index = 0; index < 5; index += 1) {
      const question = generateValidatedQuestion({
        attemptSeed: 'age-problem-duplicate-prevention',
        generatorSlug: 'mixed-age-relationships',
        generatorVersion: 1,
        difficulty: index < 2 ? 'easy' : index < 4 ? 'medium' : 'hard',
        position: index + 1,
        existingSignatures: signatures,
      })
      signatures.add(question.metadata.canonicalSignature)
    }
    expect(signatures.size).toBe(5)
  })
})

describe('Dynamic work-rate generator engine', () => {
  it('performs exact work, rate, time, net-rate, and timeline calculations', () => {
    expect(rateFromWorkAndTime(WHOLE_JOB, workRational(8))).toEqual(workRational(1, 8))
    expect(workFromRateAndTime(workRational(1, 8), workRational(3))).toEqual(workRational(3, 8))
    expect(timeFromWorkAndRate(workRational(3, 4), workRational(1, 8))).toEqual(workRational(6))
    expect(combineWorkRates([individualRate(workRational(6)), individualRate(workRational(3))])).toEqual(workRational(1, 2))
    expect(opposingNetRate([workRational(1, 6)], [workRational(1, 12)])).toEqual(workRational(1, 12))
    expect(remainingWork(workRational(3, 8))).toEqual(workRational(5, 8))
    expect(solveUnknownRate(workRational(1, 4), [workRational(1, 6)])).toEqual(workRational(1, 12))
    const phases = [
      { label: 'solo', rate: workRational(1, 8), time: workRational(2) },
      { label: 'together', rate: workRational(3, 8), time: workRational(2) },
    ]
    expect(evaluateWorkTimeline(phases).completed).toEqual(WHOLE_JOB)
    expect(validateTimeline(phases, true)).toBe(true)
  })

  it('rejects invalid rates, impossible net rates, and invalid phase totals', () => {
    expect(() => rateFromWorkAndTime(WHOLE_JOB, workRational(0))).toThrow('positive')
    expect(() => opposingNetRate([workRational(1, 12)], [workRational(1, 6)])).toThrow('positive')
    expect(() => remainingWork(workRational(5, 4))).toThrow('between zero and one')
    expect(() => solveUnknownRate(workRational(1, 8), [workRational(1, 6)])).toThrow('positive')
    expect(validateTimeline([
      { label: 'too much', rate: workRational(1), time: workRational(2) },
    ], false)).toBe(false)
  })

  it('registers nine versioned work-rate generators', () => {
    const generators = registeredWorkRateGenerators()
    expect(generators.map((generator) => generator.slug)).toEqual([...workRateGeneratorSlugs])
    expect(generators).toHaveLength(9)
    for (const generator of generators) {
      expect(generator.version).toBe(1)
      expect(generator.supportedDifficulties).toEqual(['easy', 'medium', 'hard'])
    }
  })

  it('is deterministic and preserves immutable versioned snapshots', () => {
    for (const generator of registeredWorkRateGenerators()) {
      const first = generator.generate({ seed: `work-rate-stable-${generator.slug}`, difficulty: 'medium' })
      const second = generator.generate({ seed: `work-rate-stable-${generator.slug}`, difficulty: 'medium' })
      expect(first).toEqual(second)
      expect(first.generatorVersion).toBe(1)
    }
  })

  it('validates 1,000 independently recomputed questions per work-rate generator', () => {
    const difficulties: readonly GeneratorDifficulty[] = ['easy', 'medium', 'hard']
    for (const generator of registeredWorkRateGenerators()) {
      for (let index = 0; index < 1_000; index += 1) {
        const question = generateValidatedQuestion({
          attemptSeed: `work-rate-validation-${generator.slug}-${index}`,
          generatorSlug: generator.slug,
          generatorVersion: 1,
          difficulty: difficulties[index % difficulties.length],
          position: index + 1,
          existingSignatures: new Set<string>(),
        })
        const correct = question.choices.find((choice) => choice.isCorrect)
        const recomputed = recomputeWorkRateAnswer(question)
        expect(generator.validate(question)).toEqual({ valid: true, reason: null })
        expect(question.choices).toHaveLength(4)
        expect(question.choices.filter((choice) => choice.isCorrect)).toHaveLength(1)
        expect(new Set(question.choices.map((choice) => choice.text)).size).toBe(4)
        expect(new Set(question.choices.map((choice) => choice.numericValue)).size).toBe(4)
        expect(question.choices.filter((choice) => !choice.isCorrect).every((choice) => choice.mistakeType !== null && choice.derivation !== null)).toBe(true)
        expect(correct?.numericValue).toBeCloseTo(recomputed.numerator / recomputed.denominator, 8)
        expect(correct?.text).toBe(question.explanation.finalAnswer)
        expect(question.prompt).not.toMatch(/NaN|Infinity/u)
        expect(question.explanation.steps.join(' ')).not.toMatch(/NaN|Infinity/u)
      }
    }
  }, 20_000)

  it('prevents duplicate work-rate snapshots within one attempt', () => {
    const signatures = new Set<string>()
    for (let index = 0; index < 5; index += 1) {
      const question = generateValidatedQuestion({
        attemptSeed: 'work-rate-duplicate-prevention',
        generatorSlug: 'mixed-work-rate',
        generatorVersion: 1,
        difficulty: index < 2 ? 'easy' : index < 4 ? 'medium' : 'hard',
        position: index + 1,
        existingSignatures: signatures,
      })
      signatures.add(question.metadata.canonicalSignature)
    }
    expect(signatures.size).toBe(5)
  })
})

describe('Dynamic distance-speed-time generator engine', () => {
  it('uses exact formulas, normalized conversions, weighted averages, and classified relative motion', () => {
    expect(distanceFromSpeedTime(travelRational(60), travelRational(3))).toEqual(travelRational(180))
    expect(speedFromDistanceTime(travelRational(150), travelRational(5, 2))).toEqual(travelRational(60))
    expect(timeFromDistanceSpeed(travelRational(240), travelRational(80))).toEqual(travelRational(3))
    expect(kilometersPerHourToMetersPerSecond(travelRational(72))).toEqual(travelRational(20))
    expect(metersPerSecondToKilometersPerHour(travelRational(15))).toEqual(travelRational(54))
    expect(calculateAverageSpeed([
      { distance: travelRational(60), time: travelRational(1) },
      { distance: travelRational(60), time: travelRational(3, 2) },
    ])).toEqual(travelRational(48))
    expect(sameDirectionRelativeSpeed(travelRational(80), travelRational(60))).toEqual(travelRational(20))
    expect(meetingTime(travelRational(300), travelRational(70), travelRational(80))).toEqual(travelRational(2))
    expect(catchTimeAfterDeparture(headStartDistance(travelRational(50), travelRational(1)), travelRational(75), travelRational(50))).toEqual(travelRational(2))
  })

  it('rejects nonpositive travel values and invalid same-direction classification', () => {
    expect(() => distanceFromSpeedTime(travelRational(0), travelRational(2))).toThrow('positive')
    expect(() => sameDirectionRelativeSpeed(travelRational(40), travelRational(60))).toThrow('exceed')
    expect(() => calculateAverageSpeed([])).toThrow('At least one')
  })

  it('registers nine versioned distance-speed-time generators', () => {
    const generators = registeredDistanceSpeedTimeGenerators()
    expect(generators.map((generator) => generator.slug)).toEqual([...distanceSpeedTimeGeneratorSlugs])
    expect(generators).toHaveLength(9)
    for (const generator of generators) {
      expect(generator.version).toBe(1)
      expect(generator.supportedDifficulties).toEqual(['easy', 'medium', 'hard'])
    }
  })

  it('is deterministic and preserves immutable versioned snapshots', () => {
    for (const generator of registeredDistanceSpeedTimeGenerators()) {
      const first = generator.generate({ seed: `travel-stable-${generator.slug}`, difficulty: 'medium' })
      const second = generator.generate({ seed: `travel-stable-${generator.slug}`, difficulty: 'medium' })
      expect(first).toEqual(second)
      expect(first.generatorVersion).toBe(1)
    }
  })

  it('validates 1,000 independently recomputed questions per distance-speed-time generator', () => {
    const difficulties: readonly GeneratorDifficulty[] = ['easy', 'medium', 'hard']
    for (const generator of registeredDistanceSpeedTimeGenerators()) {
      for (let index = 0; index < 1_000; index += 1) {
        const question = generateValidatedQuestion({
          attemptSeed: `travel-validation-${generator.slug}-${index}`,
          generatorSlug: generator.slug,
          generatorVersion: 1,
          difficulty: difficulties[index % difficulties.length],
          position: index + 1,
          existingSignatures: new Set<string>(),
        })
        const correct = question.choices.find((choice) => choice.isCorrect)
        const recomputed = recomputeDistanceSpeedTimeAnswer(question)
        expect(generator.validate(question)).toEqual({ valid: true, reason: null })
        expect(question.choices).toHaveLength(4)
        expect(question.choices.filter((choice) => choice.isCorrect)).toHaveLength(1)
        expect(new Set(question.choices.map((choice) => choice.text)).size).toBe(4)
        expect(new Set(question.choices.map((choice) => choice.numericValue)).size).toBe(4)
        expect(question.choices.filter((choice) => !choice.isCorrect).every((choice) => choice.mistakeType !== null && choice.derivation !== null)).toBe(true)
        expect(correct?.numericValue).toBeCloseTo(recomputed.numerator / recomputed.denominator, 8)
        expect(correct?.text).toBe(question.explanation.finalAnswer)
        expect(question.prompt).not.toMatch(/NaN|Infinity/u)
      }
    }
  }, 20_000)

  it('prevents duplicate distance-speed-time snapshots within one attempt', () => {
    const signatures = new Set<string>()
    for (let index = 0; index < 5; index += 1) {
      const question = generateValidatedQuestion({ attemptSeed: 'travel-duplicate-prevention', generatorSlug: 'mixed-distance-speed-time', generatorVersion: 1, difficulty: index < 2 ? 'easy' : index < 4 ? 'medium' : 'hard', position: index + 1, existingSignatures: signatures })
      signatures.add(question.metadata.canonicalSignature)
    }
    expect(signatures.size).toBe(5)
  })
})

describe('Dynamic simple-interest generator engine', () => {
  it('uses exact centavo, percent, time-conversion, and option-comparison arithmetic', () => {
    const principal = interestRational(1_000_000)
    const rate = percentToAnnualRate(600)
    const time = interestRational(2)
    const interest = simpleInterest(principal, rate, time)
    expect(interest).toEqual(interestRational(120_000))
    expect(principalFromInterest(interest, rate, time)).toEqual(principal)
    expect(annualRateFromInterest(interest, principal, time)).toEqual(rate)
    expect(timeFromInterest(interest, principal, rate)).toEqual(time)
    expect(calculateMaturityValue(principal, interest)).toEqual(interestRational(1_120_000))
    expect(interestFromMaturity(interestRational(1_120_000), principal)).toEqual(interest)
    expect(interestMonthsToYears(18)).toEqual(interestRational(3, 2))
    expect(daysToYears(90, 360)).toEqual(interestRational(1, 4))
    expect(daysToYears(73, 365)).toEqual(interestRational(1, 5))
    expect(roundMoneyCentavos(interestRational(1005, 2))).toBe(503)
    expect(compareInterestOptions(
      { principalCentavos: interestRational(2_000_000), annualRate: percentToAnnualRate(500), timeYears: interestRational(2) },
      { principalCentavos: interestRational(2_000_000), annualRate: percentToAnnualRate(450), timeYears: interestRational(5, 2) },
    )).toMatchObject({ winner: 'B', differenceCentavos: interestRational(25_000) })
  })

  it('rejects invalid monetary, rate, time, day-basis, and tied-option inputs', () => {
    expect(() => simpleInterest(interestRational(0), interestRational(1, 20), interestRational(2))).toThrow('positive')
    expect(() => percentToAnnualRate(0)).toThrow('positive')
    expect(() => interestMonthsToYears(0)).toThrow('positive')
    expect(() => daysToYears(90, 361 as 360)).toThrow('360 or 365')
    const option = { principalCentavos: interestRational(100_000), annualRate: interestRational(1, 20), timeYears: interestRational(1) }
    expect(() => compareInterestOptions(option, option)).toThrow('must not tie')
  })

  it('registers nine versioned simple-interest generators', () => {
    const generators = registeredSimpleInterestGenerators()
    expect(generators.map((generator) => generator.slug)).toEqual([...simpleInterestGeneratorSlugs])
    expect(generators).toHaveLength(9)
    for (const generator of generators) {
      expect(generator.version).toBe(1)
      expect(generator.supportedDifficulties).toEqual(['easy', 'medium', 'hard'])
    }
  })

  it('is deterministic and preserves immutable versioned snapshots', () => {
    for (const generator of registeredSimpleInterestGenerators()) {
      const first = generator.generate({ seed: `interest-stable-${generator.slug}`, difficulty: 'medium' })
      const second = generator.generate({ seed: `interest-stable-${generator.slug}`, difficulty: 'medium' })
      expect(first).toEqual(second)
      expect(first.generatorVersion).toBe(1)
    }
  })

  it('validates 1,000 independently recomputed questions per simple-interest generator', () => {
    const difficulties: readonly GeneratorDifficulty[] = ['easy', 'medium', 'hard']
    for (const generator of registeredSimpleInterestGenerators()) {
      for (let index = 0; index < 1_000; index += 1) {
        const question = generateValidatedQuestion({ attemptSeed: `interest-validation-${generator.slug}-${index}`, generatorSlug: generator.slug, generatorVersion: 1, difficulty: difficulties[index % difficulties.length], position: index + 1, existingSignatures: new Set<string>() })
        const correct = question.choices.find((choice) => choice.isCorrect)
        const recomputed = recomputeSimpleInterestAnswer(question)
        expect(generator.validate(question)).toEqual({ valid: true, reason: null })
        expect(question.choices).toHaveLength(4)
        expect(question.choices.filter((choice) => choice.isCorrect)).toHaveLength(1)
        expect(new Set(question.choices.map((choice) => choice.text)).size).toBe(4)
        expect(new Set(question.choices.map((choice) => choice.numericValue)).size).toBe(4)
        expect(question.choices.filter((choice) => !choice.isCorrect).every((choice) => choice.mistakeType !== null && choice.derivation !== null)).toBe(true)
        expect(correct?.numericValue).toBeCloseTo(recomputed.numerator / recomputed.denominator, 8)
        expect(correct?.text).toBe(question.explanation.finalAnswer)
        expect(question.prompt).not.toMatch(/NaN|Infinity|compound/iu)
        if (question.parameters.timeKind === 'days') expect([360, 365]).toContain(question.parameters.dayCountBasis)
        if (question.metadata.answerKind === 'money') expect(Number.isInteger(correct?.numericValue)).toBe(true)
      }
    }
  }, 20_000)

  it('prevents duplicate simple-interest snapshots within one attempt', () => {
    const signatures = new Set<string>()
    for (let index = 0; index < 5; index += 1) {
      const question = generateValidatedQuestion({ attemptSeed: 'interest-duplicate-prevention', generatorSlug: 'mixed-simple-interest', generatorVersion: 1, difficulty: index < 2 ? 'easy' : index < 4 ? 'medium' : 'hard', position: index + 1, existingSignatures: signatures })
      signatures.add(question.metadata.canonicalSignature)
    }
    expect(signatures.size).toBe(5)
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

  it('uses mistake-derived distractors for fixed Percentages practice sets', async () => {
    const seededChoices = await getSeededFixedPracticeChoices()

    for (const [lessonSlug, expectedQuestionChoices] of Object.entries(
      expectedFixedPracticeChoices,
    )) {
      for (const [index, expectedChoices] of expectedQuestionChoices.entries()) {
        const questionPosition = index + 1
        const choices = seededChoices.filter(
          (choice) =>
            choice.lesson_slug === lessonSlug &&
            choice.question_position === questionPosition,
        )

        expect(choices.map((choice) => choice.choice_text)).toEqual(
          expectedChoices,
        )
        expect(
          choices.filter((choice) => choice.is_correct === 1),
        ).toHaveLength(1)
        expect(choices[0]?.is_correct).toBe(1)
        expect(new Set(choices.map((choice) => choice.choice_text)).size).toBe(
          4,
        )
      }
    }
  })

  it('scores every fixed Percentages practice correct choice consistently', async () => {
    const seededChoices = await getSeededFixedPracticeChoices()

    for (const lessonSlug of Object.keys(expectedFixedPracticeChoices)) {
      const lessonChoices = seededChoices.filter(
        (choice) => choice.lesson_slug === lessonSlug,
      )
      const questionPositions = [
        ...new Set(lessonChoices.map((choice) => choice.question_position)),
      ]

      for (const questionPosition of questionPositions) {
        const choices = lessonChoices.filter(
          (choice) => choice.question_position === questionPosition,
        )
        const correctChoice = choices.find((choice) => choice.is_correct === 1)

        if (correctChoice === undefined) {
          throw new Error(
            `${lessonSlug} question ${questionPosition} has no correct choice.`,
          )
        }

        const { cookie, practiceSetId } = await prepareUnlockedPracticeUser(
          `fixed-practice-correct-${lessonSlug}-${questionPosition}@example.com`,
          lessonSlug as (typeof cseProfessionalLessonSlugs)[number],
        )
        const { body } = await startPractice(cookie, practiceSetId)
        const attemptQuestion = body.data.questions.find(
          (question) => question.position === questionPosition,
        )
        const attemptChoice = attemptQuestion?.choices.find(
          (choice) => choice.text === correctChoice.choice_text,
        )

        if (attemptQuestion === undefined || attemptChoice === undefined) {
          throw new Error(
            `${lessonSlug} question ${questionPosition} correct choice was not returned.`,
          )
        }

        const saveResponse = await savePracticeAttemptAnswer({
          cookie,
          attemptPublicId: body.data.attempt.publicId,
          questionId: attemptQuestion.id,
          selectedChoiceId: attemptChoice.id,
        })
        const { response, body: result } = await submitPracticeAttemptForTest(
          cookie,
          body.data.attempt.publicId,
        )
        const questionResult = result.data.questions.find(
          (question) => question.position === questionPosition,
        )

        expect(saveResponse.status).toBe(200)
        expect(response.status).toBe(200)
        expect(questionResult?.selectedChoice).toEqual(attemptChoice)
        expect(questionResult?.correctChoice).toEqual(attemptChoice)
        expect(questionResult?.isCorrect).toBe(true)
        expect(questionResult?.pointsAwarded).toBe(1)
      }
    }
  }, 20_000)

  it('scores every fixed Percentages practice distractor as incorrect', async () => {
    const seededChoices = await getSeededFixedPracticeChoices()

    for (const lessonSlug of Object.keys(expectedFixedPracticeChoices)) {
      const lessonChoices = seededChoices.filter(
        (choice) => choice.lesson_slug === lessonSlug,
      )
      const questionPositions = [
        ...new Set(lessonChoices.map((choice) => choice.question_position)),
      ]

      for (const questionPosition of questionPositions) {
        const choices = lessonChoices.filter(
          (choice) => choice.question_position === questionPosition,
        )
        const correctChoice = choices.find((choice) => choice.is_correct === 1)

        if (correctChoice === undefined) {
          throw new Error(
            `${lessonSlug} question ${questionPosition} has no correct choice.`,
          )
        }

        for (const distractor of choices.filter((choice) => choice.is_correct === 0)) {
          const { cookie, practiceSetId } = await prepareUnlockedPracticeUser(
            `fixed-practice-distractor-${lessonSlug}-${questionPosition}-${distractor.choice_position}@example.com`,
            lessonSlug as (typeof cseProfessionalLessonSlugs)[number],
          )
          const { body } = await startPractice(cookie, practiceSetId)
          const attemptQuestion = body.data.questions.find(
            (question) => question.position === questionPosition,
          )
          const attemptDistractor = attemptQuestion?.choices.find(
            (choice) => choice.text === distractor.choice_text,
          )

          if (attemptQuestion === undefined || attemptDistractor === undefined) {
            throw new Error(
              `${lessonSlug} question ${questionPosition} distractor ${distractor.choice_text} was not returned.`,
            )
          }

          const saveResponse = await savePracticeAttemptAnswer({
            cookie,
            attemptPublicId: body.data.attempt.publicId,
            questionId: attemptQuestion.id,
            selectedChoiceId: attemptDistractor.id,
          })
          const { response, body: result } =
            await submitPracticeAttemptForTest(
              cookie,
              body.data.attempt.publicId,
            )
          const questionResult = result.data.questions.find(
            (question) => question.position === questionPosition,
          )

          expect(saveResponse.status).toBe(200)
          expect(response.status).toBe(200)
          expect(questionResult?.selectedChoice).toEqual(attemptDistractor)
          expect(questionResult?.correctChoice.text).toBe(
            correctChoice.choice_text,
          )
          expect(questionResult?.selectedChoice?.text).not.toBe(
            questionResult?.correctChoice.text,
          )
          expect(questionResult?.isCorrect).toBe(false)
          expect(questionResult?.pointsAwarded).toBe(0)
        }
      }
    }
  }, 20_000)

  it('keeps submitted practice result text stable when choice rows later change', async () => {
    const { cookie } = await prepareUnlockedPracticeUser(
      'practice-choice-snapshot@example.com',
    )
    const practiceSetId = await createTestPracticeSet('published')
    const { body } = await startPractice(cookie, practiceSetId)
    const question = body.data.questions[0]
    const correctChoice = question?.choices.find(
      (choice) => choice.text === '9',
    )

    if (question === undefined || correctChoice === undefined) {
      throw new Error('Test practice question was not returned.')
    }

    await savePracticeAttemptAnswer({
      cookie,
      attemptPublicId: body.data.attempt.publicId,
      questionId: question.id,
      selectedChoiceId: correctChoice.id,
    })
    const submitted = await submitPracticeAttemptForTest(
      cookie,
      body.data.attempt.publicId,
    )

    expect(submitted.response.status).toBe(200)

    await env.DB.prepare(
      `UPDATE practice_question_choices
      SET choice_text = 'changed after submit'
      WHERE id = ?1`,
    )
      .bind(correctChoice.id)
      .run()

    const response = await app.request(
      `/api/student/practice-attempts/${body.data.attempt.publicId}/results`,
      { headers: { cookie } },
      createBindings('production'),
    )
    const result = await response.json<PracticeResultBody>()
    const questionResult = result.data.questions.find(
      (candidate) => candidate.position === question.position,
    )

    expect(response.status).toBe(200)
    expect(questionResult?.selectedChoice?.text).toBe('9')
    expect(questionResult?.correctChoice.text).toBe('9')
    expect(questionResult?.isCorrect).toBe(true)
  })

  it('creates immutable generated snapshots and reloads the same questions on refresh', async () => {
    const { cookie, practiceSetId } = await prepareUnlockedPracticeUser(
      'practice-generated-refresh@example.com',
    )
    const firstAttempt = await startPractice(cookie, practiceSetId)
    const firstPayload = JSON.stringify(firstAttempt.body.data.questions)
    const signatures = await getGeneratedCanonicalSignatures(
      firstAttempt.body.data.attempt.publicId,
    )

    const reloadResponse = await app.request(
      `/api/student/practice-attempts/${firstAttempt.body.data.attempt.publicId}`,
      { headers: { cookie } },
      createBindings('production'),
    )
    const reloadBody = await reloadResponse.json<PracticeAttemptFetchBody>()
    const secondAttempt = await startPractice(cookie, practiceSetId)

    expect(firstAttempt.response.status).toBe(201)
    expect(signatures).toHaveLength(5)
    expect(new Set(signatures).size).toBe(5)
    expect(reloadResponse.status).toBe(200)
    expect('questions' in reloadBody.data).toBe(true)
    if ('questions' in reloadBody.data) {
      expect(JSON.stringify(reloadBody.data.questions)).toBe(firstPayload)
    }
    expect(JSON.stringify(secondAttempt.body.data.questions)).not.toBe(
      firstPayload,
    )
  })

  it.each([
    ['finding-the-percentage', 'finding-percentage'],
    ['finding-the-base', 'finding-base'],
    ['finding-the-rate', 'finding-rate'],
  ] as const)(
    'uses generated snapshots for %s only',
    async (lessonSlug, generatorSlug) => {
      const { cookie, practiceSetId } = await prepareUnlockedPracticeUser(
        `practice-generated-${lessonSlug}@example.com`,
        lessonSlug,
      )
      const { body } = await startPractice(cookie, practiceSetId)
      const rows = await env.DB.prepare(
        `SELECT
          generated_question_snapshots.generator_slug,
          generated_question_snapshots.generator_version,
          generated_question_snapshots.difficulty,
          COUNT(generated_question_choices.id) AS choice_count,
          SUM(generated_question_choices.is_correct) AS correct_count
        FROM generated_question_snapshots
        INNER JOIN practice_attempts
          ON practice_attempts.id = generated_question_snapshots.practice_attempt_id
        INNER JOIN generated_question_choices
          ON generated_question_choices.snapshot_id = generated_question_snapshots.id
        WHERE practice_attempts.public_id = ?1
        GROUP BY generated_question_snapshots.id
        ORDER BY generated_question_snapshots.source_position`,
      )
        .bind(body.data.attempt.publicId)
        .all<{
          generator_slug: string
          generator_version: number
          difficulty: string
          choice_count: number
          correct_count: number
        }>()

      expect(rows.results).toHaveLength(5)
      expect(rows.results.map((row) => row.generator_slug)).toEqual(
        Array<string>(5).fill(generatorSlug),
      )
      expect(rows.results.map((row) => row.generator_version)).toEqual(
        Array<number>(5).fill(1),
      )
      expect(rows.results.map((row) => row.difficulty)).toEqual([
        'easy',
        'easy',
        'medium',
        'medium',
        'hard',
      ])
      expect(rows.results.every((row) => row.choice_count === 4)).toBe(true)
      expect(rows.results.every((row) => row.correct_count === 1)).toBe(true)
    },
  )

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

  it('scores generated practice against persisted snapshot choices', async () => {
    const email = 'practice-generated-scoring@example.com'
    const { cookie, practiceSetId } = await prepareUnlockedPracticeUser(email)
    const { body } = await startPractice(cookie, practiceSetId)
    const correctChoices = await getGeneratedCorrectChoiceIds(
      body.data.attempt.publicId,
    )

    for (const question of body.data.questions) {
      const choiceId = correctChoices.get(question.id)

      if (choiceId === undefined) {
        throw new Error('Generated correct choice was not found.')
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
    }

    const response = await app.request(
      `/api/student/practice-attempts/${body.data.attempt.publicId}/submit`,
      { method: 'POST', headers: { cookie } },
      createBindings('production'),
    )
    const result = await response.json<PracticeResultBody>()
    const storedAnswers = await env.DB.prepare(
      `SELECT
        COUNT(*) AS answer_count,
        SUM(is_correct) AS correct_count,
        SUM(points_awarded) AS awarded_points
      FROM generated_practice_attempt_answers
      INNER JOIN practice_attempts
        ON practice_attempts.id = generated_practice_attempt_answers.attempt_id
      WHERE practice_attempts.public_id = ?1`,
    )
      .bind(body.data.attempt.publicId)
      .first<{
        answer_count: number
        correct_count: number
        awarded_points: number
      }>()

    expect(response.status).toBe(200)
    expect(result.data.scorePercent).toBe(100)
    expect(result.data.passed).toBe(true)
    expect(result.data.questions.every((question) => question.isCorrect)).toBe(
      true,
    )
    expect(result.data.questions[0]?.generator).toMatchObject({
      slug: 'finding-percentage',
      version: 1,
    })
    expect(storedAnswers).toMatchObject({
      answer_count: 5,
      correct_count: 5,
      awarded_points: 5,
    })
  })

  it('keeps fixed practice sets on the original question tables', async () => {
    const { cookie, practiceSetId } = await prepareUnlockedPracticeUser(
      'practice-fixed-guided@example.com',
      'guided-practice',
    )
    const { body } = await startPractice(cookie, practiceSetId)
    const snapshotCount = await env.DB.prepare(
      `SELECT COUNT(*) AS snapshot_count
      FROM generated_question_snapshots
      INNER JOIN practice_attempts
        ON practice_attempts.id = generated_question_snapshots.practice_attempt_id
      WHERE practice_attempts.public_id = ?1`,
    )
      .bind(body.data.attempt.publicId)
      .first<{ snapshot_count: number }>()

    expect(body.data.questions).toHaveLength(5)
    expect(body.data.questions[0]?.prompt).toBe('What is 18% of 450?')
    expect(snapshotCount?.snapshot_count).toBe(0)
  })

  it('fails below 60%, passes at 60%, completes the lesson, and is idempotent', async () => {
    const failEmail = 'practice-below-sixty@example.com'
    const { cookie: failCookie, practiceSetId: failPracticeSetId } =
      await prepareUnlockedPracticeUser(failEmail)
    const failedAttempt = await startPractice(failCookie, failPracticeSetId)
    const failedCorrectChoices = await getGeneratedCorrectChoiceIds(
      failedAttempt.body.data.attempt.publicId,
    )

    for (const question of failedAttempt.body.data.questions.slice(0, 2)) {
      const choiceId = failedCorrectChoices.get(question.id)

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
    const passingCorrectChoices = await getGeneratedCorrectChoiceIds(
      passingAttempt.body.data.attempt.publicId,
    )

    for (const question of passingAttempt.body.data.questions.slice(0, 3)) {
      const choiceId = passingCorrectChoices.get(question.id)

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
        users.public_id,
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
    expect(stored?.public_id).toMatch(uuidPattern)
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
      'SELECT public_id, password_hash FROM users WHERE email = ?1',
    )
      .bind(email)
      .first<{ public_id: string; password_hash: string }>()
    const loginResponse = await app.request(
      '/api/auth/login',
      jsonRequest({
        email,
        password: validPassword,
      }),
      createBindings('production'),
    )

    expect(registrationResponse.status).toBe(201)
    expect(stored?.public_id).toMatch(uuidPattern)
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

describe('Admin beta student accounts', () => {
  function betaStudentBody(
    email: string,
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> {
    return {
      firstName: 'Beta',
      lastName: 'Learner',
      email,
      password: validPassword,
      confirmPassword: validPassword,
      enrollInCseProfessional: true,
      ...overrides,
    }
  }

  it('rejects unauthenticated and student account creation server-side', async () => {
    const unauthenticated = await app.request(
      '/api/admin/beta-students',
      jsonRequest(betaStudentBody('unauth-beta@example.com')),
      createBindings('production'),
    )
    const { cookie } = await register('student-beta-creator@example.com')
    const student = await app.request(
      '/api/admin/beta-students',
      adminJsonRequest(
        betaStudentBody('forbidden-beta@example.com'),
        cookie,
      ),
      createBindings('production'),
    )

    expect(unauthenticated.status).toBe(401)
    expect(student.status).toBe(403)
    await expect(unauthenticated.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'UNAUTHENTICATED' },
    })
    await expect(student.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'FORBIDDEN' },
    })
  })

  it('creates, enrolls, and audit logs a student without exposing or logging the password', async () => {
    const adminEmail = `beta-admin-${crypto.randomUUID()}@example.com`
    const email = `  BETA-${crypto.randomUUID()}@Example.COM  `
    const normalizedEmail = email.trim().toLowerCase()
    const { cookie } = await registerAdmin(adminEmail)
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    try {
      const response = await app.request(
        '/api/admin/beta-students',
        adminJsonRequest(betaStudentBody(email), cookie),
        createBindings('production'),
      )
      const responseText = await response.text()
      const stored = await env.DB.prepare(
        `SELECT
          users.public_id,
          users.password_hash,
          users.role,
          course_enrollments.enrollment_status,
          courses.slug AS course_slug,
          COUNT(user_sessions.id) AS session_count
        FROM users
        LEFT JOIN course_enrollments ON course_enrollments.user_id = users.id
        LEFT JOIN courses ON courses.id = course_enrollments.course_id
        LEFT JOIN user_sessions ON user_sessions.user_id = users.id
        WHERE users.email = ?1
        GROUP BY users.id, course_enrollments.id`,
      )
        .bind(normalizedEmail)
        .first<{
          public_id: string
          password_hash: string
          role: string
          enrollment_status: string | null
          course_slug: string | null
          session_count: number
        }>()
      const audit = await env.DB.prepare(
        `SELECT action, entity_type, entity_id, metadata_json
        FROM audit_logs
        WHERE action = 'beta_student.created' AND entity_id = ?1`,
      )
        .bind(stored?.public_id ?? '')
        .first<{
          action: string
          entity_type: string
          entity_id: string
          metadata_json: string | null
        }>()
      const allLogs = [
        ...logSpy.mock.calls,
        ...warnSpy.mock.calls,
        ...errorSpy.mock.calls,
      ]

      expect(response.status).toBe(201)
      expect(responseText).toContain(normalizedEmail)
      expect(responseText).toContain('"role":"student"')
      expect(responseText).not.toContain(validPassword)
      expect(responseText).not.toContain('passwordHash')
      expect(responseText).not.toContain('password_hash')
      expect(stored?.role).toBe('student')
      expect(stored?.password_hash).not.toBe(validPassword)
      expect(stored?.password_hash).toMatch(/^pbkdf2-sha256\$v1\$100000\$/u)
      await expect(
        verifyPassword(validPassword, stored?.password_hash ?? ''),
      ).resolves.toBe(true)
      expect(stored?.course_slug).toBe('cse-professional')
      expect(stored?.enrollment_status).toBe('active')
      expect(stored?.session_count).toBe(0)
      expect(audit).toMatchObject({
        action: 'beta_student.created',
        entity_type: 'user',
        entity_id: stored?.public_id,
      })
      expect(audit?.metadata_json).toContain(normalizedEmail)
      expect(audit?.metadata_json).toContain('cse-professional')
      expect(audit?.metadata_json).not.toContain(validPassword)
      expect(JSON.stringify(allLogs)).not.toContain(validPassword)
    } finally {
      logSpy.mockRestore()
      warnSpy.mockRestore()
      errorSpy.mockRestore()
    }
  })

  it('rejects role injection, mismatched passwords, and duplicate emails safely', async () => {
    const { cookie } = await registerAdmin(
      `beta-validation-admin-${crypto.randomUUID()}@example.com`,
    )
    const email = `beta-duplicate-${crypto.randomUUID()}@example.com`
    const roleResponse = await app.request(
      '/api/admin/beta-students',
      adminJsonRequest(betaStudentBody(`role-${email}`, { role: 'admin' }), cookie),
      createBindings('production'),
    )
    const mismatchResponse = await app.request(
      '/api/admin/beta-students',
      adminJsonRequest(
        betaStudentBody(`mismatch-${email}`, {
          confirmPassword: 'DifferentPassword123',
        }),
        cookie,
      ),
      createBindings('production'),
    )
    const first = await app.request(
      '/api/admin/beta-students',
      adminJsonRequest(betaStudentBody(email), cookie),
      createBindings('production'),
    )
    const duplicate = await app.request(
      '/api/admin/beta-students',
      adminJsonRequest(betaStudentBody(email.toUpperCase()), cookie),
      createBindings('production'),
    )
    const count = await env.DB.prepare(
      'SELECT COUNT(*) AS count FROM users WHERE email = ?1',
    )
      .bind(email)
      .first<{ count: number }>()

    expect(roleResponse.status).toBe(400)
    expect(mismatchResponse.status).toBe(400)
    expect(first.status).toBe(201)
    expect(duplicate.status).toBe(409)
    await expect(duplicate.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: 'BETA_STUDENT_EMAIL_EXISTS',
        message: 'A user account with this email already exists.',
      },
    })
    expect(count?.count).toBe(1)
  })

  it('keeps enrollment idempotent and lists only safe student fields', async () => {
    const { cookie } = await registerAdmin(
      `beta-list-admin-${crypto.randomUUID()}@example.com`,
    )
    const email = `beta-list-${crypto.randomUUID()}@example.com`
    const created = await app.request(
      '/api/admin/beta-students',
      adminJsonRequest(betaStudentBody(email), cookie),
      createBindings('production'),
    )
    const firstEnrollment = await app.request(
      '/api/admin/enrollments',
      adminJsonRequest({ email, courseSlug: 'cse-professional' }, cookie),
      createBindings('production'),
    )
    const secondEnrollment = await app.request(
      '/api/admin/enrollments',
      adminJsonRequest({ email, courseSlug: 'cse-professional' }, cookie),
      createBindings('production'),
    )
    const listResponse = await app.request(
      '/api/admin/beta-students',
      { headers: { cookie } },
      createBindings('production'),
    )
    const listText = await listResponse.text()
    const enrollmentCount = await env.DB.prepare(
      `SELECT COUNT(*) AS count
      FROM course_enrollments
      WHERE user_id = (SELECT id FROM users WHERE email = ?1)
        AND course_id = (SELECT id FROM courses WHERE slug = 'cse-professional')`,
    )
      .bind(email)
      .first<{ count: number }>()

    expect(created.status).toBe(201)
    expect(firstEnrollment.status).toBe(201)
    expect(secondEnrollment.status).toBe(201)
    expect(listResponse.status).toBe(200)
    expect(listText).toContain(email)
    expect(listText).toContain('"role":"student"')
    expect(listText).not.toContain('password')
    expect(listText).not.toContain('password_hash')
    expect(enrollmentCount?.count).toBe(1)
  })

  it('allows the created learner to log in and access the course but not admin routes', async () => {
    const { cookie: adminCookie } = await registerAdmin(
      `beta-login-admin-${crypto.randomUUID()}@example.com`,
    )
    const email = `beta-login-${crypto.randomUUID()}@example.com`
    const closedBindings = {
      ...createBindings('production'),
      REGISTRATION_MODE: 'closed' as const,
    }
    const created = await app.request(
      '/api/admin/beta-students',
      adminJsonRequest(betaStudentBody(email), adminCookie),
      closedBindings,
    )
    const publicRegistration = await app.request(
      '/api/auth/register',
      jsonRequest(betaStudentBody(`public-${email}`)),
      closedBindings,
    )
    const login = await app.request(
      '/api/auth/login',
      jsonRequest({ email, password: validPassword }),
      closedBindings,
    )
    const studentCookie = getCookieHeader(login)
    const dashboard = await app.request(
      '/api/student/dashboard',
      { headers: { cookie: studentCookie } },
      closedBindings,
    )
    const adminCheck = await app.request(
      '/api/admin/auth-check',
      { headers: { cookie: studentCookie } },
      closedBindings,
    )

    expect(created.status).toBe(201)
    expect(publicRegistration.status).toBe(403)
    expect(login.status).toBe(200)
    expect(dashboard.status).toBe(200)
    expect(await dashboard.text()).toContain('cse-professional')
    expect(adminCheck.status).toBe(403)
  })

  it('rolls back user and enrollment creation when the atomic audit batch fails', async () => {
    const { cookie } = await registerAdmin(
      `beta-rollback-admin-${crypto.randomUUID()}@example.com`,
    )
    const email = `beta-rollback-${crypto.randomUUID()}@example.com`
    const triggerName = `test_beta_audit_failure_${crypto.randomUUID().replaceAll('-', '')}`

    await env.DB.prepare(
      `CREATE TRIGGER ${triggerName}
      BEFORE INSERT ON audit_logs
      WHEN NEW.action = 'beta_student.created'
      BEGIN
        SELECT RAISE(ABORT, 'forced beta audit failure');
      END`,
    ).run()

    try {
      const response = await app.request(
        '/api/admin/beta-students',
        adminJsonRequest(betaStudentBody(email), cookie),
        createBindings('production'),
      )
      const user = await env.DB.prepare(
        'SELECT id FROM users WHERE email = ?1',
      )
        .bind(email)
        .first<{ id: number }>()
      const enrollment = await env.DB.prepare(
        `SELECT course_enrollments.id
        FROM course_enrollments
        INNER JOIN users ON users.id = course_enrollments.user_id
        WHERE users.email = ?1`,
      )
        .bind(email)
        .first<{ id: number }>()

      expect(response.status).toBe(500)
      expect(user).toBeNull()
      expect(enrollment).toBeNull()
      await expect(response.json()).resolves.toMatchObject({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR' },
      })
    } finally {
      await env.DB.prepare(`DROP TRIGGER ${triggerName}`).run()
    }
  })
  it('can create a student without enrollment when the administrator opts out', async () => {
    const { cookie } = await registerAdmin(
      `beta-no-enrollment-admin-${crypto.randomUUID()}@example.com`,
    )
    const email = `beta-no-enrollment-${crypto.randomUUID()}@example.com`
    const response = await app.request(
      '/api/admin/beta-students',
      adminJsonRequest(
        betaStudentBody(email, { enrollInCseProfessional: false }),
        cookie,
      ),
      createBindings('production'),
    )
    const enrollment = await env.DB.prepare(
      `SELECT id FROM course_enrollments
      WHERE user_id = (SELECT id FROM users WHERE email = ?1)`,
    )
      .bind(email)
      .first<{ id: number }>()

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        student: { email, role: 'student', enrollmentStatus: null },
        enrolled: false,
      },
    })
    expect(enrollment).toBeNull()
  })
})
describe('Admin Content Builder Lite API', () => {
  async function createAdminCourseForTest(
    cookie: string,
    slug: string,
    status = 'draft',
  ): Promise<{ id: number; slug: string; updatedAt: string }> {
    const response = await app.request(
      '/api/admin/courses',
      adminJsonRequest(
        {
          title: `Admin Test ${slug}`,
          slug,
          shortDescription: 'Admin test course',
          description: 'Admin test course description',
          level: 'test',
          thumbnailKey: null,
          accessDurationDays: null,
          status,
        },
        cookie,
      ),
      createBindings('production'),
    )
    const body = await response.json<{
      success: true
      data: {
        course: {
          id: number
          slug: string
          updatedAt: string
        }
      }
    }>()

    expect(response.status).toBe(201)
    return body.data.course
  }

  async function createCurriculumShell(cookie: string): Promise<{
    courseId: number
    subjectId: number
    topicId: number
    lessonId: number
    lessonUpdatedAt: string
  }> {
    const unique = crypto.randomUUID().slice(0, 8)
    const course = await createAdminCourseForTest(
      cookie,
      `admin-shell-${unique}`,
    )
    const subjectResponse = await app.request(
      `/api/admin/courses/${course.id}/subjects`,
      adminJsonRequest(
        {
          title: 'Admin Subject',
          slug: `admin-subject-${unique}`,
          description: null,
          status: 'draft',
        },
        cookie,
      ),
      createBindings('production'),
    )
    const subjectBody = await subjectResponse.json<{
      success: true
      data: { subject: { id: number } }
    }>()
    const topicResponse = await app.request(
      `/api/admin/subjects/${subjectBody.data.subject.id}/topics`,
      adminJsonRequest(
        {
          title: 'Admin Topic',
          slug: `admin-topic-${unique}`,
          description: null,
          status: 'draft',
        },
        cookie,
      ),
      createBindings('production'),
    )
    const topicBody = await topicResponse.json<{
      success: true
      data: { topic: { id: number } }
    }>()
    const lessonResponse = await app.request(
      `/api/admin/topics/${topicBody.data.topic.id}/lessons`,
      adminJsonRequest(
        {
          title: 'Admin Lesson',
          slug: `admin-lesson-${unique}`,
          lessonType: 'reading',
          summary: null,
          estimatedMinutes: null,
          isPreview: false,
          requiresPrevious: true,
          status: 'draft',
        },
        cookie,
      ),
      createBindings('production'),
    )
    const lessonBody = await lessonResponse.json<{
      success: true
      data: { lesson: { id: number; updatedAt: string } }
    }>()

    expect(subjectResponse.status).toBe(201)
    expect(topicResponse.status).toBe(201)
    expect(lessonResponse.status).toBe(201)

    return {
      courseId: course.id,
      subjectId: subjectBody.data.subject.id,
      topicId: topicBody.data.topic.id,
      lessonId: lessonBody.data.lesson.id,
      lessonUpdatedAt: lessonBody.data.lesson.updatedAt,
    }
  }

  async function createTypedLessonShell(
    cookie: string,
    lessonType: 'reading' | 'practice' | 'quiz',
  ): Promise<{
    lessonId: number
    lessonType: 'reading' | 'practice' | 'quiz'
    updatedAt: string
  }> {
    const unique = crypto.randomUUID().slice(0, 8)
    const course = await createAdminCourseForTest(
      cookie,
      `typed-course-${unique}`,
    )
    const subjectResponse = await app.request(
      `/api/admin/courses/${course.id}/subjects`,
      adminJsonRequest(
        {
          title: 'Typed Subject',
          slug: `typed-subject-${unique}`,
          status: 'draft',
        },
        cookie,
      ),
      createBindings('production'),
    )
    const subjectBody = await subjectResponse.json<{
      success: true
      data: { subject: { id: number } }
    }>()
    const topicResponse = await app.request(
      `/api/admin/subjects/${subjectBody.data.subject.id}/topics`,
      adminJsonRequest(
        {
          title: 'Typed Topic',
          slug: `typed-topic-${unique}`,
          status: 'draft',
        },
        cookie,
      ),
      createBindings('production'),
    )
    const topicBody = await topicResponse.json<{
      success: true
      data: { topic: { id: number } }
    }>()
    const lessonResponse = await app.request(
      `/api/admin/topics/${topicBody.data.topic.id}/lessons`,
      adminJsonRequest(
        {
          title: `Typed ${lessonType} Lesson`,
          slug: `typed-${lessonType}-${unique}`,
          lessonType,
          status: 'draft',
          isPreview: false,
          requiresPrevious: true,
        },
        cookie,
      ),
      createBindings('production'),
    )
    const lessonBody = await lessonResponse.json<{
      success: true
      data: {
        lesson: {
          id: number
          lessonType: 'reading' | 'practice' | 'quiz'
          updatedAt: string
        }
      }
    }>()

    expect(subjectResponse.status).toBe(201)
    expect(topicResponse.status).toBe(201)
    expect(lessonResponse.status).toBe(201)

    return {
      lessonId: lessonBody.data.lesson.id,
      lessonType: lessonBody.data.lesson.lessonType,
      updatedAt: lessonBody.data.lesson.updatedAt,
    }
  }

  async function addPublishableReadingBlock(
    cookie: string,
    lessonId: number,
  ): Promise<void> {
    const response = await app.request(
      `/api/admin/lessons/${lessonId}/blocks`,
      adminJsonRequest(
        {
          blockType: 'paragraph',
          content: { text: 'Publishable reading content.' },
          position: 1,
        },
        cookie,
      ),
      createBindings('production'),
    )

    expect(response.status).toBe(201)
  }

  async function savePublishedGeneratedPracticeSet(
    cookie: string,
    lessonId: number,
  ): Promise<void> {
    const response = await app.request(
      `/api/admin/lessons/${lessonId}/practice-set`,
      adminJsonRequest(
        {
          title: 'Generated Practice',
          instructions: null,
          passingScore: 60,
          questionCount: 1,
          maximumAttempts: null,
          showExplanations: true,
          status: 'published',
          questionSource: 'generated',
          generatorSlug: 'finding-percentage',
          generatorVersion: 1,
          difficulty: { easy: 1, medium: 0, hard: 0 },
        },
        cookie,
        'PUT',
      ),
      createBindings('production'),
    )

    expect(response.status).toBe(200)
  }

  async function savePublishedQuiz(
    cookie: string,
    lessonId: number,
  ): Promise<void> {
    const draftResponse = await app.request(
      `/api/admin/lessons/${lessonId}/quiz`,
      adminJsonRequest(
        {
          title: 'Publishable Quiz',
          description: null,
          quizType: 'topic',
          passingScore: 70,
          timeLimitMinutes: null,
          maximumAttempts: null,
          shuffleQuestions: false,
          shuffleChoices: false,
          showExplanations: true,
          status: 'draft',
        },
        cookie,
        'PUT',
      ),
      createBindings('production'),
    )
    const draftBody = await draftResponse.json<{
      success: true
      data: { quiz: { id: number } }
    }>()

    expect(draftResponse.status).toBe(200)

    const questionResponse = await app.request(
      `/api/admin/quizzes/${draftBody.data.quiz.id}/questions`,
      adminJsonRequest(
        {
          prompt: 'Which fraction is equal to one half?',
          explanation: '2/4 simplifies to 1/2.',
          points: 1,
          position: 1,
          status: 'active',
          questionType: 'multiple_choice',
          choices: [
            { text: '2/4', isCorrect: true, position: 1 },
            { text: '1/4', isCorrect: false, position: 2 },
            { text: '3/4', isCorrect: false, position: 3 },
            { text: '4/1', isCorrect: false, position: 4 },
          ],
        },
        cookie,
      ),
      createBindings('production'),
    )

    expect(questionResponse.status).toBe(201)

    const publishResponse = await app.request(
      `/api/admin/lessons/${lessonId}/quiz`,
      adminJsonRequest(
        {
          title: 'Publishable Quiz',
          description: null,
          quizType: 'topic',
          passingScore: 70,
          timeLimitMinutes: null,
          maximumAttempts: null,
          shuffleQuestions: false,
          shuffleChoices: false,
          showExplanations: true,
          status: 'published',
        },
        cookie,
        'PUT',
      ),
      createBindings('production'),
    )

    expect(publishResponse.status).toBe(200)
  }

  async function patchLesson(
    cookie: string,
    lessonId: number,
    input: Record<string, unknown>,
  ): Promise<{
    response: Response
    body: {
      success: true
      data: {
        lesson: {
          lessonType: 'reading' | 'practice' | 'quiz'
          status: 'draft' | 'published' | 'archived'
        }
      }
    }
  }> {
    const response = await app.request(
      `/api/admin/lessons/${lessonId}`,
      adminJsonRequest(input, cookie, 'PATCH'),
      createBindings('production'),
    )
    const body = await response.json<{
      success: true
      data: {
        lesson: {
          lessonType: 'reading' | 'practice' | 'quiz'
          status: 'draft' | 'published' | 'archived'
        }
      }
    }>()

    return { response, body }
  }

  it('protects admin reads by role and admin mutations by CSRF header', async () => {
    const { cookie: studentCookie } = await register(
      'admin-builder-student@example.com',
    )
    const studentResponse = await app.request(
      '/api/admin/dashboard',
      { headers: { cookie: studentCookie } },
      createBindings('production'),
    )

    expect(studentResponse.status).toBe(403)

    const { cookie } = await registerAdmin('admin-builder-csrf@example.com')
    const missingCsrfResponse = await app.request(
      '/api/admin/courses',
      jsonRequest(
        {
          title: 'Missing CSRF',
          slug: 'missing-csrf',
          status: 'draft',
        },
        cookie,
      ),
      createBindings('production'),
    )

    expect(missingCsrfResponse.status).toBe(403)

    const created = await createAdminCourseForTest(
      cookie,
      `csrf-ok-${crypto.randomUUID().slice(0, 8)}`,
    )

    expect(created.id).toBeGreaterThan(0)
  })

  it('rejects duplicate course slugs and stale admin updates', async () => {
    const { cookie } = await registerAdmin('admin-builder-stale@example.com')
    const slug = `duplicate-${crypto.randomUUID().slice(0, 8)}`
    const course = await createAdminCourseForTest(cookie, slug)
    const duplicateResponse = await app.request(
      '/api/admin/courses',
      adminJsonRequest(
        {
          title: 'Duplicate',
          slug,
          status: 'draft',
        },
        cookie,
      ),
      createBindings('production'),
    )

    expect(duplicateResponse.status).toBe(409)

    const firstUpdate = await app.request(
      `/api/admin/courses/${course.id}`,
      adminJsonRequest(
        {
          title: 'Fresh update',
          slug,
          status: 'draft',
          updatedAt: course.updatedAt,
        },
        cookie,
        'PATCH',
      ),
      createBindings('production'),
    )

    expect(firstUpdate.status).toBe(200)

    const staleUpdate = await app.request(
      `/api/admin/courses/${course.id}`,
      adminJsonRequest(
        {
          title: 'Stale update',
          slug,
          status: 'draft',
          updatedAt: '1900-01-01 00:00:00',
        },
        cookie,
        'PATCH',
      ),
      createBindings('production'),
    )

    expect(staleUpdate.status).toBe(409)
  })

  it('keeps draft admin-authored courses out of the public catalog', async () => {
    const { cookie } = await registerAdmin('admin-builder-draft@example.com')
    const slug = `draft-hidden-${crypto.randomUUID().slice(0, 8)}`
    await createAdminCourseForTest(cookie, slug, 'draft')

    const publicResponse = await app.request(
      '/api/courses',
      undefined,
      createBindings('production'),
    )
    const body = await publicResponse.json<CourseListBody>()

    expect(publicResponse.status).toBe(200)
    expect(body.data.courses.map((course) => course.slug)).not.toContain(slug)
  })

  it('keeps draft admin-authored curriculum hidden publicly but visible to admins and audited', async () => {
    const { cookie } = await registerAdmin(
      'admin-builder-draft-curriculum@example.com',
    )
    const courseResponse = await app.request(
      '/api/admin/courses/1',
      { headers: { cookie } },
      createBindings('production'),
    )
    const courseBody = await courseResponse.json<{
      success: true
      data: {
        subjects: Array<{
          id: number
          slug: string
          topics: Array<{
            slug: string
            lessons: Array<{ slug: string }>
          }>
        }>
      }
    }>()
    const numericalAbility = courseBody.data.subjects.find(
      (subject) => subject.slug === 'numerical-ability',
    )
    const unique = crypto.randomUUID().slice(0, 8)
    const topicSlug = `draft-fractions-${unique}`
    const lessonSlug = `draft-fraction-lesson-${unique}`

    expect(courseResponse.status).toBe(200)
    expect(numericalAbility).toBeDefined()

    const topicResponse = await app.request(
      `/api/admin/subjects/${numericalAbility?.id}/topics`,
      adminJsonRequest(
        {
          title: 'Draft Fractions Test',
          slug: topicSlug,
          description: 'Draft-only curriculum test topic.',
          position: 99,
          status: 'draft',
        },
        cookie,
      ),
      createBindings('production'),
    )
    const topicBody = await topicResponse.json<{
      success: true
      data: { topic: { id: number } }
    }>()
    const lessonResponse = await app.request(
      `/api/admin/topics/${topicBody.data.topic.id}/lessons`,
      adminJsonRequest(
        {
          title: 'Draft Fraction Lesson Test',
          slug: lessonSlug,
          lessonType: 'reading',
          summary: 'Draft-only lesson.',
          estimatedMinutes: 5,
          isPreview: false,
          requiresPrevious: true,
          status: 'draft',
        },
        cookie,
      ),
      createBindings('production'),
    )

    expect(topicResponse.status).toBe(201)
    expect(lessonResponse.status).toBe(201)

    const adminDetailResponse = await app.request(
      '/api/admin/courses/1',
      { headers: { cookie } },
      createBindings('production'),
    )
    const adminDetailBody = await adminDetailResponse.json<typeof courseBody>()
    const adminTopic = adminDetailBody.data.subjects
      .find((subject) => subject.slug === 'numerical-ability')
      ?.topics.find((topic) => topic.slug === topicSlug)
    const publicResponse = await app.request(
      '/api/courses/cse-professional',
      undefined,
      createBindings('production'),
    )
    const publicBody = await publicResponse.json<CourseDetailBody>()
    const auditResponse = await app.request(
      '/api/admin/audit-logs',
      { headers: { cookie } },
      createBindings('production'),
    )
    const auditBody = await auditResponse.json<{
      success: true
      data: {
        logs: Array<{
          action: string
          entityType: string
        }>
      }
    }>()

    expect(adminTopic?.lessons.map((lesson) => lesson.slug)).toContain(
      lessonSlug,
    )
    expect(
      publicBody.data.curriculum.flatMap((subject) =>
        subject.topics.map((topic) => topic.slug),
      ),
    ).not.toContain(topicSlug)
    expect(
      auditBody.data.logs.some(
        (log) => log.action === 'create' && log.entityType === 'topic',
      ),
    ).toBe(true)
    expect(
      auditBody.data.logs.some(
        (log) => log.action === 'create' && log.entityType === 'lesson',
      ),
    ).toBe(true)
  })

  it('validates lesson publish readiness and blocks raw HTML content', async () => {
    const { cookie } = await registerAdmin('admin-builder-publish@example.com')
    const shell = await createCurriculumShell(cookie)

    const publishResponse = await app.request(
      `/api/admin/lessons/${shell.lessonId}`,
      adminJsonRequest(
        {
          title: 'Admin Lesson',
          slug: 'admin-lesson-publish-test',
          status: 'published',
          updatedAt: shell.lessonUpdatedAt,
        },
        cookie,
        'PATCH',
      ),
      createBindings('production'),
    )

    expect(publishResponse.status).toBe(400)

    const rawHtmlResponse = await app.request(
      `/api/admin/lessons/${shell.lessonId}/blocks`,
      adminJsonRequest(
        {
          blockType: 'paragraph',
          content: { text: '<p>Do not store raw HTML.</p>' },
        },
        cookie,
      ),
      createBindings('production'),
    )

    expect(rawHtmlResponse.status).toBe(400)
    await expect(rawHtmlResponse.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'RAW_HTML_BLOCKED' },
    })
  })

  it('creates and updates illustrated guided teaching while rejecting malformed content', async () => {
    const { cookie } = await registerAdmin('admin-guided-block@example.com')
    const shell = await createCurriculumShell(cookie)
    const content = {
      title: 'Guided transformation',
      steps: [{
        id: 'guided-step-1',
        stepNumber: 1,
        title: 'Start here',
        boardExpression: '20%',
        explanation: 'This value comes directly from the question.',
      }],
    }
    const createResponse = await app.request(
      `/api/admin/lessons/${shell.lessonId}/blocks`,
      adminJsonRequest({
        blockType: 'illustrated-guided-teaching',
        content,
        position: 1,
      }, cookie),
      createBindings('production'),
    )
    const created = await createResponse.json<{
      success: true
      data: { block: { id: number; type: string; content: unknown; position: number } }
    }>()
    expect(createResponse.status).toBe(201)
    expect(created.data.block).toMatchObject({
      type: 'illustrated-guided-teaching',
      content,
      position: 1,
    })

    const updatedContent = { ...content, title: 'Updated guided transformation' }
    const updateResponse = await app.request(
      `/api/admin/lesson-blocks/${created.data.block.id}`,
      adminJsonRequest({
        blockType: 'illustrated-guided-teaching',
        content: updatedContent,
      }, cookie, 'PATCH'),
      createBindings('production'),
    )
    expect(updateResponse.status).toBe(200)
    await expect(updateResponse.json()).resolves.toMatchObject({
      success: true,
      data: { block: { type: 'illustrated-guided-teaching', content: updatedContent } },
    })

    const malformedResponse = await app.request(
      `/api/admin/lessons/${shell.lessonId}/blocks`,
      adminJsonRequest({
        blockType: 'illustrated-guided-teaching',
        content: { title: 'Missing required steps' },
        position: 2,
      }, cookie),
      createBindings('production'),
    )
    expect(malformedResponse.status).toBe(400)
    await expect(malformedResponse.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'INVALID_LESSON_BLOCK_CONTENT' },
    })
  })

  it('rolls back occupied-position shifts and block creation when create audit fails', async () => {
    const { cookie } = await registerAdmin('admin-block-create-rollback@example.com')
    const shell = await createCurriculumShell(cookie)
    const originalResponse = await app.request(
      `/api/admin/lessons/${shell.lessonId}/blocks`,
      adminJsonRequest({
        blockType: 'paragraph',
        content: { text: 'Original block.' },
        position: 1,
      }, cookie),
      createBindings('production'),
    )
    expect(originalResponse.status).toBe(201)
    const before = (await env.DB.prepare(
      'SELECT id,block_type,content_json,position FROM lesson_blocks WHERE lesson_id=?1 ORDER BY id',
    ).bind(shell.lessonId).all()).results
    await env.DB.prepare(
      `CREATE TRIGGER fail_test_lesson_block_create_audit
       BEFORE INSERT ON audit_logs
       WHEN NEW.entity_type='lesson_block'
       BEGIN SELECT RAISE(ABORT,'forced create audit failure'); END`,
    ).run()
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    try {
      const response = await app.request(
        `/api/admin/lessons/${shell.lessonId}/blocks`,
        adminJsonRequest({
          blockType: 'paragraph',
          content: { text: 'This create must roll back.' },
          position: 1,
        }, cookie),
        createBindings('production'),
      )
      expect(response.status).toBe(500)
      const after = (await env.DB.prepare(
        'SELECT id,block_type,content_json,position FROM lesson_blocks WHERE lesson_id=?1 ORDER BY id',
      ).bind(shell.lessonId).all()).results
      expect(after).toEqual(before)
    } finally {
      errorLog.mockRestore()
      await env.DB.prepare('DROP TRIGGER fail_test_lesson_block_create_audit').run()
    }
  })
  it('repairs the known Percentage partial shift atomically and is idempotent', async () => {
    const { cookie } = await registerAdmin('admin-percentage-repair@example.com')
    const lesson = await env.DB.prepare(
      `SELECT lessons.id
       FROM lessons
       JOIN topics ON topics.id=lessons.topic_id
       JOIN subjects ON subjects.id=topics.subject_id
       JOIN courses ON courses.id=subjects.course_id
       WHERE courses.slug='cse-professional'
         AND subjects.slug='numerical-ability'
         AND topics.slug='percentages'
         AND lessons.slug='finding-the-percentage'`,
    ).first<{ id: number }>()
    if (lesson === null) throw new Error('Seeded Percentage lesson is missing.')
    const originalRows = (await env.DB.prepare(
      'SELECT * FROM lesson_blocks WHERE lesson_id=?1 ORDER BY position,id',
    ).bind(lesson.id).all<{
      id: number
      lesson_id: number
      block_type: string
      content_json: string
      position: number
      created_at: string
      updated_at: string
    }>()).results
    const guidedContent = {
      title: 'Find 20% of 80',
      steps: [{
        id: 'percent-step-1',
        stepNumber: 1,
        title: 'Start from the percent form',
        boardExpression: '20%',
        explanation: 'The value comes directly from the question.',
      }],
    }
    const fixtureBlocks = [
      ['heading', { level: 1, text: 'Finding the Percentage' }, 1],
      ['paragraph', { text: 'Pilot paragraph.' }, 2],
      ['formula', { expression: 'Percentage = Rate x Base', description: 'Pilot formula.' }, 3],
      ['summary', { items: ['Pilot summary.'] }, 4],
      ['example', percentageExampleContent, 7],
      ['example', { title: 'Second example', problem: 'Problem?', steps: ['Step.'], answer: 'Answer.' }, 8],
      ['example', { title: 'Third example', problem: 'Problem?', steps: ['Step.'], answer: 'Answer.' }, 9],
      ['callout', { variant: 'warning', title: 'Warning', text: 'Check the decimal.' }, 10],
      ['summary', { items: ['Final summary.'] }, 11],
    ] as const
    const insertedFixtureIds: number[] = []

    try {
      await env.DB.prepare('DELETE FROM lesson_blocks WHERE lesson_id=?1').bind(lesson.id).run()
      for (const [blockType, content, position] of fixtureBlocks) {
        const inserted = await env.DB.prepare(
          `INSERT INTO lesson_blocks(lesson_id,block_type,content_json,position)
           VALUES(?1,?2,?3,?4)`,
        ).bind(lesson.id, blockType, JSON.stringify(content), position).run()
        insertedFixtureIds.push(Number(inserted.meta.last_row_id))
      }

      const beforeFailure = (await env.DB.prepare(
        'SELECT id,position FROM lesson_blocks WHERE lesson_id=?1 ORDER BY id',
      ).bind(lesson.id).all()).results
      await env.DB.prepare(
        `CREATE TRIGGER fail_test_percentage_repair_audit
         BEFORE INSERT ON audit_logs
         WHEN NEW.entity_type='lesson_block'
         BEGIN SELECT RAISE(ABORT,'forced Percentage repair audit failure'); END`,
      ).run()
      const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      try {
        const failedResponse = await app.request(
          `/api/admin/lessons/${lesson.id}/percentage-guided-teaching`,
          adminJsonRequest({ content: guidedContent }, cookie),
          createBindings('production'),
        )
        expect(failedResponse.status).toBe(500)
        const afterFailure = (await env.DB.prepare(
          'SELECT id,position FROM lesson_blocks WHERE lesson_id=?1 ORDER BY id',
        ).bind(lesson.id).all()).results
        expect(afterFailure).toEqual(beforeFailure)
        expect(await env.DB.prepare(
          "SELECT COUNT(*) AS count FROM lesson_blocks WHERE lesson_id=?1 AND block_type='illustrated-guided-teaching'",
        ).bind(lesson.id).first<{ count: number }>()).toEqual({ count: 0 })
      } finally {
        errorLog.mockRestore()
        await env.DB.prepare('DROP TRIGGER fail_test_percentage_repair_audit').run()
      }

      const firstResponse = await app.request(
        `/api/admin/lessons/${lesson.id}/percentage-guided-teaching`,
        adminJsonRequest({ content: guidedContent }, cookie),
        createBindings('production'),
      )
      expect(firstResponse.status).toBe(200)
      const first = await firstResponse.json<{
        success: true
        data: { block: { id: number }; writeRequired: boolean; repairedPositionCount: number }
      }>()
      insertedFixtureIds.push(first.data.block.id)
      expect(first.data).toMatchObject({ writeRequired: true, repairedPositionCount: 5 })

      const afterFirst = (await env.DB.prepare(
        'SELECT id,block_type,content_json,position FROM lesson_blocks WHERE lesson_id=?1 ORDER BY position',
      ).bind(lesson.id).all<{
        id: number
        block_type: string
        content_json: string
        position: number
      }>()).results
      expect(afterFirst.map((block) => block.position)).toEqual([1,2,3,4,5,6,7,8,9,10])
      expect(afterFirst.filter((block) => block.block_type === 'illustrated-guided-teaching')).toHaveLength(1)
      expect(afterFirst[5]?.id).toBe(insertedFixtureIds[4])
      expect(JSON.parse(afterFirst[5]?.content_json ?? '{}')).toEqual(percentageExampleContent)

      const secondResponse = await app.request(
        `/api/admin/lessons/${lesson.id}/percentage-guided-teaching`,
        adminJsonRequest({ content: guidedContent }, cookie),
        createBindings('production'),
      )
      const second = await secondResponse.json<{
        success: true
        data: { block: { id: number }; writeRequired: boolean; repairedPositionCount: number }
      }>()
      expect(secondResponse.status).toBe(200)
      expect(second.data.block.id).toBe(first.data.block.id)
      expect(second.data.block).toMatchObject({ position: 5 })
      expect(second.data.writeRequired).toBe(false)
      expect(second.data.repairedPositionCount).toBe(0)
      const afterSecond = (await env.DB.prepare(
        'SELECT id,position FROM lesson_blocks WHERE lesson_id=?1 ORDER BY position',
      ).bind(lesson.id).all<{ id: number; position: number }>()).results
      expect(afterSecond).toEqual(afterFirst.map(({ id, position }) => ({ id, position })))
    } finally {
      await env.DB.prepare('DELETE FROM lesson_blocks WHERE lesson_id=?1').bind(lesson.id).run()
      for (const block of originalRows) {
        await env.DB.prepare(
          `INSERT INTO lesson_blocks(
            id,lesson_id,block_type,content_json,position,created_at,updated_at
          ) VALUES(?1,?2,?3,?4,?5,?6,?7)`,
        ).bind(
          block.id,
          block.lesson_id,
          block.block_type,
          block.content_json,
          block.position,
          block.created_at,
          block.updated_at,
        ).run()
      }
      for (const id of insertedFixtureIds) {
        await env.DB.prepare(
          "DELETE FROM audit_logs WHERE entity_type='lesson_block' AND entity_id=?1",
        ).bind(String(id)).run()
      }
    }
  })

  it('reconciles a partial Percentage lesson atomically, preserves valid IDs, and is idempotent', async () => {
    const { cookie } = await registerAdmin('admin-percentage-v1-reconcile@example.com')
    const spec = percentageLessonSpecs[0]
    const lesson = await env.DB.prepare(
      `SELECT lessons.id
       FROM lessons
       JOIN topics ON topics.id=lessons.topic_id
       JOIN subjects ON subjects.id=topics.subject_id
       JOIN courses ON courses.id=subjects.course_id
       WHERE courses.slug='cse-professional'
         AND subjects.slug='numerical-ability'
         AND topics.slug='percentages'
         AND lessons.slug=?1`,
    ).bind(spec.slug).first<{ id: number }>()
    if (lesson === null) throw new Error('Seeded Percentage lesson is missing.')
    const originalRows = (await env.DB.prepare(
      'SELECT * FROM lesson_blocks WHERE lesson_id=?1 ORDER BY position,id',
    ).bind(lesson.id).all<{
      id: number
      lesson_id: number
      block_type: string
      content_json: string
      position: number
      created_at: string
      updated_at: string
    }>()).results
    const fixtureIds: number[] = []

    try {
      await env.DB.prepare('DELETE FROM lesson_blocks WHERE lesson_id=?1').bind(lesson.id).run()
      for (const [index, block] of spec.blocks.entries()) {
        const content = index === 1
          ? { text: 'Stale Percentage explanation.' }
          : block.content
        const inserted = await env.DB.prepare(
          `INSERT INTO lesson_blocks(lesson_id,block_type,content_json,position)
           VALUES(?1,?2,?3,?4)`,
        ).bind(
          lesson.id,
          block.blockType,
          JSON.stringify(content),
          index + 1,
        ).run()
        fixtureIds.push(Number(inserted.meta.last_row_id))
      }
      const firstId = fixtureIds[0]
      const desired = {
        blocks: spec.blocks.map((block, index) => ({
          ...block,
          position: index + 1,
        })),
      }


      const beforeFailure = (await env.DB.prepare(
        'SELECT id,block_type,content_json,position FROM lesson_blocks WHERE lesson_id=?1 ORDER BY position,id',
      ).bind(lesson.id).all()).results
      await env.DB.prepare(
        `CREATE TRIGGER fail_test_percentage_v1_reconcile_audit
         BEFORE INSERT ON audit_logs
         WHEN NEW.entity_type='lesson' AND NEW.action='reconcile'
         BEGIN SELECT RAISE(ABORT,'forced Percentage v1 reconcile audit failure'); END`,
      ).run()
      const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      try {
        const failedResponse = await app.request(
          `/api/admin/lessons/${lesson.id}/percentage-teaching-system-v1`,
          adminJsonRequest(desired, cookie, 'PUT'),
          createBindings('production'),
        )
        expect(failedResponse.status).toBe(500)
        expect((await env.DB.prepare(
          'SELECT id,block_type,content_json,position FROM lesson_blocks WHERE lesson_id=?1 ORDER BY position,id',
        ).bind(lesson.id).all()).results).toEqual(beforeFailure)
      } finally {
        errorLog.mockRestore()
        await env.DB.prepare('DROP TRIGGER fail_test_percentage_v1_reconcile_audit').run()
      }

      const firstResponse = await app.request(
        `/api/admin/lessons/${lesson.id}/percentage-teaching-system-v1`,
        adminJsonRequest(desired, cookie, 'PUT'),
        createBindings('production'),
      )
      expect(firstResponse.status).toBe(200)
      const first = await firstResponse.json<{
        success: true
        data: {
          blocks: Array<{ id: number; type: string; content: unknown; position: number }>
          writeRequired: boolean
          createdCount: number
          updatedCount: number
          deletedCount: number
        }
      }>()
      expect(first.data).toMatchObject({
        writeRequired: true,
        createdCount: 0,
        updatedCount: 1,
        deletedCount: 0,
      })
      expect(first.data.blocks[0]?.id).toBe(firstId)
      expect(first.data.blocks.map((block) => block.position)).toEqual(
        spec.blocks.map((_, index) => index + 1),
      )
      expect(first.data.blocks.map((block) => block.type)).toEqual(
        spec.blocks.map((block) => block.blockType),
      )

      const rowsAfterFirst = (await env.DB.prepare(
        'SELECT id,block_type,content_json,position FROM lesson_blocks WHERE lesson_id=?1 ORDER BY position,id',
      ).bind(lesson.id).all()).results
      const secondResponse = await app.request(
        `/api/admin/lessons/${lesson.id}/percentage-teaching-system-v1`,
        adminJsonRequest(desired, cookie, 'PUT'),
        createBindings('production'),
      )
      const second = await secondResponse.json<{
        success: true
        data: {
          writeRequired: boolean
          createdCount: number
          updatedCount: number
          deletedCount: number
        }
      }>()
      expect(secondResponse.status).toBe(200)
      expect(second.data).toMatchObject({
        writeRequired: false,
        createdCount: 0,
        updatedCount: 0,
        deletedCount: 0,
      })
      expect((await env.DB.prepare(
        'SELECT id,block_type,content_json,position FROM lesson_blocks WHERE lesson_id=?1 ORDER BY position,id',
      ).bind(lesson.id).all()).results).toEqual(rowsAfterFirst)
    } finally {
      await env.DB.prepare('DELETE FROM lesson_blocks WHERE lesson_id=?1').bind(lesson.id).run()
      for (const block of originalRows) {
        await env.DB.prepare(
          `INSERT INTO lesson_blocks(
            id,lesson_id,block_type,content_json,position,created_at,updated_at
          ) VALUES(?1,?2,?3,?4,?5,?6,?7)`,
        ).bind(
          block.id,
          block.lesson_id,
          block.block_type,
          block.content_json,
          block.position,
          block.created_at,
          block.updated_at,
        ).run()
      }
      for (const id of fixtureIds) {
        await env.DB.prepare(
          "DELETE FROM audit_logs WHERE entity_type IN ('lesson','lesson_block') AND entity_id=?1",
        ).bind(String(id)).run()
      }
      await env.DB.prepare(
        "DELETE FROM audit_logs WHERE entity_type='lesson' AND entity_id=?1 AND action='reconcile'",
      ).bind(String(lesson.id)).run()
    }
  })

  it('reconciles a partial Fractions lesson atomically, rejects malformed content, and is idempotent', async () => {
    const { cookie } = await registerAdmin('admin-fractions-v1-reconcile@example.com')
    const spec = fractionsLessonSpecs[0]
    const subject = await env.DB.prepare(
      `SELECT subjects.id
       FROM subjects
       JOIN courses ON courses.id=subjects.course_id
       WHERE courses.slug='cse-professional' AND subjects.slug='numerical-ability'`,
    ).first<{ id: number }>()
    if (subject === null) throw new Error('Seeded Numerical Ability subject is missing.')
    const nextPosition = await env.DB.prepare(
      'SELECT COALESCE(MAX(position),0)+1 AS position FROM topics WHERE subject_id=?1',
    ).bind(subject.id).first<{ position: number }>()
    const topic = await env.DB.prepare(
      `INSERT INTO topics(subject_id,title,slug,position,status)
       VALUES(?1,'Fractions','fractions',?2,'draft') RETURNING id`,
    ).bind(subject.id, nextPosition?.position ?? 1).first<{ id: number }>()
    if (topic === null) throw new Error('Fractions topic fixture was not created.')
    const lesson = await env.DB.prepare(
      `INSERT INTO lessons(
        topic_id,public_id,title,slug,lesson_type,estimated_minutes,position,status
       ) VALUES(?1,?2,?3,?4,?5,?6,1,'draft') RETURNING id`,
    ).bind(
      topic.id,
      `lesson-fractions-v1-${crypto.randomUUID()}`,
      spec.title,
      spec.slug,
      spec.lessonType,
      spec.estimatedMinutes,
    ).first<{ id: number }>()
    if (lesson === null) throw new Error('Fractions lesson fixture was not created.')

    try {
      const fixtureIds: number[] = []
      for (const [index, block] of spec.blocks.entries()) {
        const inserted = await env.DB.prepare(
          `INSERT INTO lesson_blocks(lesson_id,block_type,content_json,position)
           VALUES(?1,?2,?3,?4)`,
        ).bind(
          lesson.id,
          block.blockType,
          JSON.stringify(index === 1 ? { text: 'Stale Fractions explanation.' } : block.content),
          index + 1,
        ).run()
        fixtureIds.push(Number(inserted.meta.last_row_id))
      }
      await env.DB.prepare(
        `INSERT INTO lesson_blocks(lesson_id,block_type,content_json,position)
         VALUES(?1,'illustrated-guided-teaching',?2,?3)`,
      ).bind(
        lesson.id,
        JSON.stringify({ title: 'Obsolete Fractions pilot' }),
        spec.blocks.length + 1,
      ).run()
      const firstId = fixtureIds[0]
      const desired = {
        blocks: spec.blocks.map((block, index) => ({ ...block, position: index + 1 })),
      }
      const rowsBefore = (await env.DB.prepare(
        'SELECT id,block_type,content_json,position FROM lesson_blocks WHERE lesson_id=?1 ORDER BY position,id',
      ).bind(lesson.id).all()).results

      const malformed = structuredClone(desired)
      malformed.blocks[0] = {
        ...malformed.blocks[0],
        content: { text: '<script>alert(1)</script>' },
      }
      const malformedResponse = await app.request(
        `/api/admin/lessons/${lesson.id}/fractions-teaching-system-v1`,
        adminJsonRequest(malformed, cookie, 'PUT'),
        createBindings('production'),
      )
      expect(malformedResponse.status).toBe(400)
      expect((await env.DB.prepare(
        'SELECT id,block_type,content_json,position FROM lesson_blocks WHERE lesson_id=?1 ORDER BY position,id',
      ).bind(lesson.id).all()).results).toEqual(rowsBefore)

      await env.DB.prepare(
        `CREATE TRIGGER fail_test_fractions_v1_reconcile_audit
         BEFORE INSERT ON audit_logs
         WHEN NEW.entity_type='lesson' AND NEW.action='reconcile'
         BEGIN SELECT RAISE(ABORT,'forced Fractions v1 reconcile audit failure'); END`,
      ).run()
      const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      try {
        const failedResponse = await app.request(
          `/api/admin/lessons/${lesson.id}/fractions-teaching-system-v1`,
          adminJsonRequest(desired, cookie, 'PUT'),
          createBindings('production'),
        )
        expect(failedResponse.status).toBe(500)
        expect((await env.DB.prepare(
          'SELECT id,block_type,content_json,position FROM lesson_blocks WHERE lesson_id=?1 ORDER BY position,id',
        ).bind(lesson.id).all()).results).toEqual(rowsBefore)
      } finally {
        errorLog.mockRestore()
        await env.DB.prepare('DROP TRIGGER fail_test_fractions_v1_reconcile_audit').run()
      }

      const firstResponse = await app.request(
        `/api/admin/lessons/${lesson.id}/fractions-teaching-system-v1`,
        adminJsonRequest(desired, cookie, 'PUT'),
        createBindings('production'),
      )
      expect(firstResponse.status).toBe(200)
      const first = await firstResponse.json<{
        success: true
        data: {
          blocks: Array<{ id: number; type: string; position: number }>
          writeRequired: boolean
          createdCount: number
          updatedCount: number
          deletedCount: number
        }
      }>()
      expect(first.data).toMatchObject({
        writeRequired: true,
        createdCount: 0,
        updatedCount: 1,
        deletedCount: 1,
      })
      expect(first.data.blocks[0]?.id).toBe(firstId)
      expect(first.data.blocks.map((block) => block.position)).toEqual(
        spec.blocks.map((_, index) => index + 1),
      )
      expect(first.data.blocks.some((block) => block.type === 'illustrated-guided-teaching')).toBe(false)
      const rowsAfterFirst = (await env.DB.prepare(
        'SELECT id,block_type,content_json,position FROM lesson_blocks WHERE lesson_id=?1 ORDER BY position,id',
      ).bind(lesson.id).all()).results

      const secondResponse = await app.request(
        `/api/admin/lessons/${lesson.id}/fractions-teaching-system-v1`,
        adminJsonRequest(desired, cookie, 'PUT'),
        createBindings('production'),
      )
      const second = await secondResponse.json<{
        success: true
        data: { writeRequired: boolean; createdCount: number; updatedCount: number; deletedCount: number }
      }>()
      expect(secondResponse.status).toBe(200)
      expect(second.data).toMatchObject({
        writeRequired: false,
        createdCount: 0,
        updatedCount: 0,
        deletedCount: 0,
      })
      expect((await env.DB.prepare(
        'SELECT id,block_type,content_json,position FROM lesson_blocks WHERE lesson_id=?1 ORDER BY position,id',
      ).bind(lesson.id).all()).results).toEqual(rowsAfterFirst)
    } finally {
      await env.DB.prepare(
        "DELETE FROM audit_logs WHERE entity_type='lesson' AND entity_id=?1 AND action='reconcile'",
      ).bind(String(lesson.id)).run()
      await env.DB.prepare('DELETE FROM topics WHERE id=?1').bind(topic.id).run()
    }
  })
  it('reconciles a partial Decimals lesson atomically, rejects malformed content, and is idempotent', async () => {
    const { cookie } = await registerAdmin('admin-decimals-v1-reconcile@example.com')
    const spec = decimalsLessonSpecs[0]
    const subject = await env.DB.prepare(
      `SELECT subjects.id
       FROM subjects
       JOIN courses ON courses.id=subjects.course_id
       WHERE courses.slug='cse-professional' AND subjects.slug='numerical-ability'`,
    ).first<{ id: number }>()
    if (subject === null) throw new Error('Seeded Numerical Ability subject is missing.')
    const nextPosition = await env.DB.prepare(
      'SELECT COALESCE(MAX(position),0)+1 AS position FROM topics WHERE subject_id=?1',
    ).bind(subject.id).first<{ position: number }>()
    const topic = await env.DB.prepare(
      `INSERT INTO topics(subject_id,title,slug,position,status)
       VALUES(?1,'Decimals','decimals',?2,'draft') RETURNING id`,
    ).bind(subject.id, nextPosition?.position ?? 1).first<{ id: number }>()
    if (topic === null) throw new Error('Decimals topic fixture was not created.')
    const lesson = await env.DB.prepare(
      `INSERT INTO lessons(
        topic_id,public_id,title,slug,lesson_type,estimated_minutes,position,status
       ) VALUES(?1,?2,?3,?4,?5,?6,1,'draft') RETURNING id`,
    ).bind(
      topic.id,
      `lesson-decimals-v1-${crypto.randomUUID()}`,
      spec.title,
      spec.slug,
      spec.lessonType,
      spec.estimatedMinutes,
    ).first<{ id: number }>()
    if (lesson === null) throw new Error('Decimals lesson fixture was not created.')

    try {
      const fixtureIds: number[] = []
      for (const [index, block] of spec.blocks.entries()) {
        const inserted = await env.DB.prepare(
          `INSERT INTO lesson_blocks(lesson_id,block_type,content_json,position)
           VALUES(?1,?2,?3,?4)`,
        ).bind(
          lesson.id,
          block.blockType,
          JSON.stringify(index === 1 ? { text: 'Stale Decimals explanation.' } : block.content),
          index + 1,
        ).run()
        fixtureIds.push(Number(inserted.meta.last_row_id))
      }
      await env.DB.prepare(
        `INSERT INTO lesson_blocks(lesson_id,block_type,content_json,position)
         VALUES(?1,'illustrated-guided-teaching',?2,?3)`,
      ).bind(
        lesson.id,
        JSON.stringify({ title: 'Obsolete Decimals pilot' }),
        spec.blocks.length + 1,
      ).run()
      const firstId = fixtureIds[0]
      const desired = {
        blocks: spec.blocks.map((block, index) => ({ ...block, position: index + 1 })),
      }
      const rowsBefore = (await env.DB.prepare(
        'SELECT id,block_type,content_json,position FROM lesson_blocks WHERE lesson_id=?1 ORDER BY position,id',
      ).bind(lesson.id).all()).results

      const malformed = structuredClone(desired)
      malformed.blocks[0] = {
        ...malformed.blocks[0],
        content: { text: '<script>alert(1)</script>' },
      }
      const malformedResponse = await app.request(
        `/api/admin/lessons/${lesson.id}/decimals-teaching-system-v1`,
        adminJsonRequest(malformed, cookie, 'PUT'),
        createBindings('production'),
      )
      expect(malformedResponse.status).toBe(400)
      expect((await env.DB.prepare(
        'SELECT id,block_type,content_json,position FROM lesson_blocks WHERE lesson_id=?1 ORDER BY position,id',
      ).bind(lesson.id).all()).results).toEqual(rowsBefore)

      await env.DB.prepare(
        `CREATE TRIGGER fail_test_decimals_v1_reconcile_audit
         BEFORE INSERT ON audit_logs
         WHEN NEW.entity_type='lesson' AND NEW.action='reconcile'
         BEGIN SELECT RAISE(ABORT,'forced Decimals v1 reconcile audit failure'); END`,
      ).run()
      const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      try {
        const failedResponse = await app.request(
          `/api/admin/lessons/${lesson.id}/decimals-teaching-system-v1`,
          adminJsonRequest(desired, cookie, 'PUT'),
          createBindings('production'),
        )
        expect(failedResponse.status).toBe(500)
        expect((await env.DB.prepare(
          'SELECT id,block_type,content_json,position FROM lesson_blocks WHERE lesson_id=?1 ORDER BY position,id',
        ).bind(lesson.id).all()).results).toEqual(rowsBefore)
      } finally {
        errorLog.mockRestore()
        await env.DB.prepare('DROP TRIGGER fail_test_decimals_v1_reconcile_audit').run()
      }

      const firstResponse = await app.request(
        `/api/admin/lessons/${lesson.id}/decimals-teaching-system-v1`,
        adminJsonRequest(desired, cookie, 'PUT'),
        createBindings('production'),
      )
      expect(firstResponse.status).toBe(200)
      const first = await firstResponse.json<{
        success: true
        data: {
          blocks: Array<{ id: number; type: string; position: number }>
          writeRequired: boolean
          createdCount: number
          updatedCount: number
          deletedCount: number
        }
      }>()
      expect(first.data).toMatchObject({
        writeRequired: true,
        createdCount: 0,
        updatedCount: 1,
        deletedCount: 1,
      })
      expect(first.data.blocks[0]?.id).toBe(firstId)
      expect(first.data.blocks.map((block) => block.position)).toEqual(
        spec.blocks.map((_, index) => index + 1),
      )
      expect(first.data.blocks.some((block) => block.type === 'illustrated-guided-teaching')).toBe(false)
      const rowsAfterFirst = (await env.DB.prepare(
        'SELECT id,block_type,content_json,position FROM lesson_blocks WHERE lesson_id=?1 ORDER BY position,id',
      ).bind(lesson.id).all()).results

      const secondResponse = await app.request(
        `/api/admin/lessons/${lesson.id}/decimals-teaching-system-v1`,
        adminJsonRequest(desired, cookie, 'PUT'),
        createBindings('production'),
      )
      const second = await secondResponse.json<{
        success: true
        data: { writeRequired: boolean; createdCount: number; updatedCount: number; deletedCount: number }
      }>()
      expect(secondResponse.status).toBe(200)
      expect(second.data).toMatchObject({
        writeRequired: false,
        createdCount: 0,
        updatedCount: 0,
        deletedCount: 0,
      })
      expect((await env.DB.prepare(
        'SELECT id,block_type,content_json,position FROM lesson_blocks WHERE lesson_id=?1 ORDER BY position,id',
      ).bind(lesson.id).all()).results).toEqual(rowsAfterFirst)
    } finally {
      await env.DB.prepare(
        "DELETE FROM audit_logs WHERE entity_type='lesson' AND entity_id=?1 AND action='reconcile'",
      ).bind(String(lesson.id)).run()
      await env.DB.prepare('DELETE FROM topics WHERE id=?1').bind(topic.id).run()
    }
  })
  it('reconciles a partial Ratio and Proportion lesson atomically, rejects malformed content, and is idempotent', async () => {
    const { cookie } = await registerAdmin('admin-ratio-proportion-v1-reconcile@example.com')
    const spec = ratioProportionLessonSpecs[0]
    const subject = await env.DB.prepare(
      `SELECT subjects.id
       FROM subjects
       JOIN courses ON courses.id=subjects.course_id
       WHERE courses.slug='cse-professional' AND subjects.slug='numerical-ability'`,
    ).first<{ id: number }>()
    if (subject === null) throw new Error('Seeded Numerical Ability subject is missing.')
    const nextPosition = await env.DB.prepare(
      'SELECT COALESCE(MAX(position),0)+1 AS position FROM topics WHERE subject_id=?1',
    ).bind(subject.id).first<{ position: number }>()
    const topic = await env.DB.prepare(
      `INSERT INTO topics(subject_id,title,slug,position,status)
       VALUES(?1,'Ratio and Proportion','ratio-and-proportion',?2,'draft') RETURNING id`,
    ).bind(subject.id, nextPosition?.position ?? 1).first<{ id: number }>()
    if (topic === null) throw new Error('Ratio and Proportion topic fixture was not created.')
    const lesson = await env.DB.prepare(
      `INSERT INTO lessons(
        topic_id,public_id,title,slug,lesson_type,estimated_minutes,position,status
       ) VALUES(?1,?2,?3,?4,?5,?6,1,'draft') RETURNING id`,
    ).bind(
      topic.id,
      `lesson-ratio-proportion-v1-${crypto.randomUUID()}`,
      spec.title,
      spec.slug,
      spec.lessonType,
      spec.estimatedMinutes,
    ).first<{ id: number }>()
    if (lesson === null) throw new Error('Ratio and Proportion lesson fixture was not created.')

    try {
      const fixtureIds: number[] = []
      for (const [index, block] of spec.blocks.entries()) {
        const inserted = await env.DB.prepare(
          `INSERT INTO lesson_blocks(lesson_id,block_type,content_json,position)
           VALUES(?1,?2,?3,?4)`,
        ).bind(
          lesson.id,
          block.blockType,
          JSON.stringify(index === 1 ? { text: 'Stale Ratio and Proportion explanation.' } : block.content),
          index + 1,
        ).run()
        fixtureIds.push(Number(inserted.meta.last_row_id))
      }
      await env.DB.prepare(
        `INSERT INTO lesson_blocks(lesson_id,block_type,content_json,position)
         VALUES(?1,'illustrated-guided-teaching',?2,?3)`,
      ).bind(
        lesson.id,
        JSON.stringify({ title: 'Obsolete Ratio and Proportion pilot' }),
        spec.blocks.length + 1,
      ).run()
      const firstId = fixtureIds[0]
      const desired = {
        blocks: spec.blocks.map((block, index) => ({ ...block, position: index + 1 })),
      }
      const rowsBefore = (await env.DB.prepare(
        'SELECT id,block_type,content_json,position FROM lesson_blocks WHERE lesson_id=?1 ORDER BY position,id',
      ).bind(lesson.id).all()).results

      const malformed = structuredClone(desired)
      malformed.blocks[0] = {
        ...malformed.blocks[0],
        content: { text: '<script>alert(1)</script>' },
      }
      const malformedResponse = await app.request(
        `/api/admin/lessons/${lesson.id}/ratio-proportion-teaching-system-v1`,
        adminJsonRequest(malformed, cookie, 'PUT'),
        createBindings('production'),
      )
      expect(malformedResponse.status).toBe(400)
      expect((await env.DB.prepare(
        'SELECT id,block_type,content_json,position FROM lesson_blocks WHERE lesson_id=?1 ORDER BY position,id',
      ).bind(lesson.id).all()).results).toEqual(rowsBefore)

      await env.DB.prepare(
        `CREATE TRIGGER fail_test_ratio_proportion_v1_reconcile_audit
         BEFORE INSERT ON audit_logs
         WHEN NEW.entity_type='lesson' AND NEW.action='reconcile'
         BEGIN SELECT RAISE(ABORT,'forced Ratio and Proportion v1 reconcile audit failure'); END`,
      ).run()
      const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      try {
        const failedResponse = await app.request(
          `/api/admin/lessons/${lesson.id}/ratio-proportion-teaching-system-v1`,
          adminJsonRequest(desired, cookie, 'PUT'),
          createBindings('production'),
        )
        expect(failedResponse.status).toBe(500)
        expect((await env.DB.prepare(
          'SELECT id,block_type,content_json,position FROM lesson_blocks WHERE lesson_id=?1 ORDER BY position,id',
        ).bind(lesson.id).all()).results).toEqual(rowsBefore)
      } finally {
        errorLog.mockRestore()
        await env.DB.prepare('DROP TRIGGER fail_test_ratio_proportion_v1_reconcile_audit').run()
      }

      const firstResponse = await app.request(
        `/api/admin/lessons/${lesson.id}/ratio-proportion-teaching-system-v1`,
        adminJsonRequest(desired, cookie, 'PUT'),
        createBindings('production'),
      )
      expect(firstResponse.status).toBe(200)
      const first = await firstResponse.json<{
        success: true
        data: {
          blocks: Array<{ id: number; type: string; position: number }>
          writeRequired: boolean
          createdCount: number
          updatedCount: number
          deletedCount: number
        }
      }>()
      expect(first.data).toMatchObject({
        writeRequired: true,
        createdCount: 0,
        updatedCount: 1,
        deletedCount: 1,
      })
      expect(first.data.blocks[0]?.id).toBe(firstId)
      expect(first.data.blocks.map((block) => block.position)).toEqual(
        spec.blocks.map((_, index) => index + 1),
      )
      expect(first.data.blocks.some((block) => block.type === 'illustrated-guided-teaching')).toBe(false)
      const rowsAfterFirst = (await env.DB.prepare(
        'SELECT id,block_type,content_json,position FROM lesson_blocks WHERE lesson_id=?1 ORDER BY position,id',
      ).bind(lesson.id).all()).results

      const secondResponse = await app.request(
        `/api/admin/lessons/${lesson.id}/ratio-proportion-teaching-system-v1`,
        adminJsonRequest(desired, cookie, 'PUT'),
        createBindings('production'),
      )
      const second = await secondResponse.json<{
        success: true
        data: { writeRequired: boolean; createdCount: number; updatedCount: number; deletedCount: number }
      }>()
      expect(secondResponse.status).toBe(200)
      expect(second.data).toMatchObject({
        writeRequired: false,
        createdCount: 0,
        updatedCount: 0,
        deletedCount: 0,
      })
      expect((await env.DB.prepare(
        'SELECT id,block_type,content_json,position FROM lesson_blocks WHERE lesson_id=?1 ORDER BY position,id',
      ).bind(lesson.id).all()).results).toEqual(rowsAfterFirst)
    } finally {
      await env.DB.prepare(
        "DELETE FROM audit_logs WHERE entity_type='lesson' AND entity_id=?1 AND action='reconcile'",
      ).bind(String(lesson.id)).run()
      await env.DB.prepare('DELETE FROM topics WHERE id=?1').bind(topic.id).run()
    }
  })
  it('accepts the exact Percentage visual payload and updates only the target block plus audit log', async () => {
    const { cookie } = await registerAdmin('admin-percentage-visual@example.com')
    const shell = await createCurriculumShell(cookie)
    const createResponse = await app.request(
      `/api/admin/lessons/${shell.lessonId}/blocks`,
      adminJsonRequest(
        {
          blockType: 'example',
          content: {
            title: 'Original example',
            problem: 'Original problem?',
            steps: ['Original step.'],
            answer: 'Original answer.',
          },
          position: 5,
        },
        cookie,
      ),
      createBindings('production'),
    )
    const created = await createResponse.json<{
      success: true
      data: { block: { id: number; lessonId: number; createdAt: string } }
    }>()
    const payload = {
      blockType: 'example' as const,
      content: percentageExampleContent,
      position: 5,
    }

    expect(new TextEncoder().encode(JSON.stringify(payload)).byteLength).toBeLessThan(
      256 * 1024,
    )

    for (let requestNumber = 0; requestNumber < 2; requestNumber += 1) {
      const response = await app.request(
        `/api/admin/lesson-blocks/${created.data.block.id}`,
        adminJsonRequest(payload, cookie, 'PATCH'),
        createBindings('production'),
      )
      const body = await response.json<{
        success: true
        data: { block: { id: number; lessonId: number; content: unknown; position: number; createdAt: string } }
      }>()

      expect(response.status).toBe(200)
      expect(body.data.block).toMatchObject({
        id: created.data.block.id,
        lessonId: shell.lessonId,
        content: percentageExampleContent,
        position: 5,
        createdAt: created.data.block.createdAt,
      })
    }

    const auditCount = await env.DB.prepare(
      `SELECT COUNT(*) AS count
       FROM audit_logs
       WHERE action = 'update'
         AND entity_type = 'lesson_block'
         AND entity_id = ?1`,
    )
      .bind(String(created.data.block.id))
      .first<{ count: number }>()
    expect(auditCount?.count).toBe(2)
  })

  it('returns a safe validation error before writing an invalid visual payload', async () => {
    const { cookie } = await registerAdmin('admin-invalid-visual@example.com')
    const shell = await createCurriculumShell(cookie)
    const createResponse = await app.request(
      `/api/admin/lessons/${shell.lessonId}/blocks`,
      adminJsonRequest(
        {
          blockType: 'example',
          content: {
            title: 'Original example',
            problem: 'Original problem?',
            steps: ['Original step.'],
            answer: 'Original answer.',
          },
          position: 5,
        },
        cookie,
      ),
      createBindings('production'),
    )
    const created = await createResponse.json<{
      success: true
      data: { block: { id: number } }
    }>()

    const response = await app.request(
      `/api/admin/lesson-blocks/${created.data.block.id}`,
      adminJsonRequest(
        {
          blockType: 'example',
          content: {
            ...percentageExampleContent,
            visual: { ...percentageExampleContent.visual, transitions: [] },
          },
          position: 5,
        },
        cookie,
        'PATCH',
      ),
      createBindings('production'),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'INVALID_LESSON_BLOCK_CONTENT' },
    })
    const stored = await env.DB.prepare(
      'SELECT content_json FROM lesson_blocks WHERE id = ?1',
    )
      .bind(created.data.block.id)
      .first<{ content_json: string }>()
    expect(JSON.parse(stored?.content_json ?? '{}')).toMatchObject({
      title: 'Original example',
    })
  })

  it('rolls back the lesson-block update when its audit write fails', async () => {
    const { cookie } = await registerAdmin('admin-visual-rollback@example.com')
    const shell = await createCurriculumShell(cookie)
    const createResponse = await app.request(
      `/api/admin/lessons/${shell.lessonId}/blocks`,
      adminJsonRequest(
        {
          blockType: 'example',
          content: {
            title: 'Original example',
            problem: 'Original problem?',
            steps: ['Original step.'],
            answer: 'Original answer.',
          },
          position: 5,
        },
        cookie,
      ),
      createBindings('production'),
    )
    const created = await createResponse.json<{
      success: true
      data: { block: { id: number } }
    }>()
    const before = await env.DB.prepare(
      'SELECT content_json, position, updated_at FROM lesson_blocks WHERE id = ?1',
    )
      .bind(created.data.block.id)
      .first<{ content_json: string; position: number; updated_at: string }>()
    await env.DB.prepare(
      `CREATE TRIGGER fail_test_lesson_block_audit
       BEFORE INSERT ON audit_logs
       WHEN NEW.entity_type = 'lesson_block'
         AND NEW.entity_id = '${created.data.block.id}'
       BEGIN
         SELECT RAISE(ABORT, 'forced audit failure');
       END`,
    ).run()
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    try {
      const response = await app.request(
        `/api/admin/lesson-blocks/${created.data.block.id}`,
        adminJsonRequest(
          {
            blockType: 'example',
            content: percentageExampleContent,
            position: 5,
          },
          cookie,
          'PATCH',
        ),
        createBindings('production'),
      )
      expect(response.status).toBe(500)
      const after = await env.DB.prepare(
        'SELECT content_json, position, updated_at FROM lesson_blocks WHERE id = ?1',
      )
        .bind(created.data.block.id)
        .first<typeof before>()
      expect(after).toEqual(before)
    } finally {
      errorLog.mockRestore()
      await env.DB.prepare('DROP TRIGGER fail_test_lesson_block_audit').run()
    }
  })
  it('publishes a draft reading lesson without sending lessonType', async () => {
    const { cookie } = await registerAdmin(
      'admin-builder-reading-publish@example.com',
    )
    const lesson = await createTypedLessonShell(cookie, 'reading')
    await addPublishableReadingBlock(cookie, lesson.lessonId)

    const { response, body } = await patchLesson(cookie, lesson.lessonId, {
      status: 'published',
      updatedAt: lesson.updatedAt,
    })

    expect(response.status).toBe(200)
    expect(body.data.lesson).toMatchObject({
      lessonType: 'reading',
      status: 'published',
    })
  })

  it('publishes a draft practice lesson without sending lessonType', async () => {
    const { cookie } = await registerAdmin(
      'admin-builder-practice-publish@example.com',
    )
    const lesson = await createTypedLessonShell(cookie, 'practice')
    await savePublishedGeneratedPracticeSet(cookie, lesson.lessonId)

    const { response, body } = await patchLesson(cookie, lesson.lessonId, {
      status: 'published',
      updatedAt: lesson.updatedAt,
    })

    expect(response.status).toBe(200)
    expect(body.data.lesson).toMatchObject({
      lessonType: 'practice',
      status: 'published',
    })
  })

  it('publishes a draft quiz lesson without sending lessonType', async () => {
    const { cookie } = await registerAdmin(
      'admin-builder-quiz-publish@example.com',
    )
    const lesson = await createTypedLessonShell(cookie, 'quiz')
    await savePublishedQuiz(cookie, lesson.lessonId)

    const { response, body } = await patchLesson(cookie, lesson.lessonId, {
      status: 'published',
      updatedAt: lesson.updatedAt,
    })

    expect(response.status).toBe(200)
    expect(body.data.lesson).toMatchObject({
      lessonType: 'quiz',
      status: 'published',
    })
  })

  it('accepts an unchanged lessonType in a lesson update', async () => {
    const { cookie } = await registerAdmin(
      'admin-builder-unchanged-type@example.com',
    )
    const lesson = await createTypedLessonShell(cookie, 'reading')
    await addPublishableReadingBlock(cookie, lesson.lessonId)

    const { response, body } = await patchLesson(cookie, lesson.lessonId, {
      lessonType: 'reading',
      status: 'published',
      updatedAt: lesson.updatedAt,
    })

    expect(response.status).toBe(200)
    expect(body.data.lesson.lessonType).toBe('reading')
  })

  it('rejects a real reading to practice lesson type change', async () => {
    const { cookie } = await registerAdmin(
      'admin-builder-reading-change@example.com',
    )
    const lesson = await createTypedLessonShell(cookie, 'reading')
    const response = await app.request(
      `/api/admin/lessons/${lesson.lessonId}`,
      adminJsonRequest(
        {
          lessonType: 'practice',
          updatedAt: lesson.updatedAt,
        },
        cookie,
        'PATCH',
      ),
      createBindings('production'),
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: 'LESSON_TYPE_CHANGE_BLOCKED',
      },
    })
  })

  it('rejects a real practice to quiz lesson type change', async () => {
    const { cookie } = await registerAdmin(
      'admin-builder-practice-change@example.com',
    )
    const lesson = await createTypedLessonShell(cookie, 'practice')
    const response = await app.request(
      `/api/admin/lessons/${lesson.lessonId}`,
      adminJsonRequest(
        {
          lessonType: 'quiz',
          updatedAt: lesson.updatedAt,
        },
        cookie,
        'PATCH',
      ),
      createBindings('production'),
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: 'LESSON_TYPE_CHANGE_BLOCKED',
      },
    })
  })

  it('preserves lesson type on status-only updates', async () => {
    const { cookie } = await registerAdmin(
      'admin-builder-status-preserve@example.com',
    )
    const lesson = await createTypedLessonShell(cookie, 'practice')

    const { response, body } = await patchLesson(cookie, lesson.lessonId, {
      status: 'archived',
      updatedAt: lesson.updatedAt,
    })

    expect(response.status).toBe(200)
    expect(body.data.lesson).toMatchObject({
      lessonType: 'practice',
      status: 'archived',
    })
  })

  it('does not let a stale status form accidentally change lesson type', async () => {
    const { cookie } = await registerAdmin(
      'admin-builder-stale-form-type@example.com',
    )
    const lesson = await createTypedLessonShell(cookie, 'practice')

    const { response, body } = await patchLesson(cookie, lesson.lessonId, {
      status: 'draft',
      updatedAt: lesson.updatedAt,
    })

    expect(response.status).toBe(200)
    expect(body.data.lesson.lessonType).toBe('practice')
  })

  it('shows generated configuration for generated practice editor mode', () => {
    expect(getPracticeEditorVisibility('generated')).toEqual({
      showFixedQuestionEditor: false,
      showGeneratedConfiguration: true,
    })
  })

  it('shows fixed-question editor for fixed practice editor mode', () => {
    expect(getPracticeEditorVisibility('fixed')).toEqual({
      showFixedQuestionEditor: true,
      showGeneratedConfiguration: false,
    })
  })

  it('returns registered practice generators including all Fractions generators', async () => {
    const { cookie } = await registerAdmin(
      'admin-builder-generator-list@example.com',
    )
    const response = await app.request(
      '/api/admin/practice-generators',
      { headers: { cookie } },
      createBindings('production'),
    )
    const body = await response.json<{
      success: true
      data: {
        generators: Array<{
          slug: string
          version: number
          supportedDifficulties: string[]
        }>
      }
    }>()
    const slugs = body.data.generators.map((generator) => generator.slug)

    expect(response.status).toBe(200)
    expect(slugs).toEqual(expect.arrayContaining([
      'equivalent-fractions',
      'simplifying-fractions',
      'comparing-fractions',
      'adding-fractions',
      'subtracting-fractions',
      'multiplying-fractions',
      'dividing-fractions',
    ]))
    expect(
      body.data.generators.find(
        (generator) => generator.slug === 'equivalent-fractions',
      ),
    ).toMatchObject({
      version: 1,
      supportedDifficulties: ['easy', 'medium', 'hard'],
    })
  })

  it('publishes a valid generated practice set without fixed questions', async () => {
    const { cookie } = await registerAdmin(
      'admin-builder-generated-publish@example.com',
    )
    const lesson = await createTypedLessonShell(cookie, 'practice')
    const response = await app.request(
      `/api/admin/lessons/${lesson.lessonId}/practice-set`,
      adminJsonRequest(
        {
          title: 'Generated Equivalent Fractions',
          instructions: 'Generated questions do not need fixed rows.',
          passingScore: 60,
          questionCount: 5,
          maximumAttempts: null,
          showExplanations: true,
          status: 'published',
          questionSource: 'generated',
          generatorSlug: 'equivalent-fractions',
          generatorVersion: 1,
          difficulty: { easy: 2, medium: 2, hard: 1 },
        },
        cookie,
        'PUT',
      ),
      createBindings('production'),
    )
    const body = await response.json<{
      success: true
      data: {
        practiceSet: {
          status: 'published'
          questionSource: 'generated'
          questionCount: number
          generator: {
            slug: string
            version: number
            difficulty: { easy: number; medium: number; hard: number }
          } | null
        }
      }
    }>()

    expect(response.status).toBe(200)
    expect(body.data.practiceSet).toMatchObject({
      status: 'published',
      questionSource: 'generated',
      questionCount: 5,
      generator: {
        slug: 'equivalent-fractions',
        version: 1,
        difficulty: { easy: 2, medium: 2, hard: 1 },
      },
    })
  })

  it('rejects generated practice without a generator', async () => {
    const { cookie } = await registerAdmin(
      'admin-builder-generated-missing@example.com',
    )
    const lesson = await createTypedLessonShell(cookie, 'practice')
    const response = await app.request(
      `/api/admin/lessons/${lesson.lessonId}/practice-set`,
      adminJsonRequest(
        {
          title: 'Missing Generator',
          instructions: null,
          passingScore: 60,
          questionCount: 5,
          maximumAttempts: null,
          showExplanations: true,
          status: 'draft',
          questionSource: 'generated',
        },
        cookie,
        'PUT',
      ),
      createBindings('production'),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: 'UNSUPPORTED_GENERATOR',
      },
    })
  })

  it('rejects generated practice when difficulty counts do not equal total', async () => {
    const { cookie } = await registerAdmin(
      'admin-builder-generated-total@example.com',
    )
    const lesson = await createTypedLessonShell(cookie, 'practice')
    const response = await app.request(
      `/api/admin/lessons/${lesson.lessonId}/practice-set`,
      adminJsonRequest(
        {
          title: 'Bad Difficulty Total',
          instructions: null,
          passingScore: 60,
          questionCount: 5,
          maximumAttempts: null,
          showExplanations: true,
          status: 'draft',
          questionSource: 'generated',
          generatorSlug: 'equivalent-fractions',
          generatorVersion: 1,
          difficulty: { easy: 1, medium: 1, hard: 1 },
        },
        cookie,
        'PUT',
      ),
      createBindings('production'),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        details: {
          fieldErrors: {
            difficulty: [
              'Easy, medium, and hard counts must equal the total question count.',
            ],
          },
        },
      },
    })
  })

  it('rejects unsupported generated practice generators', async () => {
    const { cookie } = await registerAdmin(
      'admin-builder-generated-unsupported@example.com',
    )
    const lesson = await createTypedLessonShell(cookie, 'practice')
    const response = await app.request(
      `/api/admin/lessons/${lesson.lessonId}/practice-set`,
      adminJsonRequest(
        {
          title: 'Unsupported Generator',
          instructions: null,
          passingScore: 60,
          questionCount: 5,
          maximumAttempts: null,
          showExplanations: true,
          status: 'draft',
          questionSource: 'generated',
          generatorSlug: 'not-a-generator',
          generatorVersion: 1,
          difficulty: { easy: 2, medium: 2, hard: 1 },
        },
        cookie,
        'PUT',
      ),
      createBindings('production'),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: 'UNSUPPORTED_GENERATOR',
      },
    })
  })

  it('does not require generated configuration for fixed practice mode', async () => {
    const { cookie } = await registerAdmin(
      'admin-builder-fixed-no-generator@example.com',
    )
    const lesson = await createTypedLessonShell(cookie, 'practice')
    const response = await app.request(
      `/api/admin/lessons/${lesson.lessonId}/practice-set`,
      adminJsonRequest(
        {
          title: 'Fixed Practice',
          instructions: null,
          passingScore: 60,
          questionCount: 1,
          maximumAttempts: null,
          showExplanations: true,
          status: 'draft',
          questionSource: 'fixed',
        },
        cookie,
        'PUT',
      ),
      createBindings('production'),
    )
    const body = await response.json<{
      success: true
      data: {
        practiceSet: {
          questionSource: 'fixed'
          generator: null
        }
      }
    }>()

    expect(response.status).toBe(200)
    expect(body.data.practiceSet).toMatchObject({
      questionSource: 'fixed',
      generator: null,
    })
  })

  it('validates fixed practice and quiz choices safely', async () => {
    const { cookie } = await registerAdmin('admin-builder-fixed@example.com')
    const unique = crypto.randomUUID().slice(0, 8)
    const course = await createAdminCourseForTest(
      cookie,
      `fixed-course-${unique}`,
    )
    const subject = await app.request(
      `/api/admin/courses/${course.id}/subjects`,
      adminJsonRequest(
        {
          title: 'Fixed Subject',
          slug: `fixed-subject-${unique}`,
          status: 'draft',
        },
        cookie,
      ),
      createBindings('production'),
    )
    const subjectBody = await subject.json<{
      success: true
      data: { subject: { id: number } }
    }>()
    const topic = await app.request(
      `/api/admin/subjects/${subjectBody.data.subject.id}/topics`,
      adminJsonRequest(
        {
          title: 'Fixed Topic',
          slug: `fixed-topic-${unique}`,
          status: 'draft',
        },
        cookie,
      ),
      createBindings('production'),
    )
    const topicBody = await topic.json<{
      success: true
      data: { topic: { id: number } }
    }>()
    const lesson = await app.request(
      `/api/admin/topics/${topicBody.data.topic.id}/lessons`,
      adminJsonRequest(
        {
          title: 'Fixed Practice',
          slug: `fixed-practice-${unique}`,
          lessonType: 'practice',
          status: 'draft',
          isPreview: false,
          requiresPrevious: true,
        },
        cookie,
      ),
      createBindings('production'),
    )
    const lessonBody = await lesson.json<{
      success: true
      data: { lesson: { id: number } }
    }>()
    const practiceSet = await app.request(
      `/api/admin/lessons/${lessonBody.data.lesson.id}/practice-set`,
      adminJsonRequest(
        {
          title: 'Fixed Practice',
          instructions: null,
          passingScore: 70,
          questionCount: 1,
          maximumAttempts: null,
          showExplanations: true,
          status: 'draft',
          questionSource: 'fixed',
        },
        cookie,
        'PUT',
      ),
      createBindings('production'),
    )
    const practiceSetBody = await practiceSet.json<{
      success: true
      data: { practiceSet: { id: number } }
    }>()
    const invalidQuestion = await app.request(
      `/api/admin/practice-sets/${practiceSetBody.data.practiceSet.id}/questions`,
      adminJsonRequest(
        {
          prompt: 'Which answer is correct?',
          explanation: null,
          points: 1,
          position: 1,
          status: 'active',
          choices: [
            { text: 'A', isCorrect: true, position: 1 },
            { text: 'B', isCorrect: false, position: 2 },
            { text: 'C', isCorrect: false, position: 3 },
          ],
        },
        cookie,
      ),
      createBindings('production'),
    )

    expect(invalidQuestion.status).toBe(400)
  })

  it('writes safe audit records for admin content changes', async () => {
    const { cookie } = await registerAdmin('admin-builder-audit@example.com')
    const slug = `audit-course-${crypto.randomUUID().slice(0, 8)}`
    await createAdminCourseForTest(cookie, slug)

    const auditResponse = await app.request(
      '/api/admin/audit-logs',
      { headers: { cookie } },
      createBindings('production'),
    )
    const auditBody = await auditResponse.json<{
      success: true
      data: {
        logs: Array<{
          action: string
          entityType: string
          metadata: unknown
        }>
      }
    }>()

    expect(auditResponse.status).toBe(200)
    expect(
      auditBody.data.logs.some(
        (log) => log.action === 'create' && log.entityType === 'course',
      ),
    ).toBe(true)
    expect(JSON.stringify(auditBody.data.logs)).not.toContain('password')
  })
})
