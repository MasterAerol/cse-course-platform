import { codingDistractor, selectCodingDistractors } from '../../domain/coding-decoding/coding-decoding-distractors'
import { codingNumericValue, formatMapping } from '../../domain/coding-decoding/coding-decoding-format'
import { applyTransformations, formatPositions, invertMap, mapCode, reverseAlphabetWord, reverseTransformations, reverseWord, shiftWord, validateOneToOneMap } from '../../domain/coding-decoding/coding-decoding-rules'
import type { CodingScenario, CodingTransformation } from '../../domain/coding-decoding/coding-decoding.types'
import { hasExactlyOneCodingAnswer, hasUniqueCodingChoices, isUnambiguousCodingInference } from '../../domain/coding-decoding/coding-decoding-validation'
import { createSeededRandom } from '../generator-random'
import type { GeneratedQuestion, GeneratorDifficulty, GeneratorSlug, GeneratorValidationResult, QuestionGenerator } from '../generator.types'

const version = 1
const supportedDifficulties = ['easy', 'medium', 'hard'] as const
const words = ['CAT', 'DOG', 'MAP', 'RING', 'BOOK', 'LAMP', 'FISH', 'TREE', 'STAR', 'MOON', 'PEN', 'CUP'] as const
type Random = ReturnType<typeof createSeededRandom>

function randomFor(seed: string, slug: GeneratorSlug, difficulty: GeneratorDifficulty): Random { return createSeededRandom(`${seed}|${slug}|${version}|${difficulty}`) }
function pickWord(random: Random): string { return random.pick(words) }
function candidate(text: string, mistake: Parameters<typeof codingDistractor>[1]) { return codingDistractor(text, mistake) }

function shiftScenario(random: Random, difficulty: GeneratorDifficulty): CodingScenario {
  const word = pickWord(random); const amount = random.integer(difficulty === 'easy' ? 1 : 2, difficulty === 'hard' ? 5 : 4); const correct = shiftWord(word, amount)
  return { prompt: `In this code, shift every letter forward by ${amount}, wrapping after Z. What is the code for ${word}?`, correct, family: 'letter-shift', steps: [`Move every letter in ${word} forward by ${amount}.`, `Keep the same letter order and wrap after Z when needed.`, `${word} becomes ${correct}.`], signature: `shift|${word}|${amount}`, parameters: { word, amount, direction: 'forward', wraparound: true }, distractors: [candidate(shiftWord(word, -amount), 'coding_wrong_direction'), candidate(shiftWord(word, amount + 1), 'coding_wrong_step'), candidate(reverseWord(correct), 'coding_reversed_order'), candidate(word, 'coding_no_transformation')] }
}

function reverseAlphabetScenario(random: Random): CodingScenario {
  const word = pickWord(random); const correct = reverseAlphabetWord(word)
  return { prompt: `Use the reverse alphabet rule A↔Z, B↔Y, C↔X, and so on. What is the code for ${word}?`, correct, family: 'reverse-alphabet', steps: ['Replace each letter with its opposite alphabet position.', 'Do not reverse the order of the letters.', `${word} becomes ${correct}.`], signature: `reverse-alpha|${word}`, parameters: { word, mapping: 'A-Z reversal' }, distractors: [candidate(reverseWord(word), 'coding_reversed_order'), candidate(reverseWord(correct), 'coding_reversed_order'), candidate(shiftWord(word, 1), 'coding_wrong_rule_family'), candidate(word, 'coding_no_transformation')] }
}

function positionsScenario(random: Random, difficulty: GeneratorDifficulty): CodingScenario {
  const word = pickWord(random); const correct = formatPositions(word); const reversed = formatPositions(reverseWord(word)); const shifted = formatPositions(shiftWord(word, difficulty === 'hard' ? 2 : 1))
  return { prompt: `Use A = 1 through Z = 26. Write the letter-position code for ${word}.`, correct, family: 'letter-positions', steps: [`Convert each letter of ${word} to its alphabet position.`, 'Keep the letters in their original order.', `${word} is coded as ${correct}.`], signature: `positions|${word}`, parameters: { word, positions: correct }, distractors: [candidate(reversed, 'coding_reversed_order'), candidate(shifted, 'coding_wrong_step'), candidate(formatPositions(word).replaceAll('-', ''), 'coding_wrong_format'), candidate(String(word.length), 'coding_used_word_length')] }
}

function substitutionScenario(random: Random): CodingScenario {
  const entries = [['CAT', 'MIP'], ['DOG', 'RAV'], ['PEN', 'LUX'], ['CUP', 'BEX'], ['MAP', 'ZED'], ['RING', 'VOT']] as const; const map = validateOneToOneMap(entries); const target = ['CAT', 'DOG', 'PEN', 'CUP', 'MAP', 'RING'] as const; const word = random.pick(target); const correct = mapCode(word, map); const inverse = mapCode(correct, invertMap(map))
  return { prompt: `The word-substitution code is ${formatMapping(entries)}. What is the code for ${word}?`, correct, family: 'word-substitution', steps: ['Use only the supplied one-to-one word table.', `Look up ${word} directly in the table.`, `${word} maps to ${correct}.`], signature: `substitution|${word}`, parameters: { entries, word }, distractors: [candidate(inverse, 'coding_reversed_mapping'), candidate(reverseWord(correct), 'coding_reversed_order'), candidate(shiftWord(correct, 1), 'coding_wrong_rule_family'), candidate(mapCode(random.pick(target.filter((item) => item !== word)), map), 'coding_used_wrong_example')] }
}

function symbolScenario(random: Random): CodingScenario {
  const entries = [['A', '▲'], ['B', '■'], ['C', '●'], ['D', '◆']] as const; const map = validateOneToOneMap(entries); const word = random.pick(['ABCD', 'BADC', 'CADB', 'DCBA', 'ACBD', 'BDCA', 'CBAD', 'DACB'] as const); const correct = [...word].map((letter) => mapCode(letter, map)).join('')
  return { prompt: `A = ▲, B = ■, C = ●, and D = ◆. What symbol code represents ${word}?`, correct, family: 'symbol-replacement', steps: ['Replace every letter with its listed symbol.', 'Preserve the order of the letters.', `${word} becomes ${correct}.`], signature: `symbol|${word}`, parameters: { word, entries }, distractors: [candidate([...correct].reverse().join(''), 'coding_reversed_order'), candidate([...word].map((letter) => mapCode(letter === 'A' ? 'B' : 'A', map)).join(''), 'coding_wrong_symbol_mapping'), candidate(correct.slice(1), 'coding_dropped_component'), candidate(word, 'coding_no_transformation')] }
}

function mixedLetterNumberScenario(random: Random, difficulty: GeneratorDifficulty): CodingScenario {
  const word = pickWord(random); const amount = difficulty === 'hard' ? 2 : 1; const shifted = shiftWord(word, amount); const correct = [...shifted].map((letter, index) => `${letter}${index + 1}`).join('-'); const wrongPosition = [...shifted].map((letter, index) => `${letter}${index + 2}`).join('-')
  return { prompt: `Shift each letter of ${word} forward by ${amount}, then attach its original position number (first = 1). What is the code?`, correct, family: 'mixed-letter-number', steps: [`Shift ${word} forward by ${amount} to get ${shifted}.`, 'Attach 1, 2, 3, and so on in the preserved letter order.', `The mixed code is ${correct}.`], signature: `mixed|${word}|${amount}`, parameters: { word, amount, shifted }, distractors: [candidate([...shiftWord(word, -amount)].map((letter, index) => `${letter}${index + 1}`).join('-'), 'coding_wrong_direction'), candidate(wrongPosition, 'coding_wrong_number_positions'), candidate([...shifted].reverse().map((letter, index) => `${letter}${index + 1}`).join('-'), 'coding_reversed_order'), candidate(shifted, 'coding_dropped_component')] }
}

function inferenceScenario(random: Random, difficulty: GeneratorDifficulty): CodingScenario {
  const amount = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3; const transformations: readonly CodingTransformation[] = [{ kind: 'shift', amount }]
  const examples: readonly (readonly [string, string])[] = [['CAT', applyTransformations('CAT', transformations)], ['DOG', applyTransformations('DOG', transformations)]]; const word = random.pick(['PEN', 'CUP', 'MAP'] as const); const correct = applyTransformations(word, transformations); const alternatives: readonly (readonly CodingTransformation[])[] = [[{ kind: 'shift', amount: -amount }], [{ kind: 'reverse-alphabet' }], [{ kind: 'shift', amount }, { kind: 'reverse-order' }]]
  if (!isUnambiguousCodingInference(examples, transformations, alternatives)) throw new Error('Ambiguous coding inference scenario.')
  return { prompt: `Infer the one rule from ${examples.map(([plain, coded]) => `${plain} → ${coded}`).join('; ')}. What is the code for ${word}?`, correct, family: 'inference', steps: ['Test the same rule against both examples.', `Every letter moves forward by ${amount}.`, `${word} becomes ${correct}.`], signature: `infer|${difficulty}|${word}|${amount}`, parameters: { examples, transformations, word }, distractors: [candidate(applyTransformations(word, [{ kind: 'shift', amount: -amount }]), 'coding_wrong_direction'), candidate(reverseAlphabetWord(word), 'coding_wrong_rule_family'), candidate(reverseWord(correct), 'coding_steps_in_wrong_order'), candidate(word, 'coding_no_transformation')] }
}

function multiStepScenario(random: Random, difficulty: GeneratorDifficulty): CodingScenario {
  const word = pickWord(random); const amount = difficulty === 'easy' ? 1 : 2; const transformations: readonly CodingTransformation[] = difficulty === 'hard' ? [{ kind: 'reverse-alphabet' }, { kind: 'reverse-order' }, { kind: 'shift', amount }] : [{ kind: 'reverse-order' }, { kind: 'shift', amount }]; const correct = applyTransformations(word, transformations); const reversedSteps = applyTransformations(word, [...transformations].reverse())
  return { prompt: `Apply these steps in order to ${word}: ${transformations.map((item) => item.kind === 'shift' ? `shift +${item.amount}` : item.kind === 'reverse-order' ? 'reverse letter order' : 'use reverse alphabet').join(', ')}. What is the final code?`, correct, family: 'multi-step', steps: [`Perform the stated transformations in their written order.`, `The intermediate operations are deterministic and reversible.`, `${word} becomes ${correct}.`], signature: `multi|${word}|${transformations.map((item) => `${item.kind}:${item.amount ?? ''}`).join('|')}`, parameters: { word, transformations, reverseTransformations: reverseTransformations(transformations) }, distractors: [candidate(reversedSteps, 'coding_steps_in_wrong_order'), candidate(applyTransformations(word, transformations.slice(0, -1)), 'coding_stopped_after_first_step'), candidate(applyTransformations(word, [{ kind: 'shift', amount: -amount }]), 'coding_wrong_direction'), candidate(word, 'coding_no_transformation')] }
}

function buildScenario(slug: GeneratorSlug, seed: string, difficulty: GeneratorDifficulty): CodingScenario {
  const random = randomFor(seed, slug, difficulty)
  switch (slug) {
    case 'letter-shift-codes': return shiftScenario(random, difficulty)
    case 'reverse-alphabet-codes': return reverseAlphabetScenario(random)
    case 'letter-position-codes': return positionsScenario(random, difficulty)
    case 'word-substitution-codes': return substitutionScenario(random)
    case 'symbol-replacement-codes': return symbolScenario(random)
    case 'mixed-letter-number-codes': return mixedLetterNumberScenario(random, difficulty)
    case 'infer-coding-rule': return inferenceScenario(random, difficulty)
    case 'multi-step-coding-rules': return multiStepScenario(random, difficulty)
    case 'mixed-coding-decoding': { const choices = ['letter-shift-codes', 'reverse-alphabet-codes', 'letter-position-codes', 'word-substitution-codes', 'symbol-replacement-codes', 'mixed-letter-number-codes', 'infer-coding-rule', 'multi-step-coding-rules'] as const; const selected = random.pick(choices); const scenario = buildScenario(selected, `${seed}|mixed`, difficulty); return { ...scenario, signature: `mixed-coding|${selected}|${scenario.signature}`, parameters: { ...scenario.parameters, mixedGenerator: selected } } }
    default: throw new Error(`Unsupported Coding and Decoding generator: ${slug}`)
  }
}

function buildQuestion(slug: GeneratorSlug, input: { seed: string; difficulty: GeneratorDifficulty }): GeneratedQuestion {
  const scenario = buildScenario(slug, input.seed, input.difficulty); const distractors = selectCodingDistractors(scenario.correct, scenario.distractors)
  const choices = randomFor(input.seed, slug, input.difficulty).shuffle([{ text: scenario.correct, isCorrect: true, distractorType: null, mistakeType: null, derivation: null, qualityScore: 1, numericValue: codingNumericValue(scenario.correct) }, ...distractors.map((item) => ({ text: item.text, isCorrect: false, distractorType: item.mistakeType, mistakeType: item.mistakeType, derivation: { operation: item.mistakeType, inputs: [codingNumericValue(item.text)] }, qualityScore: 0.9, numericValue: codingNumericValue(item.text) }))])
  return { generatorSlug: slug, generatorVersion: version, difficulty: input.difficulty, seed: input.seed, prompt: scenario.prompt, parameters: { ...scenario.parameters, intendedFamily: scenario.family, recomputedCorrect: scenario.correct }, choices, explanation: { title: 'Coding and Decoding solution', steps: scenario.steps, finalAnswer: scenario.correct }, metadata: { answerKind: 'text', unit: null, canonicalSignature: `${slug}|${input.difficulty}|${scenario.signature}` } }
}

function validateQuestion(
  question: GeneratedQuestion,
): GeneratorValidationResult {
  try {
    const recomputedCorrect = question.parameters.recomputedCorrect
    const correct =
      typeof recomputedCorrect === "string" ? recomputedCorrect : ""

    const values = question.choices.map((choice) => choice.text)

    const valid =
      correct.length > 0 &&
      hasUniqueCodingChoices(values) &&
      hasExactlyOneCodingAnswer(values, correct) &&
      question.choices.filter((choice) => choice.isCorrect).length === 1 &&
      question.choices.find((choice) => choice.isCorrect)?.text === correct &&
      question.choices
        .filter((choice) => !choice.isCorrect)
        .every(
          (choice) =>
            choice.mistakeType !== null &&
            choice.derivation !== null,
        )

    return {
      valid,
      reason: valid
        ? null
        : "The generated Coding and Decoding question failed structural validation.",
    }
  } catch (error) {
    return {
      valid: false,
      reason:
        error instanceof Error
          ? error.message
          : "Invalid Coding and Decoding question.",
    }
  }
}

function makeGenerator(slug: GeneratorSlug, title: string): QuestionGenerator { return { slug, version, title, supportedDifficulties, generate: (input) => buildQuestion(slug, input), validate: validateQuestion } }
export const codingDecodingGenerators = [
  ['letter-shift-codes', 'Letter-Shift Codes'], ['reverse-alphabet-codes', 'Reverse-Alphabet Codes'], ['letter-position-codes', 'Letter-Position Number Codes'], ['word-substitution-codes', 'Word Substitution Codes'], ['symbol-replacement-codes', 'Symbol Replacement Codes'], ['mixed-letter-number-codes', 'Mixed Letter and Number Codes'], ['infer-coding-rule', 'Inferring an Unknown Coding Rule'], ['multi-step-coding-rules', 'Multi-Step Coding Rules'], ['mixed-coding-decoding', 'Mixed Coding and Decoding Problems'],
].map(([slug, title]) => makeGenerator(slug as GeneratorSlug, title ?? 'Coding and Decoding'))
