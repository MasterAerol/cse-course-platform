#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const confirm = 'create-validate-publish-analytical-ability-assessment'
import { analyticalAbilityBlueprintV1 as blueprint, generatorPools as pools, requiredTopics } from './analytical-ability-assessment-blueprint.mjs'
const baseInput = { title: 'Analytical Ability Subject Assessment', slug: 'analytical-ability-subject-assessment', description: 'A comprehensive mixed assessment covering all completed Analytical Ability topics.', position: 10, passingScore: 70, questionCount: 45, maximumAttempts: null, timeLimitMinutes: null, showExplanations: true, blueprint }

function args() { const values = new Map(); for (let i = 2; i < process.argv.length; i += 2) { const key = process.argv[i], value = process.argv[i + 1]; if (!key?.startsWith('--') || value === undefined) throw new Error(`Invalid argument near ${key ?? '(end)'}.`); values.set(key.slice(2), value) } return values }
function qualityGate() { const entry = fileURLToPath(new URL('../node_modules/vitest/vitest.mjs', import.meta.url)); const result = spawnSync(process.execPath, [entry, 'run', 'tests/analytical-subject-assessment.test.ts', 'tests/subject-assessment.test.ts'], { stdio: 'inherit' }); if (result.status !== 0) throw new Error('The 11,250-question Analytical assessment quality gate failed.') }

async function main() {
  const options = args(); if (options.get('confirm') !== confirm) throw new Error(`Pass --confirm ${confirm} to continue.`)
  const baseUrl = options.get('base-url') ?? 'http://127.0.0.1:5173'; let cookie = options.get('cookie') ?? null
  async function request(path, init = {}) { const headers = new Headers(init.headers); headers.set('accept','application/json'); if (cookie) headers.set('cookie',cookie); if (init.body !== undefined) headers.set('content-type','application/json'); if (init.method && init.method !== 'GET') headers.set('x-cse-admin-csrf','same-origin-admin-mutation'); const response = await fetch(`${baseUrl}${path}`, { ...init, headers }); const setCookie = response.headers.get('set-cookie'); if (setCookie) cookie = setCookie.split(';')[0]; const body = await response.json(); if (!response.ok || body.success !== true) throw new Error(`${init.method ?? 'GET'} ${path} failed: ${JSON.stringify(body)}`); return body.data }
  if (!cookie) { const email = options.get('email'), password = options.get('password') ?? process.env.CSE_ANALYTICAL_ASSESSMENT_ADMIN_PASSWORD; if (!email || !password) throw new Error('Pass --cookie, or --email plus --password or CSE_ANALYTICAL_ASSESSMENT_ADMIN_PASSWORD.'); await request('/api/auth/login', { method:'POST', body: JSON.stringify({ email, password }) }) }
  const dashboard = await request('/api/admin/dashboard'); const courseId = dashboard.cseProfessional?.id; if (!courseId) throw new Error('CSE Professional was not found.')
  const detail = await request(`/api/admin/courses/${courseId}`); const subject = detail.subjects.find((item) => item.slug === 'analytical-ability'); if (!subject) throw new Error('Analytical Ability was not found.')
  const missing = requiredTopics.filter((slug) => subject.topics.find((topic) => topic.slug === slug)?.status !== 'published'); if (missing.length) throw new Error(`Required published topics missing: ${missing.join(', ')}`)
  const registry = await request('/api/admin/practice-generators'); const registered = new Set(registry.generators.map((item) => `${item.slug}@${item.version}`)); const missingGenerators = pools.flat().filter((slug) => !registered.has(`${slug}@1`)); if (missingGenerators.length) throw new Error(`Required generators missing: ${missingGenerators.join(', ')}`)
  const prior = (await request('/api/admin/subject-assessments/analytical-ability-subject-assessment')).assessment
  const draft = (await request('/api/admin/subject-assessments/analytical-ability-subject-assessment', { method:'PUT', body: JSON.stringify({ ...baseInput, status:'draft', ...(prior ? { updatedAt: prior.updatedAt } : {}) }) })).assessment
  qualityGate()
  await request('/api/admin/subject-assessments/analytical-ability-subject-assessment/validate', { method:'POST' })
  try { await request('/api/admin/subject-assessments/analytical-ability-subject-assessment', { method:'PUT', body: JSON.stringify({ ...baseInput, status:'published', updatedAt: draft.updatedAt }) }) }
  catch (error) { if (prior?.status === 'published') { const current = (await request('/api/admin/subject-assessments/analytical-ability-subject-assessment')).assessment; await request('/api/admin/subject-assessments/analytical-ability-subject-assessment', { method:'PUT', body: JSON.stringify({ ...baseInput, status:'published', updatedAt: current.updatedAt }) }) } throw error }
  console.log('Analytical Ability Subject Assessment was created, validated, and published.')
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
