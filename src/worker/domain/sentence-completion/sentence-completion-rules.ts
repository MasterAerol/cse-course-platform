import type { PartOfSpeech } from '../vocabulary/vocabulary.types'
import type { Formality } from '../synonyms-antonyms/synonyms-antonyms.types'
import type { SentenceCompletionEntry, SentenceRelationship, SentenceTone } from './sentence-completion.types'

export function normalizeCompletion(value: string): string { return value.trim().toLowerCase().replaceAll(/\s+/gu, ' ') }
export function countSentenceBlanks(template: string): number { return template.match(/____/gu)?.length ?? 0 }
export function completionParts(completion: string): string[] { return completion.split(/\s*\|\s*/u).map((part) => part.trim()) }
export function reconstructSentence(template: string, completion: string): string { let result = template; for (const part of completionParts(completion)) result = result.replace('____', part); return result }
export function blankPositionsValid(entry: SentenceCompletionEntry): boolean { return countSentenceBlanks(entry.sentenceTemplate) === entry.blankCount && completionParts(entry.correctCompletion).length === entry.blankCount }
export function partOfSpeechMatches(entry: SentenceCompletionEntry, expected: PartOfSpeech | null): boolean { return entry.partOfSpeech === expected }
export function tenseAndNumberMatch(entry: SentenceCompletionEntry, tense: SentenceCompletionEntry['tense'], number: SentenceCompletionEntry['number']): boolean { return entry.tense === tense && entry.number === number }
export function transitionRelationshipValid(entry: SentenceCompletionEntry): boolean { if (entry.transitionType === null) return true; const allowed: Record<NonNullable<SentenceCompletionEntry['transitionType']>, readonly SentenceRelationship[]> = { addition: ['continuation', 'parallel'], contrast: ['contrast', 'concession', 'comparison'], cause: ['cause', 'result'], result: ['result'], example: ['example'], sequence: ['sequence'] }; return allowed[entry.transitionType].includes(entry.relationship) }
export function semanticCompatibility(entry: SentenceCompletionEntry, completion: string): boolean { return normalizeCompletion(completion) === normalizeCompletion(entry.correctCompletion) && reconstructSentence(entry.sentenceTemplate, completion) === entry.completedSentence }
export function parallelFormValid(entry: SentenceCompletionEntry): boolean { return entry.skill !== 'parallel' || entry.relationship === 'parallel' || entry.relationship === 'sequence' }
export function toneAndFormalityMatch(entry: SentenceCompletionEntry, tone: SentenceTone, formality: Formality): boolean { return entry.tone === tone && entry.formality === formality }
export function doubleBlankPairValid(entry: SentenceCompletionEntry, completion: string): boolean { return entry.blankCount !== 2 || (completionParts(completion).length === 2 && semanticCompatibility(entry, completion)) }
export function naturalCompletedSentence(entry: SentenceCompletionEntry): boolean { const sentence = reconstructSentence(entry.sentenceTemplate, entry.correctCompletion); return sentence === entry.completedSentence && !sentence.includes('____') && sentence.length >= 24 && /[.!?]$/u.test(sentence) }
