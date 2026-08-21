import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

describe('0018 Google account authentication migration', () => {
  it('supports passwordless users and durable unique Google subjects', async () => {
    const columns = await env.DB.prepare('PRAGMA table_info(users)')
      .all<{ name: string; notnull: 0 | 1 }>()
    const passwordHash = columns.results.find(
      (column) => column.name === 'password_hash',
    )
    expect(passwordHash?.notnull).toBe(0)

    const publicId = crypto.randomUUID()
    const email = `migration-${publicId}@example.test`
    const inserted = await env.DB.prepare(
      `INSERT INTO users (
        public_id,
        email,
        password_hash,
        first_name,
        last_name
      ) VALUES (?1, ?2, NULL, 'Google', 'Learner')`,
    ).bind(publicId, email).run()
    const userId = Number(inserted.meta.last_row_id)
    await env.DB.prepare(
      `INSERT INTO user_identities (
        user_id,
        provider,
        provider_subject
      ) VALUES (?1, 'google', ?2)`,
    ).bind(userId, `subject-${publicId}`).run()

    const identity = await env.DB.prepare(
      `SELECT users.public_id, users.password_hash, user_identities.provider_subject
      FROM user_identities
      INNER JOIN users ON users.id = user_identities.user_id
      WHERE user_identities.provider = 'google'
        AND user_identities.provider_subject = ?1`,
    ).bind(`subject-${publicId}`).first()

    expect(identity).toEqual({
      public_id: publicId,
      password_hash: null,
      provider_subject: `subject-${publicId}`,
    })
    expect((await env.DB.prepare('PRAGMA foreign_key_check').all()).results)
      .toEqual([])
  })

  it('enforces one Google identity per subject and per PasaWise user', async () => {
    const tables = await env.DB.prepare(
      `SELECT sql FROM sqlite_schema
      WHERE type = 'table' AND name = 'user_identities'`,
    ).first<{ sql: string }>()

    expect(tables?.sql).toContain('UNIQUE (provider, provider_subject)')
    expect(tables?.sql).toContain('UNIQUE (user_id, provider)')
  })
})
