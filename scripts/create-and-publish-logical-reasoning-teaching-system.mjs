#!/usr/bin/env node
import { runAnalyticalTeachingPublisher } from './lib/analytical-teaching-system-publisher.mjs'
import { logicalReasoningLessonSpecs } from './lib/logical-reasoning-teaching-system-content.mjs'

runAnalyticalTeachingPublisher({
  topicSlug: 'logical-reasoning-fundamentals',
  topicTitle: 'Logical Reasoning Fundamentals',
  lessonSpecs: logicalReasoningLessonSpecs,
  confirmation: 'publish-logical-reasoning-fundamentals-teaching-system-v1',
  credentialEnv: 'CSE_LOGICAL_REASONING_ADMIN_PASSWORD',
}).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
