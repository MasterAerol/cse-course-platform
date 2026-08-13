#!/usr/bin/env node

import { percentageLessonSpecs } from './lib/percentage-teaching-system-content.mjs'
import { jsonFingerprint, sameJson } from './lib/canonical-json.mjs'

const confirmation = 'publish-percentage-teaching-system-v1'
const csrfHeaderValue = 'same-origin-admin-mutation'
const guidedBlockType = 'illustrated-guided-teaching'

function parseArgs() {
  const args = new Map()
  for (let index = 2; index < process.argv.length; index += 1) {
    const key = process.argv[index]
    if (key === '--validate-only') { args.set('validate-only', 'true'); continue }
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

function buildPlan(existingBlocks, desiredBlocks) {
  const all = ordered(existingBlocks)
  const guided = all.filter((block) => block.type === guidedBlockType)
  const allowed = all.filter((block) => block.type !== guidedBlockType)
  const excess = allowed.slice(desiredBlocks.length)
  const retained = allowed.slice(0, desiredBlocks.length)
  const updates = retained.flatMap((block, index) => sameBlock(block, desiredBlocks[index], index + 1) ? [] : [{ block, desired: desiredBlocks[index], position: index + 1 }])
  const creates = desiredBlocks.slice(retained.length).map((block, index) => ({ desired: block, position: retained.length + index + 1 }))
  return { deletes: [...guided, ...excess], updates, creates, guidedCount: guided.length, writesRequired: guided.length + excess.length + updates.length + creates.length > 0 }
}

function summarizePlan(lesson, existingBlocks, plan) {
  return { lessonSlug: lesson.slug, title: lesson.title, currentBlockCount: existingBlocks.length, desiredBlockCount: lesson.blocks.length, guidedBlocksRemoved: plan.guidedCount, blocksCreated: plan.creates.length, blocksUpdated: plan.updates.length, blocksDeleted: plan.deletes.length, writeRequired: plan.writesRequired }
}
function assertLessonMetadata(actual, expected) {
  if (actual.lessonType !== expected.lessonType || actual.estimatedMinutes !== expected.estimatedMinutes || actual.status !== 'published') throw new Error(`${expected.title} has unexpected activity type, duration, or publication status.`)
}

async function main() {
  const args = parseArgs()
  const validateOnly = args.get('validate-only') === 'true'
  const baseUrl = args.get('base-url') ?? 'http://127.0.0.1:5173'
  if (!validateOnly && args.get('confirm') !== confirmation) throw new Error(`Pass --confirm ${confirmation} to publish.`)
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
    const password = args.get('password') ?? process.env.CSE_PERCENTAGES_ADMIN_PASSWORD
    if (email === undefined || password === undefined) throw new Error('Pass --cookie, or --email with --password or CSE_PERCENTAGES_ADMIN_PASSWORD.')
    await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  }
  const dashboard = await request('/api/admin/dashboard')
  const courseId = dashboard.cseProfessional?.id
  if (courseId === undefined) throw new Error('CSE Professional course was not found.')
  const course = await request(`/api/admin/courses/${courseId}`)
  const subject = course.subjects.find((item) => item.slug === 'numerical-ability')
  const topic = subject?.topics.find((item) => item.slug === 'percentages')
  if (topic === undefined || topic.lessons.length !== percentageLessonSpecs.length) throw new Error('Percentages must contain exactly the eleven expected lessons.')
  const states = []
  for (const spec of percentageLessonSpecs) {
    const lesson = topic.lessons.find((item) => item.slug === spec.slug)
    if (lesson === undefined) throw new Error(`Missing Percentage lesson ${spec.slug}.`)
    assertLessonMetadata(lesson, spec)
    const response = await request(`/api/admin/lessons/${lesson.id}/blocks`)
    const positions = response.blocks.map((block) => block.position)
    if (new Set(positions).size !== positions.length) throw new Error(`${spec.title} has duplicate block positions.`)
    const plan = buildPlan(response.blocks, spec.blocks)
    states.push({ spec, lesson, existingBlocks: response.blocks, plan })
  }
  const reports = states.map(({ spec, existingBlocks, plan }) => summarizePlan(spec, existingBlocks, plan))
  const totals = reports.reduce((result, report) => ({ lessonsChanged: result.lessonsChanged + (report.writeRequired ? 1 : 0), blocksCreated: result.blocksCreated + report.blocksCreated, blocksUpdated: result.blocksUpdated + report.blocksUpdated, blocksDeleted: result.blocksDeleted + report.blocksDeleted, guidedBlocksRemoved: result.guidedBlocksRemoved + report.guidedBlocksRemoved }), { lessonsChanged: 0, blocksCreated: 0, blocksUpdated: 0, blocksDeleted: 0, guidedBlocksRemoved: 0 })
  if (validateOnly) {
    console.log(JSON.stringify({ valid: true, operation: 'percentage-teaching-system-v1', topicSlug: 'percentages', lessonCount: percentageLessonSpecs.length, writesRequired: totals.lessonsChanged > 0, totals, lessons: reports }, null, 2))
    return
  }
  for (const state of states) {
    if (!state.plan.writesRequired) continue
    await request(`/api/admin/lessons/${state.lesson.id}/percentage-teaching-system-v1`, {
      method: 'PUT',
      body: JSON.stringify({ blocks: state.spec.blocks.map((block, index) => desiredPayload(block, index + 1)) }),
    })
  }
  const verifiedLessons = []
  for (const state of states) {
    const response = await request(`/api/admin/lessons/${state.lesson.id}/blocks`)
    const blocks = ordered(response.blocks)
    const mismatch = lessonMismatch(blocks, state.spec)
    if (mismatch !== null) throw new Error(`Post-publish validation failed for ${state.spec.title}: ${mismatch}.`)
    verifiedLessons.push({ lessonSlug: state.spec.slug, blockCount: blocks.length, visualBlockCount: blocks.filter((block) => block.content?.visual !== undefined).length, guidedBlockCount: 0 })
  }
  console.log(JSON.stringify({ published: true, updated: totals.lessonsChanged > 0, operation: 'percentage-teaching-system-v1', topicSlug: 'percentages', lessonCount: percentageLessonSpecs.length, totals, lessons: verifiedLessons, unrelatedTopicsModified: 0 }, null, 2))
}
main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1 })