export type UserRole = 'student' | 'admin'
export type UserStatus = 'active' | 'suspended'

export interface PublicUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  signInMethods?: {
    hasPassword: boolean
    googleConnected: boolean
  }
}

export interface UserRecord {
  id: number
  publicId: string
  email: string
  passwordHash: string | null
  hasGoogleIdentity: boolean
  firstName: string
  lastName: string
  role: UserRole
  status: UserStatus
}

export interface AuthenticatedPrincipal extends PublicUser {
  internalUserId: number
}

export interface SessionMetadata {
  userAgent: string | null
  ipAddress: string | null
}
