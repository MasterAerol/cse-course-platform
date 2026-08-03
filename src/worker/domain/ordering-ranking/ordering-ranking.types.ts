import type { DistractorMistakeType } from '../distractor-models'

export interface OrderEdge { higher: string; lower: string }
export interface RankingDistractor { text: string; mistakeType: DistractorMistakeType }
export interface RankingScenario { prompt: string; correct: string; steps: string[]; signature: string; parameters: Record<string, unknown>; distractors: RankingDistractor[] }
export interface QueueState { total: number; rankFromFront: number }
