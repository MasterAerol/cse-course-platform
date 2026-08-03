import type { ArrangementConstraint } from './seating-arrangement.types'

export function formatConstraint(constraint: ArrangementConstraint): string {
  if (constraint.kind === 'fixed') return `${constraint.label} is in position ${constraint.position + 1}.`
  if (constraint.kind === 'end') return `${constraint.label} is at one end.`
  if (constraint.kind === 'not-end') return `${constraint.label} is not at either end.`
  if (constraint.kind === 'before') return `${constraint.first} is ${constraint.immediate ? 'immediately ' : ''}left of ${constraint.second}.`
  if (constraint.kind === 'adjacent') return `${constraint.first} sits next to ${constraint.second}.`
  if (constraint.kind === 'not-adjacent') return `${constraint.first} does not sit next to ${constraint.second}.`
  if (constraint.kind === 'gap') return `Exactly ${constraint.between} ${constraint.between === 1 ? 'person sits' : 'people sit'} between ${constraint.first} and ${constraint.second}.`
  if (constraint.kind === 'between') return `${constraint.middle} sits somewhere between ${constraint.first} and ${constraint.second}.`
  if (constraint.kind === 'clockwise') return `${constraint.second} is ${constraint.steps === 1 ? 'immediately ' : `${constraint.steps} seats `}clockwise from ${constraint.first}.`
  return `${constraint.first} sits opposite ${constraint.second}.`
}
export const formatClues = (constraints: readonly ArrangementConstraint[]) => constraints.map((constraint, index) => `${index + 1}. ${formatConstraint(constraint)}`).join('\n')
export const arrangementNumericValue = (text: string) => [...text].reduce((total, character) => (total * 31 + (character.codePointAt(0) ?? 0)) % 1000003, 17)
