import type { PartOfSpeech } from '../vocabulary/vocabulary.types'
import type { GrammarTense, GrammarUsageEntry } from './grammar-usage.types'

export function normalizeGrammarText(value: string): string { return value.trim().toLowerCase().replaceAll(/\s+/gu, ' ') }
export function reconstructGrammarSentence(entry: GrammarUsageEntry, choice: string): string { return entry.sentenceTemplate.includes('____') ? entry.sentenceTemplate.replace('____', choice) : choice }
export function partOfSpeechMatches(entry: GrammarUsageEntry, expected: PartOfSpeech | null): boolean { return entry.partOfSpeech === expected }
export function tenseValid(entry: GrammarUsageEntry, expected: GrammarTense): boolean { return entry.tense === expected }
export function timeMarkerCompatible(entry: GrammarUsageEntry): boolean { if (entry.timeMarker === null) return true; if (/yesterday|last monday/iu.test(entry.timeMarker)) return entry.tense === 'past'; if (/since/iu.test(entry.timeMarker)) return entry.tense === 'present_perfect'; if (/by the time/iu.test(entry.timeMarker)) return entry.tense === 'past_perfect'; return true }
export function articleDeterminerValid(entry: GrammarUsageEntry): boolean { return entry.skill !== 'article_determiner' || entry.articleRule !== null || entry.determinerRule !== null }
export function countabilityValid(entry: GrammarUsageEntry): boolean { if (entry.determinerRule === 'many') return entry.countability === 'count_plural'; if (entry.comparisonType === 'fewer_count') return entry.countability === 'count_plural'; if (entry.comparisonType === 'less_mass') return entry.countability === 'mass'; return true }
export function prepositionPatternValid(entry: GrammarUsageEntry): boolean { return entry.skill !== 'preposition' || entry.prepositionPattern !== null }
export function conjunctionRelationshipValid(entry: GrammarUsageEntry): boolean { return entry.skill !== 'conjunction' || entry.conjunctionRelationship !== null }
export function correlativePairValid(entry: GrammarUsageEntry): boolean { if (entry.correlativePair === 'neither_nor') return /Neither/iu.test(entry.sentenceTemplate) && normalizeGrammarText(entry.correctChoice) === 'nor'; if (entry.correlativePair === 'either_or') return /Either/iu.test(entry.sentenceTemplate) && normalizeGrammarText(entry.correctChoice) === 'or'; if (entry.correlativePair === 'not_only_but_also') return /Not only/iu.test(entry.sentenceTemplate) && normalizeGrammarText(entry.correctChoice) === 'but also'; return true }
export function comparisonValid(entry: GrammarUsageEntry): boolean { return entry.skill !== 'comparison' || entry.comparisonType !== null }
export function commonUsageValid(entry: GrammarUsageEntry): boolean { return entry.skill !== 'misused_expression' || entry.usageKey !== null }
export function sentenceCorrectnessValid(entry: GrammarUsageEntry): boolean { const sentence = reconstructGrammarSentence(entry, entry.correctChoice); return sentence === entry.completedSentence && sentence.length >= 24 && /[.!?]$/u.test(sentence) && !sentence.includes('____') }
export function semanticRuleMatch(entry: GrammarUsageEntry, choice: string): boolean { return normalizeGrammarText(choice) === normalizeGrammarText(entry.correctChoice) && reconstructGrammarSentence(entry, choice) === entry.completedSentence }
