import { z } from 'zod'

export const quizIdSchema = z
  .object({
    quizId: z.coerce
      .number({ error: 'Quiz id is required.' })
      .int('Quiz id must be an integer.')
      .positive('Quiz id must be positive.'),
  })
  .strict()

export const attemptPublicIdSchema = z
  .object({
    attemptPublicId: z
      .string({ error: 'Attempt id is required.' })
      .min(1, 'Attempt id is required.')
      .max(160, 'Attempt id must be 160 characters or fewer.')
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/u,
        'Attempt id must use lowercase letters, numbers, and hyphens.',
      ),
  })
  .strict()

export const answerParamsSchema = attemptPublicIdSchema
  .extend({
    questionId: z.coerce
      .number({ error: 'Question id is required.' })
      .int('Question id must be an integer.')
      .positive('Question id must be positive.'),
  })
  .strict()

export const saveAnswerSchema = z
  .object({
    selectedChoiceId: z
      .number({ error: 'Select an answer choice.' })
      .int('Selected choice id must be an integer.')
      .positive('Selected choice id must be positive.'),
  })
  .strict()

export type QuizIdInput = z.infer<typeof quizIdSchema>
export type AttemptPublicIdInput = z.infer<typeof attemptPublicIdSchema>
export type AnswerParamsInput = z.infer<typeof answerParamsSchema>
export type SaveAnswerInput = z.infer<typeof saveAnswerSchema>
