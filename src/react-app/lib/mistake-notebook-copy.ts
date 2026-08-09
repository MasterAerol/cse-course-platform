import type { MistakeNotebookSource } from './mistake-notebook-api'

export function mistakeSourceLabel(source: MistakeNotebookSource): string {
  return {
    practice: 'Generated Practice',
    subject_assessment: 'Subject Assessment',
    mock_exam: 'Full Mock Examination',
    smart_recovery: 'Smart Recovery',
  }[source]
}
export function skillStatusLabel(status: string | null): string | null {
  if (status === null) return null
  return {
    not_enough_data: 'Not enough data',
    needs_more_practice: 'Needs more practice',
    improving: 'Improving',
    strong: 'Strong',
  }[status] ?? null
}
export function formatNotebookDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}