import { logicalReasoningLessonSpecs } from '../scripts/lib/logical-reasoning-teaching-system-content.mjs'
import { defineAnalyticalPublisherContract } from './lib/analytical-teaching-publisher-harness'
defineAnalyticalPublisherContract({
  topicSlug:'logical-reasoning-fundamentals',
  topicTitle:'Logical Reasoning Fundamentals',
  confirmation:'publish-logical-reasoning-fundamentals-teaching-system-v1',
  scriptName:'create-and-publish-logical-reasoning-teaching-system.mjs',
  lessonSpecs:logicalReasoningLessonSpecs,
  legacyBlockCounts:logicalReasoningLessonSpecs.map((item)=>item.blocks.length-(item.lessonType==='reading'?2:3)),
})
