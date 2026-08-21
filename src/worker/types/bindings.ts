export type RuntimeEnvironment = 'development' | 'production'
export type RegistrationMode = 'open' | 'closed'

type SecurityBindingName =
  | 'ENVIRONMENT'
  | 'REGISTRATION_MODE'
  | 'GOOGLE_CLIENT_ID'
  | 'PAYMENT_RECEIPTS'
  | 'LOGIN_IP_RATE_LIMITER'
  | 'LOGIN_ACCOUNT_RATE_LIMITER'
  | 'REGISTRATION_RATE_LIMITER'
  | 'ATTEMPT_RATE_LIMITER'
  | 'AUTOSAVE_RATE_LIMITER'
  | 'ADMIN_RATE_LIMITER'

export type Bindings = Omit<Cloudflare.Env, SecurityBindingName> & {
  ENVIRONMENT: RuntimeEnvironment
  REGISTRATION_MODE?: string
  GOOGLE_CLIENT_ID?: string
  PAYMENT_RECEIPTS?: R2Bucket
  LOGIN_IP_RATE_LIMITER?: RateLimit
  LOGIN_ACCOUNT_RATE_LIMITER?: RateLimit
  REGISTRATION_RATE_LIMITER?: RateLimit
  ATTEMPT_RATE_LIMITER?: RateLimit
  AUTOSAVE_RATE_LIMITER?: RateLimit
  ADMIN_RATE_LIMITER?: RateLimit
}
