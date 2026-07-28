import {
  insertAuditLog,
  listAuditLogs,
} from '../../repositories/admin/admin-content.repository'
import type { AuditLogFilterInput } from '../../schemas/admin/content-admin.schemas'
import type { AuthenticatedPrincipal } from '../../types/auth'
import type { AuditLogRow } from '../../types/admin/content'

export interface AdminAuditLog {
  id: number
  actorUserId: number | null
  actorEmail: string | null
  action: string
  entityType: string
  entityId: string | null
  metadata: unknown
  createdAt: string
}

export async function recordAdminAuditLog(
  database: D1Database,
  actor: AuthenticatedPrincipal,
  input: {
    action: string
    entityType: string
    entityId: number | string
    metadata?: Record<string, unknown>
  },
): Promise<void> {
  await insertAuditLog(database, {
    actorUserId: actor.internalUserId,
    action: input.action,
    entityType: input.entityType,
    entityId: String(input.entityId),
    metadataJson:
      input.metadata === undefined ? null : JSON.stringify(input.metadata),
  })
}

function parseMetadata(row: AuditLogRow): unknown {
  if (row.metadata_json === null) {
    return null
  }

  try {
    return JSON.parse(row.metadata_json) as unknown
  } catch {
    return null
  }
}

export async function getAdminAuditLogs(
  database: D1Database,
  filters: AuditLogFilterInput,
): Promise<{ logs: AdminAuditLog[] }> {
  const rows = await listAuditLogs(database, {
    action: filters.action ?? null,
    entityType: filters.entityType ?? null,
    actor: filters.actor ?? null,
    from: filters.from ?? null,
    to: filters.to ?? null,
    limit: filters.limit,
    offset: filters.offset,
  })

  return {
    logs: rows.map((row) => ({
      id: row.id,
      actorUserId: row.actor_user_id,
      actorEmail: row.actor_email,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      metadata: parseMetadata(row),
      createdAt: row.created_at,
    })),
  }
}
