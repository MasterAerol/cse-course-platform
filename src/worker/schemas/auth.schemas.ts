import { z } from 'zod'

import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '../../shared/password-policy'

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
  .min(
    PASSWORD_MIN_LENGTH,
    `Password must contain at least ${PASSWORD_MIN_LENGTH} characters.`,
  )
  .max(
    PASSWORD_MAX_LENGTH,
    `Password must contain at most ${PASSWORD_MAX_LENGTH} characters.`,
  )
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

const registrationCredentialsSchema = z.object({
  email: emailSchema,
  password: registrationPasswordSchema,
  confirmPassword: z.string().max(PASSWORD_MAX_LENGTH).optional(),
})

const fullNameRegistrationSchema = registrationCredentialsSchema
  .extend({
    fullName: z
      .string({ error: 'Full name is required.' })
      .trim()
      .min(1, 'Full name is required.')
      .max(160, 'Full name must be 160 characters or fewer.'),
  })
  .strict()
  .transform(({ fullName, ...input }) => {
    const parts = fullName.split(/\s+/u)
    return {
      ...input,
      firstName: parts.length === 1 ? (parts[0] ?? '') : parts.slice(0, -1).join(' '),
      lastName: parts.length === 1 ? '' : (parts.at(-1) ?? ''),
    }
  })

const legacyRegistrationSchema = registrationCredentialsSchema
  .extend({
    firstName: nameSchema('First name'),
    lastName: nameSchema('Last name'),
  })
  .strict()

export const registrationSchema = z
  .union([fullNameRegistrationSchema, legacyRegistrationSchema])
  .superRefine((input, context) => {
    if (
      input.confirmPassword !== undefined &&
      input.password !== input.confirmPassword
    ) {
      context.addIssue({
        code: 'custom',
        path: ['confirmPassword'],
        message: 'Passwords must match.',
      })
    }
  })

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1).max(128),
  })
  .strict()

const registrationIdSchema = z
  .string({ error: 'A verification request is required.' })
  .uuid('The verification request is invalid.')

export const verifyRegistrationEmailSchema = z
  .object({
    registrationId: registrationIdSchema,
    code: z
      .string({ error: 'Enter the six-digit verification code.' })
      .regex(/^\d{6}$/u, 'Enter the six-digit verification code.'),
  })
  .strict()

export const resendRegistrationVerificationSchema = z
  .object({
    registrationId: registrationIdSchema,
  })
  .strict()

export const googleCredentialSchema = z
  .object({
    credential: z
      .string({ error: 'A Google credential is required.' })
      .min(1, 'A Google credential is required.')
      .max(16_384, 'The Google credential is too large.'),
  })
  .strict()

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, 'Enter your current password.')
      .max(PASSWORD_MAX_LENGTH),
    newPassword: registrationPasswordSchema,
    confirmNewPassword: z
      .string()
      .min(1, 'Confirm your new password.')
      .max(PASSWORD_MAX_LENGTH),
  })
  .strict()
  .superRefine((input, context) => {
    if (input.newPassword !== input.confirmNewPassword) {
      context.addIssue({
        code: 'custom',
        path: ['confirmNewPassword'],
        message: 'New passwords must match.',
      })
    }

    if (input.currentPassword === input.newPassword) {
      context.addIssue({
        code: 'custom',
        path: ['newPassword'],
        message:
          'Choose a new password that is different from your current password.',
      })
    }
  })

export type RegistrationInput = z.infer<typeof registrationSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type VerifyRegistrationEmailInput = z.infer<
  typeof verifyRegistrationEmailSchema
>
export type ResendRegistrationVerificationInput = z.infer<
  typeof resendRegistrationVerificationSchema
>
export type GoogleCredentialInput = z.infer<typeof googleCredentialSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
