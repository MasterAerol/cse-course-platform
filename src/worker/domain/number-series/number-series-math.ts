import type { SeriesBounds, SeriesOperation } from './number-series.types'

export const DEFAULT_SERIES_BOUNDS: SeriesBounds = { minimum: -10_000, maximum: 10_000 }

export function assertSeriesValue(value: number, bounds: SeriesBounds = DEFAULT_SERIES_BOUNDS): number {
  if (!Number.isFinite(value) || !Number.isSafeInteger(value)) throw new Error('Series values must be finite safe integers.')
  if (value < bounds.minimum || value > bounds.maximum) throw new Error('Series value is outside the readable bounds.')
  return value
}

export function arithmeticProgression(start: number, difference: number, count: number): number[] {
  if (!Number.isInteger(count) || count < 2) throw new Error('An arithmetic progression needs at least two terms.')
  return Array.from({ length: count }, (_, index) => assertSeriesValue(start + difference * index))
}

export function geometricProgression(start: number, ratio: number, count: number): number[] {
  if (!Number.isInteger(ratio) || ratio === 0) throw new Error('The geometric ratio must be a nonzero integer.')
  if (!Number.isInteger(count) || count < 2) throw new Error('A geometric progression needs at least two terms.')
  return Array.from({ length: count }, (_, index) => assertSeriesValue(start * ratio ** index))
}

export function applyOperation(value: number, operation: SeriesOperation): number {
  if (operation.kind === 'add') return assertSeriesValue(value + operation.value)
  if (operation.kind === 'multiply') return assertSeriesValue(value * operation.value)
  if (operation.value === 0 || value % operation.value !== 0) throw new Error('Division must be exact and nonzero.')
  return assertSeriesValue(value / operation.value)
}

export function operationCycle(start: number, operations: readonly SeriesOperation[], transitions: number): number[] {
  if (operations.length < 2 || !Number.isInteger(transitions) || transitions < operations.length * 2) throw new Error('An operation cycle must repeat at least twice.')
  const result = [assertSeriesValue(start)]
  for (let index = 0; index < transitions; index += 1) {
    const operation = operations[index % operations.length]
    if (operation === undefined) throw new Error('Operation cycle is incomplete.')
    result.push(applyOperation(result[result.length - 1] ?? start, operation))
  }
  return result
}

export function differenceTable(values: readonly number[]): number[][] {
  if (values.length < 2) throw new Error('A difference table needs at least two terms.')
  const rows: number[][] = [values.map((value) => assertSeriesValue(value))]
  while ((rows[rows.length - 1]?.length ?? 0) > 1) {
    const previous = rows[rows.length - 1] ?? []
    rows.push(previous.slice(1).map((value, index) => assertSeriesValue(value - (previous[index] ?? 0))))
  }
  return rows
}

export function powerProgression(startIndex: number, exponent: 2 | 3, offset: number, count: number): number[] {
  if (!Number.isInteger(startIndex) || startIndex < 1 || count < 2) throw new Error('Power progression inputs are invalid.')
  return Array.from({ length: count }, (_, index) => assertSeriesValue((startIndex + index) ** exponent + offset))
}

export function recursiveProgression(first: number, second: number, adjustment: number, count: number): number[] {
  if (!Number.isInteger(count) || count < 5) throw new Error('A recursive progression needs at least five terms.')
  const result = [assertSeriesValue(first), assertSeriesValue(second)]
  while (result.length < count) result.push(assertSeriesValue((result[result.length - 1] ?? 0) + (result[result.length - 2] ?? 0) + adjustment))
  return result
}

export function interleaveSeries(odd: readonly number[], even: readonly number[]): number[] {
  if (odd.length !== even.length && odd.length !== even.length + 1) throw new Error('Interleaved subseries lengths are inconsistent.')
  const result: number[] = []
  for (let index = 0; index < odd.length; index += 1) {
    result.push(assertSeriesValue(odd[index] ?? 0))
    if (index < even.length) result.push(assertSeriesValue(even[index] ?? 0))
  }
  return result
}

export function recoverMissingTerm(complete: readonly number[], missingIndex: number, visible: readonly (number | null)[]): number {
  if (!Number.isInteger(missingIndex) || missingIndex < 0 || missingIndex >= complete.length || visible.length !== complete.length) throw new Error('Missing-term inputs are inconsistent.')
  if (visible[missingIndex] !== null) throw new Error('The requested position is not blank.')
  for (let index = 0; index < complete.length; index += 1) if (index !== missingIndex && visible[index] !== complete[index]) throw new Error('Visible terms do not match the complete series.')
  return assertSeriesValue(complete[missingIndex] ?? Number.NaN)
}
