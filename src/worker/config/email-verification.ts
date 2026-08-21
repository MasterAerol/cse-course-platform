import type { Bindings } from '../types/bindings'
import { AppError } from '../utils/app-error'

const MINIMUM_SECRET_LENGTH = 32

export function requireEmailVerificationSecret(bindings: Bindings): string {
  const secret = bindings.EMAIL_VERIFICATION_SECRET?.trim()
  if (secret === undefined || secret.length < MINIMUM_SECRET_LENGTH) {
    throw new AppError(
      503,
      'EMAIL_VERIFICATION_UNAVAILABLE',
      'Email verification is temporarily unavailable. Please try again later.',
    )
  }
  return secret
}
