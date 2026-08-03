export type ArrangementMode = 'linear' | 'circular' | 'schedule'
export type FacingDirection = 'center' | 'outward'

export type ArrangementConstraint =
  | { kind: 'fixed'; label: string; position: number }
  | { kind: 'end'; label: string }
  | { kind: 'not-end'; label: string }
  | { kind: 'before'; first: string; second: string; immediate?: boolean }
  | { kind: 'adjacent'; first: string; second: string }
  | { kind: 'not-adjacent'; first: string; second: string }
  | { kind: 'gap'; first: string; second: string; between: number }
  | { kind: 'between'; middle: string; first: string; second: string }
  | { kind: 'clockwise'; first: string; second: string; steps: number }
  | { kind: 'opposite'; first: string; second: string }

export interface ArrangementProblem {
  mode: ArrangementMode
  labels: readonly string[]
  constraints: readonly ArrangementConstraint[]
}

export interface ArrangementSolution {
  order: readonly string[]
}

export type QueryTruth = 'must' | 'may' | 'cannot'

export interface ArrangementScenario {
  problem: ArrangementProblem
  prompt: string
  correct: string
  distractors: readonly ArrangementDistractor[]
  steps: readonly string[]
  signature: string
  query: { kind: 'position' | 'left' | 'right' | 'clockwise' | 'opposite'; label?: string; position?: number; steps?: number; facing?: FacingDirection }
}

export interface ArrangementDistractor {
  text: string
  mistakeType: ArrangementMistakeType
}

export type ArrangementMistakeType =
  | 'arrangement_reversed_direction'
  | 'arrangement_ignored_immediate'
  | 'arrangement_possible_not_necessary'
  | 'arrangement_violated_end'
  | 'arrangement_off_by_one_gap'
  | 'arrangement_counted_endpoint'
  | 'arrangement_ignored_wraparound'
  | 'arrangement_rotation_distinct'
  | 'arrangement_wrong_opposite'
  | 'arrangement_ignored_orientation'
  | 'arrangement_outward_as_center'
  | 'arrangement_original_position'
  | 'arrangement_partial_swap'
  | 'arrangement_failed_shift'
  | 'arrangement_reversed_before_after'
  | 'arrangement_ignored_fixed_slot'
  | 'arrangement_violated_not_end'
  | 'arrangement_ignored_adjacency'
  | 'arrangement_violated_clue'
