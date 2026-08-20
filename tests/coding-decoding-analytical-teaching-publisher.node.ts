import { codingDecodingLessonSpecs } from '../scripts/lib/coding-decoding-teaching-system-content.mjs'
import { defineAnalyticalPublisherContract } from './lib/analytical-teaching-publisher-harness'

defineAnalyticalPublisherContract({
  topicSlug:'coding-and-decoding',
  topicTitle:'Coding and Decoding',
  confirmation:'publish-coding-and-decoding-teaching-system-v1',
  scriptName:'create-and-publish-coding-decoding-teaching-system.mjs',
  lessonSpecs:codingDecodingLessonSpecs,
  legacyBlockCounts:codingDecodingLessonSpecs.map((item)=>item.blocks.length-(item.lessonType==='reading'?2:3)),
})
