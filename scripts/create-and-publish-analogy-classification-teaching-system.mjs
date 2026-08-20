#!/usr/bin/env node
import { runAnalyticalTeachingPublisher } from './lib/analytical-teaching-system-publisher.mjs'
import { analogyClassificationLessonSpecs } from './lib/analogy-classification-teaching-system-content.mjs'

runAnalyticalTeachingPublisher({
  topicSlug: 'analogy-and-classification',
  topicTitle: 'Analogy and Classification',
  lessonSpecs: analogyClassificationLessonSpecs,
  confirmation: 'publish-analogy-and-classification-teaching-system-v1',
  credentialEnv: 'CSE_ANALOGY_ADMIN_PASSWORD',
}).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})

