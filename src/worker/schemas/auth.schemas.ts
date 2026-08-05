import { z } from 'zod'

export const emailSchema = z.preprocess(
  (value) =>
    typeof value === 'string'
      ? value.trim().toLowerCase()
      : value,
  z
    .string({ error: 'Enter an email address.' })
    .min(1, 'Enter an email address.')
    .max(254, 'Email must be 254 characters or fewer.')
    .email('Enter a valid email address.'),
)

export const registrationPasswordSchema = z
  .string({ error: 'Enter a password.' })
  .min(12, 'Password must contain at least 12 characters.')
  .max(128, 'Password must contain at most 128 characters.')
  .regex(/[a-z]/u, 'Password must include a lowercase letter.')
  .regex(/[A-Z]/u, 'Password must include an uppercase letter.')
  .regex(/[0-9]/u, 'Password must include a number.')

export function nameSchema(label: 'First name' | 'Last name') {
  return z
    .string({ error: `${label} is required.` })
    .trim()
    .min(1, `${label} is required.`)
    .max(80, `${label} must be 80 characters or fewer.`)
}

export const registrationSchema = z
  .object({
    email: emailSchema,
    password: registrationPasswordSchema,
    firstName: nameSchema('First name'),
    lastName: nameSchema('Last name'),
  })
  .strict()

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1).max(128),
  })
  .strict()

export type RegistrationInput = z.infer<typeof registrationSchema>
export type LoginInput = z.infer<typeof loginSchema>
