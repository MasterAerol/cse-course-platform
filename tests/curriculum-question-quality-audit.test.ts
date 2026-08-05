import { describe, expect, it } from 'vitest'

import { numericalAbilityBlueprintV1 } from '../src/worker/domain/subject-assessment-blueprint'
import { getRegisteredGenerators } from '../src/worker/generators/generator.registry'

const malformedText =
  /\uFFFD|\u00EF\u00BF\u00BD|\u00E2(?:\u20AC|\u201A\u00B1)|\u00C3|\b(?:NaN|Infinity)\b/u

describe('curriculum-wide generated-question quality audit', () => {
  it('validates every registered family across deterministic stress seeds', () => {
    const generators = getRegisteredGenerators()
    const numericalSlugs = new Set(
      numericalAbilityBlueprintV1.topics.flatMap((topic) =>
        topic.generators.map((generator) => generator.slug),
      ),
    )
    let generatedCases = 0

    for (const generator of generators) {
      const cases = numericalSlugs.has(generator.slug) ? 1_000 : 500
      const answerPositions = [0, 0, 0, 0]

      for (let index = 0; index < cases; index += 1) {
        const difficulty =
          generator.supportedDifficulties[
            index % generator.supportedDifficulties.length
          ]
        if (difficulty === undefined) throw new Error(`${generator.slug} has no difficulty.`)
        const seed = `curriculum-audit|${generator.slug}|${index}`
        const question = generator.generate({ seed, difficulty })
        const repeated = generator.generate({ seed, difficulty })
        const validation = generator.validate(question)

        expect(repeated, `${generator.slug} seed ${seed}`).toEqual(question)
        if (!validation.valid) {
          throw new Error(
            `${generator.slug} seed ${seed}: ${validation.reason}; ${JSON.stringify({
              prompt: question.prompt,
              parameters: question.parameters,
              choices: question.choices,
            })}`,
          )
        }
        expect(question.choices, `${generator.slug} seed ${seed}`).toHaveLength(4)
        expect(
          question.choices.filter((choice) => choice.isCorrect),
          `${generator.slug} seed ${seed}`,
        ).toHaveLength(1)
        expect(
          new Set(question.choices.map((choice) => choice.text.trim().toLocaleLowerCase())),
          `${generator.slug} seed ${seed}`,
        ).toHaveLength(4)

        const correctIndex = question.choices.findIndex((choice) => choice.isCorrect)
        const correct = question.choices[correctIndex]
        if (correct === undefined) throw new Error(`${generator.slug} has no correct choice.`)
        answerPositions[correctIndex] = (answerPositions[correctIndex] ?? 0) + 1

        expect(question.explanation.finalAnswer.trim(), `${generator.slug} seed ${seed}`).toBe(
          correct.text.trim(),
        )
        expect(question.explanation.steps.length, `${generator.slug} seed ${seed}`).toBeGreaterThan(0)
        expect(question.metadata.canonicalSignature.trim()).not.toBe('')
        expect(question.prompt.trim()).not.toBe('')
        expect(
          malformedText.test(
            [
              question.prompt,
              question.explanation.title,
              ...question.explanation.steps,
              question.explanation.finalAnswer,
              ...question.choices.map((choice) => choice.text),
            ].join('\n'),
          ),
          `${generator.slug} seed ${seed}`,
        ).toBe(false)
        for (const choice of question.choices) {
          expect(Number.isFinite(choice.numericValue), `${generator.slug} seed ${seed}`).toBe(true)
          expect(Number.isFinite(choice.qualityScore), `${generator.slug} seed ${seed}`).toBe(true)
        }
        generatedCases += 1
      }

      for (const count of answerPositions) {
        expect(count / cases, `${generator.slug} answer positions ${answerPositions.join('/')}`).toBeGreaterThan(0.15)
      }
    }

    expect(generators.length).toBeGreaterThan(250)
    expect(generatedCases).toBeGreaterThan(150_000)
    console.info(
      `CURRICULUM_GENERATOR_AUDIT families=${generators.length} numerical=${numericalSlugs.size} cases=${generatedCases}`,
    )
  }, 180_000)
})
