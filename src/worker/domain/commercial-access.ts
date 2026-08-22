export const COMMERCIAL_SETTING_KEYS = [
  'public_signup',
  'show_pricing',
  'public_checkout',
  'premium_access_enforcement',
] as const

export type CommercialSettingKey = (typeof COMMERCIAL_SETTING_KEYS)[number]

export interface CommercialSettings {
  publicSignup: boolean
  showPricing: boolean
  publicCheckout: boolean
  premiumAccessEnforcement: boolean
}

export const DEFAULT_COMMERCIAL_SETTINGS: CommercialSettings = {
  publicSignup: false,
  showPricing: false,
  publicCheckout: false,
  premiumAccessEnforcement: false,
}
export const FREE_PREVIEW_LESSON_COUNT = 3
export const TESTER_PROGRAM_CAPACITY = 20

export const PREMIUM_LOCK_COPY = {
  badge: 'Premium',
  title: 'PasaWise Premium',
  message: 'Unlock the complete PasaWise experience.',
} as const

export const PREMIUM_FEATURE_SUMMARY =
  'Unlock complete access to lessons, assessments, Smart Recovery, Readiness Score, and Full Mock.'


export type CommercialAccessType = 'FREE' | 'PREMIUM' | 'TESTER' | 'EXPIRED'

export const COMMERCIAL_FEATURES = [
  'full_curriculum',
  'premium_practice',
  'subject_assessments',
  'smart_analysis',
  'smart_recovery',
  'mistake_notebook',
  'readiness_score',
  'full_mock',
] as const

export type CommercialFeature = (typeof COMMERCIAL_FEATURES)[number]

export interface CommercialEntitlementSnapshot {
  accessType: 'PREMIUM' | 'TESTER'
  status: 'active' | 'expired' | 'revoked' | 'refunded'
  startsAt: string
  expiresAt: string
  planSlug: string
  source: 'tester' | 'admin' | 'payment'
}

export interface CommercialAccessDecision {
  accessType: CommercialAccessType
  commerciallyActive: boolean
  enforcementEnabled: boolean
  entitlement: CommercialEntitlementSnapshot | null
  features: Record<CommercialFeature, boolean>
}

function isEntitlementActive(
  entitlement: CommercialEntitlementSnapshot,
  now: Date,
): boolean {
  const startsAt = Date.parse(entitlement.startsAt)
  const expiresAt = Date.parse(entitlement.expiresAt)
  return (
    entitlement.status === 'active' &&
    Number.isFinite(startsAt) &&
    Number.isFinite(expiresAt) &&
    startsAt <= now.getTime() &&
    now.getTime() < expiresAt
  )
}

export function evaluateCommercialAccess(input: {
  entitlement: CommercialEntitlementSnapshot | null
  enforcementEnabled: boolean
  now?: Date
}): CommercialAccessDecision {
  const now = input.now ?? new Date()
  const commerciallyActive =
    input.entitlement !== null && isEntitlementActive(input.entitlement, now)
  const accessType: CommercialAccessType = commerciallyActive
    ? input.entitlement?.accessType ?? 'FREE'
    : input.entitlement === null
      ? 'FREE'
      : 'EXPIRED'
  const allowed = !input.enforcementEnabled || commerciallyActive

  return {
    accessType,
    commerciallyActive,
    enforcementEnabled: input.enforcementEnabled,
    entitlement: input.entitlement,
    features: Object.fromEntries(
      COMMERCIAL_FEATURES.map((feature) => [feature, allowed]),
    ) as Record<CommercialFeature, boolean>,
  }
}

export function commercialSettingKeyToProperty(
  key: CommercialSettingKey,
): keyof CommercialSettings {
  const properties: Record<CommercialSettingKey, keyof CommercialSettings> = {
    public_signup: 'publicSignup',
    show_pricing: 'showPricing',
    public_checkout: 'publicCheckout',
    premium_access_enforcement: 'premiumAccessEnforcement',
  }
  return properties[key]
}

export function normalizePaymentReference(reference: string): string {
  return reference
    .normalize('NFKC')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/gu, '')
}

const PAYMENT_ID_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'

export function createPaymentRequestPublicId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  const suffix = Array.from(
    bytes,
    (byte) => PAYMENT_ID_ALPHABET[byte % PAYMENT_ID_ALPHABET.length],
  ).join('')
  return `PW-${suffix}`
}

export type PaymentState =
  | 'awaiting_payment'
  | 'proof_submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'refunded'

const PAYMENT_TRANSITIONS: Readonly<Record<PaymentState, readonly PaymentState[]>> = {
  awaiting_payment: ['proof_submitted', 'cancelled'],
  proof_submitted: ['under_review', 'approved', 'rejected'],
  under_review: ['approved', 'rejected'],
  approved: ['refunded'],
  rejected: [],
  cancelled: [],
  refunded: [],
}

export function canTransitionPayment(
  from: PaymentState,
  to: PaymentState,
): boolean {
  return from === to || PAYMENT_TRANSITIONS[from].includes(to)
}

export function addUtcDays(start: Date, days: number): Date {
  return new Date(start.getTime() + days * 24 * 60 * 60 * 1000)
}

export const ONLINE_WINDOW_MINUTES = 5
export const ACTIVITY_WRITE_THROTTLE_MINUTES = 2
