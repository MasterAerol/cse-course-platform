export interface GeneratorConfig { slug:string;version:number;rotationPosition:number;selectionWeight:number }
export interface TopicConfig { topicSlug:string;topicTitle:string;position:number;count:number;difficulty:{easy:number;medium:number;hard:number};generators:GeneratorConfig[] }
export interface SubjectConfig { subjectSlug:string;subjectTitle:string;position:number;count:number;difficulty:{easy:number;medium:number;hard:number};assessmentSlug:string;topics:TopicConfig[] }
export const fullCseMockBlueprintV1:{version:number;label:string;totalQuestions:number;passingScorePercent:number;timedDurationMinutes:number;difficulty:{easy:number;medium:number;hard:number};subjects:SubjectConfig[]}
export const allMockGeneratorSlugs:string[]
