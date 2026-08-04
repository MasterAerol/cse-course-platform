export interface GeneratorConfig { slug:string;version:number;rotationPosition:number;selectionWeight:number }
export interface TopicConfig { topicSlug:string;topicTitle:string;position:number;count:number;difficulty:{easy:number;medium:number;hard:number};generators:GeneratorConfig[] }
export const requiredTopics:readonly string[]
export const topicTitles:readonly string[]
export const generatorPools:readonly (readonly string[])[]
export const generalInformationBlueprintV1:{subjectSlug:string;version:number;totalQuestions:number;passingScorePercent:number;topics:TopicConfig[]}
