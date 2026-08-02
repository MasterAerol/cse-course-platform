import type {
  ConditionalRule,
  DeductionRule,
  QuantifiedStatement,
} from './logical-reasoning.types'

export function converse(rule: ConditionalRule): ConditionalRule {
  return { antecedent: rule.consequent, consequent: rule.antecedent }
}

export function inverse(rule: ConditionalRule): ConditionalRule {
  return {
    antecedent: `not ${rule.antecedent}`,
    consequent: `not ${rule.consequent}`,
  }
}

export function contrapositive(rule: ConditionalRule): ConditionalRule {
  return {
    antecedent: `not ${rule.consequent}`,
    consequent: `not ${rule.antecedent}`,
  }
}

export function isValidConditionalInference(input: {
  rule: ConditionalRule
  fact: string
  conclusion: string
}): boolean {
  const { rule, fact, conclusion } = input
  return (
    (fact === rule.antecedent && conclusion === rule.consequent) ||
    (fact === `not ${rule.consequent}` &&
      conclusion === `not ${rule.antecedent}`)
  )
}

export function negateQuantifier(statement: QuantifiedStatement): string {
  return statement.quantifier === 'all'
    ? `At least one ${statement.subject} is not ${statement.predicate}.`
    : `No ${statement.subject} is ${statement.predicate}.`
}

export function areContradictory(left: string, right: string): boolean {
  return left === `not ${right}` || right === `not ${left}`
}

export function followDeductionChain(
  start: string,
  rules: readonly DeductionRule[],
): string[] {
  const reached = [start]
  let current = start
  const unused = [...rules]
  while (true) {
    const index = unused.findIndex((rule) => rule.from === current)
    if (index < 0) return reached
    const rule = unused[index]
    if (rule === undefined) return reached
    current = rule.to
    reached.push(current)
    unused.splice(index, 1)
  }
}

export function areLogicallyEquivalent(left: string, right: string): boolean {
  const normalizedLeft = left.trim().toLowerCase()
  const normalizedRight = right.trim().toLowerCase()
  if (normalizedLeft === normalizedRight) return true
  const commutative = (value: string, operator: ' and ' | ' or ') =>
    value.split(operator).map((part) => part.trim()).sort().join(operator)
  for (const operator of [' and ', ' or '] as const) {
    if (
      normalizedLeft.includes(operator) &&
      normalizedRight.includes(operator) &&
      commutative(normalizedLeft, operator) ===
        commutative(normalizedRight, operator)
    ) return true
  }
  return normalizedLeft.startsWith('not not ') &&
    normalizedLeft.slice(8) === normalizedRight
}
