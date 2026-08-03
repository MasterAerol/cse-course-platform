import type { DistractorMistakeType } from '../distractor-models'
import { normalizeRankingAnswer } from './ordering-ranking-format'
import type { RankingDistractor } from './ordering-ranking.types'

export function rankingDistractor(text: string, mistakeType: DistractorMistakeType): RankingDistractor { return { text: normalizeRankingAnswer(text), mistakeType } }
export function selectRankingDistractors(correct: string, candidates: readonly RankingDistractor[]): RankingDistractor[] { const seen = new Set([normalizeRankingAnswer(correct)]); const selected: RankingDistractor[] = []; for (const candidate of candidates) { const text = normalizeRankingAnswer(candidate.text); if (!seen.has(text)) { seen.add(text); selected.push({ ...candidate, text }) } if (selected.length === 3) return selected } throw new Error('Ordering and Ranking question lacks three unique modeled distractors.') }
