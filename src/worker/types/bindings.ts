import type { EmailProviderFetch } from '../services/transactional-email.service'

export type RuntimeEnvironment = 'development' | 'production'
export type RegistrationMode = 'open' | 'closed'

type SecurityBindingName =
  | 'ENVIRONMENT'
  | 'REGISTRATION_MODE'
  | 'GOOGLE_CLIENT_ID'
  | 'EMAIL_VERIFICATION_SECRET'
  | 'RESEND_API_KEY'
  | 'PAYMENT_RECEIPTS'
  | 'LOGIN_IP_RATE_LIMITER'
  | 'LOGIN_ACCOUNT_RATE_LIMITER'
  | 'REGISTRATION_RATE_LIMITER'
  | 'EMAIL_VERIFICATION_IP_RATE_LIMITER'
  | 'EMAIL_VERIFICATION_ACCOUNT_RATE_LIMITER'
  | 'ATTEMPT_RATE_LIMITER'
  | 'AUTOSAVE_RATE_LIMITER'
  | 'ADMIN_RATE_LIMITER'

export type Bindings = Omit<Cloudflare.Env, SecurityBindingName> & {
  ENVIRONMENT: RuntimeEnvironment
  REGISTRATION_MODE?: string
  GOOGLE_CLIENT_ID?: string
  EMAIL_VERIFICATION_SECRET?: string
  RESEND_API_KEY?: string
  EMAIL_PROVIDER_FETCH?: EmailProviderFetch
  PAYMENT_RECEIPTS?: R2Bucket
  LOGIN_IP_RATE_LIMITER?: RateLimit
  LOGIN_ACCOUNT_RATE_LIMITER?: RateLimit
  REGISTRATION_RATE_LIMITER?: RateLimit
  EMAIL_VERIFICATION_IP_RATE_LIMITER?: RateLimit
  EMAIL_VERIFICATION_ACCOUNT_RATE_LIMITER?: RateLimit
  ATTEMPT_RATE_LIMITER?: RateLimit
  AUTOSAVE_RATE_LIMITER?: RateLimit
  ADMIN_RATE_LIMITER?: RateLimit
}
