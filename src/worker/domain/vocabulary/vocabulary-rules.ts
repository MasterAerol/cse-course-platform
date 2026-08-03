import { findVocabularyEntry, vocabularyBankV1 } from './vocabulary-bank'
import type { Connotation, PartOfSpeech, VocabularyEntry } from './vocabulary.types'

export function normalizeWord(value: string): string { return value.trim().toLowerCase().replaceAll(/\s+/gu, ' ') }
export function decomposeWord(entry: VocabularyEntry): { prefix: string | null; base: string; suffix: string | null } { return { prefix: entry.prefix, base: entry.base, suffix: entry.suffix } }
export function familyForm(base: string, partOfSpeech: PartOfSpeech): string | null { const entry = vocabularyBankV1.find((item) => item.base === normalizeWord(base) && item.family.some((form) => form.partOfSpeech === partOfSpeech)); return entry?.family.find((form) => form.partOfSpeech === partOfSpeech)?.word ?? null }
export function hasPartOfSpeech(word: string, partOfSpeech: PartOfSpeech): boolean { const entry = findVocabularyEntry(word); return entry?.partOfSpeech === partOfSpeech || entry?.family.some((form) => normalizeWord(form.word) === normalizeWord(word) && form.partOfSpeech === partOfSpeech) === true }
export function definitionMatches(word: string, definition: string): boolean { return findVocabularyEntry(word)?.definition === definition }
export function classifyConnotation(word: string): Connotation | null { return findVocabularyEntry(word)?.connotation ?? null }
export function hasSense(word: string, meaning: string, example: string): boolean { return findVocabularyEntry(word)?.senses.some((sense) => sense.meaning === meaning && sense.example === example) === true }
export function areConfusedPartners(left: string, right: string): boolean { const first = findVocabularyEntry(left); return first?.confusedWith === normalizeWord(right) && findVocabularyEntry(right)?.confusedWith === normalizeWord(left) }
export function sentenceIsUsable(sentence: string, word: string): boolean { const text = sentence.trim(); return text.length >= 12 && /[.!?]$/u.test(text) && new RegExp(`\\b${normalizeWord(word)}\\b`, 'iu').test(text) }
