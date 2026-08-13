#!/usr/bin/env node

import { spawnSync } from 'node:child_process'

import { canonicalJson, jsonFingerprint } from './lib/canonical-json.mjs'
import { percentageLessonSpecs } from './lib/percentage-teaching-system-content.mjs'

const database = process.argv[2] ?? 'cse-course-platform'
if (!/^[a-z0-9-]+$/u.test(database)) throw new Error('Invalid D1 database name.')
const sql = `SELECT l.id AS lesson_id,l.public_id,l.slug,l.title,l.lesson_type,
  l.estimated_minutes,l.status,l.position AS lesson_position,b.id AS block_id,
  b.position AS block_position,b.block_type,b.content_json
FROM courses c
JOIN subjects s ON s.course_id=c.id
JOIN topics t ON t.subject_id=s.id
JOIN lessons l ON l.topic_id=t.id
LEFT JOIN lesson_blocks b ON b.lesson_id=l.id
WHERE c.slug='cse-professional' AND s.slug='numerical-ability'
  AND t.slug='percentages'
ORDER BY l.position,l.id,b.position,b.id`
const executable = process.execPath
const result = spawnSync(executable, [
  'node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', database,
  '--remote', '--json', '--command', sql,
], { encoding: 'utf8', windowsHide: true })
if (result.status !== 0) throw new Error(result.stderr || result.error?.message || 'Read-only D1 query failed.')

const rows = JSON.parse(result.stdout)[0]?.results ?? []
const lessons = percentageLessonSpecs.map((spec, lessonIndex) => {
  const lessonRows = rows.filter((row) => row.slug === spec.slug)
  const first = lessonRows[0]
  const actualBlocks = lessonRows.filter((row) => row.block_id !== null)
  const mismatches = []
  if (first === undefined) mismatches.push('lesson missing')
  else {
    if (first.title !== spec.title) mismatches.push(`title expected ${spec.title}`)
    if (first.lesson_type !== spec.lessonType) mismatches.push(`type expected ${spec.lessonType}`)
    if (first.estimated_minutes !== spec.estimatedMinutes) mismatches.push(`duration expected ${spec.estimatedMinutes}`)
    if (first.status !== 'published') mismatches.push('lesson is not published')
    if (first.lesson_position !== lessonIndex + 1) mismatches.push(`lesson position expected ${lessonIndex + 1}`)
  }
  if (actualBlocks.length !== spec.blocks.length) mismatches.push(`block count expected ${spec.blocks.length}, actual ${actualBlocks.length}`)
  for (const [index, desired] of spec.blocks.entries()) {
    const actual = actualBlocks[index]
    if (actual === undefined) continue
    if (actual.block_position !== index + 1) mismatches.push(`block ${index + 1} position is ${actual.block_position}`)
    if (actual.block_type !== desired.blockType) mismatches.push(`block ${index + 1} type expected ${desired.blockType}, actual ${actual.block_type}`)
    const parsed = JSON.parse(actual.content_json)
    if (canonicalJson(parsed) !== canonicalJson(desired.content)) mismatches.push(`block ${index + 1} fingerprint expected ${jsonFingerprint(desired.content)}, actual ${jsonFingerprint(parsed)}`)
  }
  return {
    lessonId: first?.lesson_id ?? null,
    publicId: first?.public_id ?? null,
    slug: spec.slug,
    title: first?.title ?? spec.title,
    status: first?.status ?? null,
    blockCount: actualBlocks.length,
    matchesManifest: mismatches.length === 0,
    firstMismatch: mismatches[0] ?? null,
    blocks: actualBlocks.map((row) => ({
      id: row.block_id,
      position: row.block_position,
      type: row.block_type,
      fingerprint: jsonFingerprint(JSON.parse(row.content_json)),
    })),
  }
})

console.log(JSON.stringify({
  readOnly: true,
  database,
  lessonCount: lessons.length,
  matchingLessonCount: lessons.filter((lesson) => lesson.matchesManifest).length,
  allMatch: lessons.every((lesson) => lesson.matchesManifest),
  lessons,
}, null, 2))
