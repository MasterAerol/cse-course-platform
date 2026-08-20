import { useState, type FormEvent } from 'react'

import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_REQUIREMENTS,
} from '../../shared/password-policy'
import {
  ApiClientError,
  changePassword,
  type ValidationFieldErrors,
} from '../lib/api'

type PasswordField =
  | 'currentPassword'
  | 'newPassword'
  | 'confirmNewPassword'

function FieldErrors({
  errors,
  id,
}: {
  errors: string[] | undefined
  id: string
}) {
  if (errors === undefined || errors.length === 0) {
    return null
  }

  return (
    <ul className="field-errors" id={id}>
      {errors.map((message) => <li key={message}>{message}</li>)}
    </ul>
  )
}

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPasswords, setShowNewPasswords] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] =
    useState<ValidationFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const requirements = PASSWORD_REQUIREMENTS.map((requirement) => ({
    ...requirement,
    satisfied: requirement.test(newPassword),
  }))

  function clearFieldError(field: PasswordField): void {
    setFieldErrors((current) => {
      if (current[field] === undefined) {
        return current
      }

      const next = { ...current }
      delete next[field]
      return next
    })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setFieldErrors({})
    setFormError(null)
    setSuccess(null)

    try {
      await changePassword({
        currentPassword,
        newPassword,
        confirmNewPassword,
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
      setShowCurrentPassword(false)
      setShowNewPasswords(false)
      setSuccess('Password updated successfully.')
    } catch (error: unknown) {
      if (
        error instanceof ApiClientError &&
        error.code === 'VALIDATION_ERROR'
      ) {
        setFieldErrors(error.fieldErrors)
      } else if (
        error instanceof ApiClientError &&
        error.code === 'CURRENT_PASSWORD_INCORRECT'
      ) {
        setFieldErrors({
          currentPassword: ['The current password is incorrect.'],
        })
      } else {
        setFormError(
          error instanceof Error
            ? error.message
            : 'Password change could not be completed.',
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      className="change-password-form"
      aria-busy={submitting}
      noValidate
      onSubmit={(event) => void handleSubmit(event)}
    >
      <div>
        <label htmlFor="current-password">Current password</label>
        <div className="password-input-group">
          <input
            id="current-password"
            name="currentPassword"
            type={showCurrentPassword ? 'text' : 'password'}
            autoComplete="current-password"
            maxLength={PASSWORD_MAX_LENGTH}
            required
            aria-invalid={fieldErrors.currentPassword !== undefined}
            aria-describedby={
              fieldErrors.currentPassword === undefined
                ? undefined
                : 'current-password-errors'
            }
            value={currentPassword}
            onChange={(event) => {
              setCurrentPassword(event.target.value)
              clearFieldError('currentPassword')
            }}
          />
          <button
            className="password-toggle"
            type="button"
            aria-label={
              showCurrentPassword
                ? 'Hide current password'
                : 'Show current password'
            }
            aria-pressed={showCurrentPassword}
            onClick={() => setShowCurrentPassword((current) => !current)}
          >
            {showCurrentPassword ? 'Hide' : 'Show'}
          </button>
        </div>
        <FieldErrors
          errors={fieldErrors.currentPassword}
          id="current-password-errors"
        />
      </div>

      <div>
        <label htmlFor="new-password">New password</label>
        <div className="password-input-group">
          <input
            id="new-password"
            name="newPassword"
            type={showNewPasswords ? 'text' : 'password'}
            autoComplete="new-password"
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
            required
            aria-invalid={fieldErrors.newPassword !== undefined}
            aria-describedby={[
              'change-password-requirements',
              fieldErrors.newPassword === undefined
                ? null
                : 'new-password-errors',
            ].filter((value) => value !== null).join(' ')}
            value={newPassword}
            onChange={(event) => {
              setNewPassword(event.target.value)
              clearFieldError('newPassword')
            }}
          />
          <button
            className="password-toggle"
            type="button"
            aria-label={showNewPasswords ? 'Hide new passwords' : 'Show new passwords'}
            aria-pressed={showNewPasswords}
            onClick={() => setShowNewPasswords((current) => !current)}
          >
            {showNewPasswords ? 'Hide' : 'Show'}
          </button>
        </div>
        <FieldErrors
          errors={fieldErrors.newPassword}
          id="new-password-errors"
        />
      </div>

      <div>
        <label htmlFor="confirm-new-password">Confirm new password</label>
        <input
          id="confirm-new-password"
          name="confirmNewPassword"
          type={showNewPasswords ? 'text' : 'password'}
          autoComplete="new-password"
          maxLength={PASSWORD_MAX_LENGTH}
          required
          aria-invalid={fieldErrors.confirmNewPassword !== undefined}
          aria-describedby={
            fieldErrors.confirmNewPassword === undefined
              ? undefined
              : 'confirm-new-password-errors'
          }
          value={confirmNewPassword}
          onChange={(event) => {
            setConfirmNewPassword(event.target.value)
            clearFieldError('confirmNewPassword')
          }}
        />
        <FieldErrors
          errors={fieldErrors.confirmNewPassword}
          id="confirm-new-password-errors"
        />
      </div>

      <div className="password-guidance">
        <p>Password requirements</p>
        <ul id="change-password-requirements" aria-live="polite">
          {requirements.map((requirement) => (
            <li
              className={requirement.satisfied ? 'requirement requirement--satisfied' : 'requirement'}
              key={requirement.id}
            >
              <span aria-hidden="true">{requirement.satisfied ? '✓' : '○'}</span>{' '}
              {requirement.label}
            </li>
          ))}
        </ul>
      </div>

      {formError !== null && <p className="form-error" role="alert">{formError}</p>}
      {success !== null && <p className="form-success" role="status">{success}</p>}

      <button type="submit" disabled={submitting}>
        {submitting ? 'Updating password…' : 'Update password'}
      </button>
      <p className="meta-copy">
        Your current session stays active. Other signed-in sessions are revoked.
      </p>
    </form>
  )
}
