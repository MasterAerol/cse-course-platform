import type { Bindings } from '../types/bindings'

export function getGoogleClientId(
  bindings: Pick<Bindings, 'GOOGLE_CLIENT_ID'>,
): string | null {
  const clientId = bindings.GOOGLE_CLIENT_ID?.trim()
  return clientId === undefined || clientId.length === 0 ? null : clientId
}
