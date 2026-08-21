import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'

import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_REQUIREMENTS,
} from '../../shared/password-policy'
import { useAuth } from '../auth/use-auth'
import { PasaWiseBrand } from '../components/PasaWiseBrand'
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
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
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
      await register({ firstName, lastName, email, password, confirmPassword })
      await navigate('/dashboard', { replace: true })
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
      <main className="auth-page">
        <section className="auth-card" aria-labelledby="registration-title">
          <PasaWiseBrand linked variant="primary" />
          <p className="brand-tagline">Aral nang wais. Pasa nang handa.</p>
          <p className="eyebrow">Private beta</p>
          <h1 id="registration-title">Registration is currently closed</h1>
          <p>
            Accounts are created for approved private-beta learners by an
            administrator. If you already have an account, sign in below.
          </p>
          <Link className="button-link" to="/login">
            Sign in
          </Link>
        </section>
      </main>
    )
  }

  return (
    <main className="auth-page">
      <div className="auth-experience registration-experience">
        <section className="auth-story" aria-labelledby="registration-story-title">
          <PasaWiseBrand linked variant="primary" />
          <p className="eyebrow">Aral nang wais. Pasa nang handa.</p>
          <h1 id="registration-story-title">Start with a clear CSE study path.</h1>
          <p>Your learner account includes the full CSE Professional curriculum, guided practice, Smart Recovery, and readiness evidence.</p>
          <ul>
            <li><span aria-hidden="true">✓</span> Fresh learner progress</li>
            <li><span aria-hidden="true">✓</span> Normal curriculum prerequisites</li>
            <li><span aria-hidden="true">✓</span> Secure personal account</li>
          </ul>
        </section>
        <section className="auth-card" aria-labelledby="registration-title">
        <p className="eyebrow">Student registration</p>
        <h1 id="registration-title">Create your account</h1>
        <p>Register as a learner and continue directly to your dashboard.</p>
        {googleClientId !== null && (
          <>
            <GoogleIdentityButton
              clientId={googleClientId}
              context="signup"
              onCredential={handleGoogleCredential}
            />
            <div className="auth-divider" role="separator"><span>or</span></div>
          </>
        )}

        <form
          noValidate
          onSubmit={(event) => void handleSubmit(event)}
        >
          <div className="field-grid">
            <div>
              <label htmlFor="first-name">First name</label>
              <input
                id="first-name"
                name="firstName"
                autoComplete="given-name"
                maxLength={80}
                required
                aria-invalid={fieldErrors.firstName !== undefined}
                aria-describedby={
                  fieldErrors.firstName === undefined
                    ? undefined
                    : 'first-name-errors'
                }
                value={firstName}
                onChange={(event) => {
                  setFirstName(event.target.value)
                  clearFieldError('firstName')
                }}
              />
              <FieldErrorList
                errors={fieldErrors.firstName}
                id="first-name-errors"
              />
            </div>
            <div>
              <label htmlFor="last-name">Last name</label>
              <input
                id="last-name"
                name="lastName"
                autoComplete="family-name"
                maxLength={80}
                required
                aria-invalid={fieldErrors.lastName !== undefined}
                aria-describedby={
                  fieldErrors.lastName === undefined
                    ? undefined
                    : 'last-name-errors'
                }
                value={lastName}
                onChange={(event) => {
                  setLastName(event.target.value)
                  clearFieldError('lastName')
                }}
              />
              <FieldErrorList
                errors={fieldErrors.lastName}
                id="last-name-errors"
              />
            </div>
          </div>

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
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
        </section>
      </div>
    </main>
  )
}
