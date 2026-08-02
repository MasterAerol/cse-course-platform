import type { NumericalAbilityTopicSlug } from './subject-assessment-blueprint'

export interface SubjectAssessmentResultItem {
  topicSlug: NumericalAbilityTopicSlug
  topicTitle: string
  topicPosition: number
  selectedChoiceId: number | null
  isCorrect: boolean
}

export interface TopicPerformance {
  topicSlug: NumericalAbilityTopicSlug
  topicTitle: string
  totalQuestions: number
  correctCount: number
  incorrectCount: number
  unansweredCount: number
  percentage: number
  status: 'Strong' | 'Developing' | 'Needs Review'
}

export interface SubjectAssessmentBreakdown {
  topics: TopicPerformance[]
  strongestTopic: TopicPerformance
  weakestTopic: TopicPerformance
  correctCount: number
  incorrectCount: number
  unansweredCount: number
}

function topicStatus(percentage: number): TopicPerformance['status'] {
  if (percentage >= 80) return 'Strong'
  if (percentage >= 60) return 'Developing'
  return 'Needs Review'
}

export function feedbackLabel(
  percentage: number,
): 'Excellent' | 'Very Good' | 'Passed' | 'Needs More Practice' {
  if (percentage >= 90) return 'Excellent'
  if (percentage >= 80) return 'Very Good'
  if (percentage >= 70) return 'Passed'
  return 'Needs More Practice'
}

export function calculateSubjectAssessmentBreakdown(
  items: SubjectAssessmentResultItem[],
): SubjectAssessmentBreakdown {
  const groups = new Map<
    NumericalAbilityTopicSlug,
    SubjectAssessmentResultItem[]
  >()

  for (const item of items) {
    const group = groups.get(item.topicSlug) ?? []
    group.push(item)
    groups.set(item.topicSlug, group)
  }

  const topics = Array.from(groups.values())
    .map((group) => {
      const first = group[0]
      if (first === undefined) {
        throw new Error('Topic result group was unexpectedly empty.')
      }
      const correctCount = group.filter((item) => item.isCorrect).length
      const unansweredCount = group.filter(
        (item) => item.selectedChoiceId === null,
      ).length
      const incorrectCount = group.length - correctCount - unansweredCount
      const percentage = Math.round((correctCount / group.length) * 100)

      return {
        topicSlug: first.topicSlug,
        topicTitle: first.topicTitle,
        topicPosition: first.topicPosition,
        totalQuestions: group.length,
        correctCount,
        incorrectCount,
        unansweredCount,
        percentage,
        status: topicStatus(percentage),
      }
    })
    .sort((left, right) => left.topicPosition - right.topicPosition)

  const strongestTopic = [...topics].sort(
    (left, right) =>
      right.percentage - left.percentage ||
      left.topicPosition - right.topicPosition,
  )[0]
  const weakestTopic = [...topics].sort(
    (left, right) =>
      left.percentage - right.percentage ||
      left.topicPosition - right.topicPosition,
  )[0]

  if (strongestTopic === undefined || weakestTopic === undefined) {
    throw new Error('Subject assessment breakdown requires topic results.')
  }

  return {
    topics: topics.map((topic) => ({
      topicSlug: topic.topicSlug,
      topicTitle: topic.topicTitle,
      totalQuestions: topic.totalQuestions,
      correctCount: topic.correctCount,
      incorrectCount: topic.incorrectCount,
      unansweredCount: topic.unansweredCount,
      percentage: topic.percentage,
      status: topic.status,
    })),
    strongestTopic,
    weakestTopic,
    correctCount: items.filter((item) => item.isCorrect).length,
    incorrectCount: items.filter(
      (item) => item.selectedChoiceId !== null && !item.isCorrect,
    ).length,
    unansweredCount: items.filter(
      (item) => item.selectedChoiceId === null,
    ).length,
  }
}
