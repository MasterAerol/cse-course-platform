#!/usr/bin/env node

import { percentageOfVisual } from './lib/visual-teaching-content.mjs'

const confirmation = 'publish-percentage-visual-teaching'
const csrfHeaderValue = 'same-origin-admin-mutation'
const target = {
  topicSlug: 'percentages',
  lessonSlug: 'finding-the-percentage',
  blockPosition: 5,
}

function parseArgs() {
  const args = new Map()
  for (let index = 2; index < process.argv.length; index += 1) {
    const key = process.argv[index]
    if (key === '--validate-only') {
      args.set('validate-only', 'true')
      continue
    }
    const value = process.argv[index + 1]
    if (key?.startsWith('--') !== true || value === undefined) {
      throw new Error(`Invalid argument near ${key ?? '(end)'}.`)
    }
    args.set(key.slice(2), value)
    index += 1
  }
  return args
}

function desiredContent() {
  return {
    title: 'Find 20% of 80',
    problem: 'What is 20% of 80?',
    steps: [
      'Remove the percent sign, reveal the hidden decimal point in 20., and move it two places left because percent means divide by 100.',
      'Therefore, 20% = 0.20.',
      'The word “of” means multiply, so write 0.20 × 80.',
      'Multiply to get 16.',
    ],
    answer: '20% of 80 is 16.',
    visual: percentageOfVisual,
  }
}

async function main() {
  const args = parseArgs()
  const validateOnly = args.get('validate-only') === 'true'
  const baseUrl = args.get('base-url') ?? 'http://127.0.0.1:5173'

  if (!validateOnly && args.get('confirm') !== confirmation) {
    throw new Error(`Pass --confirm ${confirmation} to publish.`)
  }

  let cookie = args.get('cookie') ?? null
  async function request(path, options = {}) {
    const headers = new Headers(options.headers)
    headers.set('accept', 'application/json')
    if (cookie !== null) headers.set('cookie', cookie)
    if (options.body !== undefined) headers.set('content-type', 'application/json')
    if (options.method !== undefined && options.method !== 'GET') {
      headers.set('x-cse-admin-csrf', csrfHeaderValue)
    }
    const response = await fetch(`${baseUrl}${path}`, { ...options, headers })
    const setCookie = response.headers.get('set-cookie')
    if (setCookie !== null) cookie = setCookie.split(';')[0]
    const body = await response.json()
    if (!response.ok || body.success !== true) {
      throw new Error(`${options.method ?? 'GET'} ${path} failed: ${JSON.stringify(body)}`)
    }
    return body.data
  }

  if (cookie === null) {
    const email = args.get('email')
    const password = args.get('password') ?? process.env.CSE_PERCENTAGES_ADMIN_PASSWORD
    if (email === undefined || password === undefined) {
      throw new Error('Pass --cookie, or --email with --password or CSE_PERCENTAGES_ADMIN_PASSWORD.')
    }
    await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  const dashboard = await request('/api/admin/dashboard')
  const courseId = dashboard.cseProfessional?.id
  if (courseId === undefined) throw new Error('CSE Professional course was not found.')

  const course = await request(`/api/admin/courses/${courseId}`)
  const subject = course.subjects.find((item) => item.slug === 'numerical-ability')
  const topic = subject?.topics.find((item) => item.slug === target.topicSlug)
  const lesson = topic?.lessons.find((item) => item.slug === target.lessonSlug)
  if (subject === undefined || topic === undefined || lesson === undefined) {
    throw new Error('The published Percentages lesson target was not found.')
  }

  const response = await request(`/api/admin/lessons/${lesson.id}/blocks`)
  const block = response.blocks.find((item) => item.position === target.blockPosition)
  if (block === undefined || block.type !== 'example') {
    throw new Error('Expected the target Percentages example at lesson block position 5.')
  }

  const desired = desiredContent()
  const alreadyCurrent = JSON.stringify(block.content) === JSON.stringify(desired)
  if (validateOnly) {
    console.log(JSON.stringify({
      valid: true,
      writeRequired: !alreadyCurrent,
      recordType: 'lesson_blocks',
      lessonBlockId: block.id,
      topicSlug: target.topicSlug,
      topicStatus: topic.status,
      lessonSlug: target.lessonSlug,
      lessonStatus: lesson.status,
      blockPosition: target.blockPosition,
      currentTitle: block.content.title,
      currentHasVisual: block.content.visual !== undefined,
      desiredTitle: desired.title,
      desiredAnswer: desired.answer,
      visualKind: desired.visual.kind,
      stages: desired.visual.stages.length,
      transitions: desired.visual.transitions.length,
      memoryExamples: desired.visual.memoryTip.examples.length,
      unrelatedRecordsUpdated: 0,
    }, null, 2))
    return
  }

  if (!alreadyCurrent) {
    await request(`/api/admin/lesson-blocks/${block.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        blockType: 'example',
        content: desired,
        position: target.blockPosition,
      }),
    })
  }

  const verified = await request(`/api/admin/lessons/${lesson.id}/blocks`)
  const stored = verified.blocks.find((item) => item.position === target.blockPosition)
  if (
    stored?.type !== 'example' ||
    JSON.stringify(stored.content) !== JSON.stringify(desired) ||
    topic.status !== 'published' ||
    lesson.status !== 'published'
  ) {
    throw new Error('Post-publish validation failed.')
  }

  console.log(JSON.stringify({
    published: true,
    updated: !alreadyCurrent,
    recordType: 'lesson_blocks',
    lessonBlockId: stored.id,
    topicSlug: target.topicSlug,
    topicStatus: topic.status,
    lessonSlug: target.lessonSlug,
    lessonStatus: lesson.status,
    blockPosition: target.blockPosition,
    title: stored.content.title,
    visualKind: stored.content.visual.kind,
    stages: stored.content.visual.stages.length,
    transitions: stored.content.visual.transitions.length,
    memoryExamples: stored.content.visual.memoryTip.examples.length,
    unrelatedRecordsUpdated: 0,
  }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})