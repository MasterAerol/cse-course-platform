import { createContext } from 'react'

import type {
  LoginRequest,
  RegistrationRequest,
  RegistrationMode,
  User,
} from '../lib/api'

export interface AuthContextValue {
  user: User | null
  loading: boolean
  error: string | null
  registrationMode: RegistrationMode
  login: (input: LoginRequest) => Promise<void>
  register: (input: RegistrationRequest) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
