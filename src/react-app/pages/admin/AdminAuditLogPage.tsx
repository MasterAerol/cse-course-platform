import { useEffect, useState } from 'react'

import { AdminMetadata, AdminPageHeader } from '../../components/admin/AdminUi'
import { PasaWiseLoader } from '../../components/PasaWiseLoader'
import { adminLabel } from '../../lib/admin-copy'
import { fetchAdminAuditLogs, type AdminAuditLog } from '../../lib/api'

type AuditState =
  | { status: 'loading' }
  | { status: 'loaded'; logs: AdminAuditLog[] }
  | { status: 'error'; message: string }

export function AdminAuditLogPage() {
  const [state, setState] = useState<AuditState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()

    fetchAdminAuditLogs(controller.signal)
      .then((logs) => setState({ status: 'loaded', logs }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState({
            status: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'Audit logs could not be loaded.',
          })
        }
      })

    return () => controller.abort()
  }, [])

  return (
    <main className="admin-page">
      <AdminPageHeader
        title="Audit log"
        description="Recent admin content changes with actor, entity, and safe metadata."
      />
      <section className="admin-panel">
        {state.status === 'loading' && <PasaWiseLoader label="Loading audit logs…" />}
        {state.status === 'error' && (
          <p className="form-error" role="alert">
            {state.message}
          </p>
        )}
        {state.status === 'loaded' && state.logs.length === 0 && (
          <p>No admin changes have been logged yet.</p>
        )}
        {state.status === 'loaded' &&
          state.logs.map((log) => (
            <article className="admin-row admin-audit-row" key={log.id}>
              <div>
                <strong>
                  {adminLabel(log.action)} {adminLabel(log.entityType)}
                </strong>
                <p>
                  {log.actorEmail ?? 'Unknown admin'} ·{' '}
                  {new Date(log.createdAt).toLocaleString()}
                </p>
                <AdminMetadata metadata={log.metadata} />
              </div>
              <div className="admin-audit-row__entity"><span>Entity</span><strong>{log.entityId ?? '—'}</strong></div>
            </article>
          ))}
      </section>
    </main>
  )
}
