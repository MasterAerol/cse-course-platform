import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import {
  ApiClientError,
  authenticateWithGoogle as googleAuthenticationRequest,
  connectGoogle as connectGoogleRequest,
  fetchCurrentUser,
  fetchPlatformConfig,
  login as loginRequest,
  logout as logoutRequest,
  registerStudent,
  type CseExamDates,
  type GoogleCredentialRequest,
  type LoginRequest,
  type RegistrationRequest,
  type RegistrationMode,
  type User,
} from '../lib/api'
import { AuthContext, type AuthContextValue } from './auth-context'
import { subscribeToSessionReplaced } from './session-events'

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
  const [googleClientId, setGoogleClientId] = useState<string | null>(null)

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
        setGoogleClientId(config.data.googleClientId)
        setCseExamDates(config.data.cseExamDates)
      } catch {
        if (!controller.signal.aborted) {
          setRegistrationMode('closed')
          setGoogleClientId(null)
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

  useEffect(() => {
    function handleSessionReplaced(): void {
      setUser(null)
      setError(
        'Your account was signed in on another device. Sign in again to continue here.',
      )
    }

    return subscribeToSessionReplaced(handleSessionReplaced)
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
  const continueWithGoogle = useCallback(
    async (input: GoogleCredentialRequest): Promise<void> => {
      const authenticatedUser = await googleAuthenticationRequest(input)
      setUser(authenticatedUser)
      setError(null)
    },
    [],
  )

  const connectGoogle = useCallback(
    async (input: GoogleCredentialRequest): Promise<void> => {
      const updatedUser = await connectGoogleRequest(input)
      setUser(updatedUser)
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
      googleClientId,
      cseExamDates,
      login,
      register,
      continueWithGoogle,
      connectGoogle,
      logout,
    }),
    [
      connectGoogle,
      continueWithGoogle,
      cseExamDates,
      error,
      googleClientId,
      loading,
      login,
      logout,
      register,
      registrationMode,
      user,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
