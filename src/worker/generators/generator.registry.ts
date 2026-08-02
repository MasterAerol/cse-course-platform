import { findingBaseGenerator } from './percentages/finding-base.generator'
import { findingPercentageGenerator } from './percentages/finding-percentage.generator'
import { findingRateGenerator } from './percentages/finding-rate.generator'
import { fractionGenerators } from './fractions/fraction-generators'
import { decimalGenerators } from './decimals/decimal-generators'
import { ratioGenerators } from './ratios/ratio-generators'
import { averageGenerators } from './averages/average-generators'
import { numberProblemGenerators } from './number-problems/number-problem-generators'
import { ageProblemGenerators } from './age-problems/age-problem-generators'
import { deriveQuestionSeed } from './generator-random'
import type {
  GeneratedQuestion,
  GeneratorDifficulty,
  GeneratorSlug,
  QuestionGenerator,
} from './generator.types'

const generators = [
  findingPercentageGenerator,
  findingBaseGenerator,
  findingRateGenerator,
  ...fractionGenerators,
  ...decimalGenerators,
  ...ratioGenerators,
  ...averageGenerators,
  ...numberProblemGenerators,
  ...ageProblemGenerators,
] as const satisfies readonly QuestionGenerator[]

export function getGenerator(
  slug: GeneratorSlug,
  version: number,
): QuestionGenerator | null {
  return (
    generators.find(
      (generator) => generator.slug === slug && generator.version === version,
    ) ?? null
  )
}

export function getRegisteredGenerators(): readonly QuestionGenerator[] {
  return generators
}

export function generateValidatedQuestion(input: {
  attemptSeed: string
  generatorSlug: GeneratorSlug
  generatorVersion: number
  difficulty: GeneratorDifficulty
  position: number
  existingSignatures: ReadonlySet<string>
  maxRetries?: number
}): GeneratedQuestion {
  const generator = getGenerator(
    input.generatorSlug,
    input.generatorVersion,
  )

  if (generator === null) {
    throw new Error(
      `Unsupported generator ${input.generatorSlug} v${input.generatorVersion}.`,
    )
  }

  const maxRetries = input.maxRetries ?? 25

  for (let retry = 0; retry < maxRetries; retry += 1) {
    const seed = deriveQuestionSeed({
      attemptSeed: input.attemptSeed,
      generatorSlug: input.generatorSlug,
      generatorVersion: input.generatorVersion,
      difficulty: input.difficulty,
      position: input.position,
      retry,
    })
    const question = generator.generate({
      seed,
      difficulty: input.difficulty,
    })
    const validation = generator.validate(question)

    if (
      validation.valid &&
      !input.existingSignatures.has(question.metadata.canonicalSignature)
    ) {
      return question
    }
  }

  throw new Error(
    `Unable to generate a valid unique question for ${input.generatorSlug}.`,
  )
}
