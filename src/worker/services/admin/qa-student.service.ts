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
  repairQaStudentPublicId,
} from '../../repositories/admin/qa-student.repository'
import type { ConfigureQaStudentInput } from '../../schemas/admin/qa-student.schemas'
import type { AuthenticatedPrincipal } from '../../types/auth'
import { AppError } from '../../utils/app-error'
import {
  getLessonAccessibilityFromOrderedRows,
  isRequiredLesson,
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

const legacyQaStudentPublicIdPattern = /^qa-student-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u

function isLegacyQaStudentPublicId(publicId: string): boolean {
  return legacyQaStudentPublicIdPattern.test(publicId)
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
) {
  const target = await findQaStudentTargetByEmail(database, email)
  const state = await countQaStudentState(database, email)
  const course = await findPublishedCseCourse(database)
  const verification = target !== null
    && target.role === 'student'
    && target.has_active_access === 1
    && course !== null
    ? await verifyQaStudentAccess(database, target.id, course.id, 'inspect')
    : null

  return {
    target: safeTarget(target),
    emailLooksLikeQa: isQaStudentEmail(email),
    state,
    verification,
  }
}

interface ActivityAccessRow {
  kind: 'practice' | 'quiz'
  activity_title: string
  lesson_public_id: string
}

async function verifyQaStudentAccess(
  database: D1Database,
  userId: number,
  courseId: number,
  expectation: 'unlocked' | 'fresh' | 'inspect',
) {
  const [enrollmentRow, curriculumRows, activityResult, assessments, mock] =
    await Promise.all([
      findCourseEnrollmentById(database, userId, courseId),
      findPublishedCurriculumLessons(database, courseId, userId),
      database
        .prepare(
          `SELECT 'practice' AS kind, practice_sets.title AS activity_title,
            lessons.public_id AS lesson_public_id
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
          SELECT 'quiz' AS kind, quizzes.title AS activity_title,
            lessons.public_id AS lesson_public_id
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
  const lessonAccess = curriculumRows.map((row) => {
    const accessibility = getLessonAccessibilityFromOrderedRows(
      row,
      curriculumRows,
      enrollment,
    )
    const prerequisiteState = row.requires_previous === 0
      ? 'not_required'
      : accessibility.reason === 'previous_required_lesson_incomplete'
        ? 'incomplete'
        : 'completed_or_not_applicable'

    return {
      subjectSlug: row.subject_slug,
      subjectTitle: row.subject_title,
      topicSlug: row.topic_slug,
      topicTitle: row.topic_title,
      lessonPublicId: row.lesson_public_id,
      title: row.lesson_title,
      activityType: 'lesson' as const,
      lessonType: row.lesson_type,
      required: isRequiredLesson(row),
      requiresPrevious: row.requires_previous === 1,
      progressStatus: row.progress_status ?? 'not_started',
      prerequisiteState,
      accessible: accessibility.canAccess,
      accessReason: accessibility.reason,
      route: `/courses/cse-professional/lessons/${row.lesson_public_id}`,
      apiRoute: `/api/student/lessons/${row.lesson_public_id}`,
    }
  })
  const inaccessibleLessons = lessonAccess.filter((item) => !item.accessible)
  const accessByLesson = new Map(
    lessonAccess.map((item) => [item.lessonPublicId, item]),
  )
  const activities = activityResult.results.map((row) => {
    const lesson = accessByLesson.get(row.lesson_public_id)
    return {
      subjectSlug: lesson?.subjectSlug ?? 'unknown',
      subjectTitle: lesson?.subjectTitle ?? 'Unknown subject',
      topicSlug: lesson?.topicSlug ?? 'unknown',
      topicTitle: lesson?.topicTitle ?? 'Unknown topic',
      lessonPublicId: row.lesson_public_id,
      title: row.activity_title,
      activityType: row.kind,
      required: lesson?.required ?? true,
      progressStatus: lesson?.progressStatus ?? 'not_started',
      prerequisiteState: lesson?.prerequisiteState ?? 'unknown',
      accessible: lesson?.accessible === true,
      route: `/courses/cse-professional/lessons/${row.lesson_public_id}`,
      apiRoute: `/api/student/lessons/${row.lesson_public_id}/${row.kind}`,
    }
  })
  const inaccessibleActivities = activities.filter((item) => !item.accessible)

  const subjectCounts = new Map<
    string,
    { title: string; total: number; accessible: number }
  >()
  for (const item of lessonAccess) {
    const current = subjectCounts.get(item.subjectSlug) ?? {
      title: item.subjectTitle,
      total: 0,
      accessible: 0,
    }
    current.total += 1
    current.accessible += item.accessible ? 1 : 0
    subjectCounts.set(item.subjectSlug, current)
  }

  const assessmentChecks = await Promise.all(
    assessments.map(async (assessment) => {
      await assertSubjectAssessmentCourseAccess(database, userId, courseId)
      return {
        subjectSlug: assessment.subject_slug,
        subjectTitle: assessment.subject_title,
        title: assessment.title,
        assessmentSlug: assessment.slug,
        activityType: 'subject_assessment' as const,
        available: true,
        reason: null,
        route: `/subject-assessments/${assessment.slug}`,
        apiRoute: `/api/student/subject-assessments/${assessment.slug}`,
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
  const practiceCount = activities.filter((item) => item.activityType === 'practice').length
  const accessiblePracticeCount = activities.filter(
    (item) => item.activityType === 'practice' && item.accessible,
  ).length
  const quizCount = activities.filter((item) => item.activityType === 'quiz').length
  const accessibleQuizCount = activities.filter(
    (item) => item.activityType === 'quiz' && item.accessible,
  ).length

  if (
    expectation === 'unlocked'
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

  const freshRequiredLocks = lessonAccess.filter(
    (item) => item.required && item.requiresPrevious && !item.accessible,
  ).length

  return {
    enrollmentActive: true,
    expectation,
    subjects: [...subjectCounts.entries()].map(([slug, counts]) => ({
      slug,
      ...counts,
    })),
    lessons: {
      total: lessonAccess.length,
      accessible: lessonAccess.length - inaccessibleLessons.length,
      locked: inaccessibleLessons.length,
      requiredLocked: freshRequiredLocks,
    },
    practices: {
      total: practiceCount,
      accessible: accessiblePracticeCount,
    },
    quizzes: {
      total: quizCount,
      accessible: accessibleQuizCount,
    },
    activities: [...lessonAccess, ...activities],
    lockedActivities: [
      ...inaccessibleLessons,
      ...inaccessibleActivities,
    ],
    subjectAssessments: assessmentChecks,
    fullMockExamination: {
      title: mock?.title ?? null,
      slug: mock?.slug ?? null,
      activityType: 'full_mock' as const,
      available: mockAvailable,
      route: mock === null ? null : `/mock-examinations/${mock.slug}`,
      apiRoute: mock === null
        ? null
        : `/api/student/mock-examinations/${mock.slug}`,
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
  const shouldRepairPublicId = input.mode === 'unlocked'
    && beforeTarget !== null
    && isLegacyQaStudentPublicId(beforeTarget.public_id)
    && beforeTarget.role === 'student'
  const publicId = shouldRepairPublicId
    ? crypto.randomUUID()
    : beforeTarget?.public_id ?? crypto.randomUUID()
  if (shouldRepairPublicId) {
    const repaired = await repairQaStudentPublicId(database, beforeTarget.id, publicId)
    if (repaired !== 1) {
      throw new Error('The QA student public identifier could not be repaired.')
    }
  }
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
    publicId,
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
    input.mode,
  )
  if (
    input.mode === 'fresh'
    && (
      after.progressRecordCount !== 0
      || after.completedLessonCount !== 0
      || verification.lessons.requiredLocked === 0
    )
  ) {
    throw new AppError(
      409,
      'QA_STUDENT_FRESH_VERIFICATION_FAILED',
      'The QA student did not return to the expected fresh-student lock state.',
    )
  }

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
