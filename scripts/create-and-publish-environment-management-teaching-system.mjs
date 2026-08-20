#!/usr/bin/env node
import { runGeneralInformationTeachingPublisher } from './lib/general-information-teaching-system-publisher.mjs'
import { environmentManagementLessonSpecs } from './lib/environment-management-teaching-system-content.mjs'

runGeneralInformationTeachingPublisher({
  topicSlug: 'environment-management-and-protection',
  topicTitle: 'Environment Management and Protection',
  lessonSpecs: environmentManagementLessonSpecs,
  confirmation: 'publish-environment-management-and-protection-teaching-system-v1',
  credentialEnv: 'CSE_ENVIRONMENT_MANAGEMENT_ADMIN_PASSWORD',
}).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
