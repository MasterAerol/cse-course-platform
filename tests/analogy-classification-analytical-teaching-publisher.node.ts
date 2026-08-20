import { analogyClassificationLessonSpecs } from '../scripts/lib/analogy-classification-teaching-system-content.mjs'
import { defineAnalyticalPublisherContract } from './lib/analytical-teaching-publisher-harness'

defineAnalyticalPublisherContract({
  topicSlug:'analogy-and-classification',
  topicTitle:'Analogy and Classification',
  confirmation:'publish-analogy-and-classification-teaching-system-v1',
  scriptName:'create-and-publish-analogy-classification-teaching-system.mjs',
  lessonSpecs:analogyClassificationLessonSpecs,
  legacyBlockCounts:analogyClassificationLessonSpecs.map((item)=>item.blocks.length-(item.lessonType==='reading'?2:3)),
})
