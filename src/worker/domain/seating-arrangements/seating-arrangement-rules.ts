import type { FacingDirection } from './seating-arrangement.types'

export const peopleBetween = (first: number, second: number) => Math.abs(first - second) - 1
export const areAdjacent = (first: number, second: number) => Math.abs(first - second) === 1
export const isEndPosition = (position: number, size: number) => position === 0 || position === size - 1
export const clockwiseIndex = (position: number, steps: number, size: number) => (position + steps) % size
export const counterclockwiseIndex = (position: number, steps: number, size: number) => (position - steps % size + size) % size
export function oppositeIndex(position: number, size: number): number {
  if (size % 2 !== 0) throw new Error('Opposite seats require an even number of seats.')
  return clockwiseIndex(position, size / 2, size)
}
export function facingRelativeIndex(position: number, side: 'left' | 'right', facing: FacingDirection, steps: number, size: number): number {
  const clockwise = facing === 'center' ? side === 'left' : side === 'right'
  return clockwise ? clockwiseIndex(position, steps, size) : counterclockwiseIndex(position, steps, size)
}
export function swapPositions<T>(order: readonly T[], first: number, second: number): T[] {
  if (first < 0 || second < 0 || first >= order.length || second >= order.length) throw new Error('Swap position is outside the arrangement.')
  const copy = order.slice()
  const value = copy[first]
  copy[first] = copy[second] as T
  copy[second] = value as T
  return copy
}
export function moveWithShift<T>(order: readonly T[], from: number, to: number): T[] {
  if (from < 0 || to < 0 || from >= order.length || to >= order.length) throw new Error('Move position is outside the arrangement.')
  const copy = order.slice()
  const [value] = copy.splice(from, 1)
  copy.splice(to, 0, value as T)
  return copy
}
