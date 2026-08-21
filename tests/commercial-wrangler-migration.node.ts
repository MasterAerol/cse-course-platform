import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'

import { afterAll, describe, expect, it } from 'vitest'

const root = path.resolve(import.meta.dirname, '..')
const migrationsRoot = path.join(root, 'migrations')
const migrationName = '0017_commercial_access_system.sql'
const wranglerEntrypoint = path.join(
  root,
  'node_modules',
  'wrangler',
  'bin',
  'wrangler.js',
)
const temporaryRoot = mkdtempSync(
  path.join(root, '.tmp-commercial-wrangler-'),
)

interface Project {
  root: string
  migrations: string
  persist: string
  config: string
}

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
  return readdirSync(migrationsRoot)
    .filter((name) => /^\d{4}_.+\.sql$/u.test(name))
    .sort()
}

function createProject(name: string, through: number): Project {
  const projectRoot = path.join(temporaryRoot, name)
  const migrations = path.join(projectRoot, 'migrations')
  const persist = path.join(projectRoot, 'persist')
  mkdirSync(migrations, { recursive: true })
  mkdirSync(persist, { recursive: true })
  for (const file of migrationFiles().slice(0, through)) {
    copyFileSync(path.join(migrationsRoot, file), path.join(migrations, file))
  }
  const config = path.join(projectRoot, 'wrangler.jsonc')
  writeFileSync(
    config,
    JSON.stringify({
      name: `commercial-${name}`,
      main: './unused-worker.js',
      compatibility_date: '2026-08-20',
      d1_databases: [
        {
          binding: 'DB',
          database_name: `commercial-${name}`,
          database_id: '00000000-0000-4000-8000-000000000017',
          migrations_dir: 'migrations',
        },
      ],
    }),
  )
  return { root: projectRoot, migrations, persist, config }
}

function apply(project: Project): void {
  runWrangler([
    'd1',
    'migrations',
    'apply',
    'DB',
    '--local',
    '--persist-to',
    project.persist,
    '--config',
    project.config,
  ])
}

function query(project: Project, command: string): QueryResult[] {
  return JSON.parse(
    runWrangler([
      'd1',
      'execute',
      'DB',
      '--local',
      '--json',
      '--persist-to',
      project.persist,
      '--config',
      project.config,
      '--command',
      command,
    ]),
  ) as QueryResult[]
}

function scalar(result: QueryResult | undefined, key: string): number {
  const value = result?.results[0]?.[key]
  if (typeof value !== 'number') throw new Error(`Missing numeric ${key}.`)
  return value
}

afterAll(() => {
  const resolved = path.resolve(temporaryRoot)
  if (
    !resolved.startsWith(`${root}${path.sep}.tmp-commercial-wrangler-`) ||
    !path.basename(resolved).startsWith('.tmp-commercial-wrangler-')
  ) {
    throw new Error('Refusing to remove an unexpected migration-test path.')
  }
  rmSync(resolved, { recursive: true })
})

describe('0017 Wrangler migration compatibility', () => {
  it('applies cleanly to a fresh local Wrangler D1 database', () => {
    const project = createProject('fresh', 17)
    apply(project)
    const result = query(
      project,
      `SELECT COUNT(*) AS migration_count FROM d1_migrations WHERE name='${migrationName}';
       SELECT COUNT(*) AS commercial_tables FROM sqlite_schema WHERE type='table' AND name IN('subscription_plans','commercial_settings','payment_requests','payment_proofs','payments','subscriptions','commercial_entitlements');
       PRAGMA foreign_key_check;`,
    )
    expect(scalar(result[0], 'migration_count')).toBe(1)
    expect(scalar(result[1], 'commercial_tables')).toBe(7)
    expect(result[2]?.results).toEqual([])
  }, 120_000)

  it('upgrades a pre-0017 local database without rewriting users or sessions', () => {
    const project = createProject('upgrade', 16)
    apply(project)
    query(
      project,
      `INSERT INTO users(public_id,email,password_hash,first_name,last_name) VALUES('wrangler-legacy-user','wrangler-legacy@example.test','hash','Legacy','User');
       INSERT INTO user_sessions(user_id,token_hash,expires_at) SELECT id,'wrangler-legacy-session','2099-01-01T00:00:00.000Z' FROM users WHERE public_id='wrangler-legacy-user';`,
    )
    copyFileSync(
      path.join(migrationsRoot, migrationName),
      path.join(project.migrations, migrationName),
    )
    apply(project)
    const result = query(
      project,
      `SELECT COUNT(*) AS user_count FROM users WHERE public_id='wrangler-legacy-user' AND learner_session_generation=0;
       SELECT COUNT(*) AS session_count FROM user_sessions WHERE token_hash='wrangler-legacy-session' AND learner_session_generation IS NULL;
       PRAGMA foreign_key_check;`,
    )
    expect(scalar(result[0], 'user_count')).toBe(1)
    expect(scalar(result[1], 'session_count')).toBe(1)
    expect(result[2]?.results).toEqual([])
  }, 120_000)
})
