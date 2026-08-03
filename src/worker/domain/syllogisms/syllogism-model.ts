import type { CategoricalStatement, ConclusionClassification, RegionRequirement, SyllogismRegionModel } from './syllogism.types'

const universalQuantifiers = new Set(['all', 'no'])

function normalizeCategory(value: string): string {
  const normalized = value.trim().toLowerCase()
  if (!/^[a-z][a-z-]*$/u.test(normalized)) throw new Error(`Invalid syllogism category: ${value}`)
  return normalized
}

export function statementCategories(statements: readonly CategoricalStatement[]): string[] {
  const categories = [...new Set(statements.flatMap((statement) => [normalizeCategory(statement.subject), normalizeCategory(statement.predicate)]))]
  if (categories.length < 2 || categories.length > 4) throw new Error('Syllogism models require two to four categories.')
  return categories
}

function membership(region: number, category: string, indexes: ReadonlyMap<string, number>): boolean {
  const index = indexes.get(normalizeCategory(category))
  if (index === undefined) throw new Error(`Unknown syllogism category: ${category}`)
  return (region & (1 << index)) !== 0
}

export function regionSatisfiesStatement(region: number, statement: CategoricalStatement, indexes: ReadonlyMap<string, number>): boolean {
  const subject = membership(region, statement.subject, indexes)
  const predicate = membership(region, statement.predicate, indexes)
  if (statement.quantifier === 'all') return !subject || predicate
  if (statement.quantifier === 'no') return !subject || !predicate
  if (statement.quantifier === 'some') return subject && predicate
  return subject && !predicate
}

export function buildRegionModel(statements: readonly CategoricalStatement[]): SyllogismRegionModel {
  const categories = statementCategories(statements)
  const indexes = new Map(categories.map((category, index) => [category, index]))
  const universals = statements.filter((statement) => universalQuantifiers.has(statement.quantifier))
  const allowedRegions = Array.from({ length: (1 << categories.length) - 1 }, (_, index) => index + 1)
    .filter((region) => universals.every((statement) => regionSatisfiesStatement(region, statement, indexes)))
  const existentialRequirements: RegionRequirement[] = statements
    .filter((statement) => !universalQuantifiers.has(statement.quantifier))
    .map((statement) => ({ statement, candidateRegions: allowedRegions.filter((region) => regionSatisfiesStatement(region, statement, indexes)) }))
  return { categories, allowedRegions, existentialRequirements, satisfiable: existentialRequirements.every((requirement) => requirement.candidateRegions.length > 0) }
}

export function isSatisfiable(statements: readonly CategoricalStatement[]): boolean {
  return buildRegionModel(statements).satisfiable
}

export function negateStatement(statement: CategoricalStatement): CategoricalStatement {
  const quantifier = statement.quantifier === 'all' ? 'some-not' : statement.quantifier === 'some-not' ? 'all' : statement.quantifier === 'no' ? 'some' : 'no'
  return { ...statement, quantifier }
}

export function isEntailed(premises: readonly CategoricalStatement[], conclusion: CategoricalStatement): boolean {
  const combinedCategories = statementCategories([...premises, conclusion])
  const indexes = new Map(combinedCategories.map((category, index) => [category, index]))
  const model = buildRegionModel([...premises, ...combinedCategories.filter((category) => !statementCategories(premises).includes(category)).map((category) => ({ quantifier: 'all' as const, subject: category, predicate: category }))])
  if (!model.satisfiable) return false
  if (universalQuantifiers.has(conclusion.quantifier)) return model.allowedRegions.every((region) => regionSatisfiesStatement(region, conclusion, indexes))
  return model.existentialRequirements.some((requirement) => requirement.candidateRegions.every((region) => regionSatisfiesStatement(region, conclusion, indexes)))
}

export function isPossible(premises: readonly CategoricalStatement[], conclusion: CategoricalStatement): boolean {
  return isSatisfiable([...premises, conclusion])
}

export function isImpossible(premises: readonly CategoricalStatement[], conclusion: CategoricalStatement): boolean {
  return !isPossible(premises, conclusion)
}

export function classifyConclusion(premises: readonly CategoricalStatement[], conclusion: CategoricalStatement): ConclusionClassification {
  if (isEntailed(premises, conclusion)) return 'definite'
  return isPossible(premises, conclusion) ? 'possible' : 'impossible'
}

function sameStatement(first: CategoricalStatement, second: CategoricalStatement): boolean {
  if (first.quantifier !== second.quantifier) return false
  const direct = normalizeCategory(first.subject) === normalizeCategory(second.subject) && normalizeCategory(first.predicate) === normalizeCategory(second.predicate)
  if (direct) return true
  return (first.quantifier === 'no' || first.quantifier === 'some') && normalizeCategory(first.subject) === normalizeCategory(second.predicate) && normalizeCategory(first.predicate) === normalizeCategory(second.subject)
}

export function isValidEitherOrPair(premises: readonly CategoricalStatement[], first: CategoricalStatement, second: CategoricalStatement): boolean {
  if (!isSatisfiable(premises) || isEntailed(premises, first) || isEntailed(premises, second)) return false
  if (!sameStatement(negateStatement(first), second) && !sameStatement(negateStatement(second), first)) return false
  const bothTrue = isSatisfiable([...premises, first, second])
  const bothFalse = isSatisfiable([...premises, negateStatement(first), negateStatement(second)])
  return !bothTrue && !bothFalse && isPossible(premises, first) && isPossible(premises, second)
}
