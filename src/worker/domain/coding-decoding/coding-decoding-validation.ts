import { applyTransformations, normalizeCodeWord } from './coding-decoding-rules'
import { normalizeCodingAnswer } from './coding-decoding-format'
import type { CodingTransformation } from './coding-decoding.types'

export const hasUniqueCodingChoices = (choices: readonly string[]): boolean => choices.length === 4 && new Set(choices.map(normalizeCodingAnswer)).size === 4
export const hasExactlyOneCodingAnswer = (choices: readonly string[], correct: string): boolean => choices.map(normalizeCodingAnswer).filter((item) => item === normalizeCodingAnswer(correct)).length === 1

export function hasCompetingCodingRule(examples: readonly (readonly [string, string])[], intended: readonly CodingTransformation[], alternatives: readonly (readonly CodingTransformation[])[]): boolean {
  return alternatives.some((candidate) => candidate.some((_, index) => candidate[index]?.kind !== intended[index]?.kind || candidate[index]?.amount !== intended[index]?.amount) && examples.every(([plain, coded]) => applyTransformations(normalizeCodeWord(plain), candidate) === coded))
}

export function isUnambiguousCodingInference(examples: readonly (readonly [string, string])[], intended: readonly CodingTransformation[], alternatives: readonly (readonly CodingTransformation[])[]): boolean {
  return examples.length >= 2 && !hasCompetingCodingRule(examples, intended, alternatives)
}
