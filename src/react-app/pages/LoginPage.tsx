import { useState, type FormEvent } from 'react'
import {
  Link,
  useLocation,
  useNavigate,
  type Location,
} from 'react-router'

import { useAuth } from '../auth/use-auth'
import { GoogleIdentityButton } from '../components/GoogleIdentityButton'
import { PublicAuthShell } from '../components/PublicAuthShell'
import { ApiClientError } from '../lib/api'

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
  const { continueWithGoogle, googleClientId, login } = useAuth()
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
      if (
        loginError instanceof ApiClientError &&
        loginError.code === 'EMAIL_VERIFICATION_REQUIRED' &&
        loginError.verification !== null
      ) {
        const verification = loginError.verification
        await navigate(`/verify-email?registration=${verification.registrationId}`, { state: { verification } })
        return
      }
      setError(
        loginError instanceof Error
          ? loginError.message
          : 'Sign in could not be completed.',
      )
    } finally {
      setSubmitting(false)
    }
  }
  async function handleGoogleCredential(credential: string): Promise<void> {
    setError(null)
    try {
      await continueWithGoogle({ credential })
      await navigate(locationState.from ?? '/dashboard', { replace: true })
    } catch (googleError: unknown) {
      setError(
        googleError instanceof Error
          ? googleError.message
          : 'Google sign-in could not be completed.',
      )
      throw googleError
    }
  }

  return (
    <PublicAuthShell labelledBy="login-title">
        <h1 id="login-title">Welcome back</h1>
        <p>Continue your CSE preparation.</p>
        {googleClientId !== null && (
          <>
            <GoogleIdentityButton
              clientId={googleClientId}
              context="signin"
              onCredential={handleGoogleCredential}
            />
            <div className="auth-divider" role="separator"><span>or continue with email</span></div>
          </>
        )}

        <form onSubmit={(event) => void handleSubmit(event)} aria-busy={submitting}>
          <label htmlFor="login-email">Email address</label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            maxLength={254}
            required
            aria-invalid={error !== null}
            aria-describedby={error === null ? undefined : 'login-error'}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <label htmlFor="login-password">Password</label>
          <div className="password-input-group">
            <input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" maxLength={128} required aria-invalid={error !== null} aria-describedby={error === null ? undefined : 'login-error'} value={password} onChange={(event) => setPassword(event.target.value)} />
            <button className="password-toggle" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword((current) => !current)}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          {error !== null && <p className="form-error" id="login-error" role="alert">{error}</p>}

          <button type="submit" disabled={submitting}>
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="auth-switch">Don&apos;t have an account? <Link to="/register">Sign up</Link></p>
        <Link className="auth-home-link" to="/">Return to PasaWise home</Link>
    </PublicAuthShell>
  )
}
