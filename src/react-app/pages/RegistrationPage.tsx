import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'

import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_REQUIREMENTS,
} from '../../shared/password-policy'
import { useAuth } from '../auth/use-auth'
import { PublicAuthShell } from '../components/PublicAuthShell'
import { GoogleIdentityButton } from '../components/GoogleIdentityButton'
import {
  ApiClientError,
  type ValidationFieldErrors,
} from '../lib/api'

interface FieldErrorListProps {
  errors: string[] | undefined
  id: string
}

function FieldErrorList({ errors, id }: FieldErrorListProps) {
  if (errors === undefined || errors.length === 0) {
    return null
  }

  return (
    <ul className="field-errors" id={id}>
      {errors.map((message) => (
        <li key={message}>{message}</li>
      ))}
    </ul>
  )
}

export function RegistrationPage() {
  const { continueWithGoogle, googleClientId, register, registrationMode } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] =
    useState<ValidationFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  const passwordRequirements = PASSWORD_REQUIREMENTS.map((requirement) => ({
    ...requirement,
    satisfied: requirement.test(password),
  }))

  function clearFieldError(field: keyof ValidationFieldErrors): void {
    setFieldErrors((currentErrors) => {
      if (currentErrors[field] === undefined) {
        return currentErrors
      }

      const nextErrors = { ...currentErrors }
      delete nextErrors[field]
      return nextErrors
    })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setFieldErrors({})
    setFormError(null)

    try {
      const verification = await register({
        fullName,
        email,
        password,
        confirmPassword,
      })
      await navigate(`/verify-email?registration=${verification.registrationId}`, {
        state: { verification },
      })
    } catch (registrationError: unknown) {
      if (
        registrationError instanceof ApiClientError &&
        registrationError.code === 'VALIDATION_ERROR'
      ) {
        setFieldErrors(registrationError.fieldErrors)
      } else {
        setFormError(
          registrationError instanceof Error
            ? registrationError.message
            : 'Registration could not be completed.',
        )
      }
    } finally {
      setSubmitting(false)
    }
  }
  async function handleGoogleCredential(credential: string): Promise<void> {
    setFormError(null)
    try {
      await continueWithGoogle({ credential })
      await navigate('/dashboard', { replace: true })
    } catch (googleError: unknown) {
      setFormError(
        googleError instanceof Error
          ? googleError.message
          : 'Google registration could not be completed.',
      )
      throw googleError
    }
  }

  if (registrationMode !== 'open') {
    return (
      <PublicAuthShell labelledBy="registration-title">
          <h1 id="registration-title">Registration is currently closed</h1>
          <p>PasaWise is not accepting new learner accounts right now.</p>
          <Link className="button-link" to="/login">
            Back to login
          </Link>
      </PublicAuthShell>
    )
  }

  return (
    <PublicAuthShell labelledBy="registration-title">
        <h1 id="registration-title">Create your account</h1>
        <p>Start preparing smarter for the Civil Service Exam.</p>
        {googleClientId !== null && (
          <>
            <GoogleIdentityButton
              clientId={googleClientId}
              context="signup"
              onCredential={handleGoogleCredential}
            />
            <div className="auth-divider" role="separator"><span>or sign up with email</span></div>
          </>
        )}

        <form
          noValidate
          onSubmit={(event) => void handleSubmit(event)}
        >
          <label htmlFor="full-name">Full name</label>
          <input
            id="full-name"
            name="fullName"
            autoComplete="name"
            maxLength={160}
            required
            aria-invalid={fieldErrors.fullName !== undefined}
            aria-describedby={
              fieldErrors.fullName === undefined
                ? undefined
                : 'full-name-errors'
            }
            value={fullName}
            onChange={(event) => {
              setFullName(event.target.value)
              clearFieldError('fullName')
            }}
          />
          <FieldErrorList
            errors={fieldErrors.fullName}
            id="full-name-errors"
          />

          <label htmlFor="registration-email">Email address</label>
          <input
            id="registration-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            maxLength={254}
            required
            aria-invalid={fieldErrors.email !== undefined}
            aria-describedby={
              fieldErrors.email === undefined
                ? undefined
                : 'registration-email-errors'
            }
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              clearFieldError('email')
            }}
          />
          <FieldErrorList
            errors={fieldErrors.email}
            id="registration-email-errors"
          />

          <label htmlFor="registration-password">Password</label>
          <div className="password-input-group">
            <input
              id="registration-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={PASSWORD_MAX_LENGTH}
              required
              aria-invalid={fieldErrors.password !== undefined}
              aria-describedby={[
                'password-requirements',
                fieldErrors.password === undefined
                  ? null
                  : 'registration-password-errors',
              ]
                .filter((value) => value !== null)
                .join(' ')}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                clearFieldError('password')
              }}
            />
            <button
              className="password-toggle"
              type="button"
              aria-label={showPassword ? 'Hide passwords' : 'Show passwords'}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <FieldErrorList
            errors={fieldErrors.password}
            id="registration-password-errors"
          />

          <label htmlFor="registration-confirm-password">Confirm password</label>
          <input
            id="registration-confirm-password"
            name="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            maxLength={PASSWORD_MAX_LENGTH}
            required
            aria-invalid={fieldErrors.confirmPassword !== undefined}
            aria-describedby={
              fieldErrors.confirmPassword === undefined
                ? undefined
                : 'registration-confirm-password-errors'
            }
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value)
              clearFieldError('confirmPassword')
            }}
          />
          <FieldErrorList
            errors={fieldErrors.confirmPassword}
            id="registration-confirm-password-errors"
          />

          <div className="password-guidance">
            <p>Password requirements</p>
            <ul id="password-requirements" aria-live="polite">
              {passwordRequirements.map((requirement) => (
                <li
                  className={
                    requirement.satisfied
                      ? 'requirement requirement--satisfied'
                      : 'requirement'
                  }
                  key={requirement.id}
                >
                  <span aria-hidden="true">
                    {requirement.satisfied ? '✓' : '○'}
                  </span>{' '}
                  {requirement.label}
                </li>
              ))}
            </ul>
          </div>

          {formError !== null && (
            <p className="form-error" role="alert">
              {formError}
            </p>
          )}

          <button type="submit" disabled={submitting}>
            {submitting ? 'Sending verification code…' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
    </PublicAuthShell>
  )
}
