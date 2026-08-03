export function normalizeCodingAnswer(value: string): string { return value.trim().toUpperCase().replaceAll(/\s+/gu, '') }
export function codingNumericValue(value: string): number { return [...normalizeCodingAnswer(value)].reduce((total, character) => total * 43 + character.charCodeAt(0), 0) }
export function formatMapping(entries: readonly (readonly [string, string])[]): string { return entries.map(([left, right]) => `${left} → ${right}`).join('; ') }
