export interface SluggedRecord {
  slug: string
  [key: string]: unknown
}

export function planAnalyticalSubject<T extends SluggedRecord>(
  subjects: readonly T[],
  numericalPosition: number,
): { existing: T | null; requiredPosition: number }

export function findUniqueBySlug<T extends SluggedRecord>(
  items: readonly T[],
  slug: string,
  label: string,
): T | null

export function rollbackStatusChanges(
  actions: readonly (() => Promise<unknown>)[],
  onError?: (error: unknown) => void,
): Promise<void>
