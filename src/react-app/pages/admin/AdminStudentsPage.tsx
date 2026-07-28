import { useState } from 'react'

import { AdminPageHeader } from '../../components/admin/AdminUi'
import { createAdminOperationalEnrollment } from '../../lib/api'

export function AdminStudentsPage() {
  const [email, setEmail] = useState('')
  const [courseSlug, setCourseSlug] = useState('cse-professional')
  const [accessExpiresAt, setAccessExpiresAt] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  return (
    <main className="admin-page">
      <AdminPageHeader
        title="Students"
        description="Operational enrollment for existing users. Payments and student management are intentionally out of scope."
      />
      <section className="admin-panel">
        <h2>Enroll existing student</h2>
        {message !== null && (
          <p
            className={message.includes('could not') ? 'form-error' : 'form-success'}
            role="status"
          >
            {message}
          </p>
        )}
        <form
          className="admin-form"
          onSubmit={(event) => {
            event.preventDefault()
            setMessage(null)
            createAdminOperationalEnrollment({
              email,
              courseSlug,
              accessExpiresAt:
                accessExpiresAt.trim().length === 0
                  ? null
                  : new Date(accessExpiresAt).toISOString(),
            })
              .then((enrollment) =>
                setMessage(
                  `Enrollment saved. Status: ${enrollment.status}; access: ${
                    enrollment.hasAccess ? 'active' : 'inactive'
                  }.`,
                ),
              )
              .catch((error: unknown) =>
                setMessage(
                  error instanceof Error
                    ? error.message
                    : 'Enrollment could not be saved.',
                ),
              )
          }}
        >
          <label htmlFor="student-email">Student email</label>
          <input
            id="student-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <label htmlFor="course-slug">Course slug</label>
          <input
            id="course-slug"
            value={courseSlug}
            onChange={(event) => setCourseSlug(event.target.value)}
            required
          />
          <label htmlFor="expires-at">Access expiration</label>
          <input
            id="expires-at"
            type="datetime-local"
            value={accessExpiresAt}
            onChange={(event) => setAccessExpiresAt(event.target.value)}
          />
          <button type="submit">Enroll student</button>
        </form>
      </section>
    </main>
  )
}
