import { configuredCseExamDates } from '../../shared/cse-exam-config'
import { normalizeCseExamDates } from '../../shared/cse-exam-target'

export function getConfiguredCseExamDates(): string[] {
  return normalizeCseExamDates(configuredCseExamDates)
}
