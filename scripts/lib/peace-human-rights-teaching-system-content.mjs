import { blocksFor, lessonSpecs } from '../peace-human-rights-topic-content.mjs'
import { buildGeneralInformationTeachingSystem } from './general-information-teaching-system-content.mjs'

export const peaceHumanRightsLessonSpecs = buildGeneralInformationTeachingSystem({
  topicSlug: 'peace-and-human-rights',
  topicTitle: 'Peace and Human Rights Issues and Concepts',
  lessonSpecs,
  blocksFor,
  method: 'Identify the Right or Peace Concept → Classify the Source → Match the Duty or Institution → Apply the Exact Scenario → Reject Absolutes and Role Overstatement → Verify Safety and Lawful Process',
  methodReason: 'Separating the right, responsibility, peace concept, source type, institution, and lawful condition prevents declarations, treaties, domestic rules, institutional mandates, and educational peace terminology from being treated as interchangeable.',
  memoryRule: 'Name the right, duty, and actor separately',
  memoryReason: 'a broadly positive answer can still be wrong when it turns a right into a reward, assigns an institution another body’s role, treats conflict as violence, or removes safety and lawful-process conditions',
})
