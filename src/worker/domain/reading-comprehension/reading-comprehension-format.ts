import type { ReadingPassage, ReadingSkill } from './reading-comprehension.types'
const labels: Readonly<Record<ReadingSkill, string>> = { main_idea: 'main idea and topic', supporting_detail: 'supporting details', sequence_organization: 'sequence and organization', cause_effect: 'cause and effect', vocabulary_context: 'vocabulary in context', inference: 'inference and implied meaning', purpose_tone: 'author purpose and tone', fact_opinion_conclusion: 'fact, opinion, and conclusion' }
export function readingSkillLabel(skill: ReadingSkill): string { return labels[skill] }
export function formatPassagePrompt(passage: ReadingPassage, question: string): string { return `Passage: ${passage.title}\n\n${passage.text}\n\nQuestion: ${question}` }
export function readingNumericValue(value: string): number { let total = 0; for (const character of value) total = (total * 31 + (character.codePointAt(0) ?? 0)) % 1_000_003; return total }
