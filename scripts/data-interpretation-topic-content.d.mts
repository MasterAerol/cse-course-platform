export interface LessonSpec { title: string; slug: string; lessonType: string; minutes: number; position: number }
export interface Block { blockType: string; content: unknown }
export type FixedQuestionTuple = readonly [string, readonly string[], number, string]
export const topicSlug: string
export const topicTitle: string
export const topicDescription: string
export const generatedByLesson: Readonly<Record<string, string>>
export const lessonSpecs: readonly LessonSpec[]
export function blocksFor(slug: string): Block[]
export const mixedQuestions: readonly FixedQuestionTuple[]
export const quizQuestions: readonly FixedQuestionTuple[]
export function fixedQuestion(item: FixedQuestionTuple, position: number, quiz?: boolean): { prompt: string; explanation: string; points: number; position: number; status: string; questionType?: string; choices: Array<{ text: string; isCorrect: boolean; position: number }> }
export function validateQuestions(label: string, questions: readonly ReturnType<typeof fixedQuestion>[], expected: number): string[]
