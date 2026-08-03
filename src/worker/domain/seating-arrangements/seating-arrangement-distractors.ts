import type { ArrangementDistractor, ArrangementMistakeType } from './seating-arrangement.types'

export const arrangementDistractor = (text: string, mistakeType: ArrangementMistakeType): ArrangementDistractor => ({ text, mistakeType })
export function selectArrangementDistractors(correct: string, candidates: readonly ArrangementDistractor[]): ArrangementDistractor[] {
  const seen = new Set([correct.trim().toLowerCase()])
  const selected: ArrangementDistractor[] = []
  for (const candidate of candidates) {
    const key = candidate.text.trim().toLowerCase()
    if (!seen.has(key)) { seen.add(key); selected.push(candidate) }
    if (selected.length === 3) return selected
  }
  throw new Error('Three distinct mistake-based arrangement distractors are required.')
}
