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

const validationFieldErrorsSchema = z
  .object({
    accessExpiresAt: z.array(z.string()).optional(),
    courseSlug: z.array(z.string()).optional(),
    firstName: z.array(z.string()).optional(),
    lastName: z.array(z.string()).optional(),
    email: z.array(z.string()).optional(),
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
export type StudentDashboard = z.infer<
  typeof studentDashboardResponseSchema
>['data']
export type CourseProgress = z.infer<typeof courseProgressSchema>
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
