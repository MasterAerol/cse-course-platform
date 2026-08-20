import type { ReactNode } from 'react'

import { adminLabel } from '../../lib/admin-copy'

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
  const classSuffix = status.toLowerCase().replace(/[^a-z0-9_-]/gu, '')
  return (
    <span className={`admin-status admin-status--${classSuffix}`}>
      {adminLabel(status)}
    </span>
  )
}

function metadataValue(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (value === null) return 'None'
  if (Array.isArray(value)) return `${value.length} ${value.length === 1 ? 'item' : 'items'}`
  if (typeof value === 'object') return `${Object.keys(value).length} structured fields`
  return 'Not available'
}

export function AdminMetadata({ metadata }: { metadata: unknown }) {
  if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) {
    return metadata === null ? null : <p className="admin-metadata-summary">{metadataValue(metadata)}</p>
  }

  const entries = Object.entries(metadata)
  if (entries.length === 0) return null

  return (
    <details className="admin-metadata">
      <summary>View change details</summary>
      <dl>
        {entries.map(([key, value]) => (
          <div key={key}><dt>{adminLabel(key)}</dt><dd>{metadataValue(value)}</dd></div>
        ))}
      </dl>
    </details>
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
