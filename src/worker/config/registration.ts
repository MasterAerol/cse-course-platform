import type { Bindings, RegistrationMode } from '../types/bindings'

export function getRegistrationMode(
  bindings: Pick<Bindings, 'REGISTRATION_MODE'>,
): RegistrationMode {
  return bindings.REGISTRATION_MODE === 'open' ? 'open' : 'closed'
}