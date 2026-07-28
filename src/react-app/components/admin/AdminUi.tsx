import type { ReactNode } from 'react'

export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="admin-page-header">
      <div>
        <h1>{title}</h1>
        {description !== undefined && <p>{description}</p>}
      </div>
      {actions !== undefined && <div className="button-row">{actions}</div>}
    </div>
  )
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`admin-status admin-status--${status}`}>
      {status}
    </span>
  )
}

export function SaveBar({
  dirty,
  saving,
  message,
}: {
  dirty: boolean
  saving: boolean
  message: string | null
}) {
  return (
    <div className="save-bar" aria-live="polite">
      <span>{saving ? 'Saving…' : dirty ? 'Unsaved changes' : 'Saved'}</span>
      {message !== null && <span>{message}</span>}
    </div>
  )
}

export function FormError({ message }: { message: string | null }) {
  if (message === null) {
    return null
  }

  return (
    <p className="form-error" role="alert">
      {message}
    </p>
  )
}

export function EntityList({
  children,
  empty,
}: {
  children: ReactNode
  empty: boolean
}) {
  if (empty) {
    return <p className="admin-empty">No records yet.</p>
  }

  return <div className="admin-entity-list">{children}</div>
}

export function MoveControls({
  onMoveUp,
  onMoveDown,
  disabled,
}: {
  onMoveUp: () => void
  onMoveDown: () => void
  disabled?: boolean
}) {
  return (
    <div className="move-controls" aria-label="Move controls">
      <button type="button" disabled={disabled} onClick={onMoveUp}>
        Move up
      </button>
      <button type="button" disabled={disabled} onClick={onMoveDown}>
        Move down
      </button>
    </div>
  )
}

export function ConfirmDialog({
  open,
  title,
  description,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  description: string
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) {
    return null
  }

  return (
    <div className="admin-confirm" role="dialog" aria-modal="true">
      <section>
        <h2>{title}</h2>
        <p>{description}</p>
        <div className="button-row">
          <button type="button" onClick={onConfirm}>
            Confirm
          </button>
          <button type="button" className="button-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </section>
    </div>
  )
}
