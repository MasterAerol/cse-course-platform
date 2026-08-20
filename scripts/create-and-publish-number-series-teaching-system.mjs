#!/usr/bin/env node
import { runAnalyticalTeachingPublisher } from './lib/analytical-teaching-system-publisher.mjs'
import { numberSeriesLessonSpecs } from './lib/number-series-teaching-system-content.mjs'

runAnalyticalTeachingPublisher({
  topicSlug: 'number-series',
  topicTitle: 'Number Series',
  lessonSpecs: numberSeriesLessonSpecs,
  confirmation: 'publish-number-series-teaching-system-v1',
  credentialEnv: 'CSE_NUMBER_SERIES_ADMIN_PASSWORD',
}).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
