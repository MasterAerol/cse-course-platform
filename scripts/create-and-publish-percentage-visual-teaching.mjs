#!/usr/bin/env node

import { percentageGuidedTeachingContent } from './lib/visual-teaching-content.mjs'

const confirmation = 'publish-percentage-visual-teaching'
const csrfHeaderValue = 'same-origin-admin-mutation'
const target = {
  topicSlug: 'percentages',
  lessonSlug: 'finding-the-percentage',
  guidedBlockPosition: 5,
  guidedBlockType: 'illustrated-guided-teaching',
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
  return structuredClone(percentageGuidedTeachingContent)
}

function summarizeContent(content) {
  const visual = content.visual
  return {
    hasVisual: visual !== undefined,
    visualKind: visual?.kind ?? null,
    stages: visual?.stages.length ?? 0,
    transitions: visual?.transitions.length ?? 0,
    memoryExamples: visual?.memoryTip?.examples?.length ?? 0,
  }
}

function findGuidedBlock(blocks) {
  return blocks.find((item) => item.type === target.guidedBlockType) ?? null
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

  const initial = await request(`/api/admin/lessons/${lesson.id}/blocks`)
  const guided = findGuidedBlock(initial.blocks)
  const guidedBlocks = initial.blocks.filter(
    (item) => item.type === target.guidedBlockType,
  )

  if (guidedBlocks.length > 1) {
    throw new Error('Production already contains multiple guided blocks.')
  }

  const desired = desiredContent()
  const existingBlocks = initial.blocks.filter(
    (item) => item.type !== target.guidedBlockType,
  )
  const visualIndexes = existingBlocks.flatMap((item, index) =>
    item.type === 'example' &&
    item.content?.title === 'Find 20% of 80' &&
    item.content?.visual?.kind === 'decimal-movement'
      ? [index]
      : [],
  )
  if (
    existingBlocks.length !== 9 ||
    visualIndexes.length !== 1 ||
    visualIndexes[0] !== 4
  ) {
    throw new Error('The lesson does not match the approved nine-block Percentage pilot structure.')
  }
  const expectedPositions = new Map(
    existingBlocks.map((item, index) => [item.id, index < 4 ? index + 1 : index + 2]),
  )
  const repairedPositionCount = existingBlocks.filter(
    (item) => item.position !== expectedPositions.get(item.id),
  ).length
  const visualBlock = existingBlocks[visualIndexes[0]]
  const atExpectedPosition =
    guided?.position !== undefined &&
    guided.position === target.guidedBlockPosition
  const alreadyCurrent =
    guided !== null && JSON.stringify(guided.content) === JSON.stringify(desired)
  const needsUpdate =
    guided === null || !atExpectedPosition || !alreadyCurrent || repairedPositionCount > 0

  if (validateOnly) {
    const status = {
      valid: true,
      recordType: 'lesson_blocks',
      writesRequired: needsUpdate,
      topicSlug: target.topicSlug,
      topicStatus: topic.status,
      lessonSlug: target.lessonSlug,
      lessonStatus: lesson.status,
      targetPosition: target.guidedBlockPosition,
      guidedBlockType: target.guidedBlockType,
      guidedCount: guidedBlocks.length,
      guidedBlockPosition: guided?.position ?? null,
      blocks: initial.blocks.map((item) => ({
        id: item.id,
        position: item.position,
        type: item.type,
        hasVisual: item.content?.visual !== undefined,
        expectedPosition: item.type === target.guidedBlockType
          ? target.guidedBlockPosition
          : expectedPositions.get(item.id) ?? null,
      })),
      repairedPositionCount,
      desired: summarizeContent(desired),
      existing:
        guided === null
          ? { hasGuided: false }
          : {
              id: guided.id,
              position: guided.position,
              ...summarizeContent(guided.content),
              title: guided.content.title,
            },
    }

    console.log(JSON.stringify(status, null, 2))
    return
  }

  const repair = await request(
    `/api/admin/lessons/${lesson.id}/percentage-guided-teaching`,
    {
      method: 'POST',
      body: JSON.stringify({ content: desired }),
    },
  )

  const verified = await request(`/api/admin/lessons/${lesson.id}/blocks`)
  const verifiedGuidedBlocks = verified.blocks.filter(
    (item) => item.type === target.guidedBlockType,
  )
  const stored = verified.blocks.find(
    (item) => item.type === target.guidedBlockType,
  )

  if (
    verifiedGuidedBlocks.length !== 1 ||
    stored?.type !== target.guidedBlockType ||
    JSON.stringify(stored.content) !== JSON.stringify(desired) ||
    stored.position !== target.guidedBlockPosition ||
    verified.blocks.length !== 10 ||
    verified.blocks.some((item, index) => item.position !== index + 1) ||
    verified.blocks.find((item) => item.id === visualBlock.id)?.position !== 6 ||
    JSON.stringify(verified.blocks.find((item) => item.id === visualBlock.id)?.content) !==
      JSON.stringify(visualBlock.content) ||
    topic.status !== 'published' ||
    lesson.status !== 'published'
  ) {
    throw new Error('Post-publish validation failed.')
  }

  console.log(
    JSON.stringify(
      {
        published: true,
        updated: repair.writeRequired,
        recordType: 'lesson_blocks',
        lessonBlockId: stored.id,
        topicSlug: target.topicSlug,
        topicStatus: topic.status,
        lessonSlug: target.lessonSlug,
        lessonStatus: lesson.status,
        blockPosition: target.guidedBlockPosition,
        ...summarizeContent(stored.content),
        title: stored.content.title,
        blocks: verified.blocks.map((item) => ({
          id: item.id,
          position: item.position,
          type: item.type,
          hasVisual: item.content?.visual !== undefined,
          expectedPosition: item.type === target.guidedBlockType
            ? target.guidedBlockPosition
            : expectedPositions.get(item.id) ?? null,
        })),
        repairedPositionCount: repair.repairedPositionCount,
        unrelatedRecordsUpdated: 0,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
