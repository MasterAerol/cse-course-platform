import { hashPassword } from '../../auth/password'
import { findUserByEmail } from '../../repositories/auth.repository'
import {
  findCourseEnrollmentById,
  findPublishedCurriculumLessons,
} from '../../repositories/course.repository'
import { findPublishedMockForCourse } from '../../repositories/mock-exam.repository'
import { findPublishedSubjectAssessmentsForCourse } from '../../repositories/subject-assessment.repository'
import {
  configureQaStudentRecords,
  countQaStudentState,
  findPublishedCseCourse,
  findQaStudentTargetByEmail,
  type QaStudentStateCounts,
} from '../../repositories/admin/qa-student.repository'
import type { ConfigureQaStudentInput } from '../../schemas/admin/qa-student.schemas'
import type { AuthenticatedPrincipal } from '../../types/auth'
import { AppError } from '../../utils/app-error'
import {
  getLessonAccessibilityFromOrderedRows,
} from '../lesson-access.service'
import { mapEnrollment } from '../enrollment.service'
import { assertMockExamCourseAccess } from '../mock-exam.service'
import { assertSubjectAssessmentCourseAccess } from '../subject-assessment.service'

const CSE_PROFESSIONAL_SLUG = 'cse-professional'
const EXPECTED_SUBJECTS = new Set([
  'numerical-ability',
  'analytical-ability',
  'verbal-ability',
  'general-information',
])

export function isQaStudentEmail(email: string): boolean {
  const [localPart] = email.toLowerCase().split('@')
  return localPart !== undefined
    && /(^|[+._-])(qa|test)([+._-]|$)/u.test(localPart)
}

function safeTarget(target: Awaited<ReturnType<typeof findQaStudentTargetByEmail>>) {
  return target === null
    ? null
    : {
        id: target.public_id,
        email: target.email,
        role: target.role,
        status: target.status,
        enrollmentStatus: target.enrollment_status,
        hasActiveAccess: target.has_active_access === 1,
      }
}

export async function inspectAdminQaStudent(
  database: D1Database,
  email: string,
): Promise<{
  target: ReturnType<typeof safeTarget>
  emailLooksLikeQa: boolean
  state: QaStudentStateCounts
}> {
  const target = await findQaStudentTargetByEmail(database, email)
  return {
    target: safeTarget(target),
    emailLooksLikeQa: isQaStudentEmail(email),
    state: await countQaStudentState(database, email),
  }
}

interface ActivityAccessRow {
  kind: 'practice' | 'quiz'
  lesson_public_id: string
}

async function verifyQaStudentAccess(
  database: D1Database,
  userId: number,
  courseId: number,
  expectUnlocked: boolean,
) {
  const [enrollmentRow, curriculumRows, activityResult, assessments, mock] =
    await Promise.all([
      findCourseEnrollmentById(database, userId, courseId),
      findPublishedCurriculumLessons(database, courseId, userId),
      database
        .prepare(
          `SELECT 'practice' AS kind, lessons.public_id AS lesson_public_id
          FROM practice_sets
          INNER JOIN lessons ON lessons.id = practice_sets.lesson_id
          INNER JOIN topics ON topics.id = lessons.topic_id
          INNER JOIN subjects ON subjects.id = topics.subject_id
          WHERE subjects.course_id = ?1
            AND practice_sets.status = 'published'
            AND lessons.status = 'published'
            AND topics.status = 'published'
            AND subjects.status = 'published'
          UNION ALL
          SELECT 'quiz' AS kind, lessons.public_id AS lesson_public_id
          FROM quizzes
          INNER JOIN lessons ON lessons.id = quizzes.lesson_id
          INNER JOIN topics ON topics.id = lessons.topic_id
          INNER JOIN subjects ON subjects.id = topics.subject_id
          WHERE subjects.course_id = ?1
            AND quizzes.status = 'published'
            AND lessons.status = 'published'
            AND topics.status = 'published'
            AND subjects.status = 'published'`,
        )
        .bind(courseId)
        .all<ActivityAccessRow>(),
      findPublishedSubjectAssessmentsForCourse(database, courseId),
      findPublishedMockForCourse(database, courseId),
    ])

  if (enrollmentRow === null || enrollmentRow.has_active_access !== 1) {
    throw new AppError(
      409,
      'QA_STUDENT_ENROLLMENT_INVALID',
      'The QA student does not have active CSE Professional access.',
    )
  }

  const enrollment = mapEnrollment(enrollmentRow)
  const lessonAccess = curriculumRows.map((row) => ({
    subjectSlug: row.subject_slug,
    lessonPublicId: row.lesson_public_id,
    lessonType: row.lesson_type,
    ...getLessonAccessibilityFromOrderedRows(row, curriculumRows, enrollment),
  }))
  const inaccessibleLessons = lessonAccess.filter((item) => !item.canAccess)
  const accessByLesson = new Map(
    lessonAccess.map((item) => [item.lessonPublicId, item.canAccess]),
  )
  const activities = activityResult.results.map((row) => ({
    kind: row.kind,
    lessonPublicId: row.lesson_public_id,
    canAccess: accessByLesson.get(row.lesson_public_id) === true,
  }))
  const inaccessibleActivities = activities.filter((item) => !item.canAccess)

  const subjectCounts = new Map<string, { total: number; accessible: number }>()
  for (const item of lessonAccess) {
    const current = subjectCounts.get(item.subjectSlug) ?? {
      total: 0,
      accessible: 0,
    }
    current.total += 1
    current.accessible += item.canAccess ? 1 : 0
    subjectCounts.set(item.subjectSlug, current)
  }

  const assessmentChecks = await Promise.all(
    assessments.map(async (assessment) => {
      await assertSubjectAssessmentCourseAccess(database, userId, courseId)
      return {
        subjectSlug: assessment.subject_slug,
        assessmentSlug: assessment.slug,
        available: true,
        reason: null,
      }
    }),
  )
  if (mock !== null) {
    await assertMockExamCourseAccess(database, userId, courseId)
  }
  const mockAvailable = mock !== null

  const subjectSetIsComplete = assessments.length === EXPECTED_SUBJECTS.size
    && assessments.every((assessment) => EXPECTED_SUBJECTS.has(assessment.subject_slug))
  const subjectCurriculumIsComplete = subjectCounts.size === EXPECTED_SUBJECTS.size
    && [...EXPECTED_SUBJECTS].every(
      (subjectSlug) => (subjectCounts.get(subjectSlug)?.total ?? 0) > 0,
    )
  const assessmentsAvailable = subjectSetIsComplete
    && assessmentChecks.every((assessment) => assessment.available)
  const practiceCount = activities.filter((item) => item.kind === 'practice').length
  const accessiblePracticeCount = activities.filter(
    (item) => item.kind === 'practice' && item.canAccess,
  ).length
  const quizCount = activities.filter((item) => item.kind === 'quiz').length
  const accessibleQuizCount = activities.filter(
    (item) => item.kind === 'quiz' && item.canAccess,
  ).length

  if (
    expectUnlocked
    && (
      inaccessibleLessons.length > 0
      || inaccessibleActivities.length > 0
      || !subjectCurriculumIsComplete
      || practiceCount === 0
      || quizCount === 0
      || !assessmentsAvailable
      || !mockAvailable
    )
  ) {
    throw new AppError(
      409,
      'QA_STUDENT_ACCESS_VERIFICATION_FAILED',
      'The QA student could not access every required CSE Professional activity.',
    )
  }

  return {
    enrollmentActive: true,
    subjects: [...subjectCounts.entries()].map(([slug, counts]) => ({
      slug,
      ...counts,
    })),
    lessons: {
      total: lessonAccess.length,
      accessible: lessonAccess.length - inaccessibleLessons.length,
      locked: inaccessibleLessons.length,
    },
    practices: {
      total: practiceCount,
      accessible: accessiblePracticeCount,
    },
    quizzes: {
      total: quizCount,
      accessible: accessibleQuizCount,
    },
    subjectAssessments: assessmentChecks,
    fullMockExamination: {
      slug: mock?.slug ?? null,
      available: mockAvailable,
    },
  }
}

export async function configureAdminQaStudent(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  input: ConfigureQaStudentInput,
  requestId: string,
) {
  const existingUser = await findUserByEmail(database, input.email)
  if (existingUser?.role === 'admin') {
    throw new AppError(
      409,
      'QA_STUDENT_ADMIN_REJECTED',
      'Administrator accounts cannot be configured as QA students.',
    )
  }
  if (!isQaStudentEmail(input.email) && !input.confirmNonQaEmail) {
    throw new AppError(
      409,
      'QA_STUDENT_EMAIL_CONFIRMATION_REQUIRED',
      'This email does not look like a QA address. Explicit confirmation is required.',
    )
  }

  const course = await findPublishedCseCourse(database)
  if (course === null || course.slug !== CSE_PROFESSIONAL_SLUG) {
    throw new AppError(
      409,
      'QA_STUDENT_COURSE_UNAVAILABLE',
      'The published CSE Professional course is unavailable.',
    )
  }

  const before = await countQaStudentState(database, input.email)
  const beforeTarget = await findQaStudentTargetByEmail(database, input.email)
  const passwordHash = await hashPassword(input.password)
  const enrollmentCreated = beforeTarget?.enrollment_id === null
    || beforeTarget === null
  const enrollmentUpdated = beforeTarget !== null
    && beforeTarget.enrollment_id !== null
    && beforeTarget.has_active_access !== 1

  const changes = input.mode === 'unlocked'
    ? {
        completionRecordsCreated: before.missingProgressCount,
        completionRecordsUpdated: before.incompleteProgressCount,
        progressRecordsRemoved: 0,
        practiceAttemptsRemoved: 0,
        quizAttemptsRemoved: 0,
        subjectAssessmentAttemptsRemoved: 0,
        mockExamAttemptsRemoved: 0,
        activeRecoveryAttemptsRemoved: 0,
        submittedRecoveryAttemptsPreserved:
          before.submittedRecoveryAttemptCount,
      }
    : {
        completionRecordsCreated: 0,
        completionRecordsUpdated: 0,
        progressRecordsRemoved: before.progressRecordCount,
        practiceAttemptsRemoved: before.practiceAttemptCount,
        quizAttemptsRemoved: before.quizAttemptCount,
        subjectAssessmentAttemptsRemoved:
          before.subjectAssessmentAttemptCount,
        mockExamAttemptsRemoved: before.mockExamAttemptCount,
        activeRecoveryAttemptsRemoved: before.activeRecoveryAttemptCount,
        submittedRecoveryAttemptsPreserved:
          before.submittedRecoveryAttemptCount,
      }

  await configureQaStudentRecords(database, {
    actorUserId: actor.internalUserId,
    publicId: existingUser?.publicId ?? `qa-student-${crypto.randomUUID()}`,
    email: input.email,
    passwordHash,
    mode: input.mode,
    metadataJson: JSON.stringify({
      operation: 'configure-cse-qa-student',
      mode: input.mode,
      targetEmail: input.email,
      accountCreated: existingUser === null,
      enrollmentCreated,
      enrollmentUpdated,
      changes,
      requestId,
    }),
  })

  const configuredUser = await findUserByEmail(database, input.email)
  if (configuredUser === null || configuredUser.role !== 'student') {
    throw new Error('The QA student account could not be loaded after configuration.')
  }
  const after = await countQaStudentState(database, input.email)
  const verification = await verifyQaStudentAccess(
    database,
    configuredUser.id,
    course.id,
    input.mode === 'unlocked',
  )

  return {
    target: {
      id: configuredUser.publicId,
      email: configuredUser.email,
      role: configuredUser.role,
      status: configuredUser.status,
      courseSlug: course.slug,
    },
    mode: input.mode,
    accountCreated: existingUser === null,
    enrollment: {
      created: enrollmentCreated,
      updated: enrollmentUpdated,
      unchanged: !enrollmentCreated && !enrollmentUpdated,
    },
    changes,
    state: after,
    verification,
  }
}
