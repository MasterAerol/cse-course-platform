import { solveArrangements, uniquelyDeterminedValue } from './seating-arrangement-solver'
import { clockwiseIndex, facingRelativeIndex, oppositeIndex } from './seating-arrangement-rules'
import type { ArrangementProblem, ArrangementScenario } from './seating-arrangement.types'

export const hasUniqueVisibleChoices = (choices: readonly string[]) => new Set(choices.map((choice) => choice.trim().toLowerCase())).size === choices.length

export function answerScenario(problem: ArrangementProblem, query: ArrangementScenario['query']): string | null {
  return uniquelyDeterminedValue(problem, (order) => {
    if (query.kind === 'position') return order[query.position ?? -1] ?? ''
    const at = order.indexOf(query.label ?? '')
    if (at < 0) return ''
    if (query.kind === 'left' || query.kind === 'right') {
      if (problem.mode === 'circular') return order[facingRelativeIndex(at, query.kind, query.facing ?? 'center', query.steps ?? 1, order.length)] ?? ''
      const target = query.kind === 'left' ? at - (query.steps ?? 1) : at + (query.steps ?? 1)
      return order[target] ?? ''
    }
    if (query.kind === 'clockwise') return order[clockwiseIndex(at, query.steps ?? 1, order.length)] ?? ''
    return order[oppositeIndex(at, order.length)] ?? ''
  })
}

export function validateScenario(scenario: ArrangementScenario): boolean {
  const solutions = solveArrangements(scenario.problem)
  const choices = [scenario.correct, ...scenario.distractors.map(({ text }) => text)]
  return solutions.length > 0 && answerScenario(scenario.problem, scenario.query) === scenario.correct && choices.length === 4 && hasUniqueVisibleChoices(choices) && scenario.distractors.every(({ mistakeType }) => mistakeType.startsWith('arrangement_'))
}
