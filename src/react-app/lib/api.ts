import { z } from 'zod'
import { visualTeachingSchema } from '../../shared/visual-teaching.schema'
import { subjectAssessmentResultSchema } from '../../shared/subject-assessment-result.schema'

const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  role: z.enum(['student', 'admin']),
})

const healthResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    status: z.literal('ok'),
  }),
})

const platformConfigResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    registrationMode: z.enum(['open', 'closed']),
  }),
})

const authenticationResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    user: userSchema,
  }),
})

const logoutResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    loggedOut: z.literal(true),
  }),
})

const adminCheckResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    authorized: z.literal(true),
    user: userSchema,
  }),
})

const enrollmentStateSchema = z.object({
  status: z.enum(['active', 'expired', 'revoked', 'completed']),
  accessStartsAt: z.string(),
  accessExpiresAt: z.string().nullable(),
  hasAccess: z.boolean(),
})

const lessonAccessibilitySchema = z.object({
  canAccess: z.boolean(),
  reason: z.enum([
    'active_enrollment',
    'preview',
    'not_required',
    'enrollment_required',
    'previous_required_lesson_incomplete',
  ]),
})

const lessonProgressStatusSchema = z.enum([
  'not_started',
  'in_progress',
  'completed',
])

const lessonProgressSchema = z.object({
  status: lessonProgressStatusSchema,
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  lastViewedAt: z.string().nullable(),
  progressPercent: z.number(),
})

const curriculumLessonSchema = z.object({
  publicId: z.string(),
  title: z.string(),
  slug: z.string(),
  lessonType: z.string(),
  position: z.number(),
  estimatedMinutes: z.number().nullable(),
  isPreview: z.boolean(),
  isRequired: z.boolean(),
  progressStatus: lessonProgressStatusSchema,
  completedAt: z.string().nullable(),
  isAccessible: z.boolean(),
  isLocked: z.boolean(),
  lockReason: z.string().nullable(),
  accessibility: lessonAccessibilitySchema,
})

const courseSummarySchema = z.object({
  title: z.string(),
  slug: z.string(),
  shortDescription: z.string().nullable(),
  level: z.string().nullable(),
  thumbnailKey: z.string().nullable(),
  enrollment: enrollmentStateSchema.nullable(),
})

const curriculumTopicSchema = z.object({
  title: z.string(),
  slug: z.string(),
  position: z.number(),
  publishedLessonCount: z.number(),
  lessons: z.array(curriculumLessonSchema),
})

const curriculumSubjectSchema = z.object({
  title: z.string(),
  slug: z.string(),
  position: z.number(),
  topics: z.array(curriculumTopicSchema),
})

const courseDetailBaseSchema = courseSummarySchema.extend({
  description: z.string().nullable(),
  curriculum: z.array(curriculumSubjectSchema),
})

const continueLearningSchema = z.object({
  courseCompleted: z.boolean(),
  lesson: z
    .object({
      publicId: z.string(),
      title: z.string(),
      slug: z.string(),
      lessonType: z.string(),
      summary: z.string().nullable(),
      isLocked: z.boolean(),
    })
    .nullable(),
})

const courseProgressSchema = z.object({
  course: courseSummarySchema,
  enrollment: enrollmentStateSchema,
  progressPercentage: z.number(),
  completedRequiredLessons: z.number(),
  totalRequiredLessons: z.number(),
  continueLearning: continueLearningSchema,
})

const dashboardCourseSchema = courseProgressSchema.extend({
  enrolledAt: z.string(),
})

const assessmentHistorySchema = z.object({
  attemptPublicId: z.string(), attemptNumber: z.number(), status: z.string(),
  startedAt: z.string(), submittedAt: z.string().nullable(), earnedPoints: z.number(),
  totalPoints: z.number(), scorePercent: z.number().nullable(), passed: z.boolean().nullable(),
  strongestTopic: z.string().nullable(), weakestTopic: z.string().nullable(),
})
const subjectAssessmentSummarySchema = z.object({
  assessment: z.object({ publicId: z.string(), title: z.string(), slug: z.string(), description: z.string().nullable(), subjectTitle: z.string(), subjectSlug: z.string(), questionCount: z.number(), passingScore: z.number(), maximumAttempts: z.number().nullable(), timeLimitMinutes: z.number().nullable(), blueprintVersion: z.number(), status: z.literal('published') }),
  availability: z.object({ available: z.boolean(), reason: z.string().nullable() }),
  state: z.enum(['not_started', 'in_progress', 'passed', 'needs_improvement']),
  inProgressAttemptPublicId: z.string().nullable(), latestScore: z.number().nullable(), bestScore: z.number().nullable(), attemptCount: z.number(), passed: z.boolean(), history: z.array(assessmentHistorySchema),
})
const assessmentChoiceSchema = z.object({ publicId: z.string(), text: z.string(), position: z.number() })
const subjectAssessmentAttemptSchema = z.object({
  attempt: z.object({ publicId: z.string(), attemptNumber: z.number(), status: z.string(), startedAt: z.string() }),
  assessment: z.object({ title: z.string(), slug: z.string(), questionCount: z.number(), passingScore: z.number() }),
  questions: z.array(z.object({ publicId: z.string(), position: z.number(), prompt: z.string(), selectedChoicePublicId: z.string().nullable(), choices: z.array(assessmentChoiceSchema) })), answeredCount: z.number(), totalCount: z.number(),
})
const subjectAssessmentAttemptResponseSchema = z.union([
  subjectAssessmentAttemptSchema,
  z.object({
    attempt: subjectAssessmentAttemptSchema.shape.attempt,
    resultAvailable: z.literal(true),
  }),
])
const assessmentReviewSchema = subjectAssessmentResultSchema.extend({ questions: z.array(z.object({ publicId: z.string(), position: z.number(), topic: z.object({ slug: z.string(), title: z.string() }), prompt: z.string(), difficulty: z.string(), selectedChoice: assessmentChoiceSchema.nullable(), correctChoice: assessmentChoiceSchema, isCorrect: z.boolean(), unanswered: z.boolean(), explanation: z.string().nullable(), choices: z.array(assessmentChoiceSchema) })) })

const dashboardCourseWithAssessmentSchema = dashboardCourseSchema.extend({ subjectAssessment: subjectAssessmentSummarySchema.nullable(), subjectAssessments: z.array(subjectAssessmentSummarySchema) })
const courseDetailSchema = courseDetailBaseSchema.extend({ subjectAssessment: subjectAssessmentSummarySchema.nullable(), subjectAssessments: z.array(subjectAssessmentSummarySchema) })

const coursesResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    courses: z.array(courseSummarySchema),
  }),
})

const courseDetailResponseSchema = z.object({
  success: z.literal(true),
  data: courseDetailSchema,
})

const studentDashboardResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    courses: z.array(dashboardCourseWithAssessmentSchema),
  }),
})

const courseProgressResponseSchema = z.object({
  success: z.literal(true),
  data: courseProgressSchema,
})

const studentCourseCurriculumResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    course: courseSummarySchema,
    subjects: z.array(curriculumSubjectSchema),
  }),
})

const baseLessonBlockSchema = z.object({
  id: z.number(),
  position: z.number(),
})

const lessonBlockSchema = z.union([
  baseLessonBlockSchema.extend({
    type: z.literal('heading'),
    content: z.object({
      level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      text: z.string(),
    }),
  }),
  baseLessonBlockSchema.extend({
    type: z.literal('paragraph'),
    content: z.object({
      text: z.string(),
    }),
  }),
  baseLessonBlockSchema.extend({
    type: z.literal('callout'),
    content: z.object({
      variant: z.enum(['info', 'important', 'warning']),
      title: z.string(),
      text: z.string(),
    }),
  }),
  baseLessonBlockSchema.extend({
    type: z.literal('formula'),
    content: z.object({
      expression: z.string(),
      description: z.string(),
    }),
  }),
  baseLessonBlockSchema.extend({
    type: z.literal('example'),
    content: z.object({
      title: z.string(),
      problem: z.string(),
      steps: z.array(z.string()),
      answer: z.string(),
      visual: visualTeachingSchema.optional(),
    }),
  }),
  baseLessonBlockSchema.extend({
    type: z.literal('image'),
    content: z.object({
      src: z.string(),
      alt: z.string(),
      caption: z.string().optional(),
    }),
  }),
  baseLessonBlockSchema.extend({
    type: z.literal('video'),
    content: z.object({
      provider: z.literal('external'),
      url: z.string(),
      title: z.string(),
    }),
  }),
  baseLessonBlockSchema.extend({
    type: z.literal('divider'),
    content: z.object({}),
  }),
  baseLessonBlockSchema.extend({
    type: z.literal('summary'),
    content: z.object({
      items: z.array(z.string()),
    }),
  }),
])

const lessonNavigationItemSchema = z.object({
  publicId: z.string(),
  title: z.string(),
  slug: z.string(),
  lessonType: z.string(),
  estimatedMinutes: z.number().nullable(),
  isAccessible: z.boolean(),
  isLocked: z.boolean(),
  lockReason: z.string().nullable(),
})

const lessonDetailSchema = z.object({
  publicId: z.string(),
  title: z.string(),
  slug: z.string(),
  summary: z.string().nullable(),
  lessonType: z.string(),
  estimatedMinutes: z.number().nullable(),
  isPreview: z.boolean(),
  course: z.object({
    title: z.string(),
    slug: z.string(),
  }),
  subject: z.object({
    title: z.string(),
    slug: z.string(),
    position: z.number(),
  }),
  topic: z.object({
    title: z.string(),
    slug: z.string(),
    position: z.number(),
  }),
  blocks: z.array(lessonBlockSchema),
  malformedBlockCount: z.number(),
  progress: lessonProgressSchema,
  manualCompletionAllowed: z.boolean(),
  previousLesson: lessonNavigationItemSchema.nullable(),
  nextLesson: lessonNavigationItemSchema.nullable(),
  navigation: z.object({
    currentLessonPublicId: z.string(),
    subjectPosition: z.number(),
    topicPosition: z.number(),
    lessonPosition: z.number(),
  }),
})

const lessonDetailResponseSchema = z.object({
  success: z.literal(true),
  data: lessonDetailSchema,
})

const topicProgressSchema = z.object({
  topicSlug: z.string(),
  completedRequiredLessons: z.number(),
  totalRequiredLessons: z.number(),
  progressPercentage: z.number(),
})

const lessonCompletionResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    completedLesson: z.object({
      publicId: z.string(),
      title: z.string(),
      progress: lessonProgressSchema,
    }),
    newlyUnlockedNextLesson: lessonNavigationItemSchema.nullable(),
    topicProgress: topicProgressSchema,
    courseProgress: courseProgressSchema,
  }),
})

const quizChoiceSchema = z.object({
  id: z.number(),
  text: z.string(),
  position: z.number(),
})

const quizQuestionSchema = z.object({
  id: z.number(),
  prompt: z.string(),
  points: z.number(),
  position: z.number(),
  selectedChoiceId: z.number().nullable(),
  choices: z.array(quizChoiceSchema),
})

const quizAttemptHistorySchema = z.object({
  attemptPublicId: z.string(),
  attemptNumber: z.number(),
  status: z.string(),
  earnedPoints: z.number(),
  totalPoints: z.number(),
  scorePercent: z.number().nullable(),
  passed: z.boolean().nullable(),
  startedAt: z.string(),
  submittedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
})

const lessonQuizSummaryResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    quiz: z.object({
      id: z.number(),
      title: z.string(),
      description: z.string().nullable(),
      passingScore: z.number(),
      questionCount: z.number(),
      timeLimitMinutes: z.number().nullable(),
      maximumAttempts: z.number().nullable(),
      attemptsRemaining: z.number().nullable(),
    }),
    inProgressAttempt: quizAttemptHistorySchema.nullable(),
    attempts: z.array(quizAttemptHistorySchema),
  }),
})

const quizAttemptPayloadSchema = z.object({
  attempt: z.object({
    publicId: z.string(),
    status: z.string(),
    attemptNumber: z.number(),
    startedAt: z.string(),
    expiresAt: z.string().nullable(),
  }),
  quiz: z.object({
    id: z.number(),
    title: z.string(),
    passingScore: z.number(),
    questionCount: z.number(),
    timeLimitMinutes: z.number().nullable(),
  }),
  questions: z.array(quizQuestionSchema),
})

const quizAttemptResponseSchema = z.object({
  success: z.literal(true),
  data: z.union([
    quizAttemptPayloadSchema,
    z.object({
      attempt: quizAttemptPayloadSchema.shape.attempt,
      resultAvailable: z.literal(true),
    }),
  ]),
})

const saveQuizAnswerResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    saved: z.literal(true),
    answeredCount: z.number(),
    totalCount: z.number(),
  }),
})

const quizAttemptResultResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    quiz: z.object({
      id: z.number(),
      title: z.string(),
      passingScore: z.number(),
    }),
    attempt: z.object({
      publicId: z.string(),
      attemptNumber: z.number(),
      status: z.string(),
      startedAt: z.string(),
      submittedAt: z.string(),
    }),
    totalPoints: z.number(),
    earnedPoints: z.number(),
    scorePercent: z.number(),
    passed: z.boolean(),
    questions: z.array(
      z.object({
        id: z.number(),
        prompt: z.string(),
        points: z.number(),
        position: z.number(),
        selectedChoice: quizChoiceSchema.nullable(),
        correctChoice: quizChoiceSchema,
        isCorrect: z.boolean(),
        pointsAwarded: z.number(),
        explanation: z.string().nullable(),
        choices: z.array(quizChoiceSchema),
      }),
    ),
    newlyUnlockedNextLesson: lessonNavigationItemSchema.nullable(),
    topicProgress: topicProgressSchema,
    courseProgress: courseProgressSchema,
  }),
})

const practiceChoiceSchema = z.object({
  id: z.number(),
  text: z.string(),
  position: z.number(),
})

const practiceQuestionSchema = z.object({
  id: z.number(),
  prompt: z.string(),
  points: z.number(),
  position: z.number(),
  selectedChoiceId: z.number().nullable(),
  choices: z.array(practiceChoiceSchema),
})

const practiceAttemptHistorySchema = z.object({
  attemptPublicId: z.string(),
  attemptNumber: z.number(),
  status: z.string(),
  earnedPoints: z.number(),
  totalPoints: z.number(),
  scorePercent: z.number().nullable(),
  passed: z.boolean().nullable(),
  startedAt: z.string(),
  submittedAt: z.string().nullable(),
})

const lessonPracticeSummaryResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    practice: z.object({
      id: z.number(),
      title: z.string(),
      instructions: z.string().nullable(),
      passingScore: z.number(),
      questionCount: z.number(),
      maximumAttempts: z.number().nullable(),
      attemptsRemaining: z.number().nullable(),
    }),
    lessonCompleted: z.boolean(),
    inProgressAttempt: practiceAttemptHistorySchema.nullable(),
    attempts: z.array(practiceAttemptHistorySchema),
  }),
})

const practiceAttemptPayloadSchema = z.object({
  attempt: z.object({
    publicId: z.string(),
    status: z.string(),
    attemptNumber: z.number(),
    startedAt: z.string(),
  }),
  practice: z.object({
    id: z.number(),
    title: z.string(),
    passingScore: z.number(),
    questionCount: z.number(),
  }),
  questions: z.array(practiceQuestionSchema),
  answeredCount: z.number(),
  totalCount: z.number(),
})

const practiceAttemptResponseSchema = z.object({
  success: z.literal(true),
  data: z.union([
    practiceAttemptPayloadSchema,
    z.object({
      attempt: practiceAttemptPayloadSchema.shape.attempt,
      resultAvailable: z.literal(true),
    }),
  ]),
})

const savePracticeAnswerResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    saved: z.literal(true),
    answeredCount: z.number(),
    totalCount: z.number(),
  }),
})

const practiceAttemptResultResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    practice: z.object({
      id: z.number(),
      title: z.string(),
      passingScore: z.number(),
    }),
    attempt: z.object({
      publicId: z.string(),
      attemptNumber: z.number(),
      status: z.string(),
      startedAt: z.string(),
      submittedAt: z.string(),
    }),
    totalPoints: z.number(),
    earnedPoints: z.number(),
    scorePercent: z.number(),
    passed: z.boolean(),
    questions: z.array(
      z.object({
        id: z.number(),
        prompt: z.string(),
        points: z.number(),
        position: z.number(),
        selectedChoice: practiceChoiceSchema.nullable(),
        correctChoice: practiceChoiceSchema,
        isCorrect: z.boolean(),
        pointsAwarded: z.number(),
        explanation: z.string().nullable(),
        choices: z.array(practiceChoiceSchema),
      }),
    ),
    newlyUnlockedNextLesson: lessonNavigationItemSchema.nullable(),
    topicProgress: topicProgressSchema,
    courseProgress: courseProgressSchema,
  }),
})

const validationFieldErrorsSchema = z
  .object({
    accessExpiresAt: z.array(z.string()).optional(),
    courseSlug: z.array(z.string()).optional(),
    firstName: z.array(z.string()).optional(),
    lastName: z.array(z.string()).optional(),
    email: z.array(z.string()).optional(),
    lessonPublicId: z.array(z.string()).optional(),
    password: z.array(z.string()).optional(),
    attemptPublicId: z.array(z.string()).optional(),
    questionId: z.array(z.string()).optional(),
    quizId: z.array(z.string()).optional(),
    practiceSetId: z.array(z.string()).optional(),
    selectedChoiceId: z.array(z.string()).optional(),
  })
  .strict()

const apiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string(),
    details: z.union([
      z.null(),
      z
        .object({
          fieldErrors: validationFieldErrorsSchema,
        })
        .strict(),
    ]),
  }),
})

export type User = z.infer<typeof userSchema>
export type HealthResponse = z.infer<typeof healthResponseSchema>
export type PlatformConfigResponse = z.infer<typeof platformConfigResponseSchema>
export type RegistrationMode = PlatformConfigResponse['data']['registrationMode']
export type AdminCheckResponse = z.infer<typeof adminCheckResponseSchema>
export type CourseSummary = z.infer<typeof courseSummarySchema>
export type CourseDetail = z.infer<typeof courseDetailSchema>
export type StudentCourseCurriculum = z.infer<
  typeof studentCourseCurriculumResponseSchema
>['data']
export type StudentDashboard = z.infer<
  typeof studentDashboardResponseSchema
>['data']
export type SubjectAssessmentSummary = z.infer<typeof subjectAssessmentSummarySchema>
export type SubjectAssessmentAttempt = z.infer<typeof subjectAssessmentAttemptSchema>
export type SubjectAssessmentAttemptResponse = z.infer<typeof subjectAssessmentAttemptResponseSchema>
export type SubjectAssessmentResult = z.infer<typeof subjectAssessmentResultSchema>
export type SubjectAssessmentReview = z.infer<typeof assessmentReviewSchema>
export type CourseProgress = z.infer<typeof courseProgressSchema>
export type CurriculumLesson = z.infer<typeof curriculumLessonSchema>
export type LessonBlock = z.infer<typeof lessonBlockSchema>
export type LessonDetail = z.infer<typeof lessonDetailSchema>
export type LessonCompletionResult = z.infer<
  typeof lessonCompletionResponseSchema
>['data']
export type LessonQuizSummary = z.infer<
  typeof lessonQuizSummaryResponseSchema
>['data']
export type QuizAttemptPayload = z.infer<typeof quizAttemptPayloadSchema>
export type QuizAttemptResponse = z.infer<
  typeof quizAttemptResponseSchema
>['data']
export type SaveQuizAnswerResult = z.infer<
  typeof saveQuizAnswerResponseSchema
>['data']
export type QuizAttemptResult = z.infer<
  typeof quizAttemptResultResponseSchema
>['data']
export type LessonPracticeSummary = z.infer<
  typeof lessonPracticeSummaryResponseSchema
>['data']
export type PracticeAttemptPayload = z.infer<
  typeof practiceAttemptPayloadSchema
>
export type PracticeAttemptResponse = z.infer<
  typeof practiceAttemptResponseSchema
>['data']
export type SavePracticeAnswerResult = z.infer<
  typeof savePracticeAnswerResponseSchema
>['data']
export type PracticeAttemptResult = z.infer<
  typeof practiceAttemptResultResponseSchema
>['data']
export type ValidationFieldErrors = z.infer<
  typeof validationFieldErrorsSchema
>

export interface RegistrationRequest {
  email: string
  password: string
  firstName: string
  lastName: string
}

export interface LoginRequest {
  email: string
  password: string
}

export class ApiClientError extends Error {
  readonly code: string
  readonly status: number
  readonly requestId: string | null
  readonly fieldErrors: ValidationFieldErrors

  constructor(
    message: string,
    code: string,
    status: number,
    requestId: string | null,
    fieldErrors: ValidationFieldErrors = {},
  ) {
    super(message)
    this.name = 'ApiClientError'
    this.code = code
    this.status = status
    this.requestId = requestId
    this.fieldErrors = fieldErrors
  }
}

type BrowserFetchInit = RequestInit & {
  credentials?: 'omit' | 'same-origin' | 'include'
}

const browserFetch = fetch as unknown as (
  input: string,
  init?: BrowserFetchInit,
) => Promise<Response>

export async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers)
  headers.set('Accept', 'application/json')

  if (init?.body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await browserFetch(path, {
    ...init,
    credentials: 'same-origin',
    headers,
  })

  let body: unknown

  try {
    body = await response.json()
  } catch {
    throw new ApiClientError(
      'The API returned an invalid response.',
      'INVALID_API_RESPONSE',
      response.status,
      response.headers.get('x-request-id'),
    )
  }

  if (!response.ok) {
    const errorResult = apiErrorSchema.safeParse(body)

    if (errorResult.success) {
      throw new ApiClientError(
        errorResult.data.error.message,
        errorResult.data.error.code,
        response.status,
        errorResult.data.error.requestId,
        errorResult.data.error.details?.fieldErrors,
      )
    }

    console.error('API error response validation failed.', {
      path,
      status: response.status,
      requestId: response.headers.get('x-request-id'),
    })
    throw new ApiClientError(
      'The request could not be completed.',
      'REQUEST_FAILED',
      response.status,
      response.headers.get('x-request-id'),
    )
  }

  const result = schema.safeParse(body)

  if (!result.success) {
    console.error('API response schema validation failed.', {
      path,
      status: response.status,
      requestId: response.headers.get('x-request-id'),
      issues: result.error.issues.map((issue) => ({
        code: issue.code,
        path: issue.path,
      })),
    })
    throw new ApiClientError(
      'The API returned an unexpected response.',
      'INVALID_API_RESPONSE',
      response.status,
      response.headers.get('x-request-id'),
    )
  }

  return result.data
}

export function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return request('/api/health', healthResponseSchema, { signal })
}

export function fetchPlatformConfig(
  signal?: AbortSignal,
): Promise<PlatformConfigResponse> {
  return request('/api/config', platformConfigResponseSchema, { signal })
}

export async function registerStudent(
  input: RegistrationRequest,
): Promise<User> {
  const response = await request(
    '/api/auth/register',
    authenticationResponseSchema,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  )

  return response.data.user
}

export async function login(input: LoginRequest): Promise<User> {
  const response = await request(
    '/api/auth/login',
    authenticationResponseSchema,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  )

  return response.data.user
}

export async function fetchCurrentUser(
  signal?: AbortSignal,
): Promise<User> {
  const response = await request(
    '/api/auth/me',
    authenticationResponseSchema,
    { signal },
  )

  return response.data.user
}

export async function logout(): Promise<void> {
  await request('/api/auth/logout', logoutResponseSchema, {
    method: 'POST',
  })
}

export function fetchAdminCheck(
  signal?: AbortSignal,
): Promise<AdminCheckResponse> {
  return request('/api/admin/auth-check', adminCheckResponseSchema, {
    signal,
  })
}

export async function fetchCourses(
  signal?: AbortSignal,
): Promise<CourseSummary[]> {
  const response = await request('/api/courses', coursesResponseSchema, {
    signal,
  })

  return response.data.courses
}

export async function fetchCourseDetail(
  courseSlug: string,
  signal?: AbortSignal,
): Promise<CourseDetail> {
  const response = await request(
    `/api/courses/${encodeURIComponent(courseSlug)}`,
    courseDetailResponseSchema,
    { signal },
  )

  return response.data
}

export async function fetchStudentDashboard(
  signal?: AbortSignal,
): Promise<StudentDashboard> {
  const response = await request(
    '/api/student/dashboard',
    studentDashboardResponseSchema,
    { signal },
  )

  return response.data
}

export async function fetchCourseProgress(
  courseSlug: string,
  signal?: AbortSignal,
): Promise<CourseProgress> {
  const response = await request(
    `/api/student/courses/${encodeURIComponent(courseSlug)}/progress`,
    courseProgressResponseSchema,
    { signal },
  )

  return response.data
}

export async function fetchStudentCourseCurriculum(
  courseSlug: string,
  signal?: AbortSignal,
): Promise<StudentCourseCurriculum> {
  const response = await request(
    `/api/student/courses/${encodeURIComponent(courseSlug)}/curriculum`,
    studentCourseCurriculumResponseSchema,
    { signal },
  )

  return response.data
}

export async function fetchLessonDetail(
  lessonPublicId: string,
  signal?: AbortSignal,
): Promise<LessonDetail> {
  const response = await request(
    `/api/student/lessons/${encodeURIComponent(lessonPublicId)}`,
    lessonDetailResponseSchema,
    { signal },
  )

  return response.data
}

export async function startLesson(
  lessonPublicId: string,
): Promise<LessonDetail> {
  const response = await request(
    `/api/student/lessons/${encodeURIComponent(lessonPublicId)}/start`,
    lessonDetailResponseSchema,
    { method: 'POST' },
  )

  return response.data
}

export async function completeLesson(
  lessonPublicId: string,
): Promise<LessonCompletionResult> {
  const response = await request(
    `/api/student/lessons/${encodeURIComponent(lessonPublicId)}/complete`,
    lessonCompletionResponseSchema,
    { method: 'POST' },
  )

  return response.data
}

export async function fetchLessonQuizSummary(
  lessonPublicId: string,
  signal?: AbortSignal,
): Promise<LessonQuizSummary> {
  const response = await request(
    `/api/student/lessons/${encodeURIComponent(lessonPublicId)}/quiz`,
    lessonQuizSummaryResponseSchema,
    { signal },
  )

  return response.data
}

export async function startQuizAttempt(
  quizId: number,
): Promise<QuizAttemptPayload> {
  const response = await request(
    `/api/student/quizzes/${encodeURIComponent(String(quizId))}/attempts`,
    quizAttemptResponseSchema,
    { method: 'POST' },
  )

  if ('resultAvailable' in response.data) {
    throw new ApiClientError(
      'The quiz attempt was already submitted.',
      'ATTEMPT_ALREADY_SUBMITTED',
      409,
      null,
    )
  }

  return response.data
}

export async function fetchQuizAttempt(
  attemptPublicId: string,
  signal?: AbortSignal,
): Promise<QuizAttemptResponse> {
  const response = await request(
    `/api/student/quiz-attempts/${encodeURIComponent(attemptPublicId)}`,
    quizAttemptResponseSchema,
    { signal },
  )

  return response.data
}

export async function saveQuizAnswer(
  attemptPublicId: string,
  questionId: number,
  selectedChoiceId: number,
): Promise<SaveQuizAnswerResult> {
  const response = await request(
    `/api/student/quiz-attempts/${encodeURIComponent(
      attemptPublicId,
    )}/answers/${encodeURIComponent(String(questionId))}`,
    saveQuizAnswerResponseSchema,
    {
      method: 'PUT',
      body: JSON.stringify({ selectedChoiceId }),
    },
  )

  return response.data
}

export async function submitQuizAttempt(
  attemptPublicId: string,
): Promise<QuizAttemptResult> {
  const response = await request(
    `/api/student/quiz-attempts/${encodeURIComponent(
      attemptPublicId,
    )}/submit`,
    quizAttemptResultResponseSchema,
    { method: 'POST' },
  )

  return response.data
}

export async function fetchQuizAttemptResult(
  attemptPublicId: string,
  signal?: AbortSignal,
): Promise<QuizAttemptResult> {
  const response = await request(
    `/api/student/quiz-attempts/${encodeURIComponent(attemptPublicId)}/results`,
    quizAttemptResultResponseSchema,
    { signal },
  )

  return response.data
}

export async function fetchLessonPracticeSummary(
  lessonPublicId: string,
  signal?: AbortSignal,
): Promise<LessonPracticeSummary> {
  const response = await request(
    `/api/student/lessons/${encodeURIComponent(lessonPublicId)}/practice`,
    lessonPracticeSummaryResponseSchema,
    { signal },
  )

  return response.data
}

export async function startPracticeAttempt(
  practiceSetId: number,
): Promise<PracticeAttemptPayload> {
  const response = await request(
    `/api/student/practice-sets/${encodeURIComponent(
      String(practiceSetId),
    )}/attempts`,
    practiceAttemptResponseSchema,
    { method: 'POST' },
  )

  if ('resultAvailable' in response.data) {
    throw new ApiClientError(
      'The practice attempt was already submitted.',
      'ATTEMPT_ALREADY_SUBMITTED',
      409,
      null,
    )
  }

  return response.data
}

export async function fetchPracticeAttempt(
  attemptPublicId: string,
  signal?: AbortSignal,
): Promise<PracticeAttemptResponse> {
  const response = await request(
    `/api/student/practice-attempts/${encodeURIComponent(attemptPublicId)}`,
    practiceAttemptResponseSchema,
    { signal },
  )

  return response.data
}

export async function savePracticeAnswer(
  attemptPublicId: string,
  questionId: number,
  selectedChoiceId: number,
): Promise<SavePracticeAnswerResult> {
  const response = await request(
    `/api/student/practice-attempts/${encodeURIComponent(
      attemptPublicId,
    )}/answers/${encodeURIComponent(String(questionId))}`,
    savePracticeAnswerResponseSchema,
    {
      method: 'PUT',
      body: JSON.stringify({ selectedChoiceId }),
    },
  )

  return response.data
}

export async function submitPracticeAttempt(
  attemptPublicId: string,
): Promise<PracticeAttemptResult> {
  const response = await request(
    `/api/student/practice-attempts/${encodeURIComponent(
      attemptPublicId,
    )}/submit`,
    practiceAttemptResultResponseSchema,
    { method: 'POST' },
  )

  return response.data
}

export async function fetchPracticeAttemptResult(
  attemptPublicId: string,
  signal?: AbortSignal,
): Promise<PracticeAttemptResult> {
  const response = await request(
    `/api/student/practice-attempts/${encodeURIComponent(
      attemptPublicId,
    )}/results`,
    practiceAttemptResultResponseSchema,
    { signal },
  )

  return response.data
}

const adminCsrfHeaderValue = 'same-origin-admin-mutation'

function adminRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers)
  const method = init?.method?.toUpperCase() ?? 'GET'

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    headers.set('X-CSE-Admin-CSRF', adminCsrfHeaderValue)
  }

  return request(path, schema, {
    ...init,
    headers,
  })
}

const adminEntityStatusSchema = z.enum(['draft', 'published', 'archived'])

const adminCourseSchema = z.object({
  id: z.number(),
  publicId: z.string(),
  title: z.string(),
  slug: z.string(),
  shortDescription: z.string().nullable(),
  description: z.string().nullable(),
  level: z.string().nullable(),
  thumbnailKey: z.string().nullable(),
  status: adminEntityStatusSchema,
  accessDurationDays: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const adminLessonSchema = z.object({
  id: z.number(),
  topicId: z.number(),
  publicId: z.string(),
  title: z.string(),
  slug: z.string(),
  lessonType: z.enum(['reading', 'video', 'practice', 'quiz']),
  summary: z.string().nullable(),
  estimatedMinutes: z.number().nullable(),
  position: z.number(),
  isPreview: z.boolean(),
  requiresPrevious: z.boolean(),
  status: adminEntityStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})

const adminTopicBaseSchema = z.object({
  id: z.number(),
  subjectId: z.number(),
  title: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  position: z.number(),
  status: adminEntityStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})

const adminTopicSchema = adminTopicBaseSchema.extend({
  lessons: z.array(adminLessonSchema),
})

const adminSubjectBaseSchema = z.object({
  id: z.number(),
  courseId: z.number(),
  title: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  position: z.number(),
  status: adminEntityStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})

const adminSubjectSchema = adminSubjectBaseSchema.extend({
  topics: z.array(adminTopicSchema),
})

const adminDashboardResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    counts: z.object({
      courses: z.number(),
      publishedCourses: z.number(),
      draftCourses: z.number(),
      subjects: z.number(),
      topics: z.number(),
      lessons: z.number(),
      publishedLessons: z.number(),
      practiceSets: z.number(),
      quizzes: z.number(),
    }),
    recentChanges: z.array(z.unknown()),
    cseProfessional: adminCourseSchema.nullable(),
  }),
})

const adminCoursesResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    courses: z.array(adminCourseSchema),
  }),
})

const adminCourseDetailResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    course: adminCourseSchema,
    subjects: z.array(adminSubjectSchema),
  }),
})

const adminCourseMutationResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    course: adminCourseSchema,
  }),
})

const adminSubjectMutationResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    subject: adminSubjectBaseSchema,
  }),
})

const adminTopicMutationResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    topic: adminTopicBaseSchema,
  }),
})

const adminLessonMutationResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    lesson: adminLessonSchema,
  }),
})

const adminLessonBlockSchema = z.object({
  id: z.number(),
  lessonId: z.number(),
  type: z.enum([
    'heading',
    'paragraph',
    'callout',
    'formula',
    'example',
    'image',
    'video',
    'divider',
    'summary',
  ]),
  content: z.unknown(),
  position: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const adminLessonBlocksResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    blocks: z.array(adminLessonBlockSchema),
  }),
})

const adminLessonBlockMutationResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    block: adminLessonBlockSchema,
  }),
})

const adminMoveResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    moved: z.boolean(),
  }),
})

const adminAuditLogSchema = z.object({
  id: z.number(),
  actorUserId: z.number().nullable(),
  actorEmail: z.string().nullable(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string().nullable(),
  metadata: z.unknown(),
  createdAt: z.string(),
})

const adminAuditLogsResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    logs: z.array(adminAuditLogSchema),
  }),
})

const adminEnrollmentResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    enrollment: enrollmentStateSchema,
  }),
})

const adminBetaStudentSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  role: z.literal('student'),
  status: z.enum(['active', 'suspended']),
  enrollmentStatus: z.string().nullable(),
  createdAt: z.string(),
  lastLoginAt: z.string().nullable(),
  activeSessionCount: z.number(),
})

const adminBetaStudentsResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ students: z.array(adminBetaStudentSchema) }),
})

const adminBetaStudentMutationResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    student: adminBetaStudentSchema,
    enrolled: z.boolean(),
  }),
})

const adminQuestionChoiceSchema = z.object({
  id: z.number(),
  text: z.string(),
  isCorrect: z.boolean(),
  position: z.number(),
  updatedAt: z.string().nullable(),
})

const adminPracticeSetSchema = z.object({
  id: z.number(),
  lessonId: z.number(),
  title: z.string(),
  instructions: z.string().nullable(),
  passingScore: z.number(),
  questionCount: z.number(),
  maximumAttempts: z.number().nullable(),
  showExplanations: z.boolean(),
  status: adminEntityStatusSchema,
  questionSource: z.enum(['fixed', 'generated']),
  generator: z
    .object({
      slug: z.string(),
      version: z.number(),
      difficulty: z.object({
        easy: z.number(),
        medium: z.number(),
        hard: z.number(),
      }),
    })
    .nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const adminPracticeQuestionSchema = z.object({
  id: z.number(),
  practiceSetId: z.number(),
  prompt: z.string(),
  explanation: z.string().nullable(),
  points: z.number(),
  position: z.number(),
  status: z.enum(['active', 'archived']),
  createdAt: z.string(),
  updatedAt: z.string(),
  choices: z.array(adminQuestionChoiceSchema),
})

const adminQuizSchema = z.object({
  id: z.number(),
  lessonId: z.number().nullable(),
  topicId: z.number().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  quizType: z.string(),
  passingScore: z.number(),
  timeLimitMinutes: z.number().nullable(),
  maximumAttempts: z.number().nullable(),
  shuffleQuestions: z.boolean(),
  shuffleChoices: z.boolean(),
  showExplanations: z.boolean(),
  status: adminEntityStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})

const adminQuizQuestionSchema = z.object({
  id: z.number(),
  quizId: z.number(),
  questionType: z.enum(['multiple_choice']),
  prompt: z.string(),
  explanation: z.string().nullable(),
  points: z.number(),
  position: z.number(),
  status: z.enum(['active', 'archived']),
  createdAt: z.string(),
  updatedAt: z.string(),
  choices: z.array(adminQuestionChoiceSchema),
})

const adminPracticeSetResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    practiceSet: adminPracticeSetSchema.nullable(),
    questions: z.array(adminPracticeQuestionSchema).optional(),
  }),
})

const adminPracticeGeneratorSchema = z.object({
  slug: z.string(),
  version: z.number(),
  title: z.string(),
  supportedDifficulties: z.array(z.enum(['easy', 'medium', 'hard'])),
})

const adminPracticeGeneratorsResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    generators: z.array(adminPracticeGeneratorSchema),
  }),
})

const adminPracticeSetMutationResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    practiceSet: adminPracticeSetSchema,
  }),
})

const adminPracticeQuestionMutationResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    question: adminPracticeQuestionSchema,
  }),
})

const adminQuizResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    quiz: adminQuizSchema.nullable(),
    questions: z.array(adminQuizQuestionSchema),
  }),
})

const adminQuizMutationResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    quiz: adminQuizSchema,
  }),
})

const adminQuizQuestionMutationResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    question: adminQuizQuestionSchema,
  }),
})

export type AdminDashboard = z.infer<
  typeof adminDashboardResponseSchema
>['data']
export type AdminCourse = z.infer<typeof adminCourseSchema>
export type AdminSubject = z.infer<typeof adminSubjectSchema>
export type AdminSubjectSummary = z.infer<typeof adminSubjectBaseSchema>
export type AdminTopic = z.infer<typeof adminTopicSchema>
export type AdminTopicSummary = z.infer<typeof adminTopicBaseSchema>
export type AdminLesson = z.infer<typeof adminLessonSchema>
export type AdminLessonBlock = z.infer<typeof adminLessonBlockSchema>
export type AdminAuditLog = z.infer<typeof adminAuditLogSchema>
export type AdminPracticeSet = z.infer<typeof adminPracticeSetSchema>
export type AdminPracticeGenerator = z.infer<
  typeof adminPracticeGeneratorSchema
>
export type AdminPracticeQuestion = z.infer<
  typeof adminPracticeQuestionSchema
>
export type AdminQuiz = z.infer<typeof adminQuizSchema>
export type AdminQuizQuestion = z.infer<typeof adminQuizQuestionSchema>

export interface AdminCourseInput {
  title: string
  slug: string
  shortDescription?: string | null
  description?: string | null
  level?: string | null
  accessDurationDays?: number | null
  status?: 'draft' | 'published' | 'archived'
  thumbnailKey?: string | null
  updatedAt?: string
}

export interface AdminSubjectInput {
  title: string
  slug: string
  description?: string | null
  position?: number
  status?: 'draft' | 'published' | 'archived'
  updatedAt?: string
}

export interface AdminLessonInput {
  title: string
  slug: string
  lessonType?: 'reading' | 'practice' | 'quiz'
  summary?: string | null
  estimatedMinutes?: number | null
  position?: number
  isPreview?: boolean
  requiresPrevious?: boolean
  status?: 'draft' | 'published' | 'archived'
  updatedAt?: string
}

export interface AdminLessonBlockInput {
  blockType: AdminLessonBlock['type']
  content: unknown
  position?: number
}

export interface AdminPracticeSetInput {
  title: string
  instructions?: string | null
  passingScore: number
  questionCount: number
  maximumAttempts?: number | null
  showExplanations: boolean
  status: 'draft' | 'published' | 'archived'
  questionSource: 'fixed' | 'generated'
  generatorSlug?: string
  generatorVersion?: number
  difficulty?: {
    easy: number
    medium: number
    hard: number
  }
  updatedAt?: string
}

export interface AdminFixedQuestionInput {
  prompt: string
  explanation?: string | null
  points: number
  position: number
  status: 'active' | 'archived'
  updatedAt?: string
  choices: Array<{
    id?: number
    text: string
    isCorrect: boolean
    position: number
  }>
}

export interface AdminQuizInput {
  title: string
  description?: string | null
  quizType: 'topic'
  passingScore: number
  timeLimitMinutes?: number | null
  maximumAttempts?: number | null
  shuffleQuestions: boolean
  shuffleChoices: boolean
  showExplanations: boolean
  status: 'draft' | 'published' | 'archived'
  updatedAt?: string
}

export interface AdminOperationalEnrollmentInput {
  email: string
  courseSlug: string
  accessExpiresAt?: string | null
}

export type AdminBetaStudent = z.infer<typeof adminBetaStudentSchema>

export interface CreateAdminBetaStudentInput {
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
  enrollInCseProfessional: boolean
}

export function fetchAdminDashboard(
  signal?: AbortSignal,
): Promise<AdminDashboard> {
  return adminRequest('/api/admin/dashboard', adminDashboardResponseSchema, {
    signal,
  }).then((response) => response.data)
}

export function fetchAdminCourses(
  signal?: AbortSignal,
): Promise<AdminCourse[]> {
  return adminRequest('/api/admin/courses', adminCoursesResponseSchema, {
    signal,
  }).then((response) => response.data.courses)
}

export function createAdminCourse(
  input: AdminCourseInput,
): Promise<AdminCourse> {
  return adminRequest('/api/admin/courses', adminCourseMutationResponseSchema, {
    method: 'POST',
    body: JSON.stringify(input),
  }).then((response) => response.data.course)
}

export function fetchAdminCourseDetail(
  courseId: number,
  signal?: AbortSignal,
): Promise<{ course: AdminCourse; subjects: AdminSubject[] }> {
  return adminRequest(
    `/api/admin/courses/${encodeURIComponent(String(courseId))}`,
    adminCourseDetailResponseSchema,
    { signal },
  ).then((response) => response.data)
}

export function updateAdminCourse(
  courseId: number,
  input: AdminCourseInput & { updatedAt: string },
): Promise<AdminCourse> {
  return adminRequest(
    `/api/admin/courses/${encodeURIComponent(String(courseId))}`,
    adminCourseMutationResponseSchema,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  ).then((response) => response.data.course)
}

export function createAdminSubject(
  courseId: number,
  input: AdminSubjectInput,
): Promise<AdminSubjectSummary> {
  return adminRequest(
    `/api/admin/courses/${encodeURIComponent(String(courseId))}/subjects`,
    adminSubjectMutationResponseSchema,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  ).then((response) => response.data.subject)
}

export function updateAdminSubject(
  subjectId: number,
  input: AdminSubjectInput & { updatedAt: string },
): Promise<AdminSubjectSummary> {
  return adminRequest(
    `/api/admin/subjects/${encodeURIComponent(String(subjectId))}`,
    adminSubjectMutationResponseSchema,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  ).then((response) => response.data.subject)
}

export function moveAdminSubject(
  subjectId: number,
  direction: 'up' | 'down',
): Promise<boolean> {
  return adminRequest(
    `/api/admin/subjects/${encodeURIComponent(String(subjectId))}/move-${direction}`,
    adminMoveResponseSchema,
    { method: 'POST' },
  ).then((response) => response.data.moved)
}

export function createAdminTopic(
  subjectId: number,
  input: AdminSubjectInput,
): Promise<AdminTopicSummary> {
  return adminRequest(
    `/api/admin/subjects/${encodeURIComponent(String(subjectId))}/topics`,
    adminTopicMutationResponseSchema,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  ).then((response) => response.data.topic)
}

export function updateAdminTopic(
  topicId: number,
  input: AdminSubjectInput & { updatedAt: string },
): Promise<AdminTopicSummary> {
  return adminRequest(
    `/api/admin/topics/${encodeURIComponent(String(topicId))}`,
    adminTopicMutationResponseSchema,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  ).then((response) => response.data.topic)
}

export function moveAdminTopic(
  topicId: number,
  direction: 'up' | 'down',
): Promise<boolean> {
  return adminRequest(
    `/api/admin/topics/${encodeURIComponent(String(topicId))}/move-${direction}`,
    adminMoveResponseSchema,
    { method: 'POST' },
  ).then((response) => response.data.moved)
}

export function createAdminLesson(
  topicId: number,
  input: AdminLessonInput,
): Promise<AdminLesson> {
  return adminRequest(
    `/api/admin/topics/${encodeURIComponent(String(topicId))}/lessons`,
    adminLessonMutationResponseSchema,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  ).then((response) => response.data.lesson)
}

export function moveAdminLesson(
  lessonId: number,
  direction: 'up' | 'down',
): Promise<boolean> {
  return adminRequest(
    `/api/admin/lessons/${encodeURIComponent(String(lessonId))}/move-${direction}`,
    adminMoveResponseSchema,
    { method: 'POST' },
  ).then((response) => response.data.moved)
}

export function updateAdminLesson(
  lessonId: number,
  input: Partial<AdminLessonInput> & { updatedAt: string },
): Promise<AdminLesson> {
  return adminRequest(
    `/api/admin/lessons/${encodeURIComponent(String(lessonId))}`,
    adminLessonMutationResponseSchema,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  ).then((response) => response.data.lesson)
}

export function fetchAdminLessonBlocks(
  lessonId: number,
  signal?: AbortSignal,
): Promise<AdminLessonBlock[]> {
  return adminRequest(
    `/api/admin/lessons/${encodeURIComponent(String(lessonId))}/blocks`,
    adminLessonBlocksResponseSchema,
    { signal },
  ).then((response) => response.data.blocks)
}

export function createAdminLessonBlock(
  lessonId: number,
  input: AdminLessonBlockInput,
): Promise<AdminLessonBlock> {
  return adminRequest(
    `/api/admin/lessons/${encodeURIComponent(String(lessonId))}/blocks`,
    adminLessonBlockMutationResponseSchema,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  ).then((response) => response.data.block)
}

export function updateAdminLessonBlock(
  blockId: number,
  input: Partial<AdminLessonBlockInput>,
): Promise<AdminLessonBlock> {
  return adminRequest(
    `/api/admin/lesson-blocks/${encodeURIComponent(String(blockId))}`,
    adminLessonBlockMutationResponseSchema,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  ).then((response) => response.data.block)
}

export function deleteAdminLessonBlock(blockId: number): Promise<boolean> {
  return adminRequest(
    `/api/admin/lesson-blocks/${encodeURIComponent(String(blockId))}`,
    z.object({
      success: z.literal(true),
      data: z.object({ deleted: z.literal(true) }),
    }),
    { method: 'DELETE' },
  ).then((response) => response.data.deleted)
}

export function moveAdminLessonBlock(
  blockId: number,
  direction: 'up' | 'down',
): Promise<boolean> {
  return adminRequest(
    `/api/admin/lesson-blocks/${encodeURIComponent(
      String(blockId),
    )}/move-${direction}`,
    adminMoveResponseSchema,
    { method: 'POST' },
  ).then((response) => response.data.moved)
}

export function fetchAdminPracticeSet(
  lessonId: number,
  signal?: AbortSignal,
): Promise<{
  practiceSet: AdminPracticeSet | null
  questions: AdminPracticeQuestion[]
}> {
  return adminRequest(
    `/api/admin/lessons/${encodeURIComponent(String(lessonId))}/practice-set`,
    adminPracticeSetResponseSchema,
    { signal },
  ).then((response) => ({
    practiceSet: response.data.practiceSet,
    questions: response.data.questions ?? [],
  }))
}

export function fetchAdminPracticeGenerators(
  signal?: AbortSignal,
): Promise<AdminPracticeGenerator[]> {
  return adminRequest(
    '/api/admin/practice-generators',
    adminPracticeGeneratorsResponseSchema,
    { signal },
  ).then((response) => response.data.generators)
}

export function saveAdminPracticeSet(
  lessonId: number,
  input: AdminPracticeSetInput,
): Promise<AdminPracticeSet> {
  return adminRequest(
    `/api/admin/lessons/${encodeURIComponent(String(lessonId))}/practice-set`,
    adminPracticeSetMutationResponseSchema,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    },
  ).then((response) => response.data.practiceSet)
}

export function createAdminPracticeQuestion(
  practiceSetId: number,
  input: AdminFixedQuestionInput,
): Promise<AdminPracticeQuestion> {
  return adminRequest(
    `/api/admin/practice-sets/${encodeURIComponent(String(practiceSetId))}/questions`,
    adminPracticeQuestionMutationResponseSchema,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  ).then((response) => response.data.question)
}

export function updateAdminPracticeQuestion(
  questionId: number,
  input: AdminFixedQuestionInput,
): Promise<AdminPracticeQuestion> {
  return adminRequest(
    `/api/admin/practice-questions/${encodeURIComponent(String(questionId))}`,
    adminPracticeQuestionMutationResponseSchema,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  ).then((response) => response.data.question)
}

export function moveAdminPracticeQuestion(
  questionId: number,
  direction: 'up' | 'down',
): Promise<boolean> {
  return adminRequest(
    `/api/admin/practice-questions/${encodeURIComponent(String(questionId))}/move-${direction}`,
    adminMoveResponseSchema,
    { method: 'POST' },
  ).then((response) => response.data.moved)
}

export function fetchAdminQuiz(
  lessonId: number,
  signal?: AbortSignal,
): Promise<{ quiz: AdminQuiz | null; questions: AdminQuizQuestion[] }> {
  return adminRequest(
    `/api/admin/lessons/${encodeURIComponent(String(lessonId))}/quiz`,
    adminQuizResponseSchema,
    { signal },
  ).then((response) => response.data)
}

export function saveAdminQuiz(
  lessonId: number,
  input: AdminQuizInput,
): Promise<AdminQuiz> {
  return adminRequest(
    `/api/admin/lessons/${encodeURIComponent(String(lessonId))}/quiz`,
    adminQuizMutationResponseSchema,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    },
  ).then((response) => response.data.quiz)
}

export function createAdminQuizQuestion(
  quizId: number,
  input: AdminFixedQuestionInput,
): Promise<AdminQuizQuestion> {
  return adminRequest(
    `/api/admin/quizzes/${encodeURIComponent(String(quizId))}/questions`,
    adminQuizQuestionMutationResponseSchema,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  ).then((response) => response.data.question)
}

export function updateAdminQuizQuestion(
  questionId: number,
  input: AdminFixedQuestionInput,
): Promise<AdminQuizQuestion> {
  return adminRequest(
    `/api/admin/questions/${encodeURIComponent(String(questionId))}`,
    adminQuizQuestionMutationResponseSchema,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  ).then((response) => response.data.question)
}

export function moveAdminQuizQuestion(
  questionId: number,
  direction: 'up' | 'down',
): Promise<boolean> {
  return adminRequest(
    `/api/admin/questions/${encodeURIComponent(String(questionId))}/move-${direction}`,
    adminMoveResponseSchema,
    { method: 'POST' },
  ).then((response) => response.data.moved)
}

export function fetchAdminAuditLogs(
  signal?: AbortSignal,
): Promise<AdminAuditLog[]> {
  return adminRequest('/api/admin/audit-logs', adminAuditLogsResponseSchema, {
    signal,
  }).then((response) => response.data.logs)
}

export function createAdminOperationalEnrollment(
  input: AdminOperationalEnrollmentInput,
): Promise<z.infer<typeof enrollmentStateSchema>> {
  return adminRequest(
    '/api/admin/enrollments',
    adminEnrollmentResponseSchema,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  ).then((response) => response.data.enrollment)
}

export function fetchAdminBetaStudents(
  signal?: AbortSignal,
): Promise<AdminBetaStudent[]> {
  return adminRequest(
    '/api/admin/beta-students',
    adminBetaStudentsResponseSchema,
    { signal },
  ).then((response) => response.data.students)
}

export function createAdminBetaStudent(
  input: CreateAdminBetaStudentInput,
): Promise<{ student: AdminBetaStudent; enrolled: boolean }> {
  return adminRequest(
    '/api/admin/beta-students',
    adminBetaStudentMutationResponseSchema,
    { method: 'POST', body: JSON.stringify(input) },
  ).then((response) => response.data)
}

const success = <T extends z.ZodTypeAny>(data: T) => z.object({ success: z.literal(true), data })

export function fetchSubjectAssessment(slug: string, signal?: AbortSignal): Promise<SubjectAssessmentSummary> {
  return request(`/api/student/subject-assessments/${encodeURIComponent(slug)}`, success(subjectAssessmentSummarySchema), { signal }).then((response) => response.data)
}
export function startSubjectAssessment(slug: string): Promise<SubjectAssessmentAttempt> {
  return request(`/api/student/subject-assessments/${encodeURIComponent(slug)}/attempts`, success(subjectAssessmentAttemptSchema), { method: 'POST' }).then((response) => response.data)
}
export function fetchSubjectAssessmentAttempt(id: string, signal?: AbortSignal): Promise<SubjectAssessmentAttemptResponse> {
  return request(`/api/student/subject-assessment-attempts/${encodeURIComponent(id)}`, success(subjectAssessmentAttemptResponseSchema), { signal }).then((response) => response.data)
}
export function saveSubjectAssessmentChoice(attemptId: string, questionId: string, choiceId: string): Promise<void> {
  return request(`/api/student/subject-assessment-attempts/${encodeURIComponent(attemptId)}/answers/${encodeURIComponent(questionId)}`, success(z.object({ saved: z.literal(true), answeredCount: z.number(), totalCount: z.number() })), { method: 'PUT', body: JSON.stringify({ selectedChoicePublicId: choiceId }) }).then(() => undefined)
}
export function submitSubjectAssessment(id: string): Promise<SubjectAssessmentResult> {
  return request(`/api/student/subject-assessment-attempts/${encodeURIComponent(id)}/submit`, success(subjectAssessmentResultSchema), { method: 'POST' }).then((response) => response.data)
}
export function fetchSubjectAssessmentResult(id: string, signal?: AbortSignal): Promise<SubjectAssessmentResult> {
  return request(`/api/student/subject-assessment-attempts/${encodeURIComponent(id)}/results`, success(subjectAssessmentResultSchema), { signal }).then((response) => response.data)
}
export function fetchSubjectAssessmentReview(id: string, signal?: AbortSignal): Promise<SubjectAssessmentReview> {
  return request(`/api/student/subject-assessment-attempts/${encodeURIComponent(id)}/review`, success(assessmentReviewSchema), { signal }).then((response) => response.data)
}
