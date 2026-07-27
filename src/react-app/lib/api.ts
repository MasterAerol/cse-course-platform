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
    'enrollment_required',
  ]),
})

const curriculumLessonSchema = z.object({
  publicId: z.string(),
  title: z.string(),
  slug: z.string(),
  lessonType: z.string(),
  position: z.number(),
  estimatedMinutes: z.number().nullable(),
  isPreview: z.boolean(),
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

const validationFieldErrorsSchema = z
  .object({
    accessExpiresAt: z.array(z.string()).optional(),
    courseSlug: z.array(z.string()).optional(),
    firstName: z.array(z.string()).optional(),
    lastName: z.array(z.string()).optional(),
    email: z.array(z.string()).optional(),
    lessonPublicId: z.array(z.string()).optional(),
    password: z.array(z.string()).optional(),
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
