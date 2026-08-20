#!/usr/bin/env node
import { runAnalyticalTeachingPublisher } from './lib/analytical-teaching-system-publisher.mjs'
import { syllogismsLessonSpecs } from './lib/syllogisms-teaching-system-content.mjs'

runAnalyticalTeachingPublisher({
  topicSlug: 'syllogisms',
  topicTitle: 'Syllogisms',
  lessonSpecs: syllogismsLessonSpecs,
  confirmation: 'publish-syllogisms-teaching-system-v1',
  credentialEnv: 'CSE_SYLLOGISMS_ADMIN_PASSWORD',
}).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
