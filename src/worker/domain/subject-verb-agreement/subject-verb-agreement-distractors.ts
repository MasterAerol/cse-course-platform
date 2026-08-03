import type { AgreementMistakeType } from './subject-verb-agreement.types'

export interface AgreementDistractor { text: string; mistakeType: AgreementMistakeType; qualityScore: number }
export function agreementDistractor(text: string, mistakeType: AgreementMistakeType): AgreementDistractor { return { text, mistakeType, qualityScore: 0.9 } }
export function selectAgreementDistractors(correct: string, candidates: readonly AgreementDistractor[]): readonly AgreementDistractor[] { const normalizedCorrect = correct.trim().toLowerCase(); const seen = new Set<string>(); const selected = candidates.filter((item) => { const normalized = item.text.trim().toLowerCase(); if (normalized === normalizedCorrect || seen.has(normalized)) return false; seen.add(normalized); return true }); if (selected.length !== 3) throw new Error('Agreement entries require exactly three curated unique distractors.'); return selected }
