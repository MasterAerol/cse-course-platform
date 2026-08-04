import type { OrderDependency, SentenceNode } from './paragraph-organization.types'

type Label = SentenceNode['id']
export function enumerateOrders(labels: readonly Label[]): Label[][] { if (labels.length === 0) return [[]]; return labels.flatMap((label) => enumerateOrders(labels.filter((item) => item !== label)).map((tail) => [label, ...tail])) }
export function orderSatisfiesDependencies(order: readonly Label[], dependencies: readonly OrderDependency[]): boolean { if (order.length !== new Set(order).size) return false; return dependencies.every((item) => order.indexOf(item.before) >= 0 && order.indexOf(item.before) < order.indexOf(item.after)) }
export function solveParagraphOrders(nodes: readonly SentenceNode[], dependencies: readonly OrderDependency[]): Label[][] { return enumerateOrders(nodes.map((item) => item.id)).filter((order) => orderSatisfiesDependencies(order, dependencies)) }
export function hasUniqueParagraphOrder(nodes: readonly SentenceNode[], dependencies: readonly OrderDependency[], expected: readonly Label[]): boolean { const solutions = solveParagraphOrders(nodes, dependencies); return solutions.length === 1 && solutions[0]?.join('-') === expected.join('-') }
