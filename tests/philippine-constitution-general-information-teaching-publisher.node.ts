import { philippineConstitutionLessonSpecs } from '../scripts/lib/philippine-constitution-teaching-system-content.mjs'
import { defineGeneralInformationPublisherContract } from './lib/general-information-teaching-publisher-harness'

defineGeneralInformationPublisherContract({
  topicSlug:'philippine-constitution-fundamentals',
  topicTitle:'Philippine Constitution Fundamentals',
  confirmation:'publish-philippine-constitution-fundamentals-teaching-system-v1',
  scriptName:'create-and-publish-philippine-constitution-teaching-system.mjs',
  lessonSpecs:philippineConstitutionLessonSpecs,
  legacyBlockCounts:philippineConstitutionLessonSpecs.map((item)=>item.blocks.length-(item.lessonType==='reading'?2:3)),
})
