import { useCallback, useEffect, useState } from 'react'

import {
  fetchMistakeNotebook,
  fetchMistakeNotebookEntry,
  fetchMistakeNotebookSummary,
  type MistakeNotebookFilters,
  type MistakeNotebookEntry,
  type MistakeNotebookList,
  type MistakeNotebookSummary,
} from '../lib/mistake-notebook-api'

export type MistakeNotebookViewState<T> =
  | { status: 'loading'; data: null; error: null; reload: () => void }
  | { status: 'error'; data: null; error: string; reload: () => void }
  | { status: 'loaded'; data: T; error: null; reload: () => void }

function message(error: unknown): string {
  return error instanceof Error ? error.message : 'Mistake Notebook could not be loaded.'
}
function useNotebookRequest<T>(loader: (signal: AbortSignal) => Promise<T>, dependencies: readonly unknown[]): MistakeNotebookViewState<T> {
  const [version, setVersion] = useState(0)
  const requestKey = `${JSON.stringify(dependencies)}:${version}`
  const [state, setState] = useState<{
    key: string | null
    value: Omit<MistakeNotebookViewState<T>, 'reload'>
  }>({ key: null, value: { status: 'loading', data: null, error: null } })
  const reload = useCallback(() => setVersion((value) => value + 1), [])
  useEffect(() => {
    const controller = new AbortController()
    void loader(controller.signal).then(
      (data) => { if (!controller.signal.aborted) setState({ key: requestKey, value: { status: 'loaded', data, error: null } }) },
      (error: unknown) => { if (!controller.signal.aborted) setState({ key: requestKey, value: { status: 'error', data: null, error: message(error) } }) },
    )
    return () => controller.abort()
  // The caller supplies stable scalar dependencies for each request.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey])
  const value = state.key === requestKey
    ? state.value
    : { status: 'loading' as const, data: null, error: null }
  return { ...value, reload } as MistakeNotebookViewState<T>
}
export function useMistakeNotebookSummary() {
  return useNotebookRequest<MistakeNotebookSummary>((signal) => fetchMistakeNotebookSummary(signal), [])
}
export function useMistakeNotebookList(filters: MistakeNotebookFilters) {
  const key = JSON.stringify(filters)
  return useNotebookRequest<MistakeNotebookList>((signal) => fetchMistakeNotebook(filters, signal), [key])
}
export function useMistakeNotebookEntry(entryId: string) {
  return useNotebookRequest<MistakeNotebookEntry>((signal) => fetchMistakeNotebookEntry(entryId, signal), [entryId])
}