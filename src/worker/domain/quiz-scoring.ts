import type {
  AttemptAnswerRow,
  QuizQuestionChoiceRow,
} from '../repositories/quiz.repository'
import {
  scoreAssessment,
  type AssessmentScore,
  type ScoredAssessmentQuestion,
} from './assessment-scoring'

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

export type ScoredQuestion = ScoredAssessmentQuestion
export type QuizScore = AssessmentScore

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
  return scoreAssessment(questions, answers, passingScore)
}
