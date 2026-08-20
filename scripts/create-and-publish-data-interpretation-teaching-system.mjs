#!/usr/bin/env node
import { runAnalyticalTeachingPublisher } from './lib/analytical-teaching-system-publisher.mjs'
import { dataInterpretationLessonSpecs } from './lib/data-interpretation-teaching-system-content.mjs'

runAnalyticalTeachingPublisher({
  topicSlug: 'data-interpretation',
  topicTitle: 'Data Interpretation',
  lessonSpecs: dataInterpretationLessonSpecs,
  confirmation: 'publish-data-interpretation-teaching-system-v1',
  credentialEnv: 'CSE_DATA_INTERPRETATION_ADMIN_PASSWORD',
}).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
