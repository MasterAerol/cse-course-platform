import { environmentManagementLessonSpecs } from '../scripts/lib/environment-management-teaching-system-content.mjs'
import { defineGeneralInformationPublisherContract } from './lib/general-information-teaching-publisher-harness'

defineGeneralInformationPublisherContract({
  topicSlug:'environment-management-and-protection',
  topicTitle:'Environment Management and Protection',
  confirmation:'publish-environment-management-and-protection-teaching-system-v1',
  scriptName:'create-and-publish-environment-management-teaching-system.mjs',
  lessonSpecs:environmentManagementLessonSpecs,
  legacyBlockCounts:environmentManagementLessonSpecs.map((item)=>item.blocks.length-(item.lessonType==='reading'?2:3)),
})
