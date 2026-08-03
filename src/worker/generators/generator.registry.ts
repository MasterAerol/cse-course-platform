import { findingBaseGenerator } from './percentages/finding-base.generator'
import { findingPercentageGenerator } from './percentages/finding-percentage.generator'
import { findingRateGenerator } from './percentages/finding-rate.generator'
import { fractionGenerators } from './fractions/fraction-generators'
import { decimalGenerators } from './decimals/decimal-generators'
import { ratioGenerators } from './ratios/ratio-generators'
import { averageGenerators } from './averages/average-generators'
import { numberProblemGenerators } from './number-problems/number-problem-generators'
import { ageProblemGenerators } from './age-problems/age-problem-generators'
import { workRateGenerators } from './work-rates/work-rate-generators'
import { distanceSpeedTimeGenerators } from './distance-speed-time/distance-speed-time-generators'
import { simpleInterestGenerators } from './simple-interest/simple-interest-generators'
import { logicalReasoningGenerators } from './logical-reasoning/logical-reasoning-generators'
import { analogyClassificationGenerators } from './analogy-classification/analogy-classification-generators'
import { numberSeriesGenerators } from './number-series/number-series-generators'
import { letterSeriesGenerators } from './letter-series/letter-series-generators'
import { codingDecodingGenerators } from './coding-decoding/coding-decoding-generators'
import { orderingRankingGenerators } from './ordering-ranking/ordering-ranking-generators'
import { syllogismGenerators } from './syllogisms/syllogism-generators'
import { seatingArrangementGenerators } from './seating-arrangements/seating-arrangement-generators'
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
  ...workRateGenerators,
  ...distanceSpeedTimeGenerators,
  ...simpleInterestGenerators,
  ...logicalReasoningGenerators,
  ...analogyClassificationGenerators,
  ...numberSeriesGenerators,
  ...letterSeriesGenerators,
  ...codingDecodingGenerators,
  ...orderingRankingGenerators,
  ...syllogismGenerators,
  ...seatingArrangementGenerators,
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
  existingPrompts?: ReadonlySet<string>
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
      !input.existingSignatures.has(question.metadata.canonicalSignature) &&
      !input.existingPrompts?.has(question.prompt.trim().toLowerCase())
    ) {
      return question
    }
  }

  throw new Error(
    `Unable to generate a valid unique question for ${input.generatorSlug}.`,
  )
}
