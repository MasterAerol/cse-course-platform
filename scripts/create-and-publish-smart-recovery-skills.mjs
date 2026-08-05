#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdtempSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { createServer } from 'vite'

import {
  LOCAL_CONFIRMATION,
  PRODUCTION_CONFIRMATION,
  buildCanonicalSkillMutationSql,
  planCanonicalSkillChanges,
  resolveCanonicalSkills,
  validateCanonicalTaxonomy,
} from './smart-recovery-skills-publisher-lib.mjs'

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url))
const wranglerPath = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url))

function usage() {
  return `Smart Recovery canonical-skills publisher

Validation only (no database access or writes):
  node scripts/create-and-publish-smart-recovery-skills.mjs --validate-only

Database preflight (read-only; local is the default target):
  node scripts/create-and-publish-smart-recovery-skills.mjs --dry-run [--local|--remote]

Publish locally:
  node scripts/create-and-publish-smart-recovery-skills.mjs --publish --local --confirm ${LOCAL_CONFIRMATION}

Publish remotely (never run before migration 0015 is applied remotely):
  node scripts/create-and-publish-smart-recovery-skills.mjs --publish --remote --confirm ${PRODUCTION_CONFIRMATION}

Optional database flags:
  --database <binding-or-name>   Defaults to DB.
  --persist-to <directory>      Local D1 persistence directory.

This script only inserts or updates canonical rows in skills. It never publishes
fixed-question mappings, recovery attempts, snapshots, choices, or answers.`
}

export function parsePublisherArguments(argv) {
  const options = {
    mode: null,
    target: 'local',
    database: 'DB',
    confirmation: null,
    persistTo: null,
    help: false,
  }
  const modeFlags = new Set()
  const targetFlags = new Set()

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--help' || argument === '-h') options.help = true
    else if (argument === '--validate-only') modeFlags.add('validate-only')
    else if (argument === '--dry-run') modeFlags.add('dry-run')
    else if (argument === '--publish') modeFlags.add('publish')
    else if (argument === '--local') targetFlags.add('local')
    else if (argument === '--remote') targetFlags.add('remote')
    else if (argument === '--database' || argument === '--confirm' || argument === '--persist-to') {
      const value = argv[index + 1]
      if (value === undefined || value.startsWith('--')) throw new Error(`${argument} requires a value.`)
      if (argument === '--database') options.database = value
      if (argument === '--confirm') options.confirmation = value
      if (argument === '--persist-to') options.persistTo = value
      index += 1
    } else {
      throw new Error(`Unknown argument ${argument}.`)
    }
  }

  if (options.help) return options
  if (modeFlags.size !== 1) throw new Error('Choose exactly one mode: --validate-only, --dry-run, or --publish.')
  if (targetFlags.size > 1) throw new Error('Choose only one database target: --local or --remote.')
  options.mode = [...modeFlags][0]
  options.target = targetFlags.size === 0 ? 'local' : [...targetFlags][0]
  if (options.database.trim() === '') throw new Error('--database cannot be empty.')
  if (options.target === 'remote' && options.persistTo !== null) throw new Error('--persist-to is only valid with --local.')
  if (options.mode === 'validate-only' && (targetFlags.size > 0 || options.persistTo !== null)) {
    throw new Error('--validate-only does not access D1; omit database target and persistence flags.')
  }
  if (options.mode === 'publish') {
    const expected = options.target === 'remote' ? PRODUCTION_CONFIRMATION : LOCAL_CONFIRMATION
    if (options.confirmation !== expected) throw new Error(`Pass --confirm ${expected} to publish to ${options.target} D1.`)
  } else if (options.confirmation !== null) {
    throw new Error('--confirm is only valid with --publish.')
  }
  return options
}

async function loadAuthoritativeTaxonomy() {
  const vite = await createServer({
    root: repositoryRoot,
    appType: 'custom',
    logLevel: 'silent',
    server: { middlewareMode: true },
  })
  try {
    const taxonomy = await vite.ssrLoadModule('/src/worker/domain/smart-recovery-skills.ts')
    return {
      taxonomyVersion: taxonomy.SMART_RECOVERY_TAXONOMY_VERSION,
      skills: taxonomy.skillDefinitions,
      mappings: taxonomy.generatorSkillMappings,
      sourceValidation: taxonomy.validateSkillTaxonomy(),
    }
  } finally {
    await vite.close()
  }
}

function d1Arguments(options, sqlMode, sqlValue) {
  const args = [wranglerPath, 'd1', 'execute', options.database, `--${options.target}`, sqlMode, sqlValue, '--yes']
  if (options.persistTo !== null) args.push('--persist-to', options.persistTo)
  return args
}

function runD1(options, sqlMode, sqlValue, json) {
  const args = d1Arguments(options, sqlMode, sqlValue)
  if (json) args.push('--json')
  const result = spawnSync(process.execPath, args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    shell: false,
  })
  if (result.error !== undefined) throw result.error
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || 'No diagnostic output.').trim()
    throw new Error(`Wrangler D1 ${options.target} command failed (${String(result.status)}): ${detail}`)
  }
  if (!json) return null
  try {
    return JSON.parse(result.stdout)
  } catch {
    throw new Error('Wrangler D1 returned invalid JSON.')
  }
}

function queryD1(options, sql) {
  const payload = runD1(options, '--command', sql, true)
  if (!Array.isArray(payload) || payload.length !== 1 || !Array.isArray(payload[0]?.results)) {
    throw new Error('Wrangler D1 returned an unexpected query result shape.')
  }
  return payload[0].results
}

function readCatalog(options) {
  const schema = queryD1(options, "SELECT name FROM sqlite_master WHERE type='table' AND name='skills';")
  if (schema.length !== 1) {
    throw new Error(`The skills table does not exist in ${options.target} D1. Apply migration 0015 to that target before publishing.`)
  }
  return {
    courses: queryD1(options, "SELECT id, slug FROM courses WHERE slug='cse-professional' ORDER BY id;"),
    subjects: queryD1(options, "SELECT s.id, s.slug FROM subjects s JOIN courses c ON c.id=s.course_id WHERE c.slug='cse-professional' ORDER BY s.id;"),
    topics: queryD1(options, "SELECT t.id, t.slug, t.subject_id, s.slug AS subject_slug FROM topics t JOIN subjects s ON s.id=t.subject_id JOIN courses c ON c.id=s.course_id WHERE c.slug='cse-professional' ORDER BY t.id;"),
    lessons: queryD1(options, "SELECT l.id, l.slug, l.topic_id, t.slug AS topic_slug, s.slug AS subject_slug FROM lessons l JOIN topics t ON t.id=l.topic_id JOIN subjects s ON s.id=t.subject_id JOIN courses c ON c.id=s.course_id WHERE c.slug='cse-professional' ORDER BY l.id;"),
    existingSkills: queryD1(options, 'SELECT public_id, slug, taxonomy_version, subject_id, topic_id, related_lesson_id, title, description, status FROM skills ORDER BY slug;'),
  }
}

function executeMutationFile(options, sql) {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'cse-smart-recovery-skills-'))
  const sqlPath = join(temporaryDirectory, 'canonical-skills.sql')
  try {
    writeFileSync(sqlPath, sql, { encoding: 'utf8', flag: 'wx' })
    runD1(options, '--file', sqlPath, false)
  } finally {
    unlinkSync(sqlPath)
    rmdirSync(temporaryDirectory)
  }
}

function formatSummary(label, summary) {
  return `${label} taxonomy_version=${summary.taxonomyVersion} skills=${summary.skillCount} active=${summary.activeSkillCount} deprecated=${summary.deprecatedSkillCount} generator_mappings=${summary.mappingCount}`
}

export async function runPublisher(argv) {
  const options = parsePublisherArguments(argv)
  if (options.help) {
    console.log(usage())
    return
  }

  const source = await loadAuthoritativeTaxonomy()
  const taxonomySummary = validateCanonicalTaxonomy(source)
  if (options.mode === 'validate-only') {
    console.log(formatSummary('SMART_RECOVERY_SKILLS_VALID', taxonomySummary))
    return
  }

  const catalog = readCatalog(options)
  const { resolved } = resolveCanonicalSkills(source, catalog)
  const plan = planCanonicalSkillChanges(
    resolved,
    catalog.existingSkills,
    () => `skill-${randomUUID()}`,
  )
  console.log(`${options.mode === 'dry-run' ? 'SMART_RECOVERY_SKILLS_DRY_RUN' : 'SMART_RECOVERY_SKILLS_PREFLIGHT'} target=${options.target} taxonomy_version=${taxonomySummary.taxonomyVersion} source=${plan.sourceSkillCount} create=${plan.created} update=${plan.updated} unchanged=${plan.unchanged} unmanaged_preserved=${plan.existingUnmanagedCount}`)
  if (options.mode === 'dry-run') return

  const sql = buildCanonicalSkillMutationSql(plan)
  if (sql !== null) executeMutationFile(options, sql)

  const verificationCatalog = readCatalog(options)
  const verificationResolved = resolveCanonicalSkills(source, verificationCatalog).resolved
  const verificationPlan = planCanonicalSkillChanges(
    verificationResolved,
    verificationCatalog.existingSkills,
    () => { throw new Error('Post-publish verification found a missing canonical skill.') },
  )
  if (verificationPlan.changes.length !== 0 || verificationPlan.unchanged !== taxonomySummary.skillCount) {
    throw new Error(`Post-publish verification failed: ${verificationPlan.created} missing, ${verificationPlan.updated} stale, ${verificationPlan.unchanged} matched.`)
  }
  console.log(`SMART_RECOVERY_SKILLS_PUBLISHED target=${options.target} created=${plan.created} updated=${plan.updated} unchanged=${plan.unchanged} verified=${verificationPlan.unchanged} unmanaged_preserved=${verificationPlan.existingUnmanagedCount}`)
}

const invokedPath = process.argv[1] === undefined ? null : pathToFileURL(process.argv[1]).href
if (invokedPath === import.meta.url) {
  runPublisher(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
