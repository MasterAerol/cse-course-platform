export interface SubjectAssessmentCardSummary {
  assessment: {
    title: string
    slug: string
    description: string | null
    questionCount: number
    passingScore: number
    timeLimitMinutes?: number | null
  }
  availability: { available: boolean; reason: string | null }
  state: 'not_started' | 'in_progress' | 'passed' | 'needs_improvement'
  inProgressAttemptPublicId: string | null
  bestScore: number | null
  history: Array<{ attemptPublicId: string; status: string }>
}
