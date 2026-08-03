import type { DataDistractor, DataMistakeType } from './data-interpretation.types'

export const dataDistractor = (value: number, mistakeType: DataMistakeType): DataDistractor => ({ value, mistakeType })
export function selectDataDistractors(correct: string, candidates: readonly { text: string; value: number; mistakeType: DataMistakeType }[]) {
  const seen = new Set([correct.trim().toLowerCase()]); const selected: typeof candidates[number][] = []
  for (const candidate of candidates) { const key = candidate.text.trim().toLowerCase(); if (!seen.has(key) && Number.isFinite(candidate.value) && candidate.value >= 0) { seen.add(key); selected.push(candidate) }; if (selected.length === 3) return selected }
  throw new Error('Three distinct documented data distractors are required.')
}
