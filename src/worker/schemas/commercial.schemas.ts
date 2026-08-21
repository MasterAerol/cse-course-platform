import { z } from 'zod'

import { COMMERCIAL_SETTING_KEYS } from '../domain/commercial-access'

export const paymentRequestParamsSchema = z.object({
  paymentRequestId: z
    .string()
    .regex(/^PW-[23456789A-HJ-NP-Z]{6}$/u, 'Invalid payment request ID.'),
})

export const paymentMethodParamsSchema = z.object({
  paymentMethodId: z.string().uuid(),
})

export const createPaymentRequestSchema = z
  .object({
    planSlug: z.string().trim().min(1).max(80),
  })
  .strict()

export const paymentProofInputSchema = z
  .object({
    paymentMethodId: z.string().uuid(),
    transactionReference: z.string().trim().min(6).max(100),
    payerName: z.string().trim().max(160).optional(),
    senderLastDigits: z
      .string()
      .trim()
      .regex(/^\d{2,8}$/u, 'Use 2 to 8 ending digits.')
      .optional(),
    paymentOccurredAt: z.iso.datetime({ offset: true }),
    learnerNote: z.string().trim().max(500).optional(),
  })
  .strict()

export const commercialSettingsUpdateSchema = z
  .object({
    publicSignup: z.boolean(),
    showPricing: z.boolean(),
    publicCheckout: z.boolean(),
    premiumAccessEnforcement: z.boolean(),
    confirmation: z.literal('confirm-commercial-settings-change'),
  })
  .strict()

export const commercialSettingKeySchema = z.enum(COMMERCIAL_SETTING_KEYS)

export const commercialPaymentListQuerySchema = z.object({
  status: z
    .enum([
      'proof_submitted',
      'under_review',
      'approved',
      'rejected',
      'refunded',
    ])
    .optional(),
})

export const paymentDecisionSchema = z
  .object({
    confirmation: z.literal('confirm-payment-decision'),
    rejectionReason: z
      .enum([
        'transaction_not_found',
        'reference_mismatch',
        'incorrect_amount',
        'duplicate_transaction',
        'unreadable_proof',
        'other',
      ])
      .optional(),
    note: z.string().trim().max(500).optional(),
  })
  .strict()

export const adminLearnerListQuerySchema = z.object({
  query: z.string().trim().max(120).optional(),
  access: z.enum(['FREE', 'PREMIUM', 'TESTER', 'EXPIRED']).optional(),
})

export const adminLearnerParamsSchema = z.object({
  learnerId: z.string().uuid(),
})

export const adminGrantAccessSchema = z
  .object({
    planSlug: z.enum([
      'tester-premium',
      'founding-learner',
      'regular-monthly',
    ]),
    durationDays: z.number().int().min(1).max(366).optional(),
    confirmation: z.literal('confirm-access-grant'),
  })
  .strict()

export const adminExtendAccessSchema = z
  .object({
    additionalDays: z.number().int().min(1).max(366),
    confirmation: z.literal('confirm-access-extension'),
  })
  .strict()

export const adminRevokeAccessSchema = z
  .object({
    confirmation: z.literal('confirm-access-revocation'),
    reason: z.string().trim().min(1).max(300),
  })
  .strict()

export const paymentMethodUpsertSchema = z
  .object({
    publicId: z.string().uuid().optional(),
    slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u).max(80),
    displayName: z.string().trim().min(1).max(100),
    accountDisplayName: z.string().trim().max(160).nullable().optional(),
    maskedAccountInfo: z.string().trim().max(160).nullable().optional(),
    instructions: z.string().trim().min(1).max(1000),
    enabled: z.boolean(),
    position: z.number().int().min(1).max(100),
  })
  .strict()

export type PaymentProofInput = z.infer<typeof paymentProofInputSchema>
export type CommercialSettingsUpdateInput = z.infer<
  typeof commercialSettingsUpdateSchema
>
export type PaymentDecisionInput = z.infer<typeof paymentDecisionSchema>
export type AdminGrantAccessInput = z.infer<typeof adminGrantAccessSchema>
export type AdminExtendAccessInput = z.infer<typeof adminExtendAccessSchema>
export type AdminRevokeAccessInput = z.infer<typeof adminRevokeAccessSchema>
export type PaymentMethodUpsertInput = z.infer<typeof paymentMethodUpsertSchema>
