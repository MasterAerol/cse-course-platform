export interface TeachingPublisher { name:string; topicSlug:string; aliases:string[]; script:string; inspectorScript?:string; passwordEnv:string; confirmation:string }
export const teachingPublisherRegistry: Readonly<Record<string,Omit<TeachingPublisher,'name'>>>
export function resolveTeachingPublisher(value:string):TeachingPublisher