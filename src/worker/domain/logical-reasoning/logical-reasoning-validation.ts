import { normalizeVisibleText } from './logical-reasoning-format'

export function hasUniqueVisibleChoices(choices: readonly string[]): boolean {
  return new Set(choices.map(normalizeVisibleText)).size === choices.length
}

export function hasExactlyOneIntendedAnswer(
  choices: readonly { isCorrect: boolean }[],
): boolean {
  return choices.filter((choice) => choice.isCorrect).length === 1
}

export function validateDeductionChain(input: {
  reached: readonly string[]
  expectedConclusion: string
}): boolean {
  return input.reached.at(-1) === input.expectedConclusion
}

export function isClosedWorldPrompt(prompt: string): boolean {
  const lower = prompt.toLocaleLowerCase()
  return prompt.length >= 25 &&
    !lower.includes('in real life') &&
    !lower.includes('generally speaking') &&
    !lower.includes('according to common knowledge')
}
