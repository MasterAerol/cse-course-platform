import type { VocabularyMistakeType } from './vocabulary.types'

export interface VocabularyDistractor { text: string; mistakeType: VocabularyMistakeType; qualityScore: number }
export function vocabularyDistractor(text: string, mistakeType: VocabularyMistakeType): VocabularyDistractor { return { text, mistakeType, qualityScore: 0.9 } }
export function selectVocabularyDistractors(correct: string, candidates: readonly VocabularyDistractor[]): VocabularyDistractor[] { const seen = new Set([correct.trim().toLowerCase()]); const selected: VocabularyDistractor[] = []; for (const item of candidates) { const key = item.text.trim().toLowerCase(); if (key.length > 0 && !seen.has(key)) { seen.add(key); selected.push(item) } if (selected.length === 3) break } if (selected.length !== 3) throw new Error('Vocabulary question lacks three documented unique distractors.'); return selected }
