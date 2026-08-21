import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

export const RELEASE_CONFIRMATION = 'release-production'
export const DEFAULT_HEALTH_URL = 'https://cse-course-platform.master-course.workers.dev/api/health'
export const DEFAULT_LIVE_URL = 'https://cse-course-platform.master-course.workers.dev'
export const MAX_CHANGED_FILE_BYTES = 15 * 1024 * 1024
export const APPROVED_COMMERCIAL_INFRASTRUCTURE = Object.freeze({
  migrationFile: 'migrations/0017_commercial_access_system.sql',
  migrationName: '0017_commercial_access_system.sql',
  migrationSha256: '65f661b71b8ede6107ff2cc53d4ccc53b80c6be36681769ede3efa26921889a5',
  databaseName: 'cse-course-platform',
  wranglerFile: 'wrangler.jsonc',
  r2Binding: 'PAYMENT_RECEIPTS',
  r2Bucket: 'pasawise-payment-receipts',
})

const booleanFlags = new Set(['help', 'dry-run', 'codex', 'skip-validation', 'skip-deploy', 'deploy-current'])
const valueOptions = new Set(['message', 'confirm'])

export function parseReleaseArgs(argv = process.argv.slice(2)) {
  const parsed = new Map()
  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index]
    if (typeof raw !== 'string' || !raw.startsWith('--')) throw new Error(`Invalid argument near ${raw ?? '(end)'}.`)
    const name = raw.slice(2)
    if (!booleanFlags.has(name) && !valueOptions.has(name)) throw new Error(`Unsupported option --${name}. Run with --help for usage.`)
    if (parsed.has(name)) throw new Error(`Option --${name} was provided more than once.`)
    if (booleanFlags.has(name)) { parsed.set(name, 'true'); continue }
    const value = argv[index + 1]
    if (value === undefined || value.startsWith('--')) throw new Error(`Missing value for --${name}.`)
    parsed.set(name, value)
    index += 1
  }
  return parsed
}

export function validateReleaseOptions(args) {
  const message = (args.get('message') ?? '').trim()
  const dryRun = args.has('dry-run')
  if (message.length === 0) throw new Error('A non-empty --message <commit message> is required.')
  if (message.length > 120) throw new Error('Commit message must be 120 characters or fewer.')
  if (/\r|\n/u.test(message)) throw new Error('Commit message must be a single line.')
  if (!dryRun && args.get('confirm') !== RELEASE_CONFIRMATION) throw new Error(`Production release requires --confirm ${RELEASE_CONFIRMATION}.`)
  if (args.has('deploy-current') && args.has('skip-deploy')) throw new Error('--deploy-current cannot be combined with --skip-deploy.')
  return { message, dryRun, codex: args.has('codex'), skipValidation: args.has('skip-validation'), skipDeploy: args.has('skip-deploy'), deployCurrent: args.has('deploy-current') }
}

export function normalizeGitPath(file) { return file.replaceAll('\\', '/').replace(/^\.\//u, '') }
function stableJson(value) {
  if (Array.isArray(value)) return '[' + value.map(stableJson).join(',') + ']'
  if (value !== null && typeof value === 'object') return '{' + Object.keys(value).sort().map((key) => JSON.stringify(key) + ':' + stableJson(value[key])).join(',') + '}'
  return JSON.stringify(value)
}

function parseStrictJson(content, label) {
  try { return JSON.parse(content) } catch { throw new Error(label + ' must remain strict JSON for this approved release.') }
}

function normalizedTextSha256(content) {
  return crypto.createHash('sha256').update(String(content).replace(/\r\n?/gu, '\n'), 'utf8').digest('hex')
}

function exactInfrastructureFiles(files, expected, label) {
  const normalized = [...new Set(files.map(normalizeGitPath))].sort()
  if (normalized.length !== 1 || normalized[0] !== expected) throw new Error(label + ' approval applies only to ' + expected + '.')
  return normalized
}

export function validateApprovedMigrationCandidate({ files, content }) {
  exactInfrastructureFiles(files, APPROVED_COMMERCIAL_INFRASTRUCTURE.migrationFile, 'Migration')
  const sha256 = normalizedTextSha256(content)
  if (sha256 !== APPROVED_COMMERCIAL_INFRASTRUCTURE.migrationSha256) throw new Error('Migration ' + APPROVED_COMMERCIAL_INFRASTRUCTURE.migrationName + ' does not match the approved SHA-256.')
  return { name: APPROVED_COMMERCIAL_INFRASTRUCTURE.migrationName, sha256 }
}

export function validateApprovedMigrationRelease({ files, content, appliedMigrations, pendingMigrations }) {
  const candidate = validateApprovedMigrationCandidate({ files, content })
  const applied = [...new Set(appliedMigrations.map(String))]
  const pending = [...new Set(pendingMigrations.map(String))]
  if (!applied.includes(candidate.name)) throw new Error('Migration ' + candidate.name + ' is not recorded as applied in production.')
  if (pending.length > 0) throw new Error('Production still has pending migrations: ' + pending.join(', ') + '.')
  return { ...candidate, applied: true, pending: [] }
}

export function validateApprovedWranglerCandidate({ files, baselineContent, currentContent }) {
  exactInfrastructureFiles(files, APPROVED_COMMERCIAL_INFRASTRUCTURE.wranglerFile, 'Wrangler configuration')
  const baseline = parseStrictJson(baselineContent, 'Committed Wrangler configuration')
  const current = parseStrictJson(currentContent, 'Changed Wrangler configuration')
  if (Object.hasOwn(baseline, 'r2_buckets')) throw new Error('The committed Wrangler baseline already has R2 configuration; independent review is required.')
  const expected = structuredClone(baseline)
  expected.r2_buckets = [{
    binding: APPROVED_COMMERCIAL_INFRASTRUCTURE.r2Binding,
    bucket_name: APPROVED_COMMERCIAL_INFRASTRUCTURE.r2Bucket,
  }]
  if (stableJson(current) !== stableJson(expected)) throw new Error('Wrangler configuration contains changes beyond the approved PAYMENT_RECEIPTS R2 binding.')
  return { binding: APPROVED_COMMERCIAL_INFRASTRUCTURE.r2Binding, bucketName: APPROVED_COMMERCIAL_INFRASTRUCTURE.r2Bucket }
}

export function validateApprovedWranglerRelease({ files, baselineContent, currentContent, bucketState }) {
  const candidate = validateApprovedWranglerCandidate({ files, baselineContent, currentContent })
  if (bucketState?.exists !== true || bucketState.name !== candidate.bucketName) throw new Error('Approved R2 bucket ' + candidate.bucketName + ' is missing or mismatched.')
  if (bucketState.devUrlEnabled !== false) throw new Error('Approved R2 bucket ' + candidate.bucketName + ' must keep r2.dev public access disabled.')
  if (!Array.isArray(bucketState.customDomains) || bucketState.customDomains.length > 0) throw new Error('Approved R2 bucket ' + candidate.bucketName + ' must not have a public custom domain.')
  return { ...candidate, private: true }
}

export function parseAppliedMigrationNames(output) {
  let payload
  try { payload = JSON.parse(output) } catch { throw new Error('Remote applied-migration query did not return valid JSON.') }
  if (!Array.isArray(payload) || payload.some((item) => item?.success !== true || !Array.isArray(item.results))) throw new Error('Remote applied-migration query was unsuccessful.')
  return payload.flatMap((item) => item.results).map((row) => row?.name).filter((name) => typeof name === 'string')
}

export function parsePendingMigrations(output) {
  if (/No migrations to apply!/iu.test(output)) return []
  throw new Error('Remote migration list did not confirm that there are no pending migrations.')
}

export function parseR2BucketInfo(output) {
  const name = output.match(/^name:\s*(\S+)\s*$/imu)?.[1]
  if (!name) throw new Error('Remote R2 bucket info did not confirm the bucket name.')
  return { exists: true, name }
}

export function parseR2DevUrlEnabled(output) {
  if (/Public access via the r2\.dev URL is disabled\./iu.test(output)) return false
  if (/Public access via the r2\.dev URL is enabled\./iu.test(output)) return true
  throw new Error('Remote R2 status did not confirm whether r2.dev public access is disabled.')
}

export function parseR2CustomDomains(output) {
  if (/There are no custom domains connected to this bucket\./iu.test(output)) return []
  throw new Error('Remote R2 status did not confirm an empty custom-domain list.')
}
export function parseStatusPorcelainZDetailed(output) {
  const entries = output.split('\0').filter(Boolean), result = []
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index], status = entry.slice(0, 2), file = normalizeGitPath(entry.slice(3))
    const paths = [file]
    if ((status.includes('R') || status.includes('C')) && entries[index + 1] !== undefined) { paths.push(normalizeGitPath(entries[index + 1])); index += 1 }
    for (const item of paths) result.push({ file: item, status, untracked: status === '??', staged: status[0] !== ' ' && status[0] !== '?' })
  }
  return result
}

export function isReleaseRelevantPath(file) {
  const normalized = normalizeGitPath(file)
  return /^(?:src|scripts|tests|docs|migrations|public)\//u.test(normalized) || /^(?:package(?:-lock)?\.json|tsconfig[^/]*\.json|vite[^/]*\.[cm]?[jt]s|vitest[^/]*\.[cm]?[jt]s|eslint\.config\.[cm]?[jt]s|wrangler[^/]*\.(?:jsonc|json|toml))$/u.test(normalized)
}

export function selectPreflightReleaseScope(entries) {
  const staged = entries.filter((entry) => entry.staged)
  if (staged.length > 0) throw new Error(`Preexisting staged files are not permitted: ${[...new Set(staged.map((entry) => entry.file))].sort().join(', ')}`)
  const approvedFiles = [], ignoredUntrackedFiles = []
  for (const entry of entries) {
    if (!entry.untracked || isReleaseRelevantPath(entry.file)) approvedFiles.push(entry.file)
    else ignoredUntrackedFiles.push(entry.file)
  }
  return { approvedFiles: [...new Set(approvedFiles)].sort(), ignoredUntrackedFiles: [...new Set(ignoredUntrackedFiles)].sort() }
}

export function validateConcurrentReleaseScope(approvedFiles, entries) {
  const approved = new Set(approvedFiles.map(normalizeGitPath))
  const stagedOutside = entries.filter((entry) => entry.staged && !approved.has(entry.file)).map((entry) => entry.file)
  if (stagedOutside.length > 0) throw new Error(`Unexpected staged files outside approved release scope: ${[...new Set(stagedOutside)].sort().join(', ')}`)
  const conflicting = entries.filter((entry) => !approved.has(entry.file) && (!entry.untracked || isReleaseRelevantPath(entry.file))).map((entry) => entry.file)
  if (conflicting.length > 0) throw new Error(`Concurrent tracked or release-relevant changes appeared outside approved release scope: ${[...new Set(conflicting)].sort().join(', ')}`)
  const present = new Set(entries.map((entry) => entry.file))
  const missing = [...approved].filter((file) => !present.has(file))
  if (missing.length > 0) throw new Error(`Approved release files changed or disappeared during validation: ${missing.join(', ')}`)
  return { ignoredUntrackedFiles: [...new Set(entries.filter((entry) => entry.untracked && !approved.has(entry.file)).map((entry) => entry.file))].sort() }
}

export function buildScopedStageArgs(approvedFiles) {
  const files = [...new Set(approvedFiles.map(normalizeGitPath))].sort()
  if (files.length === 0) throw new Error('Approved release scope is empty.')
  return ['add', '--all', '--', ...files]
}

export function validateStagedScope(approvedFiles, stagedFiles) {
  const approved = [...new Set(approvedFiles.map(normalizeGitPath))].sort()
  const staged = [...new Set(stagedFiles.map(normalizeGitPath))].sort()
  if (JSON.stringify(staged) !== JSON.stringify(approved)) throw new Error(`Staged scope differs from approved release scope. Expected ${approved.length}; found ${staged.length}.`)
  return { approvedCount: approved.length, stagedCount: staged.length }
}

export function classifyChangedFiles(files) {
  const normalized = [...new Set(files.map(normalizeGitPath))].sort()
  const runtimeFiles = normalized.filter((file) => file.startsWith('src/worker/'))
  const migrations = normalized.filter((file) => file.startsWith('migrations/'))
  const publishers = normalized.filter((file) => /(^|\/)create-and-publish-[^/]+\.mjs$/u.test(file))
  const wranglerConfig = normalized.filter((file) => /(^|\/)wrangler(?:\.[^/]+)?\.(?:jsonc|json|toml)$/iu.test(file))
  const productionMutationScripts = normalized.filter((file) => {
    if (!file.startsWith('scripts/') || publishers.includes(file)) return false
    return /(?:^|[-_.])(repair|migrat(?:e|ion)|seed|rollback|production-mutation|remote-d1)(?:[-_.]|$)/iu.test(path.basename(file))
  })
  const developmentArtifacts = normalized.filter((file) => /^(?:\.tmp|\.wrangler|\.wrangler-logs|backups|dist|coverage)\//iu.test(file))
  const blockers = []
  if (developmentArtifacts.length > 0) blockers.push({ code: 'tracked_development_artifact', reason: 'Ignored development or generated artifact is tracked as a change.', files: developmentArtifacts })
  if (migrations.length > 0) blockers.push({ code: 'migration_detected', reason: 'Database migration detected.', files: migrations })
  if (wranglerConfig.length > 0) blockers.push({ code: 'wrangler_config_changed', reason: 'Wrangler or D1 binding configuration changed.', files: wranglerConfig })
  if (productionMutationScripts.length > 0) blockers.push({ code: 'production_mutation_script', reason: 'Production mutation, repair, migration, seed, or rollback script detected.', files: productionMutationScripts })
  return { files: normalized, runtimeFiles, migrations, publishers, wranglerConfig, productionMutationScripts, developmentArtifacts, blockers, publisherRequired: publishers.length > 0, deploymentRequired: runtimeFiles.length > 0 }
}

export function validateDeploymentPolicy(risk, skipDeploy) {
  if (skipDeploy && risk.deploymentRequired) throw new Error(`--skip-deploy is not permitted because Worker runtime files changed: ${risk.runtimeFiles.join(', ')}`)
  return { deploymentRequired: risk.deploymentRequired, skipDeploy }
}

const secretRules = [
  { name: 'private key', expression: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u },
  { name: 'GitHub token', expression: /\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b/u },
  { name: 'Cloudflare API token', expression: /\bCLOUDFLARE_API_TOKEN\s*[=:]\s*["']?(?!\$|<|example|replace|test|fake|dummy)[A-Za-z0-9._-]{20,}/iu },
  { name: 'bearer token', expression: /\bAuthorization\s*[=:]\s*["']?Bearer\s+(?!\$|<|example|test|fake|dummy)[A-Za-z0-9._-]{20,}/iu },
  { name: 'password', expression: /(?:\b(?:password|passwd|pwd)\b\s*=\s*(?:["'](?!\$|process\.env|environment(?:\.|\[)|<|example|replace|test|fake|dummy|undefined|null)[^"'\r\n]{12,}["']|(?!\$|process\.env|environment(?:\.|\[)|<|example|replace|test|fake|dummy|undefined|null)[A-Za-z0-9._~!@#$%^&*()+={}\[\]:,?/\\-]{12,})|(?:["'](?:password|passwd|pwd)["']|\b(?:password|passwd|pwd)\b)\s*:\s*["'](?!\$|process\.env|environment(?:\.|\[)|<|example|replace|test|fake|dummy|undefined|null)[^"'\r\n]{12,}["'])/iu },
]

export function detectSecrets(file, content) {
  const normalized = normalizeGitPath(file)
  if (/^(?:tests?|fixtures?)\//u.test(normalized) || /\.(?:test|spec)\.[cm]?[jt]sx?$/u.test(normalized)) return []
  if (/^\.env(?:\.|$)/u.test(normalized) && !/\.example$/u.test(normalized)) return ['environment secrets file']
  if (/(^|\/)(?:\.dev\.vars|credentials(?:\.[^/]+)?|secrets(?:\.[^/]+)?|id_rsa|id_ed25519|\.npmrc|\.pypirc)$/iu.test(normalized) && !/\.example$/iu.test(normalized)) return ['credential or secrets file']
  return secretRules.filter((rule) => rule.expression.test(content)).map((rule) => rule.name)
}

export function inspectChangedFiles(root, files, options = {}) {
  const maxBytes = options.maxBytes ?? MAX_CHANGED_FILE_BYTES
  const secretFindings = [], largeFiles = [], suspiciousTemporaryFiles = [], productionMutationSignals = []
  for (const relativeFile of files) {
    const file = normalizeGitPath(relativeFile)
    const absolute = path.join(root, ...file.split('/'))
    if (!fs.existsSync(absolute)) continue
    const stat = fs.lstatSync(absolute)
    if (!stat.isFile()) continue
    if (stat.size > maxBytes) largeFiles.push({ file, bytes: stat.size })
    if (/^(?:\.tmp|tmp|temp)\//iu.test(file) && /\.(?:exe|dll|bin|zip|7z|tar|gz)$/iu.test(file)) suspiciousTemporaryFiles.push({ file, bytes: stat.size })
    if (stat.size <= Math.min(maxBytes, 2 * 1024 * 1024)) {
      const content = fs.readFileSync(absolute, 'utf8')
      for (const kind of detectSecrets(file, content)) secretFindings.push({ file, kind })
      const isPublisher = /(^|\/)create-and-publish-[^/]+\.mjs$/u.test(file)
      const isReleaseWorkflow = /(^|\/)(?:safe-(?:teaching-)?release|content-release)(?:\.d\.mts|\.mjs|\.node\.ts)?$/u.test(file)
      if (file.startsWith('scripts/') && !isPublisher && !isReleaseWorkflow && /--approve-deletions|wrangler\s+d1[\s\S]{0,120}--remote|manual rollback required|production mutation required/iu.test(content)) productionMutationSignals.push({ file, kind: 'explicit production mutation signal' })
    }
  }
  return { secretFindings, largeFiles, suspiciousTemporaryFiles, productionMutationSignals }
}

export function parseStatusPorcelainZ(output) {
  return [...new Set(parseStatusPorcelainZDetailed(output).map((entry) => entry.file))]
}

export function validateHealthResponse(status, body) {
  if (status !== 200) throw new Error(`Health check returned HTTP ${status}.`)
  let payload
  try { payload = JSON.parse(body) } catch { throw new Error('Health check did not return valid JSON.') }
  if (payload === null || typeof payload !== 'object' || payload.success !== true || payload.data === null || typeof payload.data !== 'object' || payload.data.status !== 'ok') throw new Error('Health check payload did not contain success true and data.status "ok".')
  return payload
}

export function formatBytes(bytes) { return `${(bytes / (1024 * 1024)).toFixed(2)} MB` }
export function validatePreflightSnapshot(snapshot) {
  if (path.resolve(snapshot.root) !== path.resolve(snapshot.cwd)) throw new Error(`Run from repository root: ${snapshot.root}`)
  if (snapshot.detached || !snapshot.branch) throw new Error('Detached HEAD detected.')
  if (snapshot.branch !== 'main') throw new Error(`Current branch is ${snapshot.branch}; Safe Release requires main.`)
  if (snapshot.operation) throw new Error(`Git operation in progress (${snapshot.operation}).`)
  if (snapshot.conflicts.length) throw new Error(`Unresolved Git conflicts detected: ${snapshot.conflicts.join(', ')}`)
  if (!snapshot.remote) throw new Error('Git remote origin is missing.')
  return snapshot.files.length === 0 ? 'clean' : 'changed'
}

export function validateCleanDeploymentSync(head, upstream) {
  const current = String(head ?? '').trim()
  const tracked = String(upstream ?? '').trim()
  if (current.length === 0 || tracked.length === 0) throw new Error('Clean-tree deployment requires HEAD and its upstream commit.')
  if (current !== tracked) throw new Error('Clean-tree deployment requires HEAD to match its upstream commit exactly.')
  return { head: current, upstream: tracked }
}

export async function runReleasePhases(phases) {
  const completed = []
  for (const phase of phases) {
    await phase.run()
    completed.push(phase.name)
  }
  return completed
}