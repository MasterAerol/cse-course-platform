import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const root = path.resolve(import.meta.dirname, '..')
const migrationName = '0016_add_illustrated_guided_teaching_lesson_blocks.sql'
const temporaryRoot = mkdtempSync(path.join(tmpdir(), 'cse-lesson-block-wrangler-'))
const wranglerEntrypoint = path.join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js')

type QueryResult = { results: Array<Record<string, unknown>> }

function runWrangler(args: readonly string[]): string {
  const result = spawnSync(process.execPath, [wranglerEntrypoint, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
    timeout: 120_000,
    windowsHide: true,
  })
  if (result.status !== 0) {
    throw new Error(
      `Wrangler failed (${result.status ?? 'no status'}).\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`,
    )
  }
  return result.stdout
}

function migrationFiles(): string[] {
  return readdirSync(path.join(root, 'migrations'))
    .filter((entry) => entry.endsWith('.sql'))
    .sort()
}

function createProject(name: string, throughMigration: number) {
  const projectPath = path.join(temporaryRoot, name)
  const migrationsPath = path.join(projectPath, 'migrations')
  const persistPath = path.join(projectPath, 'persist')
  mkdirSync(migrationsPath, { recursive: true })
  mkdirSync(persistPath, { recursive: true })
  for (const filename of migrationFiles().slice(0, throughMigration)) {
    copyFileSync(
      path.join(root, 'migrations', filename),
      path.join(migrationsPath, filename),
    )
  }
  const configPath = path.join(projectPath, 'wrangler.jsonc')
  writeFileSync(configPath, JSON.stringify({
    name: `lesson-block-${name}`,
    main: './unused-worker.js',
    compatibility_date: '2026-07-27',
    d1_databases: [{
      binding: 'DB',
      database_name: `lesson-block-${name}`,
      database_id: '00000000-0000-4000-8000-000000000016',
      migrations_dir: 'migrations',
    }],
  }))
  return { configPath, migrationsPath, persistPath }
}

function applyMigrations(project: ReturnType<typeof createProject>): void {
  runWrangler([
    'd1', 'migrations', 'apply', 'DB', '--local',
    '--persist-to', project.persistPath,
    '--config', project.configPath,
  ])
}

function query(project: ReturnType<typeof createProject>, sql: string): QueryResult[] {
  return JSON.parse(runWrangler([
    'd1', 'execute', 'DB', '--local', '--json',
    '--persist-to', project.persistPath,
    '--config', project.configPath,
    '--command', sql,
  ])) as QueryResult[]
}

let fresh: ReturnType<typeof createProject>
let upgrade: ReturnType<typeof createProject>

beforeAll(() => {
  fresh = createProject('fresh', 16)
  upgrade = createProject('upgrade', 15)
})

afterAll(() => {
  const resolved = path.resolve(temporaryRoot)
  if (
    !resolved.startsWith(path.resolve(tmpdir()) + path.sep) ||
    !path.basename(resolved).startsWith('cse-lesson-block-wrangler-')
  ) throw new Error('Refusing to remove an unexpected migration test directory.')
  rmSync(resolved, { recursive: true })
})

describe('0016 Wrangler-local lesson-block migration compatibility', () => {
  it('applies all migrations in a clean isolated persistence directory', () => {
    applyMigrations(fresh)
    const results = query(
      fresh,
      `SELECT COUNT(*) AS migration_count FROM d1_migrations WHERE name='${migrationName}';
       SELECT sql FROM sqlite_master WHERE type='table' AND name='lesson_blocks';
       SELECT COUNT(*) AS index_count FROM sqlite_master WHERE type='index' AND tbl_name='lesson_blocks';
       PRAGMA foreign_key_check;`,
    )
    expect(results[0]?.results[0]?.migration_count).toBe(1)
    expect(results[1]?.results[0]?.sql).toContain("'illustrated-guided-teaching'")
    expect(results[2]?.results[0]?.index_count).toBe(2)
    expect(results[3]?.results).toEqual([])
  })

  it('upgrades a pre-0016 database without changing stored lesson-block rows', () => {
    applyMigrations(upgrade)
    const before = query(
      upgrade,
      `SELECT id,lesson_id,block_type,content_json,position,created_at,updated_at
       FROM lesson_blocks ORDER BY id;`,
    )[0]?.results ?? []
    copyFileSync(
      path.join(root, 'migrations', migrationName),
      path.join(upgrade.migrationsPath, migrationName),
    )
    applyMigrations(upgrade)
    const results = query(
      upgrade,
      `SELECT id,lesson_id,block_type,content_json,position,created_at,updated_at
       FROM lesson_blocks ORDER BY id;
       SELECT COUNT(*) AS migration_count FROM d1_migrations WHERE name='${migrationName}';
       PRAGMA foreign_key_check;`,
    )
    expect(results[0]?.results).toEqual(before)
    expect(results[1]?.results[0]?.migration_count).toBe(1)
    expect(results[2]?.results).toEqual([])
    expect(readFileSync(path.join(root, 'migrations', migrationName), 'utf8')).toContain(
      "'illustrated-guided-teaching'",
    )
  })
})