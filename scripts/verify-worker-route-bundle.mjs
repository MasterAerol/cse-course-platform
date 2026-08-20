#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const bundlePath = resolve(process.cwd(), 'dist/cse_course_platform/index.js')
const source = readFileSync(bundlePath, 'utf8')
const requiredRoutes = [
  '/api/admin',
  '/lessons/:lessonId/general-information-teaching-system-v1/capability',
  '/lessons/:lessonId/general-information-teaching-system-v1',
]
for (const route of requiredRoutes) {
  if (!source.includes(route)) {
    throw new Error(`Production Worker bundle is missing required route: ${route}`)
  }
}
if (source.length === 0) throw new Error('Production Worker bundle is empty.')
console.log('Production Worker bundle contains the General Information capability and reconciliation routes.')
