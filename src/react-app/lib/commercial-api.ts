import { z } from 'zod'

import { request } from './api'

const accessTypeSchema = z.enum(['FREE', 'PREMIUM', 'TESTER', 'EXPIRED'])
const featureSchema = z.object({
  full_curriculum: z.boolean(),
  premium_practice: z.boolean(),
  subject_assessments: z.boolean(),
  smart_analysis: z.boolean(),
  smart_recovery: z.boolean(),
  mistake_notebook: z.boolean(),
  readiness_score: z.boolean(),
  full_mock: z.boolean(),
})
const accessSchema = z.object({
  accessType: accessTypeSchema,
  commerciallyActive: z.boolean(),
  enforcementEnabled: z.boolean(),
  entitlement: z
    .object({
      accessType: z.enum(['PREMIUM', 'TESTER']),
      status: z.enum(['active', 'expired', 'revoked', 'refunded']),
      startsAt: z.string(),
      expiresAt: z.string(),
      planSlug: z.string(),
      source: z.enum(['tester', 'admin', 'payment']),
    })
    .nullable(),
  features: featureSchema,
})
const planSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  currency: z.literal('PHP'),
  priceMinor: z.number().int().nonnegative(),
  durationType: z.enum(['fixed_days', 'manual']),
  durationDays: z.number().int().positive().nullable(),
  accessType: z.enum(['PREMIUM', 'TESTER']),
  active: z.boolean(),
  publicVisible: z.boolean(),
  checkoutEnabled: z.boolean(),
  countsAsRevenue: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
const paymentMethodSchema = z.object({
  id: z.string(),
  slug: z.string(),
  displayName: z.string(),
  accountDisplayName: z.string().nullable(),
  maskedAccountInfo: z.string().nullable(),
  instructions: z.string(),
  hasQr: z.boolean(),
  enabled: z.boolean(),
  position: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
const paymentStateSchema = z.enum([
  'awaiting_payment',
  'proof_submitted',
  'under_review',
  'approved',
  'rejected',
  'cancelled',
  'refunded',
])
const paymentRequestSchema = z.object({
  id: z.string(),
  learner: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    currentAccess: accessTypeSchema,
  }),
  plan: z.object({
    slug: z.string(),
    name: z.string(),
    accessType: z.enum(['PREMIUM', 'TESTER']),
  }),
  expectedAmountMinor: z.number().int().nonnegative(),
  currency: z.literal('PHP'),
  status: paymentStateSchema,
  createdAt: z.string(),
  proofSubmittedAt: z.string().nullable(),
  approvedAt: z.string().nullable(),
  rejectedAt: z.string().nullable(),
  refundedAt: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  rejectionNote: z.string().nullable(),
  proof: z
    .object({
      paymentMethodId: z.string(),
      paymentMethod: z.string(),
      transactionReference: z.string(),
      payerName: z.string().nullable(),
      senderLastDigits: z.string().nullable(),
      paymentOccurredAt: z.string(),
      learnerNote: z.string().nullable(),
      submittedAt: z.string(),
      receiptAvailable: z.boolean(),
      receiptSizeBytes: z.number().int().positive(),
    })
    .nullable(),
  duplicateReferenceWarning: z.boolean(),
})
const success = <T extends z.ZodTypeAny>(data: T) =>
  z.object({ success: z.literal(true), data })

const settingsSchema = z.object({
  publicSignup: z.boolean(),
  showPricing: z.boolean(),
  publicCheckout: z.boolean(),
  premiumAccessEnforcement: z.boolean(),
})
const adminSettingsSchema = z.object({
  settings: settingsSchema,
  controls: z.array(
    z.object({
      setting_key: z.string(),
      enabled: z.union([z.literal(0), z.literal(1)]),
      description: z.string(),
      updated_at: z.string(),
    }),
  ),
  plans: z.array(planSchema),
  paymentMethods: z.array(paymentMethodSchema),
})
const learnerSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  accountStatus: z.enum(['active', 'suspended']),
  registeredAt: z.string(),
  lastActiveAt: z.string().nullable(),
  online: z.boolean(),
  currentAccess: accessTypeSchema,
  accessExpiresAt: z.string().nullable(),
  enrollmentStatus: z.string().nullable(),
  enrollmentExpiresAt: z.string().nullable(),
  courseProgressPercent: z.number(),
})
const learnerDetailSchema = z.object({
  learner: learnerSummarySchema,
  access: z.object({
    planSlug: z.string().nullable(),
    planName: z.string().nullable(),
    source: z.string().nullable(),
    startsAt: z.string().nullable(),
    expiresAt: z.string().nullable(),
    status: accessTypeSchema,
  }),
  payments: z.array(paymentRequestSchema),
})
const businessSchema = z.object({
  students: z.object({
    totalRegistered: z.number(),
    newToday: z.number(),
    newThisWeek: z.number(),
    newThisMonth: z.number(),
  }),
  online: z.object({ onlineNow: z.number(), definitionMinutes: z.literal(5) }),
  access: z.object({
    activePremium: z.number(),
    testerAccounts: z.number(),
    freeLearners: z.number(),
    expiringSoon: z.number(),
    expired: z.number(),
  }),
  payments: z.object({
    pendingVerification: z.number(),
    approved: z.number(),
    rejected: z.number(),
    refunded: z.number(),
  }),
  revenue: z.object({
    currency: z.literal('PHP'),
    todayMinor: z.number().int(),
    thisWeekMinor: z.number().int(),
    thisMonthMinor: z.number().int(),
    allTimeMinor: z.number().int(),
    paidCustomers: z.number(),
    approvedPaidTransactions: z.number(),
  }),
})

export type CommercialAccess = z.infer<typeof accessSchema>
export type CommercialPlan = z.infer<typeof planSchema>
export type PaymentMethod = z.infer<typeof paymentMethodSchema>
export type CommercialPaymentRequest = z.infer<typeof paymentRequestSchema>
export type CommercialSettings = z.infer<typeof settingsSchema>
export type AdminCommercialSettings = z.infer<typeof adminSettingsSchema>
export type AdminLearnerSummary = z.infer<typeof learnerSummarySchema>
export type AdminLearnerDetail = z.infer<typeof learnerDetailSchema>
export type BusinessOverview = z.infer<typeof businessSchema>

export async function fetchCommercialAccess(signal?: AbortSignal) {
  return (
    await request('/api/student/commercial/access', success(accessSchema), {
      signal,
    })
  ).data
}

export async function fetchLearnerPlans(signal?: AbortSignal) {
  return (
    await request(
      '/api/student/commercial/plans',
      success(
        z.object({
          checkoutEnabled: z.boolean(),
          showPricing: z.boolean(),
          plans: z.array(planSchema),
        }),
      ),
      { signal },
    )
  ).data
}

export async function fetchPaymentMethods(signal?: AbortSignal) {
  return (
    await request(
      '/api/student/commercial/payment-methods',
      success(z.array(paymentMethodSchema)),
      { signal },
    )
  ).data
}

export async function fetchLearnerPaymentRequests(signal?: AbortSignal) {
  return (
    await request(
      '/api/student/commercial/payment-requests',
      success(z.array(paymentRequestSchema)),
      { signal },
    )
  ).data
}

export async function createLearnerPaymentRequest(planSlug: string) {
  return (
    await request(
      '/api/student/commercial/payment-requests',
      success(paymentRequestSchema),
      { method: 'POST', body: JSON.stringify({ planSlug }) },
    )
  ).data
}

export async function submitLearnerPaymentProof(
  paymentRequestId: string,
  input: {
    paymentMethodId: string
    transactionReference: string
    payerName?: string
    senderLastDigits?: string
    paymentOccurredAt: string
    learnerNote?: string
    receipt: File
  },
) {
  const form = new FormData()
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) form.set(key, value)
  }
  return (
    await request(
      `/api/student/commercial/payment-requests/${encodeURIComponent(paymentRequestId)}/proof`,
      success(paymentRequestSchema),
      { method: 'POST', body: form },
    )
  ).data
}

export async function fetchAdminCommercialSettings(signal?: AbortSignal) {
  return (
    await request(
      '/api/admin/commercial/settings',
      success(adminSettingsSchema),
      { signal },
    )
  ).data
}

export async function saveAdminCommercialSettings(
  settings: CommercialSettings,
) {
  return (
    await request(
      '/api/admin/commercial/settings',
      success(z.object({ settings: settingsSchema, controls: z.array(z.unknown()) })),
      {
        method: 'PATCH',
        body: JSON.stringify({
          ...settings,
          confirmation: 'confirm-commercial-settings-change',
        }),
      },
    )
  ).data
}

export async function saveAdminPaymentMethod(input: {
  publicId?: string
  slug: string
  displayName: string
  accountDisplayName?: string
  maskedAccountInfo?: string
  instructions: string
  enabled: boolean
  position: number
}) {
  return (
    await request(
      '/api/admin/commercial/payment-methods',
      success(paymentMethodSchema),
      { method: 'PUT', body: JSON.stringify(input) },
    )
  ).data
}

export async function uploadAdminPaymentMethodQr(
  paymentMethodId: string,
  file: File,
) {
  const form = new FormData()
  form.set('qr', file)
  return (
    await request(
      `/api/admin/commercial/payment-methods/${encodeURIComponent(paymentMethodId)}/qr`,
      success(paymentMethodSchema),
      { method: 'POST', body: form },
    )
  ).data
}

export async function fetchBusinessOverview(signal?: AbortSignal) {
  return (
    await request('/api/admin/commercial/business', success(businessSchema), {
      signal,
    })
  ).data
}

export async function fetchAdminLearners(
  filters: { query?: string; access?: string },
  signal?: AbortSignal,
) {
  const query = new URLSearchParams()
  if (filters.query) query.set('query', filters.query)
  if (filters.access) query.set('access', filters.access)
  return (
    await request(
      `/api/admin/commercial/learners?${query.toString()}`,
      success(z.array(learnerSummarySchema)),
      { signal },
    )
  ).data
}

export async function fetchAdminLearner(id: string, signal?: AbortSignal) {
  return (
    await request(
      `/api/admin/commercial/learners/${encodeURIComponent(id)}`,
      success(learnerDetailSchema),
      { signal },
    )
  ).data
}

async function learnerAction(
  id: string,
  action: 'grant' | 'extend' | 'revoke',
  body: Record<string, unknown>,
) {
  return (
    await request(
      `/api/admin/commercial/learners/${encodeURIComponent(id)}/${action}`,
      success(learnerDetailSchema),
      { method: 'POST', body: JSON.stringify(body) },
    )
  ).data
}

export function grantLearnerAccess(id: string, planSlug: string) {
  return learnerAction(id, 'grant', {
    planSlug,
    confirmation: 'confirm-access-grant',
  })
}

export function extendLearnerAccess(id: string, additionalDays: number) {
  return learnerAction(id, 'extend', {
    additionalDays,
    confirmation: 'confirm-access-extension',
  })
}

export function revokeLearnerAccess(id: string, reason: string) {
  return learnerAction(id, 'revoke', {
    reason,
    confirmation: 'confirm-access-revocation',
  })
}

export async function fetchAdminPayments(
  status?: string,
  signal?: AbortSignal,
) {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  return (
    await request(
      `/api/admin/commercial/payments${query}`,
      success(z.array(paymentRequestSchema)),
      { signal },
    )
  ).data
}

export async function decidePayment(
  id: string,
  action: 'review' | 'approve' | 'reject' | 'refund',
  options: { rejectionReason?: string; note?: string } = {},
) {
  const body =
    action === 'review'
      ? undefined
      : JSON.stringify({
          confirmation: 'confirm-payment-decision',
          ...options,
        })
  return (
    await request(
      `/api/admin/commercial/payments/${encodeURIComponent(id)}/${action}`,
      success(paymentRequestSchema),
      { method: 'POST', body },
    )
  ).data
}
