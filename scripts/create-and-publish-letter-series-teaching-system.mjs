#!/usr/bin/env node
import { runAnalyticalTeachingPublisher } from './lib/analytical-teaching-system-publisher.mjs'
import { letterSeriesLessonSpecs } from './lib/letter-series-teaching-system-content.mjs'

runAnalyticalTeachingPublisher({
  topicSlug: 'letter-series',
  topicTitle: 'Letter Series',
  lessonSpecs: letterSeriesLessonSpecs,
  confirmation: 'publish-letter-series-teaching-system-v1',
  credentialEnv: 'CSE_LETTER_SERIES_ADMIN_PASSWORD',
}).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
