import type { Bindings } from './bindings'
import type { AuthenticatedPrincipal } from './auth'

export interface AppEnv {
  Bindings: Bindings
  Variables: {
    requestId: string
    authUser: AuthenticatedPrincipal
  }
}
