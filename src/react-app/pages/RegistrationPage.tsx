import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuth } from '../auth/use-auth'
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
  const { register, registrationMode } = useAuth()
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] =
    useState<ValidationFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  const passwordRequirements = [
    {
      id: 'password-length',
      label: '12 to 128 characters',
      satisfied: password.length >= 12 && password.length <= 128,
    },
    {
      id: 'password-uppercase',
      label: 'At least one uppercase letter',
      satisfied: /[A-Z]/u.test(password),
    },
    {
      id: 'password-lowercase',
      label: 'At least one lowercase letter',
      satisfied: /[a-z]/u.test(password),
    },
    {
      id: 'password-number',
      label: 'At least one number',
      satisfied: /[0-9]/u.test(password),
    },
  ]

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
      await register({ firstName, lastName, email, password })
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

  if (registrationMode !== 'open') {
    return (
      <main className="auth-page">
        <section className="auth-card" aria-labelledby="registration-title">
          <Link className="brand-link" to="/">
            CSE Course Platform
          </Link>
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
      <section className="auth-card" aria-labelledby="registration-title">
        <Link className="brand-link" to="/">
          CSE Course Platform
        </Link>
        <p className="eyebrow">Student registration</p>
        <h1 id="registration-title">Create your account</h1>
        <p>
          Enter your details below. Your email is normalized automatically.
        </p>

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
              minLength={12}
              maxLength={128}
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
              aria-label={showPassword ? 'Hide password' : 'Show password'}
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
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </section>
    </main>
  )
}
