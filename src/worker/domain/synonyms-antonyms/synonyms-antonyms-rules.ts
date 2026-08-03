import { findSynonymAntonymEntry } from './synonyms-antonyms-bank'
import type { Formality, SynonymAntonymEntry } from './synonyms-antonyms.types'
import type { Connotation, PartOfSpeech } from '../vocabulary/vocabulary.types'
import { normalizeWord } from '../vocabulary/vocabulary-rules'

export function sameSense(left: string, right: string): boolean { const a = findSynonymAntonymEntry(left), b = findSynonymAntonymEntry(right); return a !== null && b !== null && a.senseId === b.senseId }
export function samePartOfSpeech(left: string, right: string): boolean { const a = findSynonymAntonymEntry(left), b = findSynonymAntonymEntry(right); return a !== null && b !== null && a.partOfSpeech === b.partOfSpeech }
export function isSynonym(left: string, right: string): boolean { const a = findSynonymAntonymEntry(left); return a?.synonyms.some((word) => normalizeWord(word) === normalizeWord(right)) === true && sameSense(left, right) && samePartOfSpeech(left, right) }
export function isAntonym(left: string, right: string): boolean { const a = findSynonymAntonymEntry(left); return a?.antonyms.some((word) => normalizeWord(word) === normalizeWord(right)) === true && samePartOfSpeech(left, right) }
export function compareIntensity(left: string, right: string): number | null { const a = findSynonymAntonymEntry(left), b = findSynonymAntonymEntry(right); return a === null || b === null ? null : Math.sign(a.intensity - b.intensity) }
export function matchesConnotation(word: string, connotation: Connotation): boolean { return findSynonymAntonymEntry(word)?.connotation === connotation }
export function matchesFormality(word: string, formality: Formality): boolean { return findSynonymAntonymEntry(word)?.formality === formality }
export function validReplacement(sentence: string, target: string, replacement: string): boolean { const targetEntry = findSynonymAntonymEntry(target), replacementEntry = findSynonymAntonymEntry(replacement); return targetEntry !== null && replacementEntry !== null && samePartOfSpeech(target, replacement) && sentence.includes(target) && sentence.replace(target, replacement).includes(replacement) }
export function metadataMatches(entry: SynonymAntonymEntry, part: PartOfSpeech): boolean { return entry.normalized === normalizeWord(entry.word) && entry.partOfSpeech === part && entry.example.toLowerCase().includes(entry.normalized) }
