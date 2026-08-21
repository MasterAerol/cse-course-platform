import type { D1Migration } from '@cloudflare/vitest-pool-workers'
import { env } from 'cloudflare:workers'
import { applyD1Migrations } from 'cloudflare:test'
import { beforeAll, describe, expect, it } from 'vitest'

interface MigrationEnv extends Cloudflare.Env {
  FRESH_COMMERCIAL_MIGRATION_DB: D1Database
  UPGRADE_COMMERCIAL_MIGRATION_DB: D1Database
  TEST_MIGRATIONS: D1Migration[]
}

const testEnv = env as MigrationEnv
const fresh = testEnv.FRESH_COMMERCIAL_MIGRATION_DB
const upgrade = testEnv.UPGRADE_COMMERCIAL_MIGRATION_DB
let legacyUserId = 0
let legacySessionId = 0

async function scalar(database: D1Database, sql: string): Promise<number> {
  const row = await database.prepare(sql).first<{ value: number }>()
  if (row === null) throw new Error(`Missing scalar result: ${sql}`)
  return row.value
}

beforeAll(async () => {
  expect(testEnv.TEST_MIGRATIONS).toHaveLength(17)
  await applyD1Migrations(
    fresh,
    testEnv.TEST_MIGRATIONS,
    'fresh_commercial_migrations',
  )
  await applyD1Migrations(
    upgrade,
    testEnv.TEST_MIGRATIONS.slice(0, 16),
    'upgrade_commercial_migrations',
  )
  const user = await upgrade.prepare(
    `INSERT INTO users(public_id,email,password_hash,first_name,last_name)
     VALUES('legacy-commercial-user','legacy-commercial@example.test','hash','Legacy','Learner')`,
  ).run()
  legacyUserId = Number(user.meta.last_row_id)
  const session = await upgrade.prepare(
    `INSERT INTO user_sessions(user_id,token_hash,expires_at)
     VALUES(?1,'legacy-commercial-session','2099-01-01T00:00:00.000Z')`,
  ).bind(legacyUserId).run()
  legacySessionId = Number(session.meta.last_row_id)
  await applyD1Migrations(
    upgrade,
    testEnv.TEST_MIGRATIONS,
    'upgrade_commercial_migrations',
  )
})

describe('0017 commercial access migration', () => {
  it('applies on fresh and pre-0017 databases', async () => {
    for (const [database, table] of [
      [fresh, 'fresh_commercial_migrations'],
      [upgrade, 'upgrade_commercial_migrations'],
    ] as const) {
      expect(await scalar(database, `SELECT COUNT(*) AS value FROM ${table} WHERE name='0017_commercial_access_system.sql'`)).toBe(1)
      expect(await scalar(database, "SELECT COUNT(*) AS value FROM sqlite_schema WHERE type='table' AND name IN('subscription_plans','commercial_settings','commercial_payment_methods','payment_requests','payment_proofs','payments','verified_payment_references','subscriptions','commercial_entitlements')")).toBe(9)
      expect((await database.prepare('PRAGMA foreign_key_check').all()).results).toEqual([])
    }
  })

  it('preserves legacy identities and makes existing learner sessions valid generation zero', async () => {
    const user = await upgrade.prepare('SELECT id,learner_session_generation,last_active_at FROM users WHERE public_id=\'legacy-commercial-user\'').first<{ id: number; learner_session_generation: number; last_active_at: string | null }>()
    const session = await upgrade.prepare('SELECT id,learner_session_generation FROM user_sessions WHERE token_hash=\'legacy-commercial-session\'').first<{ id: number; learner_session_generation: number | null }>()
    expect(user).toEqual({ id: legacyUserId, learner_session_generation: 0, last_active_at: null })
    expect(session).toEqual({ id: legacySessionId, learner_session_generation: null })
  })

  it('seeds immutable integer-PHP plan and disabled control defaults', async () => {
    const plans = await fresh.prepare('SELECT slug,price_minor,duration_days,access_type,public_visible,checkout_enabled,counts_as_revenue FROM subscription_plans ORDER BY id').all()
    expect(plans.results).toEqual([
      { slug: 'tester-premium', price_minor: 0, duration_days: 14, access_type: 'TESTER', public_visible: 0, checkout_enabled: 0, counts_as_revenue: 0 },
      { slug: 'founding-learner', price_minor: 14900, duration_days: 30, access_type: 'PREMIUM', public_visible: 0, checkout_enabled: 0, counts_as_revenue: 1 },
      { slug: 'regular-monthly', price_minor: 29900, duration_days: 30, access_type: 'PREMIUM', public_visible: 0, checkout_enabled: 0, counts_as_revenue: 1 },
      { slug: 'exam-pass', price_minor: 49900, duration_days: null, access_type: 'PREMIUM', public_visible: 0, checkout_enabled: 0, counts_as_revenue: 1 },
    ])
    expect(await scalar(fresh, 'SELECT COUNT(*) AS value FROM commercial_settings WHERE enabled=0')).toBe(4)
  })

  it('enforces one active entitlement and unique verified method/reference', async () => {
    const indexes = await fresh.prepare("SELECT name FROM sqlite_schema WHERE type='index' AND name IN('idx_subscriptions_one_active_per_user','idx_entitlements_one_active_per_user','sqlite_autoindex_verified_payment_references_3')").all<{ name: string }>()
    expect(indexes.results.map((row) => row.name)).toContain('idx_subscriptions_one_active_per_user')
    expect(indexes.results.map((row) => row.name)).toContain('idx_entitlements_one_active_per_user')
    const verifiedTable = await fresh.prepare("SELECT sql FROM sqlite_schema WHERE type='table' AND name='verified_payment_references'").first<{ sql: string }>()
    expect(verifiedTable?.sql).toContain('UNIQUE (payment_method_id, normalized_reference)')
  })
})
