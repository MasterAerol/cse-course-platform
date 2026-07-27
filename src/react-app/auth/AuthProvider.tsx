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
  login as loginRequest,
  logout as logoutRequest,
  registerStudent,
  type LoginRequest,
  type RegistrationRequest,
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

    void restoreSession()

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
      login,
      register,
      logout,
    }),
    [error, loading, login, logout, register, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
