export function formatSeries(values: readonly (number | null)[]): string {
  return values.map((value) => value === null ? '?' : String(value)).join(', ')
}

export function normalizedNumericText(value: number): string {
  if (!Number.isFinite(value)) throw new Error('Cannot format a non-finite series value.')
  return Object.is(value, -0) ? '0' : String(value)
}
