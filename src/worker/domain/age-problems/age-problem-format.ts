export function formatAgeAnswer(value: number, unit = 'years'): string {
  if (!Number.isInteger(value) || !Number.isFinite(value) || value < 0) {
    throw new Error('Age answers must be nonnegative finite integers.')
  }
  return `${value} ${value === 1 && unit === 'years' ? 'year' : unit}`
}

export function ageIdentity(value: number): string {
  if (!Number.isInteger(value) || !Number.isFinite(value)) {
    throw new Error('Age identities require finite integers.')
  }
  return String(value)
}
