import { runAnalyticalTeachingPublisher } from './analytical-teaching-system-publisher.mjs'

export function runGeneralInformationTeachingPublisher(config, argv = process.argv) {
  return runAnalyticalTeachingPublisher({ ...config, subjectSlug: 'general-information', endpointSlug: 'general-information-teaching-system-v1' }, argv)
}
