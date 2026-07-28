import { z } from 'zod'

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

const courseDetailSchema = courseSummarySchema.extend({
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
    courses: z.array(dashboardCourseSchema),
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
export type AdminCheckResponse = z.infer<typeof adminCheckResponseSchema>
export type CourseSummary = z.infer<typeof courseSummarySchema>
export type CourseDetail = z.infer<typeof courseDetailSchema>
export type StudentCourseCurriculum = z.infer<
  typeof studentCourseCurriculumResponseSchema
>['data']
export type StudentDashboard = z.infer<
  typeof studentDashboardResponseSchema
>['data']
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

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers)
  headers.set('Accept', 'application/json')

  if (init?.body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(path, {
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

    throw new ApiClientError(
      'The request could not be completed.',
      'REQUEST_FAILED',
      response.status,
      response.headers.get('x-request-id'),
    )
  }

  const result = schema.safeParse(body)

  if (!result.success) {
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
