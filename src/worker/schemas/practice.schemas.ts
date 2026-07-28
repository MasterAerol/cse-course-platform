import { z } from 'zod'

export const practiceSetIdSchema = z
  .object({
    practiceSetId: z.coerce
      .number()
      .int('Practice set ID must be an integer.')
      .positive('Practice set ID must be positive.'),
  })
  .strict()

export const practiceAttemptPublicIdSchema = z
  .object({
    attemptPublicId: z
      .string()
      .trim()
      .min(1, 'Practice attempt ID is required.')
      .max(160, 'Practice attempt ID is too long.')
      .regex(
        /^practice-attempt-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
        'Practice attempt ID is invalid.',
      ),
  })
  .strict()

export const practiceAnswerParamsSchema =
  practiceAttemptPublicIdSchema
    .extend({
      questionId: z.coerce
        .number()
        .int('Question ID must be an integer.')
        .positive('Question ID must be positive.'),
    })
    .strict()

export const savePracticeAnswerSchema = z
  .object({
    selectedChoiceId: z
      .number()
      .int('Selected choice ID must be an integer.')
      .positive('Selected choice ID must be positive.'),
  })
  .strict()

export type PracticeSetIdInput = z.infer<typeof practiceSetIdSchema>
export type PracticeAttemptPublicIdInput = z.infer<
  typeof practiceAttemptPublicIdSchema
>
export type PracticeAnswerParamsInput = z.infer<
  typeof practiceAnswerParamsSchema
>
export type SavePracticeAnswerInput = z.infer<
  typeof savePracticeAnswerSchema
>
