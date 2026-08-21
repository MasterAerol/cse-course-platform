import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

import { describe, expect, it } from 'vitest'

const migrationRoot = path.resolve(import.meta.dirname, '..', 'migrations')
const migrations = readdirSync(migrationRoot)
  .filter((name) => /^\d{4}_.+\.sql$/u.test(name))
  .sort()
  .map((name) => ({
    name,
    sql: readFileSync(path.join(migrationRoot, name), 'utf8'),
  }))

function scalar(database: DatabaseSync, sql: string): number {
  const value = database.prepare(sql).get()?.value
  if (typeof value !== 'number') throw new Error(`Missing scalar: ${sql}`)
  return value
}

describe('0017 direct SQLite migration compatibility', () => {
  it('applies all migrations to a fresh in-memory database', () => {
    const database = new DatabaseSync(':memory:')
    try {
      for (const migration of migrations) database.exec(migration.sql)
      expect(migrations.at(-1)?.name).toBe('0017_commercial_access_system.sql')
      expect(scalar(database, "SELECT COUNT(*) AS value FROM sqlite_schema WHERE type='table' AND name IN('subscription_plans','commercial_settings','commercial_payment_methods','payment_requests','payment_proofs','payments','verified_payment_references','subscriptions','commercial_entitlements')")).toBe(9)
      expect(scalar(database, 'SELECT COUNT(*) AS value FROM subscription_plans')).toBe(4)
      expect(scalar(database, 'SELECT COUNT(*) AS value FROM commercial_settings WHERE enabled=0')).toBe(4)
      expect(database.prepare('PRAGMA foreign_key_check').all()).toEqual([])
    } finally {
      database.close()
    }
  })

  it('upgrades a pre-0017 database and preserves users and sessions', () => {
    const database = new DatabaseSync(':memory:')
    try {
      for (const migration of migrations.slice(0, 16)) database.exec(migration.sql)
      database.exec(`
        INSERT INTO users(public_id,email,password_hash,first_name,last_name)
        VALUES('sqlite-legacy-user','sqlite-legacy@example.test','hash','Legacy','User');
        INSERT INTO user_sessions(user_id,token_hash,expires_at)
        SELECT id,'sqlite-legacy-session','2099-01-01T00:00:00.000Z'
        FROM users WHERE public_id='sqlite-legacy-user';
      `)
      const userId = scalar(database, "SELECT id AS value FROM users WHERE public_id='sqlite-legacy-user'")
      const sessionId = scalar(database, "SELECT id AS value FROM user_sessions WHERE token_hash='sqlite-legacy-session'")
      database.exec(migrations[16]?.sql ?? '')
      expect(database.prepare("SELECT id,learner_session_generation,last_active_at FROM users WHERE public_id='sqlite-legacy-user'").get()).toEqual({ id: userId, learner_session_generation: 0, last_active_at: null })
      expect(database.prepare("SELECT id,learner_session_generation FROM user_sessions WHERE token_hash='sqlite-legacy-session'").get()).toEqual({ id: sessionId, learner_session_generation: null })
      expect(database.prepare('PRAGMA foreign_key_check').all()).toEqual([])
    } finally {
      database.close()
    }
  })
})
