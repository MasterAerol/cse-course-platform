import { useEffect, useRef, useState } from 'react'
import {
  clearGoogleIdentityButton,
  getGoogleButtonWidth,
  mountGoogleIdentityButton,
  type GoogleButtonRenderOptions,
} from './google-identity-button-lifecycle'

interface GoogleCredentialResponse {
  credential: string
}

interface GoogleAccountsId {
  initialize(config: {
    client_id: string
    callback: (response: GoogleCredentialResponse) => void
    context: 'signin' | 'signup'
    ux_mode: 'popup'
    use_fedcm_for_button: boolean
  }): void
  renderButton(
    parent: HTMLElement,
    options: GoogleButtonRenderOptions,
  ): void
}

interface GoogleIdentityServices {
  accounts: {
    id: GoogleAccountsId
  }
}

declare global {
  interface Window {
    google?: GoogleIdentityServices
  }
}

interface GoogleIdentityButtonProps {
  clientId: string | null
  context: 'signin' | 'signup'
  onCredential: (credential: string) => Promise<void>
}

type GoogleButtonState =
  | 'loading'
  | 'ready'
  | 'submitting'
  | 'unavailable'

const GOOGLE_SCRIPT_ID = 'google-identity-services'
const GOOGLE_SCRIPT_URL = 'https://accounts.google.com/gsi/client?hl=en'
let googleScriptPromise: Promise<void> | null = null

function loadGoogleIdentityServices(): Promise<void> {
  if (window.google !== undefined) return Promise.resolve()
  if (googleScriptPromise !== null) return googleScriptPromise

  googleScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_SCRIPT_ID)
    const script = existing instanceof HTMLScriptElement
      ? existing
      : document.createElement('script')

    function handleLoad(): void {
      if (window.google === undefined) {
        reject(new Error('Google Identity Services did not initialize.'))
        return
      }
      resolve()
    }

    script.addEventListener('load', handleLoad, { once: true })
    script.addEventListener(
      'error',
      () => reject(new Error('Google Identity Services could not be loaded.')),
      { once: true },
    )

    if (existing === null) {
      script.id = GOOGLE_SCRIPT_ID
      script.src = GOOGLE_SCRIPT_URL
      script.async = true
      document.head.append(script)
    }
  }).catch((error: unknown) => {
    googleScriptPromise = null
    throw error
  })

  return googleScriptPromise
}

export function GoogleIdentityButton({
  clientId,
  context,
  onCredential,
}: GoogleIdentityButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const credentialHandlerRef = useRef(onCredential)
  const [state, setState] = useState<GoogleButtonState>(
    clientId === null ? 'unavailable' : 'loading',
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    credentialHandlerRef.current = onCredential
  }, [onCredential])

  useEffect(() => {
    if (clientId === null) {
      return
    }
    const configuredClientId = clientId

    let active = true
    let mountedContainer: HTMLElement | null = null

    async function initialize(): Promise<void> {
      try {
        await loadGoogleIdentityServices()
        if (!active || window.google === undefined || containerRef.current === null) {
          return
        }

        const container = containerRef.current
        const width = getGoogleButtonWidth(container.getBoundingClientRect().width)

        window.google.accounts.id.initialize({
          client_id: configuredClientId,
          context,
          ux_mode: 'popup',
          use_fedcm_for_button: true,
          callback: (response) => {
            if (response.credential.length === 0) {
              setError('Google sign-in could not be completed. Please try again.')
              return
            }

            setState('submitting')
            setError(null)
            void credentialHandlerRef.current(response.credential)
              .then(() => setState('ready'))
              .catch((credentialError: unknown) => {
                setState('ready')
                setError(
                  credentialError instanceof Error
                    ? credentialError.message
                    : 'Google sign-in could not be completed. Please try again.',
                )
              })
          },
        })
        mountGoogleIdentityButton(
          container,
          (parent, options) => window.google?.accounts.id.renderButton(parent, options),
          {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            locale: 'en',
            width,
          },
        )
        mountedContainer = container
        setState('ready')
      } catch {
        if (active) {
          setState('unavailable')
          setError(
            'Google sign-in is temporarily unavailable. You can use your password instead.',
          )
        }
      }
    }

    void initialize()
    return () => {
      active = false
      if (mountedContainer !== null) {
        clearGoogleIdentityButton(mountedContainer)
      }
    }
  }, [clientId, context])

  if (clientId === null) return null

  return (
    <div className="google-auth">
      <div
        className="google-auth__button"
        data-google-identity-button
        ref={containerRef}
      />
      {state === 'loading' && (
        <p className="google-auth__status" role="status">
          Loading Google sign-in…
        </p>
      )}
      {state === 'submitting' && (
        <p className="google-auth__status" role="status">
          Signing in securely…
        </p>
      )}
      {error !== null && (
        <p className="form-error google-auth__error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
