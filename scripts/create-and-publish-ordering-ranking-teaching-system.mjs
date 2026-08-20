#!/usr/bin/env node
import { runAnalyticalTeachingPublisher } from './lib/analytical-teaching-system-publisher.mjs'
import { orderingRankingLessonSpecs } from './lib/ordering-ranking-teaching-system-content.mjs'

runAnalyticalTeachingPublisher({
  topicSlug: 'ordering-and-ranking',
  topicTitle: 'Ordering and Ranking',
  lessonSpecs: orderingRankingLessonSpecs,
  confirmation: 'publish-ordering-and-ranking-teaching-system-v1',
  credentialEnv: 'CSE_ORDERING_RANKING_ADMIN_PASSWORD',
}).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
