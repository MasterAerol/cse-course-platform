#!/usr/bin/env node
import { runAnalyticalTeachingPublisher } from './lib/analytical-teaching-system-publisher.mjs'
import { seatingArrangementsLessonSpecs } from './lib/seating-arrangements-teaching-system-content.mjs'

runAnalyticalTeachingPublisher({
  topicSlug: 'seating-and-arrangement-problems',
  topicTitle: 'Seating and Arrangement Problems',
  lessonSpecs: seatingArrangementsLessonSpecs,
  confirmation: 'publish-seating-and-arrangement-problems-teaching-system-v1',
  credentialEnv: 'CSE_SEATING_ARRANGEMENTS_ADMIN_PASSWORD',
}).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
