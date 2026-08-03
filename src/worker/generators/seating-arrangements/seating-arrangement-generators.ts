import { arrangementDistractor, selectArrangementDistractors } from '../../domain/seating-arrangements/seating-arrangement-distractors'
import { arrangementNumericValue, formatClues } from '../../domain/seating-arrangements/seating-arrangement-format'
import { moveWithShift, swapPositions } from '../../domain/seating-arrangements/seating-arrangement-rules'
import { answerScenario, validateScenario } from '../../domain/seating-arrangements/seating-arrangement-validation'
import type { ArrangementConstraint, ArrangementProblem, ArrangementScenario } from '../../domain/seating-arrangements/seating-arrangement.types'
import { createSeededRandom } from '../generator-random'
import type { GeneratedQuestion, GeneratorDifficulty, GeneratorSlug, GeneratorValidationResult, QuestionGenerator } from '../generator.types'

const version = 1
const supportedDifficulties = ['easy', 'medium', 'hard'] as const
const people = ['Aira', 'Ben', 'Cleo', 'Dino', 'Eli', 'Faye', 'Gino', 'Hope', 'Ivan', 'Jade', 'Kira', 'Luis', 'Mina', 'Noel', 'Omar', 'Pia', 'Quin', 'Rosa', 'Seth', 'Tina', 'Uri', 'Vera', 'Wade', 'Xena', 'Yani', 'Zed'] as const
const objects = ['Atlas', 'Binder', 'Catalog', 'Directory', 'Envelope', 'Folder', 'Guide', 'Handbook', 'Index', 'Journal', 'Ledger', 'Manual', 'Notebook', 'Portfolio', 'Report', 'Workbook'] as const
const tasks = ['Audit', 'Briefing', 'Coding', 'Drafting', 'Evaluation', 'Filing', 'Interview', 'Review', 'Training', 'Workshop'] as const
type Random = ReturnType<typeof createSeededRandom>

const immediateChain = (order: readonly string[]): ArrangementConstraint[] => order.slice(0, -1).map((label, index) => ({ kind: 'before', first: label, second: order[index + 1] as string, immediate: true }))
const fixedOrder = (order: readonly string[]): ArrangementConstraint[] => order.map((label, position) => ({ kind: 'fixed', label, position }))
const chooseSize = (difficulty: GeneratorDifficulty) => difficulty === 'easy' ? 4 : difficulty === 'medium' ? 5 : 6
const randomFor = (seed: string, slug: GeneratorSlug, difficulty: GeneratorDifficulty) => createSeededRandom(`${seed}|${slug}|${version}|${difficulty}`)

function choicesFrom(order: readonly string[], correct: string, mistakes: readonly ArrangementScenario['distractors'][number]['mistakeType'][]): ArrangementScenario['distractors'] {
  return order.filter((label) => label !== correct).slice(0, 3).map((text, index) => arrangementDistractor(text, mistakes[index] ?? 'arrangement_violated_clue'))
}

function linearScenario(random: Random, difficulty: GeneratorDifficulty): ArrangementScenario {
  const order = random.shuffle(people).slice(0, chooseSize(difficulty))
  const constraints: ArrangementConstraint[] = [{ kind: 'end', label: order[0] as string }, ...immediateChain(order)]
  const position = random.integer(1, order.length - 2)
  const problem: ArrangementProblem = { mode: 'linear', labels: [...order].sort(), constraints }
  const correct = order[position] as string
  return { problem, prompt: `Employees sit in one row, viewed from the front.\n${formatClues(constraints)}\n\nWho sits in position ${position + 1} from the left?`, correct, distractors: choicesFrom(order, correct, ['arrangement_reversed_direction', 'arrangement_ignored_immediate', 'arrangement_violated_end']), steps: ['Place the stated end person first.', 'Join each immediate-left pair into one chain.', `The completed row is ${order.join(' – ')}.`, `${correct} is in position ${position + 1}.`], signature: `linear|${order.join('|')}|${position}`, query: { kind: 'position', position } }
}

function neighborScenario(random: Random, difficulty: GeneratorDifficulty): ArrangementScenario {
  const order = random.shuffle(people).slice(0, chooseSize(difficulty))
  const constraints = immediateChain(order)
  const index = random.integer(1, order.length - 2)
  const side = random.pick(['left', 'right'] as const)
  const target = order[index] as string
  const correct = order[index + (side === 'left' ? -1 : 1)] as string
  const problem: ArrangementProblem = { mode: 'linear', labels: [...order].sort(), constraints }
  return { problem, prompt: `Students sit in one row, viewed from the front.\n${formatClues(constraints)}\n\nWho sits immediately ${side} of ${target}?`, correct, distractors: choicesFrom(order, correct, ['arrangement_reversed_direction', 'arrangement_ignored_immediate', 'arrangement_violated_clue']), steps: ['Immediate means exactly one neighboring seat.', `The row is ${order.join(' – ')}.`, `${correct} is immediately ${side} of ${target}.`], signature: `neighbor|${order.join('|')}|${target}|${side}`, query: { kind: side, label: target } }
}

function gapScenario(random: Random, difficulty: GeneratorDifficulty): ArrangementScenario {
  const order = random.shuffle(people).slice(0, chooseSize(difficulty) + 1)
  const constraints = fixedOrder(order)
  const first = random.integer(0, order.length - 3)
  const between = random.integer(1, Math.min(3, order.length - first - 2))
  const second = first + between + 1
  const correct = order[second] as string
  const problem: ArrangementProblem = { mode: 'linear', labels: [...order].sort(), constraints }
  const displayed: ArrangementConstraint[] = [{ kind: 'fixed', label: order[first] as string, position: first }, { kind: 'gap', first: order[first] as string, second: correct, between }, ...immediateChain(order)]
  return { problem, prompt: `People sit in a row from left to right.\n${formatClues(displayed)}\n\nWho is exactly ${between + 1} positions to the right of ${order[first]}?`, correct, distractors: choicesFrom(order, correct, ['arrangement_off_by_one_gap', 'arrangement_counted_endpoint', 'arrangement_reversed_direction']), steps: [`${between} people between two seats means a position difference of ${between + 1}.`, `The row is ${order.join(' – ')}.`, `${correct} is the required person.`], signature: `gap|${order.join('|')}|${first}|${between}`, query: { kind: 'position', position: second } }
}

function circularBase(random: Random, difficulty: GeneratorDifficulty): { order: string[]; problem: ArrangementProblem; constraints: ArrangementConstraint[] } {
  const size = difficulty === 'hard' ? 6 : 4
  const order = random.shuffle(people).slice(0, size)
  const constraints: ArrangementConstraint[] = order.slice(0, -1).map((label, index) => ({ kind: 'clockwise', first: label, second: order[index + 1] as string, steps: 1 }))
  constraints.push({ kind: 'clockwise', first: order[size - 1] as string, second: order[0] as string, steps: 1 })
  return { order, constraints, problem: { mode: 'circular', labels: order, constraints } }
}

function circularScenario(random: Random, difficulty: GeneratorDifficulty): ArrangementScenario {
  const { order, problem, constraints } = circularBase(random, difficulty)
  const index = random.integer(0, order.length - 1)
  const target = order[index] as string
  const opposite = difficulty !== 'easy' && random.integer(0, 1) === 1
  const correct = order[(index + (opposite ? order.length / 2 : 1)) % order.length] as string
  return { problem, prompt: `Everyone sits around a circle facing the center. The listed order is clockwise.\n${formatClues(constraints)}\n\nWho sits ${opposite ? 'opposite' : 'immediately clockwise from'} ${target}?`, correct, distractors: choicesFrom(order, correct, ['arrangement_reversed_direction', 'arrangement_ignored_wraparound', 'arrangement_wrong_opposite']), steps: [`Fix ${order[0]} as the circular anchor; rotations are equivalent.`, `Clockwise order: ${order.join(' → ')} → ${order[0]}.`, `${correct} is ${opposite ? 'opposite' : 'immediately clockwise from'} ${target}.`], signature: `circle|${order.join('|')}|${target}|${opposite}`, query: opposite ? { kind: 'opposite', label: target } : { kind: 'clockwise', label: target } }
}

function facingScenario(random: Random, difficulty: GeneratorDifficulty): ArrangementScenario {
  const { order, problem, constraints } = circularBase(random, difficulty)
  const index = random.integer(0, order.length - 1)
  const target = order[index] as string
  const facing = difficulty === 'easy' ? 'center' : random.pick(['center', 'outward'] as const)
  const side = random.pick(['left', 'right'] as const)
  const clockwise = facing === 'center' ? side === 'left' : side === 'right'
  const correct = order[(index + (clockwise ? 1 : order.length - 1)) % order.length] as string
  return { problem, prompt: `People sit around a circle in this clockwise arrangement. ${target} faces ${facing === 'center' ? 'the center' : 'away from the center'}.\n${formatClues(constraints)}\n\nWho is immediately to ${target}'s ${side}?`, correct, distractors: choicesFrom(order, correct, ['arrangement_ignored_orientation', 'arrangement_outward_as_center', 'arrangement_reversed_direction']), steps: [`For someone facing ${facing === 'center' ? 'the center, left is clockwise' : 'outward, left is counterclockwise'}.`, `Clockwise order: ${order.join(' → ')}.`, `${correct} is immediately to ${target}'s ${side}.`], signature: `facing|${order.join('|')}|${target}|${facing}|${side}`, query: { kind: side, label: target, facing } }
}

function rearrangementScenario(random: Random, difficulty: GeneratorDifficulty): ArrangementScenario {
  const original = random.shuffle(people).slice(0, chooseSize(difficulty))
  const from = random.integer(0, original.length - 1)
  let to = random.integer(0, original.length - 1); if (to === from) to = (to + 1) % original.length
  const swap = difficulty !== 'hard'
  const final = swap ? swapPositions(original, from, to) : moveWithShift(original, from, to)
  const position = random.integer(0, final.length - 1)
  const correct = final[position] as string
  const problem: ArrangementProblem = { mode: 'linear', labels: [...final].sort(), constraints: fixedOrder(final) }
  const action = swap ? `${original[from]} and ${original[to]} swap positions.` : `${original[from]} moves to position ${to + 1}; intervening people shift.`
  return { problem, prompt: `Original row: ${original.join(' – ')}. ${action}\nWho is then in position ${position + 1}?`, correct, distractors: choicesFrom(original, correct, ['arrangement_original_position', 'arrangement_partial_swap', 'arrangement_failed_shift']), steps: [`Start with ${original.join(' – ')}.`, action, `New row: ${final.join(' – ')}.`, `${correct} is in position ${position + 1}.`], signature: `move|${original.join('|')}|${from}|${to}|${swap}|${position}`, query: { kind: 'position', position } }
}

function scheduleScenario(random: Random, difficulty: GeneratorDifficulty): ArrangementScenario {
  const order = random.shuffle(tasks).slice(0, chooseSize(difficulty))
  const constraints: ArrangementConstraint[] = [{ kind: 'fixed', label: order[0] as string, position: 0 }, ...immediateChain(order), { kind: 'not-end', label: order[1] as string }]
  const position = random.integer(1, order.length - 1)
  const problem: ArrangementProblem = { mode: 'schedule', labels: [...order].sort(), constraints }
  const correct = order[position] as string
  return { problem, prompt: `Tasks occupy slots 1 through ${order.length}.\n${formatClues(constraints)}\n\nWhich task is in slot ${position + 1}?`, correct, distractors: choicesFrom(order, correct, ['arrangement_reversed_before_after', 'arrangement_ignored_fixed_slot', 'arrangement_violated_not_end']), steps: ['Place the fixed slot first.', 'Apply every before/after clue in sequence.', `Schedule: ${order.join(' – ')}.`, `${correct} is in slot ${position + 1}.`], signature: `schedule|${order.join('|')}|${position}`, query: { kind: 'position', position } }
}

function shelfScenario(random: Random, difficulty: GeneratorDifficulty): ArrangementScenario {
  const order = random.shuffle(objects).slice(0, chooseSize(difficulty))
  const constraints: ArrangementConstraint[] = [{ kind: 'end', label: order[0] as string }, ...immediateChain(order)]
  const position = random.integer(0, order.length - 1)
  const correct = order[position] as string
  const problem: ArrangementProblem = { mode: 'linear', labels: [...order].sort(), constraints }
  return { problem, prompt: `Distinct office items are arranged on a shelf from left to right.\n${formatClues(constraints)}\n\nWhich item is in position ${position + 1}?`, correct, distractors: choicesFrom(order, correct, ['arrangement_reversed_direction', 'arrangement_ignored_adjacency', 'arrangement_violated_end']), steps: ['Keep every label as a distinct object.', 'Apply the end and adjacency clues.', `Shelf order: ${order.join(' – ')}.`, `${correct} is in position ${position + 1}.`], signature: `shelf|${order.join('|')}|${position}`, query: { kind: 'position', position } }
}

function buildScenario(slug: GeneratorSlug, seed: string, difficulty: GeneratorDifficulty): ArrangementScenario {
  const random = randomFor(seed, slug, difficulty)
  if (slug === 'linear-row-seating') return linearScenario(random, difficulty)
  if (slug === 'left-right-neighbor') return neighborScenario(random, difficulty)
  if (slug === 'fixed-gap-seating') return gapScenario(random, difficulty)
  if (slug === 'circular-seating') return circularScenario(random, difficulty)
  if (slug === 'facing-direction-seating') return facingScenario(random, difficulty)
  if (slug === 'rearrangement-swap') return rearrangementScenario(random, difficulty)
  if (slug === 'schedule-slot-arrangement') return scheduleScenario(random, difficulty)
  if (slug === 'object-shelf-arrangement') return shelfScenario(random, difficulty)
  if (slug === 'mixed-seating-arrangement') {
    const variants = ['linear-row-seating', 'left-right-neighbor', 'fixed-gap-seating', 'circular-seating', 'facing-direction-seating', 'rearrangement-swap', 'schedule-slot-arrangement', 'object-shelf-arrangement'] as const
    const selected = random.pick(variants)
    const scenario = buildScenario(selected, `${seed}|mixed`, difficulty)
    return { ...scenario, signature: `mixed|${selected}|${scenario.signature}` }
  }
  throw new Error(`Unsupported Seating and Arrangement generator: ${slug}`)
}

function buildQuestion(slug: GeneratorSlug, input: { seed: string; difficulty: GeneratorDifficulty }): GeneratedQuestion {
  const scenario = buildScenario(slug, input.seed, input.difficulty)
  if (!validateScenario(scenario)) throw new Error('Generated arrangement scenario failed exact validation.')
  const distractors = selectArrangementDistractors(scenario.correct, scenario.distractors)
  const choices = randomFor(input.seed, slug, input.difficulty).shuffle([
    { text: scenario.correct, isCorrect: true, distractorType: null, mistakeType: null, derivation: null, qualityScore: 1, numericValue: arrangementNumericValue(scenario.correct) },
    ...distractors.map((item) => ({ text: item.text, isCorrect: false, distractorType: item.mistakeType, mistakeType: item.mistakeType, derivation: { operation: item.mistakeType, inputs: [arrangementNumericValue(item.text)] }, qualityScore: 0.95, numericValue: arrangementNumericValue(item.text) })),
  ])
  return { generatorSlug: slug, generatorVersion: version, difficulty: input.difficulty, seed: input.seed, prompt: scenario.prompt, parameters: { problem: scenario.problem, query: scenario.query, recomputedCorrect: scenario.correct }, choices, explanation: { title: 'Seating and arrangement solution', steps: [...scenario.steps], finalAnswer: scenario.correct }, metadata: { answerKind: 'text', unit: null, canonicalSignature: `${slug}|${input.difficulty}|${scenario.signature}` } }
}

function validate(question: GeneratedQuestion): GeneratorValidationResult {
  try {
    const problem = question.parameters.problem as ArrangementProblem
    const query = question.parameters.query as ArrangementScenario['query']
    const expected = question.parameters.recomputedCorrect
    const correct = question.choices.find((choice) => choice.isCorrect)
    const texts = question.choices.map((choice) => choice.text.trim().toLowerCase())
    const valid = typeof expected === 'string' && answerScenario(problem, query) === expected && correct?.text === expected && question.choices.length === 4 && new Set(texts).size === 4 && question.choices.filter((choice) => choice.isCorrect).length === 1 && question.choices.filter((choice) => !choice.isCorrect).every((choice) => choice.mistakeType?.startsWith('arrangement_') && choice.derivation !== null) && question.explanation.finalAnswer === expected
    return { valid, reason: valid ? null : 'Arrangement solver validation failed.' }
  } catch (error) { return { valid: false, reason: error instanceof Error ? error.message : 'Invalid arrangement question.' } }
}

const make = (slug: GeneratorSlug, title: string): QuestionGenerator => ({ slug, version, title, supportedDifficulties, generate: (input) => buildQuestion(slug, input), validate })
export const seatingArrangementGenerators = [
  ['linear-row-seating', 'Linear Row Seating'], ['left-right-neighbor', 'Left, Right, and Immediate Neighbors'], ['fixed-gap-seating', 'People Between and Fixed Gaps'], ['circular-seating', 'Circular Seating'], ['facing-direction-seating', 'Facing Direction Seating'], ['rearrangement-swap', 'Position Swaps and Rearrangements'], ['schedule-slot-arrangement', 'Schedule and Time-Slot Arrangements'], ['object-shelf-arrangement', 'Object and Shelf Arrangements'], ['mixed-seating-arrangement', 'Mixed Seating and Arrangement Problems'],
].map(([slug, title]) => make(slug as GeneratorSlug, title ?? 'Seating and Arrangement'))
