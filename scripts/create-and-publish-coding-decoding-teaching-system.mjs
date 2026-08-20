#!/usr/bin/env node
import { runAnalyticalTeachingPublisher } from './lib/analytical-teaching-system-publisher.mjs'
import { codingDecodingLessonSpecs } from './lib/coding-decoding-teaching-system-content.mjs'

runAnalyticalTeachingPublisher({
  topicSlug: 'coding-and-decoding',
  topicTitle: 'Coding and Decoding',
  lessonSpecs: codingDecodingLessonSpecs,
  confirmation: 'publish-coding-and-decoding-teaching-system-v1',
  credentialEnv: 'CSE_CODING_DECODING_ADMIN_PASSWORD',
}).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
