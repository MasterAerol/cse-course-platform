import type { Formality } from './synonyms-antonyms.types'
export function relationshipLabel(kind: 'synonym' | 'antonym'): string { return kind === 'synonym' ? 'closest in meaning' : 'opposite in meaning' }
export function formalityLabel(value: Formality): string { return value === 'formal' ? 'formal or official' : value === 'informal' ? 'everyday or informal' : 'neutral' }
export function relationNumericValue(text: string): number { let value = 0; for (const character of text.toLowerCase()) value = (value * 31 + character.codePointAt(0)!) % 1_000_003; return value }
