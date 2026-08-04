export interface LessonSpec { title: string; slug: string; lessonType: string; minutes: number; position: number }
export interface Block { blockType: string; content: unknown }
export interface Source { title:string; url:string; classification:string; verificationDate:string; historicalVersion?:string; article?:string; section?:string; provisionId?:string; paraphrasedRule?:string }
export interface ContentQuestion { prompt:string; choices:readonly string[]; correctIndex:number; explanation:string; source:Source }
export const subjectTitle:string; export const subjectSlug:string; export const subjectDescription:string
export const topicTitle:string; export const topicSlug:string; export const topicDescription:string
export const constitutionSource:Source; export const examCoverageSource:Source; export const disclaimer:string
export const lessonSpecs:readonly LessonSpec[]; export const generatedByLesson:Readonly<Record<string,string>>
export function requiredSubjectPosition(verbalPosition:number):number
export function blocksFor(slug:string):Block[]
export const mixedQuestions:readonly ContentQuestion[]; export const quizQuestions:readonly ContentQuestion[]
export function fixedQuestion(item:ContentQuestion,position:number,quiz?:boolean):{prompt:string;explanation:string;points:number;position:number;status:string;questionType?:string;choices:Array<{text:string;isCorrect:boolean;position:number}>}
export function validateQuestions(label:string,questions:readonly ReturnType<typeof fixedQuestion>[],expected:number):string[]