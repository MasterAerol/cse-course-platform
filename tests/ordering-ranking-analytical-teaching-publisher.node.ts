import { orderingRankingLessonSpecs } from '../scripts/lib/ordering-ranking-teaching-system-content.mjs'
import { defineAnalyticalPublisherContract } from './lib/analytical-teaching-publisher-harness'

defineAnalyticalPublisherContract({
  topicSlug:'ordering-and-ranking',
  topicTitle:'Ordering and Ranking',
  confirmation:'publish-ordering-and-ranking-teaching-system-v1',
  scriptName:'create-and-publish-ordering-ranking-teaching-system.mjs',
  lessonSpecs:orderingRankingLessonSpecs,
  legacyBlockCounts:orderingRankingLessonSpecs.map((item)=>item.blocks.length-(item.lessonType==='reading'?2:3)),
})
