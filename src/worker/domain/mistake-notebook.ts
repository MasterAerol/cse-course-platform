export type MistakeNotebookSourceType =
  | 'practice'
  | 'subject_assessment'
  | 'mock_exam'
  | 'smart_recovery'

export type MistakeNotebookSkillStatus =
  | 'not_enough_data'
  | 'needs_more_practice'
  | 'improving'
  | 'strong'

export interface MistakeNotebookRow {
  entry_id: string
  source_type: MistakeNotebookSourceType
  attempt_public_id: string
  snapshot_public_id: string
  submitted_at: string
  prompt: string
  selected_answer: string | null
  correct_answer: string
  explanation_json: string | null
  was_unanswered: 0 | 1
  subject_slug: string | null
  subject_title: string | null
  topic_slug: string | null
  topic_title: string | null
  skill_slug: string | null
  skill_title: string | null
  skill_status: string | null
  mistake_pattern: string | null
  related_lesson_title: string | null
  related_lesson_route: string | null
  practice_route: string | null
}

export interface MistakeNotebookEntry {
  id: string
  sourceType: MistakeNotebookSourceType
  attemptPublicId: string
  snapshotPublicId: string
  submittedAt: string
  prompt: string
  selectedAnswer: string | null
  correctAnswer: string
  explanation: string | null
  wasUnanswered: boolean
  subject: { slug: string; title: string } | null
  topic: { slug: string; title: string } | null
  skill: { slug: string; title: string } | null
  currentSkillStatus: MistakeNotebookSkillStatus | null
  mistakePattern: string | null
  relatedLesson: { title: string; route: string } | null
  practiceRoute: string | null
}

export interface MistakeNotebookSummary {
  totalMistakes: number
  recentMistakes: number
  latestMistakeAt: string | null
  reviewedSourceCount: number
  mistakesBySubject: Array<{ slug: string; title: string; count: number }>
  topMistakeSkills: Array<{ slug: string; title: string; count: number }>
  repeatedMistakePatterns: Array<{ pattern: string; count: number }>
}

function explanationText(value: string | null): string | null {
  if (value === null) return null
  try {
    const parsed = JSON.parse(value) as {
      title?: unknown
      steps?: unknown
      finalAnswer?: unknown
    }
    const title = typeof parsed.title === 'string' ? parsed.title.trim() : ''
    const steps = Array.isArray(parsed.steps)
      ? parsed.steps.filter((step): step is string => typeof step === 'string')
      : []
    const finalAnswer =
      typeof parsed.finalAnswer === 'string' ? parsed.finalAnswer.trim() : ''
    const parts = [
      title,
      steps.join(' '),
      finalAnswer.length > 0 ? `Final answer: ${finalAnswer}` : '',
    ].filter((part) => part.length > 0)
    return parts.length === 0 ? null : parts.join(': ').replace(': Final answer:', ' Final answer:')
  } catch {
    return null
  }
}

export function formatMistakePattern(value: string | null): string | null {
  if (value === null || value.trim().length === 0) return null
  return value
    .trim()
    .replaceAll(/[_-]+/gu, ' ')
    .replace(/\b\p{L}/gu, (letter) => letter.toUpperCase())
}

function pair(slug: string | null, title: string | null) {
  return slug === null || title === null ? null : { slug, title }
}

export function normalizeMistakeNotebookRow(
  row: MistakeNotebookRow,
): MistakeNotebookEntry | null {
  if (
    row.entry_id.length === 0 ||
    row.attempt_public_id.length === 0 ||
    row.snapshot_public_id.length === 0 ||
    row.prompt.trim().length === 0 ||
    row.correct_answer.trim().length === 0 ||
    !Number.isFinite(Date.parse(row.submitted_at))
  ) {
    return null
  }
  return {
    id: row.entry_id,
    sourceType: row.source_type,
    attemptPublicId: row.attempt_public_id,
    snapshotPublicId: row.snapshot_public_id,
    submittedAt: row.submitted_at,
    prompt: row.prompt,
    selectedAnswer: row.selected_answer,
    correctAnswer: row.correct_answer,
    explanation: explanationText(row.explanation_json),
    wasUnanswered: row.was_unanswered === 1,
    subject: pair(row.subject_slug, row.subject_title),
    topic: pair(row.topic_slug, row.topic_title),
    skill: pair(row.skill_slug, row.skill_title),
    currentSkillStatus: null,
    mistakePattern: formatMistakePattern(row.mistake_pattern),
    relatedLesson:
      row.related_lesson_title === null || row.related_lesson_route === null
        ? null
        : { title: row.related_lesson_title, route: row.related_lesson_route },
    practiceRoute: row.practice_route,
  }
}