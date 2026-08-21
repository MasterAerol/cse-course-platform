type SessionReplacedListener = () => void

const listeners = new Set<SessionReplacedListener>()

export function notifySessionReplaced(): void {
  for (const listener of listeners) listener()
}

export function subscribeToSessionReplaced(
  listener: SessionReplacedListener,
): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
