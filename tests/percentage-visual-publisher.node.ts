import { spawn } from 'node:child_process'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import path from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { percentageExampleContent, percentageGuidedTeachingContent } from '../scripts/lib/visual-teaching-content.mjs'

const root = path.resolve(import.meta.dirname, '..')
const script = path.join(root, 'scripts', 'create-and-publish-percentage-visual-teaching.mjs')
const blocks: Array<{ id: number; type: string; content: unknown; position: number }> = [
  { id: 55, type: 'heading', content: { level: 1, text: 'Finding the Percentage' }, position: 1 },
  { id: 56, type: 'paragraph', content: { text: 'Introduction.' }, position: 2 },
  { id: 57, type: 'formula', content: { expression: 'P=RxB', description: 'Formula.' }, position: 3 },
  { id: 58, type: 'summary', content: { items: ['Steps.'] }, position: 4 },
  { id: 59, type: 'example', content: percentageExampleContent, position: 6 },
  { id: 60, type: 'example', content: { title: 'Second' }, position: 7 },
  { id: 61, type: 'example', content: { title: 'Third' }, position: 8 },
  { id: 62, type: 'callout', content: { title: 'Warning' }, position: 9 },
  { id: 63, type: 'summary', content: { items: ['Finish.'] }, position: 10 },
]
let repairCalls = 0
let server: ReturnType<typeof createServer>
let baseUrl = ''

function send(response: ServerResponse, data: unknown, status = 200): void {
  response.writeHead(status, { 'content-type': 'application/json' })
  response.end(JSON.stringify({ success: status < 400, data }))
}

function body(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let raw = ''
    request.setEncoding('utf8')
    request.on('data', (chunk: string) => { raw += chunk })
    request.on('end', () => {
      try {
        resolve(JSON.parse(raw) as unknown)
      } catch (error: unknown) {
        reject(error instanceof Error ? error : new Error('Invalid JSON body.'))
      }
    })
    request.on('error', reject)
  })
}

async function handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const url = request.url ?? ''
    if (url === '/api/admin/dashboard') {
      send(response, { cseProfessional: { id: 1 } })
      return
    }
    if (url === '/api/admin/courses/1') {
      send(response, {
        subjects: [{
          slug: 'numerical-ability',
          topics: [{
            slug: 'percentages',
            status: 'published',
            lessons: [{ id: 4, slug: 'finding-the-percentage', status: 'published' }],
          }],
        }],
      })
      return
    }
    if (url === '/api/admin/lessons/4/blocks' && request.method === 'GET') {
      send(response, { blocks: [...blocks].sort((left, right) => left.position - right.position) })
      return
    }
    if (url === '/api/admin/lessons/4/percentage-guided-teaching' && request.method === 'POST') {
      repairCalls += 1
      const input = await body(request) as { content: unknown }
      const existing = blocks.find((block) => block.type === 'illustrated-guided-teaching')
      if (existing === undefined) {
        blocks.push({ id: 64, type: 'illustrated-guided-teaching', content: input.content, position: 5 })
        send(response, {
          block: blocks.at(-1),
          writeRequired: true,
          repairedPositionCount: 0,
        })
      } else {
        send(response, {
          block: existing,
          writeRequired: false,
          repairedPositionCount: 0,
        })
      }
      return
    }
    send(response, { message: `Unexpected ${request.method} ${url}` }, 404)
}

beforeAll(async () => {
  server = createServer((request, response) => {
    void handleRequest(request, response).catch((error: unknown) => {
      send(response, { message: error instanceof Error ? error.message : 'Request failed.' }, 500)
    })
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
    const child = spawn(process.execPath, [
      script,
      '--base-url', baseUrl,
      '--cookie', 'test-admin-session',
      '--confirm', 'publish-percentage-visual-teaching',
      ...extraArgs,
    ], { cwd: root, windowsHide: true })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += String(chunk) })
    child.stderr.on('data', (chunk) => { stderr += String(chunk) })
    child.on('error', reject)
    child.on('close', (status) => resolve({ stdout, stderr, status }))
  })
}

describe('Percentage visual teaching publisher', () => {
  it('validates, publishes once through the atomic endpoint, and is unchanged on the second run', async () => {
    const validation = await runPublisher(['--validate-only'])
    expect(validation).toMatchObject({ status: 0, stderr: '' })
    expect(JSON.parse(validation.stdout)).toMatchObject({
      valid: true,
      writesRequired: true,
      guidedCount: 0,
      targetPosition: 5,
      repairedPositionCount: 0,
    })
    expect(repairCalls).toBe(0)

    const first = await runPublisher()
    expect(first).toMatchObject({ status: 0, stderr: '' })
    expect(JSON.parse(first.stdout)).toMatchObject({
      published: true,
      updated: true,
      lessonBlockId: 64,
      blockPosition: 5,
      repairedPositionCount: 0,
    })

    const idsAndPositionsAfterFirst = blocks
      .map(({ id, position }) => ({ id, position }))
      .sort((left, right) => left.position - right.position)
    const second = await runPublisher()
    expect(second).toMatchObject({ status: 0, stderr: '' })
    expect(JSON.parse(second.stdout)).toMatchObject({
      published: true,
      updated: false,
      lessonBlockId: 64,
      blockPosition: 5,
      repairedPositionCount: 0,
    })
    expect(blocks.filter((block) => block.type === 'illustrated-guided-teaching')).toHaveLength(1)
    expect(blocks.find((block) => block.id === 59)?.content).toEqual(percentageExampleContent)
    expect(blocks.map(({ id, position }) => ({ id, position })).sort((left, right) => left.position - right.position)).toEqual(idsAndPositionsAfterFirst)
    expect(blocks.find((block) => block.id === 64)?.content).toEqual(percentageGuidedTeachingContent)
    expect(repairCalls).toBe(2)
  })
})