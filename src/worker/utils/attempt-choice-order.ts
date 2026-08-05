import { createSeededRandom } from '../generators/generator-random'

interface AttemptChoice {
  id: number
  position: number
}

export function orderAttemptChoices<TChoice extends AttemptChoice>(
  choices: TChoice[],
  attemptPublicId: string,
  questionId: number,
): TChoice[] {
  const random = createSeededRandom(
    `${attemptPublicId}|question-${questionId}|choice-order`,
  )

  return random.shuffle([...choices]).map((choice, index) => ({
    ...choice,
    position: index + 1,
  }))
}
