import type { D1Migration } from '@cloudflare/vitest-pool-workers'
import { env } from 'cloudflare:workers'
import { applyD1Migrations } from 'cloudflare:test'
import { beforeAll, describe, expect, it } from 'vitest'

interface MigrationEnv extends Cloudflare.Env {
  FRESH_LESSON_BLOCK_MIGRATION_DB: D1Database
  UPGRADE_LESSON_BLOCK_MIGRATION_DB: D1Database
  TEST_MIGRATIONS: D1Migration[]
}

const testEnv = env as MigrationEnv
const fresh = testEnv.FRESH_LESSON_BLOCK_MIGRATION_DB
const upgrade = testEnv.UPGRADE_LESSON_BLOCK_MIGRATION_DB
const legacyTypes = [
  'heading',
  'paragraph',
  'callout',
  'formula',
  'example',
  'image',
  'video',
  'divider',
  'summary',
] as const
let fixtureLessonId = 0
let beforeRows: Array<Record<string, unknown>> = []
let preservedSequence = 0

async function scalar(db: D1Database, sql: string): Promise<number> {
  const row = await db.prepare(sql).first<{ value: number }>()
  if (row === null) throw new Error(`Missing scalar result for ${sql}`)
  return row.value
}

beforeAll(async () => {
  expect(testEnv.TEST_MIGRATIONS).toHaveLength(16)
  await applyD1Migrations(fresh, testEnv.TEST_MIGRATIONS, 'fresh_lesson_block_migrations')
  await applyD1Migrations(
    upgrade,
    testEnv.TEST_MIGRATIONS.slice(0, 15),
    'upgrade_lesson_block_migrations',
  )

  const topic = await upgrade.prepare(
    "SELECT id FROM topics WHERE slug='percentages'",
  ).first<{ id: number }>()
  if (topic === null) throw new Error('Percentages fixture topic is missing.')
  const lesson = await upgrade.prepare(
    `INSERT INTO lessons(
      topic_id,public_id,title,slug,lesson_type,position,status
    ) VALUES(?1,'lesson-block-0016-fixture','0016 fixture','lesson-block-0016-fixture','reading',99,'draft')`,
  ).bind(topic.id).run()
  fixtureLessonId = Number(lesson.meta.last_row_id)

  for (const [index, blockType] of legacyTypes.entries()) {
    await upgrade.prepare(
      `INSERT INTO lesson_blocks(
        lesson_id,block_type,content_json,position,created_at,updated_at
      ) VALUES(?1,?2,?3,?4,'2026-01-02 03:04:05','2026-06-07 08:09:10')`,
    ).bind(
      fixtureLessonId,
      blockType,
      JSON.stringify({ type: blockType, exact: `fixture-${index + 1}` }),
      index + 1,
    ).run()
  }

  beforeRows = (await upgrade.prepare(
    `SELECT id,lesson_id,block_type,content_json,position,created_at,updated_at
     FROM lesson_blocks WHERE lesson_id=?1 ORDER BY id`,
  ).bind(fixtureLessonId).all()).results
  preservedSequence = await scalar(
    upgrade,
    "SELECT seq + 50 AS value FROM sqlite_sequence WHERE name='lesson_blocks'",
  )
  await upgrade.prepare(
    "UPDATE sqlite_sequence SET seq=?1 WHERE name='lesson_blocks'",
  ).bind(preservedSequence).run()

  await applyD1Migrations(
    upgrade,
    testEnv.TEST_MIGRATIONS,
    'upgrade_lesson_block_migrations',
  )
})

describe('0016 illustrated guided teaching lesson-block migration', () => {
  it('applies on fresh and pre-0016 databases', async () => {
    for (const [database, migrationTable] of [
      [fresh, 'fresh_lesson_block_migrations'],
      [upgrade, 'upgrade_lesson_block_migrations'],
    ] as const) {
      expect(await scalar(
        database,
        `SELECT COUNT(*) AS value FROM ${migrationTable} WHERE name='0016_add_illustrated_guided_teaching_lesson_blocks.sql'`,
      )).toBe(1)
    }
  })

  it('preserves all legacy rows exactly and keeps their IDs stable', async () => {
    const afterRows = (await upgrade.prepare(
      `SELECT id,lesson_id,block_type,content_json,position,created_at,updated_at
       FROM lesson_blocks WHERE lesson_id=?1 ORDER BY id`,
    ).bind(fixtureLessonId).all()).results
    expect(afterRows).toEqual(beforeRows)
    expect(afterRows).toHaveLength(legacyTypes.length)
  })

  it('preserves the closed type constraint, foreign key, unique constraint, and index', async () => {
    const schema = await upgrade.prepare(
      "SELECT sql FROM sqlite_schema WHERE type='table' AND name='lesson_blocks'",
    ).first<{ sql: string }>()
    expect(schema?.sql).toContain("'illustrated-guided-teaching'")
    for (const legacyType of legacyTypes) expect(schema?.sql).toContain(`'${legacyType}'`)

    const indexes = await upgrade.prepare(
      "SELECT name FROM sqlite_schema WHERE type='index' AND tbl_name='lesson_blocks' ORDER BY name",
    ).all<{ name: string }>()
    expect(indexes.results.map((row) => row.name)).toContain('idx_lesson_blocks_lesson_id')
    expect(indexes.results.some((row) => row.name.startsWith('sqlite_autoindex_lesson_blocks_'))).toBe(true)
    expect((await upgrade.prepare('PRAGMA foreign_key_check').all()).results).toEqual([])
  })

  it('accepts every legacy type and the canonical new type but rejects arbitrary text', async () => {
    const guided = await upgrade.prepare(
      `INSERT INTO lesson_blocks(lesson_id,block_type,content_json,position)
       VALUES(?1,'illustrated-guided-teaching','{"title":"Guided"}',10)`,
    ).bind(fixtureLessonId).run()
    expect(Number(guided.meta.last_row_id)).toBeGreaterThan(preservedSequence)

    await expect(upgrade.prepare(
      `INSERT INTO lesson_blocks(lesson_id,block_type,content_json,position)
       VALUES(?1,'arbitrary-future-type','{}',11)`,
    ).bind(fixtureLessonId).run()).rejects.toThrow()
  })
})