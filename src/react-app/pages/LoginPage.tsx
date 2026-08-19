import { useState, type FormEvent } from 'react'
import {
  Link,
  useLocation,
  useNavigate,
  type Location,
} from 'react-router'

import { useAuth } from '../auth/use-auth'
import { PasaWiseBrand } from '../components/PasaWiseBrand'

interface LoginLocationState {
  from?: string
  message?: string | null
}

function getLocationState(location: Location): LoginLocationState {
  if (typeof location.state !== 'object' || location.state === null) {
    return {}
  }

  const state = location.state as Record<string, unknown>

  return {
    from: typeof state.from === 'string' ? state.from : undefined,
    message: typeof state.message === 'string' ? state.message : null,
  }
}

export function LoginPage() {
  const { login, registrationMode } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = getLocationState(location)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(
    locationState.message ?? null,
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      await login({ email, password })
      await navigate(locationState.from ?? '/dashboard', { replace: true })
    } catch (loginError: unknown) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : 'Sign in could not be completed.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <PasaWiseBrand linked variant="primary" />
        <p className="brand-tagline">Aral nang wais. Pasa nang handa.</p>
        <p className="eyebrow">Welcome back</p>
        <h1 id="login-title">Sign in</h1>
        <p>Use the email and password associated with your account.</p>

        <form onSubmit={(event) => void handleSubmit(event)}>
          <label htmlFor="login-email">Email address</label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <label htmlFor="login-password">Password</label>
          <div className="password-input-group">
            <input
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              maxLength={128}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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

          {error !== null && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {registrationMode === 'open' ? (
          <p className="auth-switch">
            Need an account? <Link to="/register">Register as a student</Link>
          </p>
        ) : (
          <p className="auth-switch">
            Private-beta access is provided by an administrator.
          </p>
        )}
      </section>
    </main>
  )
}
