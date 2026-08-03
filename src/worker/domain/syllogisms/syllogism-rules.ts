import type { CategoricalStatement } from './syllogism.types'

export function parseCategoricalStatement(text: string): CategoricalStatement {
  const normalized = text.trim().replace(/[.]$/u, '')
  const someNot = /^Some ([A-Za-z-]+) are not ([A-Za-z-]+)$/u.exec(normalized)
  if (someNot !== null) return { quantifier: 'some-not', subject: someNot[1]?.toLowerCase() ?? '', predicate: someNot[2]?.toLowerCase() ?? '' }
  const match = /^(All|No|Some) ([A-Za-z-]+) are ([A-Za-z-]+)$/u.exec(normalized)
  if (match === null) throw new Error(`Unsupported categorical statement: ${text}`)
  return { quantifier: match[1]?.toLowerCase() as 'all' | 'no' | 'some', subject: match[2]?.toLowerCase() ?? '', predicate: match[3]?.toLowerCase() ?? '' }
}

export function statement(quantifier: CategoricalStatement['quantifier'], subject: string, predicate: string): CategoricalStatement {
  return { quantifier, subject: subject.trim().toLowerCase(), predicate: predicate.trim().toLowerCase() }
}
