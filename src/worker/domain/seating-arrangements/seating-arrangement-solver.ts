import type { ArrangementConstraint, ArrangementProblem, ArrangementSolution, QueryTruth } from './seating-arrangement.types'

export function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [items.slice()]
  const result: T[][] = []
  items.forEach((item, index) => {
    const rest = [...items.slice(0, index), ...items.slice(index + 1)]
    for (const tail of permutations(rest)) result.push([item, ...tail])
  })
  return result
}

const position = (order: readonly string[], label: string) => order.indexOf(label)
const circularDistance = (from: number, to: number, size: number) => (to - from + size) % size

export function satisfiesConstraint(order: readonly string[], constraint: ArrangementConstraint, circular: boolean): boolean {
  const size = order.length
  const at = (label: string) => position(order, label)
  if (constraint.kind === 'fixed') return at(constraint.label) === constraint.position
  if (constraint.kind === 'end') return at(constraint.label) === 0 || at(constraint.label) === size - 1
  if (constraint.kind === 'not-end') return at(constraint.label) > 0 && at(constraint.label) < size - 1
  if (constraint.kind === 'before') return constraint.immediate ? at(constraint.second) - at(constraint.first) === 1 : at(constraint.first) < at(constraint.second)
  if (constraint.kind === 'adjacent') return circular ? circularDistance(at(constraint.first), at(constraint.second), size) === 1 || circularDistance(at(constraint.second), at(constraint.first), size) === 1 : Math.abs(at(constraint.first) - at(constraint.second)) === 1
  if (constraint.kind === 'not-adjacent') return !satisfiesConstraint(order, { kind: 'adjacent', first: constraint.first, second: constraint.second }, circular)
  if (constraint.kind === 'gap') return Math.abs(at(constraint.first) - at(constraint.second)) === constraint.between + 1
  if (constraint.kind === 'between') {
    const middle = at(constraint.middle)
    return (at(constraint.first) < middle && middle < at(constraint.second)) || (at(constraint.second) < middle && middle < at(constraint.first))
  }
  if (constraint.kind === 'clockwise') return circular && circularDistance(at(constraint.first), at(constraint.second), size) === constraint.steps
  return circular && size % 2 === 0 && circularDistance(at(constraint.first), at(constraint.second), size) === size / 2
}

export function normalizeCircular(order: readonly string[], anchor = order[0]): string[] {
  if (anchor === undefined) return []
  const index = order.indexOf(anchor)
  if (index < 0) throw new Error(`Circular anchor ${anchor} is absent.`)
  return [...order.slice(index), ...order.slice(0, index)]
}

export function solveArrangements(problem: ArrangementProblem): ArrangementSolution[] {
  if (new Set(problem.labels).size !== problem.labels.length) return []
  if (problem.labels.length < 2 || problem.labels.length > 8) throw new Error('Arrangement size must be between 2 and 8.')
  const circular = problem.mode === 'circular'
  const anchor = problem.labels[0]
  const candidates = circular && anchor !== undefined
    ? permutations(problem.labels.slice(1)).map((tail) => [anchor, ...tail])
    : permutations(problem.labels)
  return candidates.filter((order) => problem.constraints.every((constraint) => satisfiesConstraint(order, constraint, circular))).map((order) => ({ order }))
}

export const isSatisfiableArrangement = (problem: ArrangementProblem) => solveArrangements(problem).length > 0
export const hasUniqueArrangement = (problem: ArrangementProblem) => solveArrangements(problem).length === 1

export function evaluateAcrossSolutions(problem: ArrangementProblem, predicate: (order: readonly string[]) => boolean): QueryTruth {
  const solutions = solveArrangements(problem)
  if (solutions.length === 0) return 'cannot'
  const matches = solutions.filter(({ order }) => predicate(order)).length
  return matches === solutions.length ? 'must' : matches > 0 ? 'may' : 'cannot'
}

export function uniquelyDeterminedValue<T>(problem: ArrangementProblem, query: (order: readonly string[]) => T): T | null {
  const values = solveArrangements(problem).map(({ order }) => query(order))
  if (values.length === 0) return null
  return values.every((value) => value === values[0]) ? values[0] ?? null : null
}
