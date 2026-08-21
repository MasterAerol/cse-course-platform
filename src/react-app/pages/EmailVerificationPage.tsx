import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'

import { useAuth } from '../auth/use-auth'
import { PublicAuthShell } from '../components/PublicAuthShell'
import { ApiClientError, type PendingRegistration } from '../lib/api'

interface VerificationLocationState {
  verification?: PendingRegistration
}

function getLocationVerification(value: unknown): PendingRegistration | null {
  if (typeof value !== 'object' || value === null) return null
  const verification = (value as VerificationLocationState).verification
  if (
    verification === undefined ||
    typeof verification.registrationId !== 'string' ||
    typeof verification.maskedEmail !== 'string' ||
    typeof verification.codeExpiresAt !== 'string' ||
    typeof verification.resendAvailableAt !== 'string'
  ) {
    return null
  }
  return verification
}

export function EmailVerificationPage() {
  const {
    registrationMode,
    resendRegistrationVerification,
    verifyRegistrationEmail,
  } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const locationVerification = getLocationVerification(location.state)
  const registrationId =
    locationVerification?.registrationId ??
    searchParams.get('registration') ??
    ''
  const [verification, setVerification] = useState<PendingRegistration | null>(
    locationVerification,
  )
  const [code, setCode] = useState('')
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 1_000)
    return () => window.clearInterval(interval)
  }, [])

  const resendAvailableAt = verification?.resendAvailableAt ?? null
  const resendSeconds = resendAvailableAt === null
    ? 0
    : Math.max(0, Math.ceil((Date.parse(resendAvailableAt) - nowMs) / 1_000))

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setMessage(null)
    setError(null)
    try {
      await verifyRegistrationEmail({ registrationId, code })
      await navigate('/dashboard', { replace: true })
    } catch (verificationError: unknown) {
      setError(
        verificationError instanceof Error
          ? verificationError.message
          : 'Email verification could not be completed.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResend(): Promise<void> {
    setResending(true)
    setMessage(null)
    setError(null)
    try {
      const updated = await resendRegistrationVerification({ registrationId })
      setVerification(updated)
      setCode('')
      setNowMs(Date.now())
      setMessage('A new verification code was sent. The previous code no longer works.')
    } catch (resendError: unknown) {
      if (
        resendError instanceof ApiClientError &&
        resendError.code === 'VERIFICATION_RESEND_TOO_SOON'
      ) {
        setError('Please wait for the resend timer, then try again.')
      } else {
        setError(
          resendError instanceof Error
            ? resendError.message
            : 'A new verification code could not be sent.',
        )
      }
    } finally {
      setResending(false)
    }
  }

  if (registrationMode !== 'open') {
    return (
      <PublicAuthShell labelledBy="verification-closed-title">
          <p className="eyebrow">Private beta</p>
          <h1 id="verification-closed-title">Registration is currently closed</h1>
          <p>Email verification cannot create a new public account while registration is closed.</p>
          <Link className="button-link" to="/login">Sign in</Link>
      </PublicAuthShell>
    )
  }

  if (registrationId.length === 0) {
    return (
      <PublicAuthShell labelledBy="verification-missing-title">
          <p className="eyebrow">Email verification</p>
          <h1 id="verification-missing-title">Start registration again</h1>
          <p>This verification request is missing or no longer available.</p>
          <Link className="button-link" to="/register">Create an account</Link>
      </PublicAuthShell>
    )
  }

  return (
    <PublicAuthShell labelledBy="verification-title" cardClassName="verification-card">
        <p className="eyebrow">Check your inbox</p>
        <h1 id="verification-title">Verify your email</h1>
        <p>We sent a 6-digit verification code to:</p>
        <p className="verification-email"><strong>{verification?.maskedEmail ?? 'your email address'}</strong></p>
        <p>The code expires in 10 minutes.</p>

        <form onSubmit={(event) => void handleVerify(event)}>
          <label htmlFor="verification-code">Verification code</label>
          <input
            id="verification-code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            minLength={6}
            maxLength={6}
            required
            aria-invalid={error !== null}
            aria-describedby={error === null ? undefined : 'verification-code-error'}
            value={code}
            onChange={(event) => {
              setCode(event.target.value.replace(/\D/gu, '').slice(0, 6))
              setError(null)
            }}
          />
          {message !== null && <p className="form-success" role="status">{message}</p>}
          {error !== null && <p className="form-error" id="verification-code-error" role="alert">{error}</p>}
          <button type="submit" disabled={submitting || code.length !== 6}>
            {submitting ? 'Verifying…' : 'Verify email'}
          </button>
        </form>

        <div className="verification-resend">
          <p>Didn&apos;t receive the code?</p>
          <button
            type="button"
            className="button-secondary"
            disabled={resending || resendSeconds > 0}
            onClick={() => void handleResend()}
          >
            {resending
              ? 'Sending…'
              : resendSeconds > 0
                ? `Resend in ${resendSeconds}s`
                : 'Resend code'}
          </button>
        </div>
        <Link className="auth-home-link" to="/login">Back to sign in</Link>
    </PublicAuthShell>
  )
}
