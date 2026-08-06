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
import { DatabaseSync } from 'node:sqlite'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const root = path.resolve(import.meta.dirname, '..')
const migrationName = '0015_smart_recovery_taxonomy_and_sessions.sql'
const migrationPath = path.join(root, 'migrations', migrationName)
const temporaryRoot = mkdtempSync(
  path.join(tmpdir(), 'cse-smart-recovery-wrangler-'),
)
const wranglerEntrypoint = path.join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js')

type QueryResult = { results: Array<Record<string, unknown>> }

function runWrangler(args: readonly string[]): string {
  const result = spawnSync(
    process.execPath,
    [wranglerEntrypoint, ...args],
    {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1' },
      timeout: 120_000,
      windowsHide: true,
    },
  )
  if (result.status !== 0) {
    throw new Error(
      `Wrangler failed (${result.status ?? 'no status'}).\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`,
    )
  }
  return result.stdout
}

function createProject(name: string, throughMigration: number): {
  configPath: string
  migrationsPath: string
  persistPath: string
} {
  const projectPath = path.join(temporaryRoot, name)
  const migrationsPath = path.join(projectPath, 'migrations')
  const persistPath = path.join(projectPath, 'persist')
  mkdirSync(migrationsPath, { recursive: true })
  mkdirSync(persistPath, { recursive: true })
  for (const filename of Array.from({ length: throughMigration }, (_, index) =>
    `${String(index + 1).padStart(4, '0')}_`,
  )) {
    const source = path.join(root, 'migrations')
    const match = readFileNames(source).find((entry) => entry.startsWith(filename))
    if (match === undefined) throw new Error(`Migration ${filename} was not found.`)
    copyFileSync(path.join(source, match), path.join(migrationsPath, match))
  }
  const configPath = path.join(projectPath, 'wrangler.jsonc')
  writeFileSync(
    configPath,
    JSON.stringify({
      name: `smart-recovery-${name}`,
      main: './unused-worker.js',
      compatibility_date: '2026-07-27',
      d1_databases: [{
        binding: 'DB',
        database_name: `smart-recovery-${name}`,
        database_id: '00000000-0000-4000-8000-000000000015',
        migrations_dir: 'migrations',
      }],
    }),
  )
  return { configPath, migrationsPath, persistPath }
}

function readFileNames(directory: string): string[] {
  return readdirSync(directory).filter((entry) => entry.endsWith('.sql'))
}

function applyMigrations(project: ReturnType<typeof createProject>): void {
  runWrangler([
    'd1', 'migrations', 'apply', 'DB', '--local',
    '--persist-to', project.persistPath,
    '--config', project.configPath,
  ])
}

function query(
  project: ReturnType<typeof createProject>,
  sql: string,
): QueryResult[] {
  const output = runWrangler([
    'd1', 'execute', 'DB', '--local', '--json',
    '--persist-to', project.persistPath,
    '--config', project.configPath,
    '--command', sql,
  ])
  return JSON.parse(output) as QueryResult[]
}

function scalar(results: QueryResult[], key: string): number {
  const value = results[0]?.results[0]?.[key]
  if (typeof value !== 'number') throw new Error(`Missing numeric ${key}.`)
  return value
}

let fresh: ReturnType<typeof createProject>
let upgrade: ReturnType<typeof createProject>

beforeAll(() => {
  fresh = createProject('fresh', 15)
  upgrade = createProject('upgrade', 14)
})

afterAll(() => {
  const resolved = path.resolve(temporaryRoot)
  const expectedPrefix = path.resolve(tmpdir()) + path.sep
  if (!resolved.startsWith(expectedPrefix) || !path.basename(resolved).startsWith('cse-smart-recovery-wrangler-')) {
    throw new Error('Refusing to remove an unexpected migration test directory.')
  }
  rmSync(resolved, { recursive: true })
})

describe('0015 Wrangler migration compatibility', () => {
  it('reproduces the exact incomplete trigger prefix rejected by SQLite', () => {
    const database = new DatabaseSync(':memory:')
    database.exec('CREATE TABLE recovery_attempts(id INTEGER PRIMARY KEY,status TEXT,question_count INTEGER);')
    database.exec('CREATE TABLE recovery_question_snapshots(id INTEGER PRIMARY KEY,attempt_id INTEGER);')
    const incompleteStatement = `CREATE TRIGGER trg_recovery_attempt_submit_integrity
      BEFORE UPDATE OF status ON recovery_attempts
      WHEN NEW.status='submitted' BEGIN
        SELECT CASE WHEN (
          SELECT COUNT(*) FROM recovery_question_snapshots WHERE attempt_id=NEW.id
        )<>NEW.question_count
        THEN RAISE(ABORT,'recovery snapshot count does not match question count') END`
    expect(() => database.exec(incompleteStatement)).toThrow(/incomplete input/i)
    database.close()
  })

  it('keeps every fixed trigger body to one statement without nested CASE', () => {
    const sql = readFileSync(migrationPath, 'utf8')
    expect(sql).not.toContain('SELECT CASE')
    expect(sql).not.toContain('trg_recovery_attempt_submit_integrity')
    expect(sql).toContain('trg_recovery_attempt_submit_snapshot_count')
    expect(sql).toContain('trg_recovery_attempt_submit_correct_choice')
    const triggerBodies = [...sql.matchAll(/CREATE TRIGGER[\s\S]*?\bBEGIN\b([\s\S]*?)\bEND;/g)]
    expect(triggerBodies).toHaveLength(13)
    for (const [, body] of triggerBodies) {
      expect(body?.match(/;/g)).toHaveLength(1)
    }
  })

  it('applies all migrations to a clean isolated Wrangler-local database', () => {
    applyMigrations(fresh)
    const results = query(
      fresh,
      `SELECT COUNT(*) AS migration_count FROM d1_migrations WHERE name='${migrationName}';
       SELECT COUNT(*) AS smart_table_count FROM sqlite_master WHERE type='table' AND name IN(
         'skills','practice_question_skills','quiz_question_skills','recovery_attempts',
         'recovery_question_snapshots','recovery_question_choices','recovery_answers');
       SELECT COUNT(*) AS submit_trigger_count FROM sqlite_master WHERE type='trigger' AND name IN(
         'trg_recovery_attempt_submit_snapshot_count','trg_recovery_attempt_submit_correct_choice');
       PRAGMA foreign_key_check;`,
    )
    expect(scalar([results[0]], 'migration_count')).toBe(1)
    expect(scalar([results[1]], 'smart_table_count')).toBe(7)
    expect(scalar([results[2]], 'submit_trigger_count')).toBe(2)
    expect(results[3]?.results).toEqual([])
  })

  it('upgrades an isolated pre-0015 database without changing prior catalog rows', () => {
    applyMigrations(upgrade)
    const before = query(upgrade, 'SELECT COUNT(*) AS course_count FROM courses;')
    copyFileSync(migrationPath, path.join(upgrade.migrationsPath, migrationName))
    applyMigrations(upgrade)
    const after = query(
      upgrade,
      `SELECT COUNT(*) AS course_count FROM courses;
       SELECT COUNT(*) AS migration_count FROM d1_migrations WHERE name='${migrationName}';
       SELECT COUNT(*) AS smart_table_count FROM sqlite_master WHERE type='table' AND name IN(
         'skills','practice_question_skills','quiz_question_skills','recovery_attempts',
         'recovery_question_snapshots','recovery_question_choices','recovery_answers');
       PRAGMA foreign_key_check;`,
    )
    expect(scalar([after[0]], 'course_count')).toBe(scalar(before, 'course_count'))
    expect(scalar([after[1]], 'migration_count')).toBe(1)
    expect(scalar([after[2]], 'smart_table_count')).toBe(7)
    expect(after[3]?.results).toEqual([])
  })
})
