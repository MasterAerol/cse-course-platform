import { createContext } from 'react'

import type {
  CseExamDates,
  GoogleCredentialRequest,
  LoginRequest,
  PendingRegistration,
  RegistrationRequest,
  RegistrationMode,
  ResendRegistrationVerificationRequest,
  User,
  VerifyRegistrationEmailRequest,
} from '../lib/api'

export interface AuthContextValue {
  user: User | null
  loading: boolean
  error: string | null
  registrationMode: RegistrationMode
  googleClientId: string | null
  cseExamDates: CseExamDates
  login: (input: LoginRequest) => Promise<void>
  register: (input: RegistrationRequest) => Promise<PendingRegistration>
  verifyRegistrationEmail: (
    input: VerifyRegistrationEmailRequest,
  ) => Promise<void>
  resendRegistrationVerification: (
    input: ResendRegistrationVerificationRequest,
  ) => Promise<PendingRegistration>
  continueWithGoogle: (input: GoogleCredentialRequest) => Promise<void>
  connectGoogle: (input: GoogleCredentialRequest) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
