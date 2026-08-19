const REVIEW_QUESTION_LIST_LIMIT = 12

type ReviewQuestionListKind = 'unanswered' | 'marked'

export function formatMockExamSimulationLabel(value: string): string {
  return value.replace(/\s+v\d+\s*$/iu, '')
}

export function formatMockExamDescription(value: string): string {
  return value
    .replace(/\bofficial\s+(?=timed\b)/iu, '')
    .replace(
      /\btimed and untimed practice modes\b/iu,
      'timed simulation and untimed practice modes',
    )
}

export function formatMockReviewQuestionList(
  questionNumbers: readonly number[],
  kind: ReviewQuestionListKind,
): string {
  if (questionNumbers.length === 0) return 'None'
  if (questionNumbers.length <= REVIEW_QUESTION_LIST_LIMIT) {
    return questionNumbers.join(', ')
  }

  return kind === 'unanswered'
    ? `${questionNumbers.length} unanswered questions. Use the question navigator below to return to any item.`
    : `${questionNumbers.length} questions marked for review. Use the question navigator below to revisit them.`
}
