import { z } from 'zod'

export const smartRecoverySkillParamsSchema = z.object({
  skillSlug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
})
export const createSmartRecoveryAttemptSchema = z
  .object({
    idempotencyKey: z.string().uuid('Idempotency key must be a UUID.'),
  })
  .strict()

export const smartRecoveryAttemptParamsSchema = z
  .object({
    attemptPublicId: z.string().regex(
      /^recovery-attempt-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
      'Recovery attempt ID is invalid.',
    ),
  })
  .strict()

export const smartRecoveryAnswerParamsSchema = smartRecoveryAttemptParamsSchema
  .extend({
    snapshotPublicId: z.string().regex(
      /^recovery-question-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
      'Recovery question ID is invalid.',
    ),
  })
  .strict()

export const saveSmartRecoveryAnswerSchema = z
  .object({
    selectedChoicePublicId: z.string().regex(
      /^recovery-choice-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
      'Recovery choice ID is invalid.',
    ),
  })
  .strict()
