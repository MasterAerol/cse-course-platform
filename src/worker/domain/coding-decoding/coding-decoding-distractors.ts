import type { DistractorMistakeType } from '../distractor-models'
import { normalizeCodingAnswer } from './coding-decoding-format'
import type { CodingDistractor } from './coding-decoding.types'

export function codingDistractor(text: string, mistakeType: DistractorMistakeType): CodingDistractor { return { text: normalizeCodingAnswer(text), mistakeType } }
export function selectCodingDistractors(correct: string, candidates: readonly CodingDistractor[]): CodingDistractor[] {
  const seen = new Set([normalizeCodingAnswer(correct)]); const selected: CodingDistractor[] = []
  for (const candidate of candidates) { const text = normalizeCodingAnswer(candidate.text); if (!seen.has(text)) { seen.add(text); selected.push({ ...candidate, text }) }; if (selected.length === 3) return selected }
  throw new Error('Coding and Decoding question does not contain three unique modeled distractors.')
}
