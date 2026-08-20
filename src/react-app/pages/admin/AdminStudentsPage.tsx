import { useEffect, useState } from 'react'

import { AdminPageHeader } from '../../components/admin/AdminUi'
import {
  createAdminBetaStudent,
  createAdminOperationalEnrollment,
  fetchAdminBetaStudents,
  type AdminBetaStudent,
} from '../../lib/api'

function formatAdminDate(value: string | null): string {
  if (value === null) return 'Never'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

export function AdminStudentsPage() {
  const [students, setStudents] = useState<AdminBetaStudent[]>([])
  const [listError, setListError] = useState<string | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [enrollInCseProfessional, setEnrollInCseProfessional] = useState(true)
  const [creationMessage, setCreationMessage] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [enrollmentEmail, setEnrollmentEmail] = useState('')
  const [courseSlug, setCourseSlug] = useState('cse-professional')
  const [accessExpiresAt, setAccessExpiresAt] = useState('')
  const [enrollmentMessage, setEnrollmentMessage] = useState<string | null>(null)

  async function refreshStudents(signal?: AbortSignal): Promise<void> {
    try {
      setStudents(await fetchAdminBetaStudents(signal))
      setListError(null)
    } catch (error: unknown) {
      if (!signal?.aborted) {
        setListError(
          error instanceof Error
            ? error.message
            : 'Beta students could not be loaded.',
        )
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    void fetchAdminBetaStudents(controller.signal)
      .then((loadedStudents) => {
        setStudents(loadedStudents)
        setListError(null)
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setListError(
            error instanceof Error
              ? error.message
              : 'Beta students could not be loaded.',
          )
        }
      })
    return () => controller.abort()
  }, [])

  return (
    <main className="admin-page">
      <AdminPageHeader
        title="Learner accounts"
        description="Create invited learner accounts and control CSE Professional enrollment."
      />

      <section className="admin-panel">
        <h2>Create beta student</h2>
        <p>
          Set a unique temporary password and communicate it privately. The
          password is never displayed again or included in the account list.
        </p>
        {creationMessage !== null && (
          <p
            className={creationMessage.startsWith('Beta student') ? 'form-success' : 'form-error'}
            role="status"
          >
            {creationMessage}
          </p>
        )}
        <form
          className="admin-form"
          onSubmit={(event) => {
            event.preventDefault()
            setCreationMessage(null)
            setCreating(true)
            createAdminBetaStudent({
              firstName,
              lastName,
              email,
              password,
              confirmPassword,
              enrollInCseProfessional,
            })
              .then(async (result) => {
                setCreationMessage(
                  result.enrolled
                    ? 'Beta student account created and enrolled.'
                    : 'Beta student account created.',
                )
                setFirstName('')
                setLastName('')
                setEmail('')
                setPassword('')
                setConfirmPassword('')
                setEnrollInCseProfessional(true)
                await refreshStudents()
              })
              .catch((error: unknown) =>
                setCreationMessage(
                  error instanceof Error
                    ? error.message
                    : 'Beta student account could not be created.',
                ),
              )
              .finally(() => setCreating(false))
          }}
        >
          <label htmlFor="beta-first-name">First name</label>
          <input id="beta-first-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} maxLength={80} required />
          <label htmlFor="beta-last-name">Last name</label>
          <input id="beta-last-name" value={lastName} onChange={(event) => setLastName(event.target.value)} maxLength={80} required />
          <label htmlFor="beta-email">Email</label>
          <input id="beta-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} autoComplete="off" required />
          <label htmlFor="beta-password">Temporary password</label>
          <input id="beta-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={12} maxLength={128} autoComplete="new-password" required />
          <label htmlFor="beta-confirm-password">Confirm temporary password</label>
          <input id="beta-confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={12} maxLength={128} autoComplete="new-password" required />
          <label className="admin-checkbox-label" htmlFor="beta-enroll-course">
            <input id="beta-enroll-course" type="checkbox" checked={enrollInCseProfessional} onChange={(event) => setEnrollInCseProfessional(event.target.checked)} />
            Enroll in CSE Professional
          </label>
          <button type="submit" disabled={creating}>
            {creating ? 'Creating account…' : 'Create beta student'}
          </button>
        </form>
      </section>

      <section className="admin-panel">
        <h2>Beta student accounts</h2>
        {listError !== null && <p className="form-error" role="alert">{listError}</p>}
        {listError === null && students.length === 0 && <p>No student accounts found.</p>}
        {students.map((student) => (
          <article className="admin-row" key={student.id}>
            <div>
              <strong>{student.firstName} {student.lastName}</strong>
              <p>{student.email}</p>
              <p>Role: {student.role} · Account: {student.status} · Enrollment: {student.enrollmentStatus ?? 'not enrolled'}</p>
              <p>Created: {formatAdminDate(student.createdAt)} · Last login: {formatAdminDate(student.lastLoginAt)} · Active sessions: {student.activeSessionCount}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="admin-panel">
        <h2>Enroll existing student</h2>
        {enrollmentMessage !== null && (
          <p className={enrollmentMessage.includes('could not') ? 'form-error' : 'form-success'} role="status">
            {enrollmentMessage}
          </p>
        )}
        <form
          className="admin-form"
          onSubmit={(event) => {
            event.preventDefault()
            setEnrollmentMessage(null)
            createAdminOperationalEnrollment({
              email: enrollmentEmail,
              courseSlug,
              accessExpiresAt: accessExpiresAt.trim().length === 0 ? null : new Date(accessExpiresAt).toISOString(),
            })
              .then(async (enrollment) => {
                setEnrollmentMessage(`Enrollment saved. Status: ${enrollment.status}; access: ${enrollment.hasAccess ? 'active' : 'inactive'}.`)
                await refreshStudents()
              })
              .catch((error: unknown) =>
                setEnrollmentMessage(error instanceof Error ? error.message : 'Enrollment could not be saved.'),
              )
          }}
        >
          <label htmlFor="student-email">Student email</label>
          <input id="student-email" type="email" value={enrollmentEmail} onChange={(event) => setEnrollmentEmail(event.target.value)} required />
          <label htmlFor="course-slug">Course slug</label>
          <input id="course-slug" value={courseSlug} onChange={(event) => setCourseSlug(event.target.value)} required />
          <label htmlFor="expires-at">Access expiration</label>
          <input id="expires-at" type="datetime-local" value={accessExpiresAt} onChange={(event) => setAccessExpiresAt(event.target.value)} />
          <button type="submit">Enroll student</button>
        </form>
      </section>
    </main>
  )
}
