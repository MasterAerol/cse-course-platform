import { blocksFor, lessonSpecs } from '../environment-management-topic-content.mjs'
import { buildGeneralInformationTeachingSystem } from './general-information-teaching-system-content.mjs'

export const environmentManagementLessonSpecs = buildGeneralInformationTeachingSystem({
  topicSlug: 'environment-management-and-protection',
  topicTitle: 'Environment Management and Protection',
  lessonSpecs,
  blocksFor,
  method: 'Identify the Environmental Issue → Trace Cause and Effect → Match the Law or Institution → Choose Prevention, Management, or Safe Response → Reject Overbroad and Unsafe Claims → Verify Source and Scope',
  methodReason: 'Separating the environmental domain, cause, legal framework, institution, preventive action, and safety boundary prevents familiar agency names, cleanup-only claims, invented technical limits, and unsafe personal intervention from replacing the authoritative rule.',
  memoryRule: 'Match the environmental problem to the correct response',
  memoryReason: 'air, water, waste, hazardous substances, biodiversity, project assessment, and climate action use different laws and institutions, while prevention and safe lawful reporting are often more accurate than overbroad bans or do-it-yourself intervention',
})
