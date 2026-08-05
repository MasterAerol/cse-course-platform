import { hashPassword } from '../../auth/password'
import { findCourseIdBySlug } from '../../repositories/course.repository'
import { findUserByEmail } from '../../repositories/auth.repository'
import {
  createBetaStudentRecord,
  listBetaStudentRows,
  type BetaStudentRow,
} from '../../repositories/admin/beta-student.repository'
import type { CreateBetaStudentInput } from '../../schemas/admin/beta-student.schemas'
import type { AuthenticatedPrincipal } from '../../types/auth'
import { AppError } from '../../utils/app-error'

const CSE_PROFESSIONAL_SLUG = 'cse-professional'

export interface AdminBetaStudent {
  id: string
  firstName: string
  lastName: string
  email: string
  role: 'student'
  status: 'active' | 'suspended'
  enrollmentStatus: string | null
  createdAt: string
  lastLoginAt: string | null
  activeSessionCount: number
}

function mapBetaStudent(row: BetaStudentRow): AdminBetaStudent {
  return {
    id: row.public_id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    role: 'student',
    status: row.status,
    enrollmentStatus: row.enrollment_status,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
    activeSessionCount: row.active_session_count,
  }
}

function duplicateEmailError(): AppError {
  return new AppError(
    409,
    'BETA_STUDENT_EMAIL_EXISTS',
    'A user account with this email already exists.',
  )
}

export async function createAdminBetaStudent(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  input: CreateBetaStudentInput,
  requestId: string,
): Promise<{ student: AdminBetaStudent; enrolled: boolean }> {
  if (await findUserByEmail(database, input.email)) {
    throw duplicateEmailError()
  }

  if (
    input.enrollInCseProfessional &&
    (await findCourseIdBySlug(database, CSE_PROFESSIONAL_SLUG)) === null
  ) {
    throw new AppError(
      409,
      'BETA_COURSE_UNAVAILABLE',
      'The CSE Professional course is not available for enrollment.',
    )
  }

  const passwordHash = await hashPassword(input.password)
  const publicId = crypto.randomUUID()
  let row: BetaStudentRow | null

  try {
    row = await createBetaStudentRecord(database, {
      actorUserId: actor.internalUserId,
      publicId,
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      enrollInCseProfessional: input.enrollInCseProfessional,
      auditMetadataJson: JSON.stringify({
        normalizedEmail: input.email,
        courseSlug: input.enrollInCseProfessional
          ? CSE_PROFESSIONAL_SLUG
          : null,
        enrollmentResult: input.enrollInCseProfessional
          ? 'active'
          : 'not_requested',
        requestId,
      }),
    })
  } catch (error: unknown) {
    if (await findUserByEmail(database, input.email)) {
      throw duplicateEmailError()
    }

    throw error
  }

  if (row === null) {
    throw new Error('The beta student account could not be loaded.')
  }

  return {
    student: mapBetaStudent(row),
    enrolled: row.enrollment_status === 'active',
  }
}

export async function listAdminBetaStudents(
  database: D1Database,
): Promise<{ students: AdminBetaStudent[] }> {
  return {
    students: (await listBetaStudentRows(database)).map(mapBetaStudent),
  }
}
