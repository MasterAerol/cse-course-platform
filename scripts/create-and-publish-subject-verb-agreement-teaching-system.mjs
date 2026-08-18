#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { jsonFingerprint, sameJson } from './lib/canonical-json.mjs'
import { subjectVerbAgreementLessonSpecs } from './lib/subject-verb-agreement-teaching-system-content.mjs'

const confirmation = 'publish-subject-verb-agreement-teaching-system-v1'
const csrfHeaderValue = 'same-origin-admin-mutation'
const guidedBlockType = 'illustrated-guided-teaching'

function parseArgs() {
  const args = new Map()
  for (let index = 2; index < process.argv.length; index += 1) {
    const key = process.argv[index]
    if (key === '--validate-only' || key === '--capability-check') { args.set(key.slice(2), 'true'); continue }
    const value = process.argv[index + 1]
    if (key?.startsWith('--') !== true || value === undefined) throw new Error(`Invalid argument near ${key ?? '(end)'}.`)
    args.set(key.slice(2), value)
    index += 1
  }
  return args
}

const ordered = (blocks) => blocks.slice().sort((left, right) => left.position - right.position || left.id - right.id)
const desiredPayload = (block, position) => ({ ...block, position })
const sameBlock = (existing, desired, position) => existing.position === position && existing.type === desired.blockType && sameJson(existing.content, desired.content)

function blockIdentifier(block) {
  const content = block.content ?? {}
  const value = content.title ?? content.text ?? content.expression ?? content.caption ?? content.items?.[0] ?? '(unlabeled block)'
  return String(value).replace(/\s+/g, ' ').slice(0, 160)
}

function buildPlan(existingBlocks, desiredBlocks) {
  const all = ordered(existingBlocks)
  const guided = all.filter((block) => block.type === guidedBlockType)
  const allowed = all.filter((block) => block.type !== guidedBlockType)
  const excess = allowed.slice(desiredBlocks.length)
  const retained = allowed.slice(0, desiredBlocks.length)
  const updates = retained.filter((block, index) => !sameBlock(block, desiredBlocks[index], index + 1))
  const creates = desiredBlocks.slice(retained.length)
  const deletions = [...guided, ...excess].map((block) => ({
    blockId: block.id,
    position: block.position,
    blockType: block.type,
    identifier: blockIdentifier(block),
    reason: block.type === guidedBlockType ? 'IllustratedGuidedTeaching is outside the approved Subject–Verb Agreement v1 teaching architecture.' : 'The block is beyond the canonical lesson block sequence.',
    learnerContentAssessment: 'requires-human-review',
  }))
  return { guidedCount: guided.length, blocksCreated: creates.length, blocksUpdated: updates.length, blocksDeleted: deletions.length, deletions, writesRequired: deletions.length + updates.length + creates.length > 0 }
}

function lessonMismatch(blocks, spec) {
  if (blocks.length !== spec.blocks.length) return `block count mismatch (expected ${spec.blocks.length}, actual ${blocks.length})`
  for (const [index, block] of blocks.entries()) {
    const desired = spec.blocks[index]
    const position = index + 1
    if (block.position !== position) return `block ${position} position mismatch (expected ${position}, actual ${block.position})`
    if (block.type !== desired.blockType) return `block ${position} type mismatch (expected ${desired.blockType}, actual ${block.type})`
    if (!sameJson(block.content, desired.content)) return `block ${position} content fingerprint mismatch (expected ${jsonFingerprint(desired.content)}, actual ${jsonFingerprint(block.content)})`
  }
  return null
}

async function main() {
  const args = parseArgs()
  const validateOnly = args.get('validate-only') === 'true'
  const capabilityCheck = args.get('capability-check') === 'true'
  const baseUrl = args.get('base-url') ?? 'http://127.0.0.1:5173'
  if (!validateOnly && !capabilityCheck && args.get('confirm') !== confirmation) throw new Error(`Pass --confirm ${confirmation} to publish.`)
  let cookie = args.get('cookie') ?? null
  async function request(path, options = {}) {
    const headers = new Headers(options.headers)
    headers.set('accept', 'application/json')
    if (cookie !== null) headers.set('cookie', cookie)
    if (options.body !== undefined) headers.set('content-type', 'application/json')
    if (options.method !== undefined && options.method !== 'GET') headers.set('x-cse-admin-csrf', csrfHeaderValue)
    const response = await fetch(`${baseUrl}${path}`, { ...options, headers })
    const setCookie = response.headers.get('set-cookie')
    if (setCookie !== null) cookie = setCookie.split(';')[0]
    const body = await response.json()
    if (!response.ok || body.success !== true) throw new Error(`${options.method ?? 'GET'} ${path} failed: ${JSON.stringify(body)}`)
    return body.data
  }
  if (cookie === null) {
    const email = args.get('email')
    const password = process.env.CSE_SUBJECT_VERB_AGREEMENT_ADMIN_PASSWORD
    if (email === undefined || password === undefined) throw new Error('Pass --cookie, or --email with CSE_SUBJECT_VERB_AGREEMENT_ADMIN_PASSWORD set securely in the environment.')
    await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  }
  const dashboard = await request('/api/admin/dashboard')
  const courseId = dashboard.cseProfessional?.id
  if (courseId === undefined) throw new Error('CSE Professional course was not found.')
  const course = await request(`/api/admin/courses/${courseId}`)
  const subject = course.subjects.find((item) => item.slug === 'verbal-ability')
  const topic = subject?.topics.find((item) => item.slug === 'subject-verb-agreement')
  if (topic === undefined || topic.lessons.length !== subjectVerbAgreementLessonSpecs.length) throw new Error('Subject–Verb Agreement must contain exactly the twelve expected lessons.')
  const capabilityLesson = topic.lessons.find((item) => item.slug === subjectVerbAgreementLessonSpecs[0]?.slug)
  if (capabilityLesson === undefined) throw new Error('Subject–Verb Agreement capability lesson was not found.')
  const capability = await request(`/api/admin/lessons/${capabilityLesson.id}/subject-verb-agreement-teaching-system-v1/capability`)
  if (capability?.supported !== true || capability.operation !== 'subject-verb-agreement-teaching-system-v1' || capability.topicSlug !== 'subject-verb-agreement') throw new Error('Production Worker does not report the Subject–Verb Agreement reconciliation capability.')
  if (capabilityCheck) {
    console.log(JSON.stringify({ supported: true, operation: capability.operation, topicSlug: capability.topicSlug }))
    return
  }
  const states = []
  for (const [lessonIndex, spec] of subjectVerbAgreementLessonSpecs.entries()) {
    const lesson = topic.lessons.find((item) => item.slug === spec.slug)
    if (lesson === undefined) throw new Error(`Missing Subject–Verb Agreement lesson ${spec.slug}.`)
    if (lesson.lessonType !== spec.lessonType || lesson.estimatedMinutes !== spec.estimatedMinutes || lesson.position !== lessonIndex + 1) throw new Error(`${spec.title} has unexpected activity type, duration, or position.`)
    const response = await request(`/api/admin/lessons/${lesson.id}/blocks`)
    const positions = response.blocks.map((block) => block.position)
    if (new Set(positions).size !== positions.length) throw new Error(`${spec.title} has duplicate block positions.`)
    const plan = buildPlan(response.blocks, spec.blocks)
    states.push({ spec, lesson, existingBlocks: response.blocks, plan })
  }
  const reports = states.map(({ spec, lesson, existingBlocks, plan }) => ({ lessonSlug: spec.slug, title: spec.title, lessonStatus: lesson.status, currentBlockCount: existingBlocks.length, desiredBlockCount: spec.blocks.length, guidedBlocksRemoved: plan.guidedCount, blocksCreated: plan.blocksCreated, blocksUpdated: plan.blocksUpdated, blocksDeleted: plan.blocksDeleted, deletions: plan.deletions, writeRequired: plan.writesRequired }))
  const totals = reports.reduce((result, report) => ({ lessonsChanged: result.lessonsChanged + (report.writeRequired ? 1 : 0), blocksCreated: result.blocksCreated + report.blocksCreated, blocksUpdated: result.blocksUpdated + report.blocksUpdated, blocksDeleted: result.blocksDeleted + report.blocksDeleted, guidedBlocksRemoved: result.guidedBlocksRemoved + report.guidedBlocksRemoved }), { lessonsChanged: 0, blocksCreated: 0, blocksUpdated: 0, blocksDeleted: 0, guidedBlocksRemoved: 0 })
  const deletionPlan = reports.flatMap((report) => report.deletions.map((deletion) => ({ lessonSlug: report.lessonSlug, title: report.title, ...deletion })))
  const deletionPlanFingerprint = deletionPlan.length === 0 ? null : createHash('sha256').update(JSON.stringify(deletionPlan)).digest('hex')
  const deletionReviewRequired = deletionPlan.length > 0
  if (validateOnly) {
    console.log(JSON.stringify({ valid: true, operation: 'subject-verb-agreement-teaching-system-v1', topicSlug: 'subject-verb-agreement', lessonCount: subjectVerbAgreementLessonSpecs.length, writesRequired: totals.lessonsChanged > 0, totals, deletionReviewRequired, deletionPlanFingerprint, deletions: deletionPlan, lessons: reports }, null, 2))
    return
  }
  if (deletionReviewRequired && args.get('approve-deletions') !== deletionPlanFingerprint) throw new Error(`Review every planned deletion, then pass --approve-deletions ${deletionPlanFingerprint}.`)
  for (const state of states) {
    if (!state.plan.writesRequired) continue
    await request(`/api/admin/lessons/${state.lesson.id}/subject-verb-agreement-teaching-system-v1`, { method: 'PUT', body: JSON.stringify({ blocks: state.spec.blocks.map((block, index) => desiredPayload(block, index + 1)) }) })
  }
  const verifiedLessons = []
  for (const state of states) {
    const response = await request(`/api/admin/lessons/${state.lesson.id}/blocks`)
    const blocks = ordered(response.blocks)
    const mismatch = lessonMismatch(blocks, state.spec)
    if (mismatch !== null) throw new Error(`Post-publish validation failed for ${state.spec.title}: ${mismatch}.`)
    verifiedLessons.push({ lessonSlug: state.spec.slug, blockCount: blocks.length, visualBlockCount: blocks.filter((block) => block.content?.visual !== undefined).length, guidedBlockCount: 0 })
  }
  console.log(JSON.stringify({ published: true, updated: totals.lessonsChanged > 0, operation: 'subject-verb-agreement-teaching-system-v1', topicSlug: 'subject-verb-agreement', lessonCount: subjectVerbAgreementLessonSpecs.length, totals, lessons: verifiedLessons, unrelatedTopicsModified: 0 }, null, 2))
}

main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1 })
