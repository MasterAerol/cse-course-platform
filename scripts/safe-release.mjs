#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {
  APPROVED_COMMERCIAL_INFRASTRUCTURE,
  DEFAULT_HEALTH_URL,
  DEFAULT_LIVE_URL,
  FALLBACK_HEALTH_URL,
  FALLBACK_LIVE_URL,
  buildScopedStageArgs,
  classifyChangedFiles,
  formatBytes,
  inspectChangedFiles,
  parseAppliedMigrationNames,
  parsePendingMigrations,
  parseR2BucketInfo,
  parseR2CustomDomains,
  parseR2DevUrlEnabled,
  parseReleaseArgs,
  parseStatusPorcelainZDetailed,
  selectPreflightReleaseScope,
  validateApprovedMigrationCandidate,
  validateApprovedMigrationRelease,
  validateApprovedWranglerCandidate,
  validateApprovedWranglerRelease,
  validateCleanDeploymentSync,
  validateConcurrentReleaseScope,
  validateDeploymentPolicy,
  validateHealthResponse,
  validateReleaseOptions,
  validateStagedScope,
} from './lib/safe-release.mjs'

const HELP = `Safe Release Workflow v1

Usage:
  npm.cmd run release:safe -- --message "Commit message" --confirm release-production
  npm.cmd run release:safe -- --codex --message "Commit message" --confirm release-production
  npm.cmd run release:safe -- --message "Inspect only" --dry-run

Options:
  --message <text>       Required single-line commit message (maximum 120 characters)
  --confirm <phrase>    Required for release: release-production
  --dry-run             Inspect, classify, and validate without Git or production writes
  --deploy-current      On a clean tree, deploy only when HEAD exactly matches its upstream
  --codex               Noninteractive mode; missing approval or review risk blocks
  --skip-deploy         Commit and push validated tooling without a Worker deploy
  --skip-validation     Dry-run only: classify without the full validation suite
  --help                Show this help

This workflow never runs D1 migrations or content publishers.`

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: options.cwd ?? process.cwd(), encoding: 'utf8', shell: false, windowsHide: true, env: { ...process.env, ...(options.env ?? {}) } })
  if (options.print !== false) { if (result.stdout) process.stdout.write(result.stdout); if (result.stderr) process.stderr.write(result.stderr) }
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} exited with code ${result.status}.`)
  return { stdout: result.stdout ?? '', stderr: result.stderr ?? '' }
}
const npmExecPath = process.env.npm_execpath
if (process.platform === 'win32' && !npmExecPath) throw new Error('npm_execpath is required for Safe Release on Windows.')
const NPM_COMMAND = process.platform === 'win32' ? process.execPath : 'npm'
const NPM_PREFIX = process.platform === 'win32' ? [npmExecPath] : []
const git = (args, options) => run('git', args, options)
function fail(reason, detail = 'No commit/push/deploy performed.') { console.error(`\nSAFE RELEASE — BLOCKED\n\nReason:\n${reason}\n\n${detail}`); process.exitCode = 1 }

function ensureNoConflictMarkers(root, files) {
  const findings = []
  for (const file of files) {
    const absolute = path.join(root, ...file.split('/'))
    if (!fs.existsSync(absolute) || !fs.lstatSync(absolute).isFile() || fs.statSync(absolute).size > 2 * 1024 * 1024) continue
    if (/^(?:<<<<<<< |=======|>>>>>>> )/mu.test(fs.readFileSync(absolute, 'utf8'))) findings.push(file)
  }
  if (findings.length) throw new Error(`Unresolved conflict markers detected in: ${findings.join(', ')}`)
}

function validateRepository() {
  const root = git(['rev-parse', '--show-toplevel'], { print: false }).stdout.trim()
  if (path.resolve(root) !== path.resolve(process.cwd())) throw new Error(`Run from repository root: ${root}`)
  const branch = git(['branch', '--show-current'], { print: false }).stdout.trim()
  if (!branch) throw new Error('Detached HEAD detected.')
  if (branch !== 'main') throw new Error(`Current branch is ${branch}; Safe Release requires main.`)
  const gitDir = git(['rev-parse', '--git-dir'], { print: false }).stdout.trim()
  for (const marker of ['MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'rebase-merge', 'rebase-apply']) if (fs.existsSync(path.resolve(root, gitDir, marker))) throw new Error(`Git operation in progress (${marker}).`)
  const conflicts = git(['diff', '--name-only', '--diff-filter=U'], { print: false }).stdout.trim()
  if (conflicts) throw new Error(`Unresolved Git conflicts detected: ${conflicts.replaceAll('\n', ', ')}`)
  if (!git(['remote', 'get-url', 'origin'], { print: false }).stdout.trim()) throw new Error('Git remote origin is missing.')
  const status = git(['status', '--porcelain=v1', '-z', '--untracked-files=all'], { print: false }).stdout
  const entries = parseStatusPorcelainZDetailed(status)
  const scope = selectPreflightReleaseScope(entries)
  return { root, branch, entries, files: scope.approvedFiles, ignoredUntrackedFiles: scope.ignoredUntrackedFiles }
}

function runValidation() {
  const checks = [['Typecheck', NPM_COMMAND, [...NPM_PREFIX, 'run', 'typecheck']], ['Lint', NPM_COMMAND, [...NPM_PREFIX, 'run', 'lint']], ['Tests', NPM_COMMAND, [...NPM_PREFIX, 'test', '--', '--testTimeout=30000']], ['Build', NPM_COMMAND, [...NPM_PREFIX, 'run', 'build']], ['Diff check', 'git', ['diff', '--check']]], passed = []
  for (const [label, command, args] of checks) { console.log(`\nVALIDATION — ${label}`); run(command, args); passed.push(label) }
  return passed
}

function runWranglerReadOnly(repository, args) {
  const executable = path.join(repository.root, 'node_modules', 'wrangler', 'bin', 'wrangler.js')
  return run(process.execPath, [executable, ...args], { print: false, env: { CI: 'true' } }).stdout
}

function verifyApprovedInfrastructureRelease(repository, risk) {
  const approvedCodes = new Set()
  const summaries = []

  if (risk.migrations.length > 0) {
    const migrationPath = path.join(repository.root, ...APPROVED_COMMERCIAL_INFRASTRUCTURE.migrationFile.split('/'))
    const content = fs.readFileSync(migrationPath, 'utf8')
    const candidate = validateApprovedMigrationCandidate({ files: risk.migrations, content })
    const pendingMigrations = parsePendingMigrations(runWranglerReadOnly(repository, [
      'd1', 'migrations', 'list', APPROVED_COMMERCIAL_INFRASTRUCTURE.databaseName, '--remote',
    ]))
    const appliedMigrations = parseAppliedMigrationNames(runWranglerReadOnly(repository, [
      'd1', 'execute', APPROVED_COMMERCIAL_INFRASTRUCTURE.databaseName, '--remote',
      '--command', "SELECT name FROM d1_migrations WHERE name = '0017_commercial_access_system.sql'", '--json',
    ]))
    validateApprovedMigrationRelease({ files: risk.migrations, content, appliedMigrations, pendingMigrations })
    approvedCodes.add('migration_detected')
    summaries.push(candidate.name + ' exact SHA-256 verified, already applied remotely, no pending migrations, not reapplied.')
  }

  if (risk.wranglerConfig.length > 0) {
    const currentContent = fs.readFileSync(path.join(repository.root, APPROVED_COMMERCIAL_INFRASTRUCTURE.wranglerFile), 'utf8')
    const baselineContent = git(['show', 'HEAD:' + APPROVED_COMMERCIAL_INFRASTRUCTURE.wranglerFile], { print: false }).stdout
    const candidate = validateApprovedWranglerCandidate({ files: risk.wranglerConfig, baselineContent, currentContent })
    const bucketState = {
      ...parseR2BucketInfo(runWranglerReadOnly(repository, ['r2', 'bucket', 'info', candidate.bucketName])),
      devUrlEnabled: parseR2DevUrlEnabled(runWranglerReadOnly(repository, ['r2', 'bucket', 'dev-url', 'get', candidate.bucketName])),
      customDomains: parseR2CustomDomains(runWranglerReadOnly(repository, ['r2', 'bucket', 'domain', 'list', candidate.bucketName])),
    }
    validateApprovedWranglerRelease({ files: risk.wranglerConfig, baselineContent, currentContent, bucketState })
    approvedCodes.add('wrangler_config_changed')
    summaries.push(candidate.binding + ' verified against existing private bucket ' + candidate.bucketName + '; r2.dev disabled; no custom domains.')
  }

  const blockers = risk.blockers.filter((blocker) => !approvedCodes.has(blocker.code))
  if (summaries.length > 0) console.log('\nINFRASTRUCTURE - VERIFIED READ-ONLY\n' + summaries.map((item) => '  ' + item).join('\n'))
  return { blockers, summary: summaries.join(' ') || 'None' }
}

async function verifyHealthUrl(url) {
  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    })
    validateHealthResponse(response.status, await response.text())
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`${url}: ${message}`, { cause: error })
  }
}

async function deployWorker(repository, options, passed, gitSummary, publisherSummary, infrastructureSummary) {
  try { console.log('\nCLOUDFLARE — AUTHENTICATION'); run(process.execPath, [path.join(repository.root, 'node_modules', 'wrangler', 'bin', 'wrangler.js'), 'whoami'], { env: options.codex ? { CI: 'true' } : {} }) } catch { fail('Cloudflare authentication unavailable.', `${gitSummary}\nDeployment not performed.`); return false }
  let deployOutput
  try { console.log('\nCLOUDFLARE — DEPLOY'); deployOutput = run(NPM_COMMAND, [...NPM_PREFIX, 'run', 'deploy']).stdout } catch { fail('Cloudflare Worker deployment failed.', `${gitSummary}\nDeployment did not complete.`); return false }
  try {
    console.log('\nPOST-DEPLOY — HEALTH')
    await verifyHealthUrl(DEFAULT_HEALTH_URL)
    await verifyHealthUrl(FALLBACK_HEALTH_URL)
  } catch (error) { console.error(`\nDEPLOYED BUT HEALTH CHECK FAILED\n${error.message}\nNo automatic rollback was attempted.`); process.exitCode = 1; return false }
  const version = deployOutput.match(/(?:Version ID|Current Version ID):\s*([\w-]+)/iu)?.[1] ?? 'reported by Wrangler output above'
  console.log(`\nSAFE RELEASE — APPLICATION DEPLOYED\nValidation: ${passed.join(', ')}\nGit: ${gitSummary}\nWorker: deployed; version ${version}\nHealth: ${DEFAULT_HEALTH_URL} → 200, status ok\nFallback health: ${FALLBACK_HEALTH_URL} → 200, status ok\nInfrastructure: ${infrastructureSummary}\nPublisher: ${publisherSummary}\nLive: ${DEFAULT_LIVE_URL}\nFallback: ${FALLBACK_LIVE_URL}`)
  return true
}

async function main() {
  let args
  try { args = parseReleaseArgs() } catch (error) { fail(error.message); return }
  if (args.has('help')) { console.log(HELP); return }
  let options
  try { options = validateReleaseOptions(args) } catch (error) { fail(error.message); return }
  if (options.skipValidation && !options.dryRun) { fail('--skip-validation is permitted only with --dry-run.'); return }
  console.log('SAFE RELEASE — PREFLIGHT')
  let repository
  try { repository = validateRepository() } catch (error) { fail(error.message); return }
  if (!repository.files.length) {
    if (!options.deployCurrent) { console.log('\nNothing to release.'); return }
    let synchronized
    try {
      synchronized = validateCleanDeploymentSync(
        git(['rev-parse', 'HEAD'], { print: false }).stdout,
        git(['rev-parse', '@{upstream}'], { print: false }).stdout,
      )
    } catch (error) { fail(error.message); return }
    let passed = []
    if (!options.skipValidation) try { passed = runValidation() } catch (error) { fail(error.message); return }
    if (options.dryRun) { console.log(`\nSAFE RELEASE — CLEAN DEPLOY DRY RUN PASS\nWould deploy synchronized commit ${synchronized.head}.\nNo commit, push, deployment, migration, or publisher execution occurred.`); return }
    await deployWorker(repository, options, passed, `current synchronized commit ${synchronized.head}; no commit or push required`, 'controlled separately after capability verification', 'None')
    return
  }
  console.log('\ngit status --short'); git(['status', '--short'])
  console.log('\ngit diff --stat'); git(['diff', '--stat'])
  console.log('\ngit diff --name-only'); git(['diff', '--name-only'])
  const risk = classifyChangedFiles(repository.files)
  console.log(`\nRISK CLASSIFICATION\nChanged files: ${risk.files.length}\nWorker runtime files: ${risk.runtimeFiles.length}\nDeployment required: ${risk.deploymentRequired}\nMigrations: ${risk.migrations.length}\nPublishers requiring separate manual execution: ${risk.publishers.length}\nWrangler/binding changes: ${risk.wranglerConfig.length}`)
  risk.publishers.forEach((file) => console.log(`  Publisher: ${file}`))
  let infrastructure = { blockers: risk.blockers, summary: 'None' }
  try {
    validateDeploymentPolicy(risk, options.skipDeploy)
    ensureNoConflictMarkers(repository.root, repository.files)
    infrastructure = verifyApprovedInfrastructureRelease(repository, risk)
    const inspection = inspectChangedFiles(repository.root, [...repository.files, ...repository.ignoredUntrackedFiles])
    if (inspection.secretFindings.length) throw new Error(`Possible secret detected in ${inspection.secretFindings.map((item) => item.file).join(', ')}. Values were not printed.`)
    if (inspection.largeFiles.length) throw new Error(`Oversized changed file detected: ${inspection.largeFiles.map((item) => `${item.file} (${formatBytes(item.bytes)})`).join(', ')}`)
    if (inspection.suspiciousTemporaryFiles.length) throw new Error(`Suspicious temporary binary detected: ${inspection.suspiciousTemporaryFiles.map((item) => `${item.file} (${formatBytes(item.bytes)})`).join(', ')}`)
    if (inspection.productionMutationSignals.length) throw new Error(`Explicit production-mutation signal detected in ${inspection.productionMutationSignals.map((item) => item.file).join(', ')}.`)
    if (infrastructure.blockers.length) {
      const details = infrastructure.blockers.map((item) => item.reason + '\n' + item.files.map((file) => '  - ' + file).join('\n')).join('\n')
      throw new Error(details + '\n\nHuman action required: use the controlled production procedure.')
    }
  } catch (error) { fail(error.message); return }
  let passed = []
  if (!options.skipValidation) try { passed = runValidation() } catch (error) { fail(error.message); return }
  if (options.dryRun) { console.log(`\nSAFE RELEASE — DRY RUN PASS\nWould commit ${repository.files.length} changed file(s) with message: ${options.message}\nNo staging, commit, push, deployment, migration, or publisher execution occurred.`); return }
  console.log('\nGIT — SCOPED STAGE')
  try {
    const currentStatus = git(['status', '--porcelain=v1', '-z', '--untracked-files=all'], { print: false }).stdout
    const concurrent = validateConcurrentReleaseScope(repository.files, parseStatusPorcelainZDetailed(currentStatus))
    git(buildScopedStageArgs(repository.files))
    const stagedOutput = git(['diff', '--cached', '--name-only', '--no-renames', '-z'], { print: false }).stdout
    const stagedFiles = stagedOutput.split('\0').filter(Boolean)
    const scope = validateStagedScope(repository.files, stagedFiles)
    console.log(`Approved release scope: ${scope.approvedCount} files`)
    console.log(`Staged release scope: ${scope.stagedCount} files`)
    console.log(`Unrelated untracked files ignored: ${concurrent.ignoredUntrackedFiles.length}`)
    const stagedInspection = inspectChangedFiles(repository.root, stagedFiles)
    if (stagedInspection.secretFindings.length || stagedInspection.largeFiles.length || stagedInspection.suspiciousTemporaryFiles.length || stagedInspection.productionMutationSignals.length) {
      git(['restore', '--staged', '--', ...repository.files])
      throw new Error('Staged safety inspection failed. Approved release files were unstaged.')
    }
  } catch (error) {
    const staged = git(['diff', '--cached', '--name-only'], { print: false }).stdout.trim()
    if (staged) git(['restore', '--staged', '--', ...repository.files])
    fail(error.message)
    return
  }
  let commit
  try { console.log('\nGIT — COMMIT'); git(['commit', '-m', options.message]); commit = git(['log', '-1', '--format=%h %s'], { print: false }).stdout.trim(); console.log(commit) } catch (error) { fail(error.message, 'No push/deploy performed. Local work was preserved.'); return }
  try { console.log('\nGIT — PUSH'); git(['push', 'origin', 'main']) } catch { fail('Git push unavailable in this environment.', `Local commit preserved: ${commit}\nDeployment not performed.`); return }
  if (options.skipDeploy) {
    console.log(`\nSAFE RELEASE — TOOLING RELEASED\nValidation: ${passed.join(', ')}\nGit: ${commit}; pushed main → origin/main\nWorker: not deployed (--skip-deploy)\nInfrastructure: ${infrastructure.summary}\nPublisher: ${risk.publisherRequired ? 'NOT PUBLISHED — separate validate/review/confirmation workflow required' : 'None'}`)
    return
  }
  await deployWorker(repository, options, passed, `${commit}; pushed main → origin/main`, risk.publisherRequired ? 'NOT PUBLISHED — separate validate/review/confirmation workflow required' : 'None', infrastructure.summary)
}
await main()