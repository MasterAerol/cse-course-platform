import type {
  AttemptAnswerRow,
  QuizQuestionChoiceRow,
} from '../repositories/quiz.repository'

export interface QuizChoice {
  id: number
  text: string
  position: number
  isCorrect: boolean
}

export interface QuizQuestion {
  id: number
  prompt: string
  explanation: string | null
  points: number
  position: number
  choices: QuizChoice[]
}

export interface ScoredQuestion {
  questionId: number
  selectedChoiceId: number | null
  correctChoiceId: number
  isCorrect: boolean
  pointsAwarded: number
}

export interface QuizScore {
  totalPoints: number
  earnedPoints: number
  scorePercent: number
  passed: boolean
  questions: ScoredQuestion[]
}

export function groupQuestions(
  rows: QuizQuestionChoiceRow[],
): QuizQuestion[] {
  const questions = new Map<number, QuizQuestion>()

  for (const row of rows) {
    const existing = questions.get(row.question_id)
    const question =
      existing ??
      {
        id: row.question_id,
        prompt: row.question_prompt,
        explanation: row.explanation,
        points: row.points,
        position: row.question_position,
        choices: [],
      }

    question.choices.push({
      id: row.choice_id,
      text: row.choice_text,
      position: row.choice_position,
      isCorrect: row.is_correct === 1,
    })

    if (existing === undefined) {
      questions.set(row.question_id, question)
    }
  }

  return Array.from(questions.values()).sort(
    (left, right) => left.position - right.position,
  )
}

export function scoreQuiz(
  questions: QuizQuestion[],
  answers: AttemptAnswerRow[],
  passingScore: number,
): QuizScore {
  const answerByQuestionId = new Map(
    answers.map((answer) => [answer.question_id, answer]),
  )
  const scoredQuestions: ScoredQuestion[] = []
  let totalPoints = 0
  let earnedPoints = 0

  for (const question of questions) {
    totalPoints += question.points
    const selectedChoiceId =
      answerByQuestionId.get(question.id)?.selected_choice_id ?? null
    const correctChoice = question.choices.find((choice) => choice.isCorrect)

    if (correctChoice === undefined) {
      throw new Error(`Question ${question.id} has no correct choice.`)
    }

    const isCorrect = selectedChoiceId === correctChoice.id
    const pointsAwarded = isCorrect ? question.points : 0
    earnedPoints += pointsAwarded
    scoredQuestions.push({
      questionId: question.id,
      selectedChoiceId,
      correctChoiceId: correctChoice.id,
      isCorrect,
      pointsAwarded,
    })
  }

  const scorePercent =
    totalPoints === 0 ? 0 : Math.round((earnedPoints / totalPoints) * 100)

  return {
    totalPoints,
    earnedPoints,
    scorePercent,
    passed: scorePercent >= passingScore,
    questions: scoredQuestions,
  }
}
