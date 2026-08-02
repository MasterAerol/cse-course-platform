import { letterDistractor, selectLetterDistractors } from '../../domain/letter-series/letter-series-distractors'
import { formatLetterSeries, termNumericValue } from '../../domain/letter-series/letter-series-format'
import { generateGroupedTerms, generateLetterNumberTerms, generateLetterSeries, increasingGapSeries, interleaveLetterSeries, moveLetter, positionToLetter, recoverMissingTerm } from '../../domain/letter-series/letter-series-math'
import type { LetterSeriesDistractor, LetterSeriesRuleFamily } from '../../domain/letter-series/letter-series.types'
import { hasExactlyOneVisibleAnswer, hasUniqueVisibleChoices, isUnambiguousLetterSeries, validateLetterTerms } from '../../domain/letter-series/letter-series-validation'
import { createSeededRandom } from '../generator-random'
import type { GeneratedQuestion, GeneratorDifficulty, GeneratorSlug, GeneratorValidationResult, QuestionGenerator } from '../generator.types'

const version = 1
const supportedDifficulties = ['easy', 'medium', 'hard'] as const
type Random = ReturnType<typeof createSeededRandom>

interface Scenario {
  prompt: string
  complete: string[]
  visible: (string | null)[]
  correct: string
  family: LetterSeriesRuleFamily
  wraparound: boolean
  steps: string[]
  signature: string
  parameters: Record<string, unknown>
  distractors: LetterSeriesDistractor[]
}

function randomFor(seed: string, slug: GeneratorSlug, difficulty: GeneratorDifficulty): Random {
  return createSeededRandom(`${seed}|${slug}|${version}|${difficulty}`)
}

function nextScenario(input: Omit<Scenario, 'prompt' | 'visible'>): Scenario {
  const visible = input.complete.slice(0, -1)
  const wrapNote = input.wraparound ? ' Wraparound after Z or before A is allowed.' : ''
  return { ...input, visible, prompt: `What term comes next? ${formatLetterSeries([...visible, null])}.${wrapNote}` }
}

function single(letter: string, mistake: LetterSeriesDistractor['mistakeType']): LetterSeriesDistractor {
  return letterDistractor(letter, mistake)
}

function choiceMove(letter: string, step: number): string {
  return moveLetter(letter, step, { wraparound: true })
}

function forwardScenario(random: Random, difficulty: GeneratorDifficulty): Scenario {
  const wraparound = difficulty === 'hard'
  const step = difficulty === 'easy' ? random.integer(1, 4) : random.integer(3, 5)
  const gaps = difficulty === 'hard' ? [step, step + 1] : [step]
  const startPosition = wraparound ? random.integer(18, 24) : random.integer(1, 26 - step * 5)
  const complete = generateLetterSeries(positionToLetter(startPosition), gaps, 5, { wraparound })
  const previous = complete[4] ?? 'A'; const correct = complete[5] ?? 'A'
  return nextScenario({ complete, correct, family: gaps.length === 1 ? 'constant' : 'alternating', wraparound, steps: [gaps.length === 1 ? `The alphabet positions move forward by ${step} each time.` : `The forward gaps repeat +${step}, +${step + 1}.`, wraparound ? 'When a move passes Z, continue from A.' : 'No wraparound is needed.', `${previous} moved forward by ${step} gives ${correct}.`], signature: `forward|${startPosition}|${gaps.join(':')}|${wraparound}`, parameters: { gaps, direction: 'forward' }, distractors: [single(previous, 'letter_repeated_previous_term'), single(choiceMove(previous, -step), 'letter_wrong_direction'), single(choiceMove(previous, step + 1), 'letter_repeated_last_gap'), single(choiceMove(previous, Math.max(1, step - 1)), 'letter_wrong_step'), single(choiceMove(previous, step + 2), 'letter_inclusive_counting')] })
}

function backwardScenario(random: Random, difficulty: GeneratorDifficulty): Scenario {
  const wraparound = difficulty === 'hard'
  const step = difficulty === 'easy' ? random.integer(1, 4) : random.integer(3, 5)
  const gaps = difficulty === 'hard' ? [-step, -(step + 1)] : [-step]
  const startPosition = wraparound ? random.integer(2, 9) : random.integer(step * 5 + 1, 26)
  const complete = generateLetterSeries(positionToLetter(startPosition), gaps, 5, { wraparound })
  const previous = complete[4] ?? 'Z'; const correct = complete[5] ?? 'Z'
  return nextScenario({ complete, correct, family: gaps.length === 1 ? 'constant' : 'alternating', wraparound, steps: [gaps.length === 1 ? `The alphabet positions move backward by ${step} each time.` : `The backward gaps repeat −${step}, −${step + 1}.`, wraparound ? 'When a move passes A, continue from Z.' : 'No wraparound is needed.', `${previous} moved backward by ${step} gives ${correct}.`], signature: `backward|${startPosition}|${gaps.join(':')}|${wraparound}`, parameters: { gaps, direction: 'backward' }, distractors: [single(previous, 'letter_repeated_previous_term'), single(choiceMove(previous, step), 'letter_wrong_direction'), single(choiceMove(previous, -(step + 1)), 'letter_repeated_last_gap'), single(choiceMove(previous, -Math.max(1, step - 1)), 'letter_wrong_step'), single(choiceMove(previous, -(step + 2)), 'letter_inclusive_counting')] })
}

function skippingScenario(random: Random, difficulty: GeneratorDifficulty): Scenario {
  const step = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 4
  const startPosition = random.integer(1, 26 - step * 5)
  const complete = generateLetterSeries(positionToLetter(startPosition), [step], 5)
  const previous = complete[4] ?? 'A'; const correct = complete[5] ?? 'A'
  return nextScenario({ complete, correct, family: 'constant', wraparound: false, steps: [`Moving by ${step} positions skips ${step - 1} letter${step === 2 ? '' : 's'}.`, `Every visible transition uses +${step}.`, `${previous} + ${step} positions = ${correct}.`], signature: `skip|${startPosition}|${step}`, parameters: { step, skippedLetters: step - 1 }, distractors: [single(choiceMove(previous, step - 1), 'letter_wrong_step'), single(choiceMove(previous, step + 1), 'letter_inclusive_counting'), single(choiceMove(previous, -step), 'letter_wrong_direction'), single(previous, 'letter_repeated_previous_term')] })
}

function alternatingScenario(random: Random, difficulty: GeneratorDifficulty): Scenario {
  if (difficulty === 'hard') {
    const oddStart = random.integer(1, 7); const evenStart = random.integer(20, 26); const oddStep = random.integer(2, 4); const evenStep = -random.integer(2, 3)
    const odd = generateLetterSeries(positionToLetter(oddStart), [oddStep], 3)
    const even = generateLetterSeries(positionToLetter(evenStart), [evenStep], 2)
    const complete = interleaveLetterSeries(odd, even); const previous = complete[5] ?? 'A'; const correct = complete[6] ?? 'A'
    return nextScenario({ complete, correct, family: 'interleaved', wraparound: false, steps: [`Odd positions move by +${oddStep}; even positions move by ${evenStep}.`, 'Each positional subseries has at least three visible terms.', `The requested odd-position term continues ${complete[4]} by +${oddStep}, giving ${correct}.`], signature: `interleaved|${oddStart}|${oddStep}|${evenStart}|${evenStep}`, parameters: { oddStart, oddStep, evenStart, evenStep }, distractors: [single(choiceMove(previous, evenStep), 'letter_wrong_subseries'), single(choiceMove(previous, oddStep), 'letter_swapped_odd_even'), single(choiceMove(complete[4] ?? 'A', evenStep), 'letter_wrong_subseries'), single(complete[4] ?? 'A', 'letter_repeated_previous_term'), single(choiceMove(complete[4] ?? 'A', -oddStep), 'letter_wrong_direction')] })
  }
  const cycles = difficulty === 'easy' ? [2, 3] : difficulty === 'medium' ? [4, -1] : [3, -2]
  const minPrefix = Math.min(0, ...Array.from({ length: 6 }, (_, end) => Array.from({ length: end + 1 }, (__, index) => cycles[index % 2] ?? 0).reduce((sum, value) => sum + value, 0)))
  const maxPrefix = Math.max(0, ...Array.from({ length: 6 }, (_, end) => Array.from({ length: end + 1 }, (__, index) => cycles[index % 2] ?? 0).reduce((sum, value) => sum + value, 0)))
  const startPosition = random.integer(1 - minPrefix, 26 - maxPrefix)
  const complete = generateLetterSeries(positionToLetter(startPosition), cycles, 6)
  const previous = complete[5] ?? 'A'; const correct = complete[6] ?? 'A'; const lastGap = cycles[0] ?? 0; const otherGap = cycles[1] ?? 0
  return nextScenario({ complete, correct, family: 'alternating', wraparound: false, steps: [`The signed gaps repeat ${cycles.map((gap) => `${gap >= 0 ? '+' : ''}${gap}`).join(', ')}.`, 'The two-gap cycle is visible at least twice.', `The next gap is ${lastGap >= 0 ? '+' : ''}${lastGap}, so ${previous} becomes ${correct}.`], signature: `alternating|${startPosition}|${cycles.join(':')}`, parameters: { gaps: cycles }, distractors: [single(choiceMove(previous, otherGap), 'letter_repeated_last_gap'), single(choiceMove(previous, -lastGap), 'letter_wrong_direction'), single(choiceMove(previous, lastGap + Math.sign(lastGap)), 'letter_inclusive_counting'), single(choiceMove(previous, otherGap + lastGap), 'letter_reversed_gap_cycle'), single(previous, 'letter_repeated_previous_term')] })
}

function increasingScenario(random: Random, difficulty: GeneratorDifficulty): Scenario {
  const firstGap = difficulty === 'medium' ? -1 : difficulty === 'hard' ? 2 : 1
  const change = difficulty === 'medium' ? -1 : 1
  const total = Array.from({ length: 5 }, (_, index) => firstGap + change * index).reduce((sum, value) => sum + value, 0)
  const startPosition = total < 0 ? random.integer(1 - total, 26) : random.integer(1, 26 - total)
  const complete = increasingGapSeries(positionToLetter(startPosition), firstGap, change, 5)
  const previous = complete[4] ?? 'A'; const correct = complete[5] ?? 'A'; const priorGap = firstGap + change * 3; const nextGap = priorGap + change
  return nextScenario({ complete, correct, family: 'increasing-gap', wraparound: false, steps: [`The gaps are ${Array.from({ length: 4 }, (_, index) => firstGap + change * index).map((gap) => `${gap >= 0 ? '+' : ''}${gap}`).join(', ')}.`, `Each gap changes by ${change}, so the next gap is ${nextGap >= 0 ? '+' : ''}${nextGap}.`, `${previous} moved by ${nextGap} gives ${correct}.`], signature: `increasing|${startPosition}|${firstGap}|${change}`, parameters: { firstGap, gapChange: change }, distractors: [single(choiceMove(previous, priorGap), 'letter_repeated_last_gap'), single(choiceMove(previous, nextGap - Math.sign(change)), 'letter_wrong_gap_growth'), single(choiceMove(complete[3] ?? previous, nextGap), 'letter_gap_from_wrong_term'), single(choiceMove(previous, -nextGap), 'letter_wrong_direction'), single(previous, 'letter_repeated_previous_term')] })
}

function groupedScenario(random: Random, difficulty: GeneratorDifficulty): Scenario {
  const width = difficulty === 'hard' ? 3 : 2; const step = difficulty === 'easy' ? 2 : 3
  const start = random.integer(1, 26 - step * 4 - width)
  const starts = Array.from({ length: width }, (_, index) => positionToLetter(start + index))
  const complete = generateGroupedTerms(starts, step, 5)
  const previous = complete[3] ?? 'AB'; const correct = complete[4] ?? 'CD'
  const wrongOne = `${correct.slice(0, -1)}${previous.at(-1) ?? 'A'}`
  return nextScenario({ complete, correct, family: 'grouped', wraparound: false, steps: [`Each term contains ${width} letters in fixed columns.`, `Every column advances by ${step} alphabet positions.`, `Advancing every letter in ${previous} gives ${correct}.`], signature: `grouped|${starts.join('')}|${step}|${width}`, parameters: { starts, step, width }, distractors: [single(wrongOne, 'letter_shifted_one_group_column'), single([...correct].reverse().join(''), 'letter_reversed_group_order'), single(generateGroupedTerms(starts, step + 1, 5, { wraparound: true })[4] ?? 'AB', 'letter_wrong_step'), single(previous, 'letter_repeated_previous_term')] })
}

function letterNumberScenario(random: Random, difficulty: GeneratorDifficulty): Scenario {
  const letterStep = difficulty === 'hard' ? -2 : difficulty === 'medium' ? 2 : 1; const numberStep = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 1 : 3
  const startPosition = letterStep > 0 ? random.integer(1, 26 - letterStep * 4) : random.integer(1 - letterStep * 4, 26)
  const startNumber = random.integer(1, 4)
  const terms = generateLetterNumberTerms(positionToLetter(startPosition), letterStep, startNumber, numberStep, 5)
  const complete = terms.map((term) => `${term.letter}${term.number}`); const correct = complete[4] ?? 'A1'; const previous = terms[3] ?? { letter: 'A', number: 1 }; const answer = terms[4] ?? { letter: 'A', number: 1 }
  return nextScenario({ complete, correct, family: 'letter-number', wraparound: false, steps: [`Letters move by ${letterStep >= 0 ? '+' : ''}${letterStep}; numbers move by +${numberStep}.`, 'The two progressions are checked independently.', `${previous.letter}${previous.number} becomes ${answer.letter}${answer.number}.`], signature: `letter-number|${startPosition}|${letterStep}|${startNumber}|${numberStep}`, parameters: { letterStep, numberStep }, distractors: [single(`${answer.letter}${previous.number}`, 'letter_correct_letter_wrong_number'), single(`${previous.letter}${answer.number}`, 'letter_wrong_letter_correct_number'), single(`${moveLetter(previous.letter, -letterStep)}${answer.number}`, 'letter_wrong_direction'), single(`${answer.letter}${answer.number + numberStep}`, 'letter_correct_letter_wrong_number')] })
}

function missingScenario(random: Random, difficulty: GeneratorDifficulty): Scenario {
  const difficultyOffset = difficulty === 'easy' ? 0 : difficulty === 'medium' ? 1 : 2
  const variant = (random.integer(0, 5) + difficultyOffset) % 6
  let complete: string[]; let family: LetterSeriesRuleFamily; let rule: string
  if (variant === 0) { const start = random.integer(1, 16); complete = generateLetterSeries(positionToLetter(start), [2], 5); family = 'constant'; rule = 'a constant +2 gap' }
  else if (variant === 1) { const start = random.integer(16, 26); complete = generateLetterSeries(positionToLetter(start), [-3], 5); family = 'constant'; rule = 'a constant −3 gap' }
  else if (variant === 2) { const start = random.integer(1, 10); complete = generateLetterSeries(positionToLetter(start), [2, 3], 5); family = 'alternating'; rule = 'the alternating +2, +3 cycle' }
  else if (variant === 3) { const start = random.integer(1, 6); complete = increasingGapSeries(positionToLetter(start), 1, 1, 5); family = 'increasing-gap'; rule = 'gaps +1, +2, +3, +4, +5' }
  else if (variant === 4) { const start = random.integer(1, 10); complete = generateGroupedTerms([positionToLetter(start), positionToLetter(start + 1)], 3, 6); family = 'grouped'; rule = 'two aligned letter columns moving +3' }
  else { const start = random.integer(1, 16); complete = generateLetterNumberTerms(positionToLetter(start), 2, random.integer(1, 3), 2, 6).map((term) => `${term.letter}${term.number}`); family = 'letter-number'; rule = 'independent +2 letter and +2 number progressions' }
  const missingIndex = random.pick([0, 2, complete.length - 2, complete.length - 1])
  const visible: (string | null)[] = [...complete]; visible[missingIndex] = null
  const correct = recoverMissingTerm(complete, missingIndex, visible); const left = complete[missingIndex - 1] ?? complete[1] ?? correct; const right = complete[missingIndex + 1] ?? complete[complete.length - 2] ?? correct
  let modeled: LetterSeriesDistractor[]
  if (/^[A-Z]$/u.test(correct)) modeled = [single(left, 'letter_used_left_side_only'), single(right, 'letter_used_right_side_only'), single(choiceMove(correct, 1), 'letter_inclusive_counting'), single(choiceMove(correct, -1), 'letter_wrong_direction'), single(choiceMove(correct, 2), 'letter_wrong_step')]
  else if (/^[A-Z][0-9]+$/u.test(correct)) { const letter = correct[0] ?? 'A'; const number = Number(correct.slice(1)); modeled = [single(left, 'letter_used_left_side_only'), single(right, 'letter_used_right_side_only'), single(`${choiceMove(letter, 1)}${number}`, 'letter_wrong_letter_correct_number'), single(`${letter}${number + 1}`, 'letter_correct_letter_wrong_number'), single(`${choiceMove(letter, -1)}${number}`, 'letter_wrong_direction')] }
  else { const letters = [...correct]; modeled = [single(left, 'letter_used_left_side_only'), single(right, 'letter_used_right_side_only'), single(`${choiceMove(letters[0] ?? 'A', 1)}${letters.slice(1).join('')}`, 'letter_shifted_one_group_column'), single([...letters].reverse().join(''), 'letter_reversed_group_order'), single(letters.map((letter) => choiceMove(letter, 1)).join(''), 'letter_wrong_step')] }
  return { prompt: `Which term replaces the question mark? ${formatLetterSeries(visible)}.`, complete, visible, correct, family, wraparound: false, steps: [`The complete series uses ${rule}.`, missingIndex > 0 && missingIndex < complete.length - 1 ? 'The transitions on both sides of the blank confirm the same rule.' : 'All remaining transitions establish the rule before recovering the edge term.', `The only term that restores the complete pattern is ${correct}.`], signature: `missing|${variant}|${complete.join(':')}|${missingIndex}`, parameters: { variant, missingIndex, rule }, distractors: modeled }
}

function buildScenario(slug: GeneratorSlug, seed: string, difficulty: GeneratorDifficulty): Scenario {
  const random = randomFor(seed, slug, difficulty)
  switch (slug) {
    case 'forward-letter-series': return forwardScenario(random, difficulty)
    case 'backward-letter-series': return backwardScenario(random, difficulty)
    case 'skipping-letter-series': return skippingScenario(random, difficulty)
    case 'alternating-letter-series': return alternatingScenario(random, difficulty)
    case 'increasing-gap-letter-series': return increasingScenario(random, difficulty)
    case 'grouped-letter-series': return groupedScenario(random, difficulty)
    case 'letter-number-series': return letterNumberScenario(random, difficulty)
    case 'missing-term-letter-series': return missingScenario(random, difficulty)
    case 'mixed-letter-series': {
      const variants = ['forward-letter-series', 'backward-letter-series', 'skipping-letter-series', 'alternating-letter-series', 'increasing-gap-letter-series', 'grouped-letter-series', 'letter-number-series', 'missing-term-letter-series'] as const
      const selected = random.pick(variants); const scenario = buildScenario(selected, `${seed}|mixed`, difficulty)
      return { ...scenario, signature: `mixed|${selected}|${scenario.signature}`, parameters: { ...scenario.parameters, mixedGenerator: selected } }
    }
    default: throw new Error(`Unsupported Letter Series generator: ${slug}`)
  }
}

function buildQuestion(slug: GeneratorSlug, input: { seed: string; difficulty: GeneratorDifficulty }): GeneratedQuestion {
  const scenario = buildScenario(slug, input.seed, input.difficulty)
  const distractors = selectLetterDistractors(scenario.correct, scenario.distractors)
  const choices = randomFor(input.seed, slug, input.difficulty).shuffle([
    { text: scenario.correct, isCorrect: true, distractorType: null, mistakeType: null, derivation: null, qualityScore: 1, numericValue: termNumericValue(scenario.correct) },
    ...distractors.map((item) => ({ text: item.text, isCorrect: false, distractorType: item.mistakeType, mistakeType: item.mistakeType, derivation: { operation: item.mistakeType, inputs: [termNumericValue(item.text)] }, qualityScore: 0.9, numericValue: termNumericValue(item.text) })),
  ])
  return { generatorSlug: slug, generatorVersion: version, difficulty: input.difficulty, seed: input.seed, prompt: scenario.prompt, parameters: { ...scenario.parameters, intendedFamily: scenario.family, completeSeries: scenario.complete, visibleSeries: scenario.visible, wraparound: scenario.wraparound, recomputedCorrect: scenario.correct }, choices, explanation: { title: 'Letter Series solution', steps: scenario.steps, finalAnswer: scenario.correct }, metadata: { answerKind: 'text', unit: null, canonicalSignature: `${slug}|${input.difficulty}|${scenario.signature}` } }
}

function validateQuestion(question: GeneratedQuestion): GeneratorValidationResult {
  try {
    const scenario = buildScenario(question.generatorSlug, question.seed, question.difficulty)
    const choiceTexts = question.choices.map((choice) => choice.text); const correct = question.choices.find((choice) => choice.isCorrect)
    const shownForNext = scenario.visible.includes(null) ? scenario.complete : scenario.complete.slice(0, -1)
    const ambiguitySafe = scenario.family === 'grouped' || scenario.family === 'letter-number' || scenario.visible.includes(null) || scenario.wraparound || isUnambiguousLetterSeries(shownForNext, scenario.family, scenario.correct)
    const checks: readonly [string, boolean][] = [
      ['version', question.generatorVersion === version], ['prompt', question.prompt === scenario.prompt], ['terms', validateLetterTerms(scenario.complete)], ['stored series', JSON.stringify(question.parameters.completeSeries) === JSON.stringify(scenario.complete)], ['wraparound disclosure', !scenario.wraparound || (question.prompt.includes('Wraparound') && question.explanation.steps.some((step) => /continue from [AZ]/u.test(step)))], ['ambiguity', ambiguitySafe], ['recomputed answer', question.parameters.recomputedCorrect === scenario.correct], ['choice count', question.choices.length === 4], ['choice uniqueness', hasUniqueVisibleChoices(choiceTexts)], ['single answer', hasExactlyOneVisibleAnswer(choiceTexts, scenario.correct)], ['correct choice', correct?.text === scenario.correct], ['explanation', question.explanation.finalAnswer === scenario.correct && question.explanation.steps.length >= 3], ['distractor derivations', question.choices.filter((choice) => !choice.isCorrect).every((choice) => choice.mistakeType !== null && choice.derivation !== null)],
    ]
    const failed = checks.find(([, valid]) => !valid)
    return { valid: failed === undefined, reason: failed === undefined ? null : `Letter Series validation failed: ${failed[0]}.` }
  } catch (error) { return { valid: false, reason: error instanceof Error ? error.message : 'Invalid Letter Series question.' } }
}

const definitions = [
  ['forward-letter-series', 'Forward Letter Series'], ['backward-letter-series', 'Backward Letter Series'], ['skipping-letter-series', 'Skipping Letter Series'], ['alternating-letter-series', 'Alternating Letter Series'], ['increasing-gap-letter-series', 'Increasing and Decreasing Letter Gaps'], ['grouped-letter-series', 'Paired and Grouped Letter Series'], ['letter-number-series', 'Letter and Number Combination Series'], ['missing-term-letter-series', 'Missing-Term Letter Series'], ['mixed-letter-series', 'Mixed Letter Series'],
] as const satisfies readonly (readonly [GeneratorSlug, string])[]

export const letterSeriesGenerators = definitions.map(([slug, title]) => ({ slug, version, title, supportedDifficulties, generate(input) { return buildQuestion(slug, input) }, validate: validateQuestion })) satisfies readonly QuestionGenerator[]
