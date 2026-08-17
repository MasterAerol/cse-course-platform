import { spawn } from 'node:child_process'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import path from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { ratioProportionLessonSpecs } from '../scripts/lib/ratio-proportion-teaching-system-content.mjs'

interface StoredBlock { id: number; type: string; content: unknown; position: number }
const root = path.resolve(import.meta.dirname, '..')
const script = path.join(root, 'scripts', 'create-and-publish-ratio-proportion-teaching-system.mjs')
const lessons = ratioProportionLessonSpecs.map((spec, index) => ({ ...spec, id: 101 + index, position: index + 1, status: 'published' as const }))
const blocksByLesson = new Map<number, StoredBlock[]>()
let nextBlockId = 1_000
let mutationCalls = 0
let baseUrl = ''
let server: ReturnType<typeof createServer>
let preservedRetainedBlockId = 0

const productionLikeBlockTypes: Record<string, string[]> = {
  'introduction-to-ratios':['heading','paragraph','formula','example','example','example','callout','callout','callout','summary'],
  'writing-and-simplifying-ratios':['heading','paragraph','formula','example','example','callout','summary','paragraph'],
  'equivalent-ratios':['heading','paragraph','formula','example','example','callout','summary','paragraph'],
  'comparing-ratios':['heading','paragraph','formula','example','example','callout','summary','paragraph'],
  'introduction-to-proportions':['heading','paragraph','formula','example','example','callout','callout','summary'],
  'solving-proportions':['heading','paragraph','formula','example','example','callout','summary','paragraph'],
  'direct-proportion':['heading','paragraph','formula','example','example','callout','summary','paragraph'],
  'inverse-proportion':['heading','paragraph','formula','example','example','callout','summary','paragraph'],
  'sharing-an-amount-in-a-ratio':['heading','paragraph','formula','example','example','callout','summary','paragraph'],
  'ratio-and-proportion-word-problems':['heading','paragraph','formula','example','example','callout','summary','paragraph'],
  'mixed-ratio-and-proportion-applications':['heading','paragraph','formula','example','example','callout','summary'],
  'ratio-and-proportion-topic-quiz':['heading','paragraph','callout','summary'],
}
function productionLikeContent(type: string, lessonSlug: string, position: number): unknown {
  const identifier = `Current production ${lessonSlug} block ${position}`
  if (type === 'heading') return { level: 2, text: identifier }
  if (type === 'paragraph') return { text: identifier }
  if (type === 'formula') return { expression: identifier, description: 'Current production formula.' }
  if (type === 'callout') return { variant: 'info', title: identifier, text: 'Current production callout.' }
  if (type === 'image') return { src: '/images/percentage-grid-25.svg', alt: identifier, caption: identifier }
  if (type === 'summary') return { items: [identifier] }
  return {
    title: identifier,
    problem: 'Current production example.',
    steps: ['Current production step.'],
    answer: 'Current production answer.',

  }
}

for (const lesson of lessons) {
  const currentTypes = productionLikeBlockTypes[lesson.slug]
  if (currentTypes === undefined) throw new Error(`Missing production-like fixture for ${lesson.slug}.`)
  const blocks = currentTypes.map((type, index): StoredBlock => ({
    id: nextBlockId++,
    type,
    content: productionLikeContent(type, lesson.slug, index + 1),
    position: index + 1,
  }))
  if (lesson.slug === 'solving-proportions') {
    preservedRetainedBlockId = blocks.find((block) => block.position === 5)?.id ?? 0
  }
  blocksByLesson.set(lesson.id, blocks)
}

function send(response: ServerResponse, data: unknown, status = 200): void {
  response.writeHead(status, { 'content-type': 'application/json' })
  response.end(JSON.stringify({ success: status < 400, data }))
}
function readBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let raw = ''
    request.setEncoding('utf8')
    request.on('data', (chunk: string) => { raw += chunk })
    request.on('end', () => {
      try {
        const parsed = JSON.parse(raw) as unknown
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Object body required.')
        resolve(parsed as Record<string, unknown>)
      } catch (error: unknown) { reject(error instanceof Error ? error : new Error('Invalid request body.')) }
    })
    request.on('error', reject)
  })
}
function normalizeApiContent(type: string, content: unknown): unknown {
  if (type !== 'callout' || content === null || typeof content !== 'object') return structuredClone(content)
  const value = content as { variant: unknown; title: unknown; text: unknown }
  return { variant: value.variant, title: value.title, text: value.text }
}

function findBlock(blockId: number): { blocks: StoredBlock[]; index: number } | null {
  for (const blocks of blocksByLesson.values()) {
    const index = blocks.findIndex((block) => block.id === blockId)
    if (index >= 0) return { blocks, index }
  }
  return null
}

async function handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const url = request.url ?? ''
  if (url === '/api/admin/dashboard') { send(response, { cseProfessional: { id: 1 } }); return }
  if (url === '/api/admin/courses/1') {
    send(response, { subjects: [{ slug: 'numerical-ability', topics: [{ slug: 'ratio-and-proportion', lessons: lessons.map(({ id, slug, title, lessonType, estimatedMinutes, status, position }) => ({ id, slug, title, lessonType, estimatedMinutes, status, position })) }] }] })
    return
  }

  const reconcileMatch = url.match(/^\/api\/admin\/lessons\/(\d+)\/ratio-proportion-teaching-system-v1$/u)
  if (reconcileMatch?.[1] !== undefined && request.method === 'PUT') {
    mutationCalls += 1
    const lessonId = Number(reconcileMatch[1])
    const existing = blocksByLesson.get(lessonId)
    if (existing === undefined) { send(response, { message: 'Missing lesson.' }, 404); return }
    const input = await readBody(request)
    const desired = input.blocks as Array<{ blockType: string; content: unknown; position: number }>
    const allowed = existing.filter((block) => block.type !== 'illustrated-guided-teaching')
    const next = desired.map((block, index): StoredBlock => ({
      id: allowed[index]?.id ?? nextBlockId++,
      type: block.blockType,
      content: normalizeApiContent(block.blockType, block.content),
      position: block.position,
    }))
    blocksByLesson.set(lessonId, next)
    send(response, {
      blocks: next,
      writeRequired: true,
      createdCount: Math.max(0, desired.length - allowed.length),
      updatedCount: Math.min(desired.length, allowed.length),
      deletedCount: existing.length - allowed.length + Math.max(0, allowed.length - desired.length),
    })
    return
  }
  const listMatch = url.match(/^\/api\/admin\/lessons\/(\d+)\/blocks$/u)
  if (listMatch?.[1] !== undefined && request.method === 'GET') {
    const blocks = blocksByLesson.get(Number(listMatch[1]))
    if (blocks === undefined) { send(response, { message: 'Missing lesson.' }, 404); return }
    send(response, { blocks: blocks.slice().sort((a, b) => a.position - b.position) })
    return
  }
  if (listMatch?.[1] !== undefined && request.method === 'POST') {
    mutationCalls += 1
    const lessonId = Number(listMatch[1])
    const blocks = blocksByLesson.get(lessonId)
    if (blocks === undefined) { send(response, { message: 'Missing lesson.' }, 404); return }
    const input = await readBody(request)
    const block: StoredBlock = { id: nextBlockId++, type: String(input.blockType), content: input.content, position: Number(input.position) }
    blocks.push(block)
    send(response, { block }, 201)
    return
  }
  const blockMatch = url.match(/^\/api\/admin\/lesson-blocks\/(\d+)$/u)
  if (blockMatch?.[1] !== undefined && (request.method === 'PATCH' || request.method === 'DELETE')) {
    mutationCalls += 1
    const found = findBlock(Number(blockMatch[1]))
    if (found === null) { send(response, { message: 'Missing block.' }, 404); return }
    if (request.method === 'DELETE') {
      found.blocks.splice(found.index, 1)
      send(response, { deleted: true })
      return
    }
    const input = await readBody(request)
    const block = found.blocks[found.index]
    block.type = String(input.blockType)
    block.content = input.content
    block.position = Number(input.position)
    send(response, { block })
    return
  }
  send(response, { message: `Unexpected ${request.method} ${url}` }, 404)
}

beforeAll(async () => {
  server = createServer((request, response) => {
    void handleRequest(request, response).catch((error: unknown) => send(response, { message: error instanceof Error ? error.message : 'Request failed.' }, 500))
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('Test server address missing.')
  baseUrl = `http://127.0.0.1:${address.port}`
})
afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
})
function runPublisher(extraArgs: string[] = []): Promise<{ stdout: string; stderr: string; status: number | null }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, '--base-url', baseUrl, '--cookie', 'test-admin-session', '--confirm', 'publish-ratio-proportion-teaching-system-v1', ...extraArgs], { cwd: root, windowsHide: true })
    let stdout = ''; let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += String(chunk) })
    child.stderr.on('data', (chunk) => { stderr += String(chunk) })
    child.on('error', reject)
    child.on('close', (status) => resolve({ stdout, stderr, status }))
  })
}

describe('Ratio and Proportion Teaching System v1 publisher', () => {
  it('reconciles the production-shaped lesson structure, preserves a retained block ID, and is idempotent', async () => {
    const validation = await runPublisher(['--validate-only'])
    expect(validation).toMatchObject({ status: 0, stderr: '' })
    const validationPlan = JSON.parse(validation.stdout) as { deletionPlanFingerprint: string; deletions: unknown[]; [key: string]: unknown }
    expect(validationPlan).toMatchObject({
      valid: true,
      lessonCount: 12,
      writesRequired: true,
      totals: {
        lessonsChanged: 12,
        blocksCreated: 0,
        blocksUpdated: 74,
        blocksDeleted: 19,
        guidedBlocksRemoved: 0,
      },
    })
    expect(mutationCalls).toBe(0)

    expect(validationPlan).toMatchObject({ deletionReviewRequired: true })
    expect(validationPlan.deletions).toEqual(expect.arrayContaining([expect.objectContaining({ lessonSlug: 'introduction-to-ratios', position: 7, learnerContentAssessment: 'requires-human-review' })]))
    const first = await runPublisher(['--approve-deletions', validationPlan.deletionPlanFingerprint])
    expect(first).toMatchObject({ status: 0, stderr: '' })
    expect(JSON.parse(first.stdout)).toMatchObject({
      published: true,
      updated: true,
      lessonCount: 12,
      totals: {
        lessonsChanged: 12,
        blocksCreated: 0,
        blocksUpdated: 74,
        blocksDeleted: 19,
        guidedBlocksRemoved: 0,
      },
      unrelatedTopicsModified: 0,
    })
    expect(findBlock(preservedRetainedBlockId)).not.toBeNull()
    const introduction = blocksByLesson.get(lessons[0].id) ?? []
    expect(introduction[2]?.content).toEqual(lessons[0].blocks[2]?.content)
    for (const lesson of lessons) {
      const blocks = blocksByLesson.get(lesson.id) ?? []
      expect(blocks).toHaveLength(lesson.blocks.length)
      expect(blocks.some((block) => block.type === 'illustrated-guided-teaching')).toBe(false)
      expect(blocks.slice().sort((a, b) => a.position - b.position).map((block) => block.position)).toEqual(lesson.blocks.map((_, index) => index + 1))
    }
    const mutationsAfterFirst = mutationCalls

    const second = await runPublisher()
    expect(second).toMatchObject({ status: 0, stderr: '' })
    expect(JSON.parse(second.stdout)).toMatchObject({ published: true, updated: false, lessonCount: 12, totals: { lessonsChanged: 0, blocksCreated: 0, blocksUpdated: 0, blocksDeleted: 0, guidedBlocksRemoved: 0 } })
    expect(mutationCalls).toBe(mutationsAfterFirst)
  })
})
