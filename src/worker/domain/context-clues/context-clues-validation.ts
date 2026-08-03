import { contextCluesBankV1 } from './context-clues-bank'
import { senseIsDisambiguated, signalMatches, validSentenceTemplate } from './context-clues-rules'

export const uniqueContextChoices = (choices: readonly string[]) => choices.length === 4 && new Set(choices.map((choice) => choice.trim().toLowerCase())).size === 4
export const uniqueContextAnswer = (choices: readonly string[], answer: string) => choices.filter((choice) => choice.trim().toLowerCase() === answer.trim().toLowerCase()).length === 1
export const validateContextCluesBank = () => contextCluesBankV1.flatMap((entry) => validSentenceTemplate(entry) && signalMatches(entry.clueType, entry.signal) && senseIsDisambiguated(entry.target) ? [] : [`Invalid ${entry.target}.`])
