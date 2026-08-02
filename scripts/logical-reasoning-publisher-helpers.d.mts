export interface SluggedRecord {
  slug: string
  [key: string]: unknown
}

export function parseSuccessEnvelope(value: unknown, context: string): unknown
export function requireRecord<T extends Record<string, unknown>>(
  value: unknown,
  label: string,
  fields?: readonly string[],
): T
export function requireArray<T>(value: unknown, label: string): T[]

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
