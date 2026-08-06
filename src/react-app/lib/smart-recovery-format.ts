export function formatSmartRecoveryDate(value: string | null): string {
  if (value === null) return 'No submitted evidence yet'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(new Date(value))
}

export function formatSmartRecoveryLabel(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
