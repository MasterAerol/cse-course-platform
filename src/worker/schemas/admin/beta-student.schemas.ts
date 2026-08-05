import { z } from 'zod'

import {
  emailSchema,
  nameSchema,
  registrationPasswordSchema,
} from '../auth.schemas'

export const createBetaStudentSchema = z
  .object({
    firstName: nameSchema('First name'),
    lastName: nameSchema('Last name'),
    email: emailSchema,
    password: registrationPasswordSchema,
    confirmPassword: z
      .string({ error: 'Confirm the temporary password.' })
      .min(1, 'Confirm the temporary password.')
      .max(128, 'Password confirmation must contain at most 128 characters.'),
    enrollInCseProfessional: z.boolean().default(true),
  })
  .strict()
  .refine((input) => input.password === input.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Temporary passwords must match.',
  })

export type CreateBetaStudentInput = z.infer<typeof createBetaStudentSchema>
