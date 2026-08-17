import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  classifyChangedFiles,
  detectSecrets,
  inspectChangedFiles,
  parseReleaseArgs,
  runReleasePhases,
  validateHealthResponse,
  validatePreflightSnapshot,
  validateReleaseOptions,
} from '../scripts/lib/safe-release.mjs'

const temporaryDirectories: string[] = []
afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) fs.rmSync(directory, { recursive: true, force: true })
})

function preflight(overrides: Partial<Parameters<typeof validatePreflightSnapshot>[0]> = {}) {
  return validatePreflightSnapshot({
    root: 'C:/repo', cwd: 'C:/repo', branch: 'main', detached: false,
    operation: null, conflicts: [], remote: 'https://github.com/example/repo.git', files: ['src/app.ts'],
    ...overrides,
  })
}

function tempFile(name: string, content: string | Buffer) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'safe-release-'))
  temporaryDirectories.push(directory)
  const file = path.join(directory, name)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
  return { directory, relative: name.replaceAll('\\', '/') }
}

describe('Safe Release Workflow v1', () => {
  it('returns clean without releasing when the working tree has no changes', () => {
    expect(preflight({ files: [] })).toBe('clean')
  })

  it('blocks a branch other than main and detached HEAD', () => {
    expect(() => preflight({ branch: 'feature/work' })).toThrow('requires main')
    expect(() => preflight({ branch: '', detached: true })).toThrow('Detached HEAD')
  })

  it('blocks migrations with a controlled-production reason', () => {
    const risk = classifyChangedFiles(['migrations/0016_example.sql', 'src/app.ts'])
    expect(risk.blockers).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'migration_detected' })]))
  })

  it('allows a publisher change as application-deployable but marks content manual', () => {
    const risk = classifyChangedFiles(['scripts/create-and-publish-average-teaching-system.mjs', 'src/react-app/App.tsx'])
    expect(risk.blockers).toHaveLength(0)
    expect(risk.publisherRequired).toBe(true)
  })

  it('classifies ordinary frontend, Worker, test, and documentation changes as safe', () => {
    expect(classifyChangedFiles(['src/react-app/App.tsx', 'src/worker/index.ts', 'tests/app.test.ts', 'docs/guide.md']).blockers).toHaveLength(0)
  })

  it.each(['Typecheck', 'Lint', 'Tests', 'Build'])('stops immediately when %s fails', async (failedName) => {
    const visited: string[] = []
    const names = ['Typecheck', 'Lint', 'Tests', 'Build', 'Diff check', 'Commit']
    await expect(runReleasePhases(names.map((name) => ({ name, run: () => { visited.push(name); if (name === failedName) throw new Error(`${name} failed`) } })))).rejects.toThrow(`${failedName} failed`)
    expect(visited).not.toContain('Commit')
    expect(visited.at(-1)).toBe(failedName)
  })

  it('detects likely secrets without printing their values and permits test fixtures', () => {
    const value = `ghp_${'a'.repeat(30)}`
    expect(detectSecrets('src/config.ts', `token = '${value}'`)).toContain('GitHub token')
    expect(detectSecrets('tests/config.test.ts', `token = '${value}'`)).toEqual([])
  })

  it('detects oversized files and suspicious temporary binaries', () => {
    const big = tempFile('assets/large.bin', Buffer.alloc(101))
    const inspection = inspectChangedFiles(big.directory, [big.relative], { maxBytes: 100 })
    expect(inspection.largeFiles).toEqual([{ file: 'assets/large.bin', bytes: 101 }])
    const binary = tempFile('.tmp/codex-patch.exe', Buffer.alloc(2))
    expect(inspectChangedFiles(binary.directory, [binary.relative]).suspiciousTemporaryFiles[0]?.file).toBe('.tmp/codex-patch.exe')
  })

  it('requires a meaningful commit message and production confirmation', () => {
    expect(() => validateReleaseOptions(parseReleaseArgs([]))).toThrow('--message')
    expect(() => validateReleaseOptions(parseReleaseArgs(['--message', 'Release']))).toThrow('--confirm release-production')
  })

  it('allows dry-run without production confirmation', () => {
    expect(validateReleaseOptions(parseReleaseArgs(['--message', 'Inspect', '--dry-run']))).toMatchObject({ dryRun: true, message: 'Inspect' })
  })

  it('blocks Codex mode when explicit production confirmation is missing', () => {
    expect(() => validateReleaseOptions(parseReleaseArgs(['--codex', '--message', 'Release']))).toThrow('Production release requires')
  })

  it('preserves a local commit boundary when Git credentials fail', async () => {
    const visited: string[] = []
    await expect(runReleasePhases([
      { name: 'Commit', run: () => { visited.push('Commit') } },
      { name: 'Push credentials', run: () => { visited.push('Push credentials'); throw new Error('Git push unavailable') } },
      { name: 'Deploy', run: () => { visited.push('Deploy') } },
    ])).rejects.toThrow('Git push unavailable')
    expect(visited).toEqual(['Commit', 'Push credentials'])
  })

  it('does not deploy when Cloudflare credentials are unavailable', async () => {
    const visited: string[] = []
    await expect(runReleasePhases([
      { name: 'Push', run: () => { visited.push('Push') } },
      { name: 'Cloudflare authentication', run: () => { visited.push('Cloudflare authentication'); throw new Error('Cloudflare authentication unavailable') } },
      { name: 'Deploy', run: () => { visited.push('Deploy') } },
    ])).rejects.toThrow('Cloudflare authentication unavailable')
    expect(visited).toEqual(['Push', 'Cloudflare authentication'])
  })

  it('rejects health-check HTTP, JSON, and status failures', () => {
    expect(() => validateHealthResponse(503, '{}')).toThrow('HTTP 503')
    expect(() => validateHealthResponse(200, 'not json')).toThrow('valid JSON')
    expect(() => validateHealthResponse(200, '{"success":true,"data":{"status":"down"}}')).toThrow('data.status "ok"')
    expect(validateHealthResponse(200, '{"success":true,"data":{"status":"ok"}}')).toEqual({ success: true, data: { status: 'ok' } })
  })

  it('runs a real dry-run inspection without staging, committing, pushing, or deploying', () => {
    const before = spawnSync('git', ['status', '--porcelain=v1'], { encoding: 'utf8' }).stdout
    const result = spawnSync(process.execPath, ['scripts/safe-release.mjs', '--message', 'Safe release test', '--dry-run', '--skip-validation'], { encoding: 'utf8' })
    const after = spawnSync('git', ['status', '--porcelain=v1'], { encoding: 'utf8' }).stdout
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('SAFE RELEASE — DRY RUN PASS')
    expect(result.stdout).toContain('No staging, commit, push, deployment, migration, or publisher execution occurred.')
    expect(after).toBe(before)
  })
})