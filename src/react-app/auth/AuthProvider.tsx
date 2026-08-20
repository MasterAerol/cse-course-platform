import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import {
  ApiClientError,
  fetchCurrentUser,
  fetchPlatformConfig,
  login as loginRequest,
  logout as logoutRequest,
  registerStudent,
  type CseExamDates,
  type LoginRequest,
  type RegistrationRequest,
  type RegistrationMode,
  type User,
} from '../lib/api'
import { AuthContext, type AuthContextValue } from './auth-context'

interface AuthProviderProps {
  children: ReactNode
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Authentication could not be completed.'
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [registrationMode, setRegistrationMode] =
    useState<RegistrationMode>('closed')
  const [cseExamDates, setCseExamDates] = useState<CseExamDates>([])

  useEffect(() => {
    const controller = new AbortController()

    async function restoreSession(): Promise<void> {
      try {
        const currentUser = await fetchCurrentUser(controller.signal)
        setUser(currentUser)
        setError(null)
      } catch (restoreError: unknown) {
        if (controller.signal.aborted) {
          return
        }

        if (
          restoreError instanceof ApiClientError &&
          restoreError.code === 'UNAUTHENTICATED'
        ) {
          setUser(null)
          setError(null)
        } else {
          setUser(null)
          setError(getErrorMessage(restoreError))
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    async function loadPlatformConfig(): Promise<void> {
      try {
        const config = await fetchPlatformConfig(controller.signal)
        setRegistrationMode(config.data.registrationMode)
        setCseExamDates(config.data.cseExamDates)
      } catch {
        if (!controller.signal.aborted) {
          setRegistrationMode('closed')
          setCseExamDates([])
        }
      }
    }

    void restoreSession()
    void loadPlatformConfig()

    return () => {
      controller.abort()
    }
  }, [])

  const login = useCallback(async (input: LoginRequest): Promise<void> => {
    const authenticatedUser = await loginRequest(input)
    setUser(authenticatedUser)
    setError(null)
  }, [])

  const register = useCallback(
    async (input: RegistrationRequest): Promise<void> => {
      const authenticatedUser = await registerStudent(input)
      setUser(authenticatedUser)
      setError(null)
    },
    [],
  )

  const logout = useCallback(async (): Promise<void> => {
    await logoutRequest()
    setUser(null)
    setError(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      error,
      registrationMode,
      cseExamDates,
      login,
      register,
      logout,
    }),
    [cseExamDates, error, loading, login, logout, register, registrationMode, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
