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
  validateDeploymentPolicy,
  validateCleanDeploymentSync,
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

  it('requires deployment for Worker runtime routes but preserves tooling-only skip-deploy', () => {
    const runtime = classifyChangedFiles(['src/worker/routes/admin/lesson-block.routes.ts', 'scripts/create-and-publish-example.mjs'])
    expect(runtime).toMatchObject({ deploymentRequired: true, runtimeFiles: ['src/worker/routes/admin/lesson-block.routes.ts'] })
    expect(() => validateDeploymentPolicy(runtime, true)).toThrow('--skip-deploy is not permitted')
    const tooling = classifyChangedFiles(['scripts/lib/release-helper.mjs', 'tests/release-helper.test.ts'])
    expect(tooling).toMatchObject({ deploymentRequired: false, runtimeFiles: [] })
    expect(validateDeploymentPolicy(tooling, true)).toEqual({ deploymentRequired: false, skipDeploy: true })
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
    expect(detectSecrets('scripts/release.mjs', 'const password = environment.CSE_CONTENT_ADMIN_PASSWORD')).toEqual([])
    expect(detectSecrets('src/schema.ts', 'password: z.string().min(12).max(128)')).toEqual([])
    expect(detectSecrets('src/generated.d.ts', 'password: PasswordCredentialData;')).toEqual([])
    expect(detectSecrets('src/login.tsx', "showPassword ? 'Hide password' : 'Show password'")).toEqual([])
    expect(detectSecrets('src/config.ts', `password = '${'a'.repeat(16)}'`)).toContain('password')
    expect(
      detectSecrets('src/config.json', `{"password": "${'b'.repeat(16)}"}`),
    ).toContain('password')
  })

  it('recognizes content-release as controlled release tooling', () => {
    const controlled = tempFile('scripts/content-release.mjs', '--approve-deletions validated-fingerprint')
    expect(inspectChangedFiles(controlled.directory, [controlled.relative]).productionMutationSignals).toEqual([])
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
  it('preserves the tooling-only skip-deploy boundary', () => {
    expect(validateReleaseOptions(parseReleaseArgs([
      '--message', 'Release tooling', '--confirm', 'release-production', '--skip-deploy',
    ]))).toMatchObject({ dryRun: false, skipDeploy: true, message: 'Release tooling' })
  })


  it('allows only an explicitly requested synchronized clean-tree deployment', () => {
    const options = validateReleaseOptions(parseReleaseArgs([
      '--message', 'Redeploy current capability', '--confirm', 'release-production', '--deploy-current',
    ]))
    expect(options).toMatchObject({ deployCurrent: true, skipDeploy: false })
    expect(validateCleanDeploymentSync('abc123\n', 'abc123\n')).toEqual({ head: 'abc123', upstream: 'abc123' })
    expect(() => validateCleanDeploymentSync('abc123', 'def456')).toThrow('match its upstream')
    expect(() => validateReleaseOptions(parseReleaseArgs([
      '--message', 'Invalid', '--confirm', 'release-production', '--deploy-current', '--skip-deploy',
    ]))).toThrow('cannot be combined')
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
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'safe-release-dry-run-'))
    temporaryDirectories.push(directory)
    const releaseScript = path.resolve('scripts/safe-release.mjs')
    const git = (args: string[]) => spawnSync('git', args, { cwd: directory, encoding: 'utf8' })
    expect(git(['init', '-b', 'main']).status).toBe(0)
    expect(git(['config', 'user.email', 'safe-release@example.com']).status).toBe(0)
    expect(git(['config', 'user.name', 'Safe Release Test']).status).toBe(0)
    expect(git(['remote', 'add', 'origin', 'https://github.com/example/repo.git']).status).toBe(0)
    fs.mkdirSync(path.join(directory, 'src'))
    fs.writeFileSync(path.join(directory, 'src/app.ts'), 'export const value = 1\n')
    expect(git(['add', '--all']).status).toBe(0)
    expect(git(['commit', '-m', 'base']).status).toBe(0)
    fs.writeFileSync(path.join(directory, 'src/app.ts'), 'export const value = 2\n')
    const before = git(['status', '--porcelain=v1']).stdout
    const result = spawnSync(process.execPath, [
      releaseScript, '--message', 'Safe release test', '--dry-run', '--skip-validation',
    ], { cwd: directory, encoding: 'utf8' })
    const after = git(['status', '--porcelain=v1']).stdout
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('SAFE RELEASE — PREFLIGHT')
    expect(result.stdout).toContain('SAFE RELEASE — DRY RUN PASS')
    expect(result.stdout).toContain('No staging, commit, push, deployment, migration, or publisher execution occurred.')
    expect(after).toBe(before)
  })
})