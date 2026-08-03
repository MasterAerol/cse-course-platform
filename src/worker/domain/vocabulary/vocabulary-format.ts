import type { PartOfSpeech } from './vocabulary.types'

export function formatAffix(prefix: string | null, base: string, suffix: string | null): string { return [prefix, base, suffix].filter((part): part is string => part !== null).join(' + ') }
export function partOfSpeechLabel(value: PartOfSpeech): string { return value.replace(/^./u, (letter) => letter.toUpperCase()) }
export function vocabularyNumericValue(text: string): number { let hash = 0; for (const character of text.trim().toLowerCase()) hash = (hash * 31 + character.codePointAt(0)!) >>> 0; return hash }
