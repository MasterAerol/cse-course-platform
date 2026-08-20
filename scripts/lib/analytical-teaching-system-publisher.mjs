import { createHash } from 'node:crypto'
import { jsonFingerprint, sameJson } from './canonical-json.mjs'

const csrfHeaderValue = 'same-origin-admin-mutation'
const guidedBlockType = 'illustrated-guided-teaching'
function parseArgs(argv) {
  const args = new Map()
  for (let index = 2; index < argv.length; index += 1) {
    const key = argv[index]
    if (key === '--validate-only' || key === '--capability-check') { args.set(key.slice(2), 'true'); continue }
    const value = argv[index + 1]
    if (key?.startsWith('--') !== true || value === undefined) throw new Error('Invalid argument near ' + (key ?? '(end)') + '.')
    args.set(key.slice(2), value)
    index += 1
  }
  return args
}
const ordered = (blocks) => blocks.slice().sort((left, right) => left.position - right.position || left.id - right.id)
const sameBlock = (existing, desired, position) => existing.position === position && existing.type === desired.blockType && sameJson(existing.content, desired.content)
function blockIdentifier(block) {
  const content = block.content ?? {}
  const value = content.title ?? content.text ?? content.expression ?? content.caption ?? content.items?.[0] ?? '(unlabeled block)'
  return String(value).replace(/\s+/gu, ' ').slice(0, 160)
}
export function buildAnalyticalTeachingPlan(existingBlocks, desiredBlocks, topicTitle) {
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
    reason: block.type === guidedBlockType
      ? 'IllustratedGuidedTeaching is outside the approved ' + topicTitle + ' v1 teaching architecture.'
      : 'The block is beyond the canonical lesson block sequence.',
    learnerContentAssessment: 'requires-human-review',
  }))
  return {
    guidedCount: guided.length,
    blocksCreated: creates.length,
    blocksUpdated: updates.length,
    blocksDeleted: deletions.length,
    deletions,
    writesRequired: deletions.length + updates.length + creates.length > 0,
  }
}
function lessonMismatch(blocks, spec) {
  if (blocks.length !== spec.blocks.length) return 'block count mismatch (expected ' + spec.blocks.length + ', actual ' + blocks.length + ')'
  for (const [index, block] of blocks.entries()) {
    const desired = spec.blocks[index]
    const position = index + 1
    if (block.position !== position) return 'block ' + position + ' position mismatch'
    if (block.type !== desired.blockType) return 'block ' + position + ' type mismatch'
    if (!sameJson(block.content, desired.content)) return 'block ' + position + ' content fingerprint mismatch (expected ' + jsonFingerprint(desired.content) + ', actual ' + jsonFingerprint(block.content) + ')'
  }
  return null
}

export async function runAnalyticalTeachingPublisher(config, argv = process.argv) {
  const args = parseArgs(argv)
  const operation = config.topicSlug + '-teaching-system-v1'
  const validateOnly = args.get('validate-only') === 'true'
  const capabilityCheck = args.get('capability-check') === 'true'
  const baseUrl = args.get('base-url') ?? 'http://127.0.0.1:5173'
  if (!validateOnly && !capabilityCheck && args.get('confirm') !== config.confirmation) throw new Error('Pass --confirm ' + config.confirmation + ' to publish.')
  let cookie = args.get('cookie') ?? null
  async function request(path, options = {}) {
    const headers = new Headers(options.headers)
    headers.set('accept', 'application/json')
    if (cookie !== null) headers.set('cookie', cookie)
    if (options.body !== undefined) headers.set('content-type', 'application/json')
    if (options.method !== undefined && options.method !== 'GET') headers.set('x-cse-admin-csrf', csrfHeaderValue)
    const response = await fetch(baseUrl + path, { ...options, headers })
    const setCookie = response.headers.get('set-cookie')
    if (setCookie !== null) cookie = setCookie.split(';')[0]
    const body = await response.json()
    if (!response.ok || body.success !== true) throw new Error((options.method ?? 'GET') + ' ' + path + ' failed: ' + JSON.stringify(body))
    return body.data
  }
  if (cookie === null) {
    const email = args.get('email')
    const password = process.env[config.credentialEnv]
    if (email === undefined || typeof password !== 'string') throw new Error('Pass --cookie, or --email with ' + config.credentialEnv + ' set securely in the environment.')
    await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  }
  const dashboard = await request('/api/admin/dashboard')
  const courseId = dashboard.cseProfessional?.id
  if (courseId === undefined) throw new Error('CSE Professional course was not found.')
  const course = await request('/api/admin/courses/' + courseId)
  const subject = course.subjects.find((item) => item.slug === 'analytical-ability')
  const topic = subject?.topics.find((item) => item.slug === config.topicSlug)
  if (topic === undefined || topic.lessons.length !== config.lessonSpecs.length) throw new Error(config.topicTitle + ' must contain exactly the expected lessons.')
  const capabilityLesson = topic.lessons.find((item) => item.slug === config.lessonSpecs[0]?.slug)
  if (capabilityLesson === undefined) throw new Error(config.topicTitle + ' capability lesson was not found.')
  const capability = await request('/api/admin/lessons/' + capabilityLesson.id + '/analytical-teaching-system-v1/capability')
  if (capability?.supported !== true || capability.operation !== operation || capability.topicSlug !== config.topicSlug) throw new Error('Production Worker does not report the ' + config.topicTitle + ' reconciliation capability.')
  if (capabilityCheck) { console.log(JSON.stringify({ supported: true, operation: capability.operation, topicSlug: capability.topicSlug })); return }
  const states = []
  for (const [lessonIndex, spec] of config.lessonSpecs.entries()) {
    const lesson = topic.lessons.find((item) => item.slug === spec.slug)
    if (lesson === undefined) throw new Error('Missing ' + config.topicTitle + ' lesson ' + spec.slug + '.')
    if (lesson.lessonType !== spec.lessonType || lesson.estimatedMinutes !== spec.estimatedMinutes || lesson.position !== lessonIndex + 1) throw new Error(spec.title + ' has unexpected activity type, duration, or position.')
    const response = await request('/api/admin/lessons/' + lesson.id + '/blocks')
    const positions = response.blocks.map((block) => block.position)
    if (new Set(positions).size !== positions.length) throw new Error(spec.title + ' has duplicate block positions.')
    const plan = buildAnalyticalTeachingPlan(response.blocks, spec.blocks, config.topicTitle)
    states.push({ spec, lesson, existingBlocks: response.blocks, plan })
  }
  const reports = states.map(({ spec, lesson, existingBlocks, plan }) => ({
    lessonSlug: spec.slug, title: spec.title, lessonStatus: lesson.status, currentBlockCount: existingBlocks.length,
    desiredBlockCount: spec.blocks.length, guidedBlocksRemoved: plan.guidedCount, blocksCreated: plan.blocksCreated,
    blocksUpdated: plan.blocksUpdated, blocksDeleted: plan.blocksDeleted, deletions: plan.deletions, writeRequired: plan.writesRequired,
  }))
  const totals = reports.reduce((result, report) => ({
    lessonsChanged: result.lessonsChanged + (report.writeRequired ? 1 : 0),
    blocksCreated: result.blocksCreated + report.blocksCreated,
    blocksUpdated: result.blocksUpdated + report.blocksUpdated,
    blocksDeleted: result.blocksDeleted + report.blocksDeleted,
    guidedBlocksRemoved: result.guidedBlocksRemoved + report.guidedBlocksRemoved,
  }), { lessonsChanged: 0, blocksCreated: 0, blocksUpdated: 0, blocksDeleted: 0, guidedBlocksRemoved: 0 })
  const deletionPlan = reports.flatMap((report) => report.deletions.map((deletion) => ({ topic: config.topicSlug, lessonSlug: report.lessonSlug, title: report.title, ...deletion })))
  const deletionPlanFingerprint = deletionPlan.length === 0 ? null : createHash('sha256').update(JSON.stringify(deletionPlan)).digest('hex')
  const deletionReviewRequired = deletionPlan.length > 0
  if (validateOnly) {
    console.log(JSON.stringify({ valid: true, operation, topicSlug: config.topicSlug, lessonCount: config.lessonSpecs.length, writesRequired: totals.lessonsChanged > 0, totals, deletionReviewRequired, deletionPlanFingerprint, deletions: deletionPlan, lessons: reports, unrelatedTopicsModified: 0, migrationRequired: false, dbRepairRequired: false, warnings: [], blockers: [] }, null, 2))
    return
  }
  if (deletionReviewRequired && args.get('approve-deletions') !== deletionPlanFingerprint) throw new Error('Deletion approval fingerprint is missing or changed; publication refused.')
  for (const state of states) {
    if (!state.plan.writesRequired) continue
    await request('/api/admin/lessons/' + state.lesson.id + '/analytical-teaching-system-v1', { method: 'PUT', body: JSON.stringify({ blocks: state.spec.blocks.map((block, index) => ({ ...block, position: index + 1 })) }) })
  }
  const verifiedLessons = []
  for (const state of states) {
    const response = await request('/api/admin/lessons/' + state.lesson.id + '/blocks')
    const blocks = ordered(response.blocks)
    const mismatch = lessonMismatch(blocks, state.spec)
    if (mismatch !== null) throw new Error('Post-publish validation failed for ' + state.spec.title + ': ' + mismatch + '.')
    verifiedLessons.push({ lessonSlug: state.spec.slug, blockCount: blocks.length, visualBlockCount: blocks.filter((block) => block.content?.visual !== undefined).length, guidedBlockCount: 0 })
  }
  console.log(JSON.stringify({ published: true, updated: totals.lessonsChanged > 0, operation, topicSlug: config.topicSlug, lessonCount: config.lessonSpecs.length, totals, lessons: verifiedLessons, unrelatedTopicsModified: 0 }, null, 2))
}
