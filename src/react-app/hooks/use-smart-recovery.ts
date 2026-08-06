import { useCallback, useEffect, useState } from 'react'

import {
  getSmartRecoverySkillDetails,
  getSmartRecoverySummary,
  type SmartRecoveryDashboard,
  type SmartRecoveryDetails,
} from '../lib/smart-recovery-api'

export type SmartRecoveryRequestState<T> =
  | { status: 'loading'; data: null; error: null }
  | { status: 'loaded'; data: T; error: null }
  | { status: 'error'; data: null; error: string }

export type SmartRecoveryViewState<T> = SmartRecoveryRequestState<T> & {
  reload: () => void
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Smart Recovery could not be loaded.'
}

function useSmartRecoveryRequest<T>(
  load: (signal: AbortSignal) => Promise<T>,
): SmartRecoveryViewState<T> {
  const [reloadVersion, setReloadVersion] = useState(0)
  const [state, setState] = useState<SmartRecoveryRequestState<T>>({
    status: 'loading',
    data: null,
    error: null,
  })

  const reload = useCallback(() => {
    setState({ status: 'loading', data: null, error: null })
    setReloadVersion((value) => value + 1)
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    void load(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setState({ status: 'loaded', data, error: null })
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState({ status: 'error', data: null, error: errorMessage(error) })
        }
      })

    return () => controller.abort()
  }, [load, reloadVersion])

  return { ...state, reload }
}

const loadSummary = (signal: AbortSignal) => getSmartRecoverySummary(signal)

export function useSmartRecoverySummary() {
  return useSmartRecoveryRequest<SmartRecoveryDashboard>(loadSummary)
}

export function useSmartRecoverySkillDetails(skillSlug: string) {
  const loadDetails = useCallback(
    (signal: AbortSignal) => getSmartRecoverySkillDetails(skillSlug, signal),
    [skillSlug],
  )
  return useSmartRecoveryRequest<SmartRecoveryDetails>(loadDetails)
}
