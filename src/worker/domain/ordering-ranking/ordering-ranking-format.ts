export function normalizeRankingAnswer(value: string): string { return value.trim().toUpperCase().replaceAll(/\s+/gu, ' ') }
export function rankingNumericValue(value: string): number { return [...normalizeRankingAnswer(value)].reduce((total, character) => total * 41 + character.charCodeAt(0), 0) }
export function ordinal(value: number): string { const remainder = value % 100; const suffix = remainder >= 11 && remainder <= 13 ? 'th' : value % 10 === 1 ? 'st' : value % 10 === 2 ? 'nd' : value % 10 === 3 ? 'rd' : 'th'; return `${value}${suffix}` }
