import { useCallback, useEffect, useState } from 'react'
import { fetchCseReadiness, type CseReadiness } from '../lib/readiness-api'

export type ReadinessViewState =
  | { status: 'loading'; data: null; error: null; reload: () => void }
  | { status: 'error'; data: null; error: string; reload: () => void }
  | { status: 'loaded'; data: CseReadiness; error: null; reload: () => void }
export function useCseReadiness(): ReadinessViewState {
  const [version, setVersion] = useState(0)
  const [state, setState] = useState<{ version: number | null; value: Omit<ReadinessViewState, 'reload'> }>({ version: null, value: { status: 'loading', data: null, error: null } })
  const reload = useCallback(() => setVersion((value) => value + 1), [])
  useEffect(() => {
    const controller = new AbortController()
    void fetchCseReadiness(controller.signal).then(
      (data) => { if (!controller.signal.aborted) setState({ version, value: { status: 'loaded', data, error: null } }) },
      (error: unknown) => { if (!controller.signal.aborted) setState({ version, value: { status: 'error', data: null, error: error instanceof Error ? error.message : 'CSE Readiness could not be loaded.' } }) },
    )
    return () => controller.abort()
  }, [version])
  const value = state.version === version ? state.value : { status: 'loading' as const, data: null, error: null }
  return { ...value, reload } as ReadinessViewState
}
