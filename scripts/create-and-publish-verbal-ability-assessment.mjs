#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { generatorPools, requiredTopics } from './verbal-ability-assessment-blueprint.mjs'
import { assessmentSlug, baseInput, confirmation, passwordEnvironmentName } from './verbal-ability-assessment-publisher-config.mjs'

function parseArgs() {
  const values = new Map()
  for (let index = 2; index < process.argv.length; index += 2) {
    const key = process.argv[index]
    const value = process.argv[index + 1]
    if (!key?.startsWith('--') || value === undefined) throw new Error(`Invalid argument near ${key ?? '(end)'}.`)
    values.set(key.slice(2), value)
  }
  return values
}

function qualityGate() {
  const vitest = fileURLToPath(new URL('../node_modules/vitest/vitest.mjs', import.meta.url))
  const focused = spawnSync(process.execPath, [vitest, 'run', 'tests/verbal-subject-assessment.test.ts', 'tests/subject-assessment-card.test.ts', 'tests/subject-assessment-submit.test.ts', 'tests/verbal-assessment-publisher.test.ts'], { stdio: 'inherit' })
  if (focused.status !== 0) throw new Error('The Verbal assessment focused gate failed, including the 250-attempt/12,500-question stress validation.')
  const lifecycle = spawnSync(process.execPath, [vitest, 'run', 'tests/subject-assessment.test.ts'], { stdio: 'inherit' })
  if (lifecycle.status !== 0) throw new Error('The shared Numerical/Analytical assessment lifecycle regression gate failed.')
}

async function main() {
  const options = parseArgs()
  if (options.get('confirm') !== confirmation) throw new Error(`Pass --confirm ${confirmation} to continue.`)
  const baseUrl = options.get('base-url') ?? 'http://127.0.0.1:5173'
  let cookie = options.get('cookie') ?? null
  async function request(path, init = {}) {
    const headers = new Headers(init.headers)
    headers.set('accept', 'application/json')
    if (cookie !== null) headers.set('cookie', cookie)
    if (init.body !== undefined) headers.set('content-type', 'application/json')
    if (init.method !== undefined && init.method !== 'GET') headers.set('x-cse-admin-csrf', 'same-origin-admin-mutation')
    const response = await fetch(`${baseUrl}${path}`, { ...init, headers })
    const setCookie = response.headers.get('set-cookie')
    if (setCookie !== null) cookie = setCookie.split(';')[0]
    const body = await response.json()
    if (!response.ok || body.success !== true) throw new Error(`${init.method ?? 'GET'} ${path} failed (${response.status}): ${JSON.stringify(body)}`)
    return body.data
  }
  if (cookie === null) {
    const email = options.get('email')
    const password = options.get('password') ?? process.env[passwordEnvironmentName]
    if (email === undefined || password === undefined) throw new Error('Pass --cookie, or --email with --password or CSE_VERBAL_ASSESSMENT_ADMIN_PASSWORD.')
    await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  }
  const dashboard = await request('/api/admin/dashboard')
  const courseId = dashboard.cseProfessional?.id
  if (courseId === undefined) throw new Error('CSE Professional was not found.')
  const detail = await request(`/api/admin/courses/${courseId}`)
  const subject = detail.subjects.find((item) => item.slug === 'verbal-ability')
  if (subject === undefined) throw new Error('Verbal Ability was not found.')
  const missingTopics = requiredTopics.filter((slug) => subject.topics.find((topic) => topic.slug === slug)?.status !== 'published')
  if (missingTopics.length > 0) throw new Error(`Required published topics missing: ${missingTopics.join(', ')}`)
  const registry = await request('/api/admin/practice-generators')
  const registered = new Set(registry.generators.map((item) => `${item.slug}@${item.version}`))
  const missingGenerators = generatorPools.flat().filter((slug) => !registered.has(`${slug}@1`))
  if (missingGenerators.length > 0) throw new Error(`Required generators missing: ${missingGenerators.join(', ')}`)
  const prior = (await request(`/api/admin/subject-assessments/${assessmentSlug}`)).assessment
  const draft = (await request(`/api/admin/subject-assessments/${assessmentSlug}`, { method: 'PUT', body: JSON.stringify({ ...baseInput, status: 'draft', ...(prior === null ? {} : { updatedAt: prior.updatedAt }) }) })).assessment
  try {
    if (draft.status !== 'draft') throw new Error('Assessment did not enter draft status before validation.')
    qualityGate()
    const validation = await request(`/api/admin/subject-assessments/${assessmentSlug}/validate`, { method: 'POST' })
    if (validation.questionCount !== 50 || validation.topicCount !== 10) throw new Error(`Unexpected validation result: ${JSON.stringify(validation)}`)
    const published = (await request(`/api/admin/subject-assessments/${assessmentSlug}`, { method: 'PUT', body: JSON.stringify({ ...baseInput, status: 'published', updatedAt: draft.updatedAt }) })).assessment
    if (published.status !== 'published' || published.questionCount !== 50 || published.blueprint.topics.length !== 10) throw new Error('Published assessment failed its final shape check.')
  } catch (error) {
    if (prior?.status === 'published') {
      const current = (await request(`/api/admin/subject-assessments/${assessmentSlug}`)).assessment
      await request(`/api/admin/subject-assessments/${assessmentSlug}`, { method: 'PUT', body: JSON.stringify({ ...baseInput, status: 'published', updatedAt: current.updatedAt }) })
    }
    throw error
  }
  console.log('Verbal Ability Subject Assessment was created as draft, validated, and published with 50 questions across 10 topics.')
}

main().catch((error) => { console.error(error); process.exitCode = 1 })