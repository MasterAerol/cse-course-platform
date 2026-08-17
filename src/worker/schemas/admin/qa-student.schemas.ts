import { z } from 'zod'

import { emailSchema, registrationPasswordSchema } from '../auth.schemas'

export const qaStudentModeSchema = z.enum(['unlocked', 'fresh'])

export const inspectQaStudentSchema = z
  .object({
    email: emailSchema,
  })
  .strict()

export const configureQaStudentSchema = z
  .object({
    email: emailSchema,
    password: registrationPasswordSchema,
    mode: qaStudentModeSchema,
    confirmation: z.literal('configure-cse-qa-student'),
    confirmNonQaEmail: z.boolean().default(false),
  })
  .strict()

export type QaStudentMode = z.infer<typeof qaStudentModeSchema>
export type ConfigureQaStudentInput = z.infer<
  typeof configureQaStudentSchema
>
