import type { SentenceCompletionMistakeType } from './sentence-completion.types'

export interface SentenceCompletionDistractor { text: string; mistakeType: SentenceCompletionMistakeType; qualityScore: number }
export function sentenceCompletionDistractor(text: string, mistakeType: SentenceCompletionMistakeType): SentenceCompletionDistractor { return { text, mistakeType, qualityScore: 0.9 } }
export function selectSentenceCompletionDistractors(correct: string, candidates: readonly SentenceCompletionDistractor[]): SentenceCompletionDistractor[] { const seen = new Set([correct.trim().toLowerCase()]); const selected: SentenceCompletionDistractor[] = []; for (const candidate of candidates) { const key = candidate.text.trim().toLowerCase(); if (!seen.has(key)) { seen.add(key); selected.push(candidate) } if (selected.length === 3) break } if (selected.length !== 3) throw new Error('Sentence completion requires three documented distractors.'); return selected }
