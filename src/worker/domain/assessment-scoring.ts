export interface AssessmentChoice {
  id: number
  isCorrect: boolean
}

export interface AssessmentQuestion {
  id: number
  points: number
  choices: AssessmentChoice[]
}

export interface AssessmentAnswer {
  question_id: number
  selected_choice_id: number | null
}

export interface ScoredAssessmentQuestion {
  questionId: number
  selectedChoiceId: number | null
  correctChoiceId: number
  isCorrect: boolean
  pointsAwarded: number
}

export interface AssessmentScore {
  totalPoints: number
  earnedPoints: number
  scorePercent: number
  passed: boolean
  questions: ScoredAssessmentQuestion[]
}

export function scoreAssessment(
  questions: AssessmentQuestion[],
  answers: AssessmentAnswer[],
  passingScore: number,
): AssessmentScore {
  const answerByQuestionId = new Map(
    answers.map((answer) => [answer.question_id, answer]),
  )
  const scoredQuestions: ScoredAssessmentQuestion[] = []
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
