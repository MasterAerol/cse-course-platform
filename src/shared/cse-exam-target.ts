export const CSE_EXAM_TIME_ZONE = 'Asia/Manila'

export type CseExamTargetState =
  | {
      status: 'future'
      targetDate: string
      daysRemaining: number
      weeksRemaining: number
      remainingDays: number
    }
  | {
      status: 'today'
      targetDate: string
      daysRemaining: 0
      weeksRemaining: 0
      remainingDays: 0
    }
  | {
      status: 'not-configured' | 'no-upcoming-date'
      targetDate: null
      daysRemaining: null
      weeksRemaining: null
      remainingDays: null
    }

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/u

function dateParts(value: string): [number, number, number] | null {
  if (!dateOnlyPattern.test(value)) {
    return null
  }

  const [yearSource, monthSource, daySource] = value.split('-')
  const year = Number(yearSource)
  const month = Number(monthSource)
  const day = Number(daySource)
  const candidate = new Date(Date.UTC(year, month - 1, day))

  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null
  }

  return [year, month, day]
}

export function isCseExamDate(value: string): boolean {
  return dateParts(value) !== null
}

export function normalizeCseExamDates(values: readonly string[]): string[] {
  return [...new Set(values.filter(isCseExamDate))].sort()
}

export function parseCseExamDates(source: string | undefined): string[] {
  if (source === undefined || source.trim().length === 0) {
    return []
  }

  return normalizeCseExamDates(
    source.split(',').map((value) => value.trim()),
  )
}

export function getManilaDateKey(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CSE_EXAM_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const valueFor = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? ''

  return `${valueFor('year')}-${valueFor('month')}-${valueFor('day')}`
}

function dateOrdinal(value: string): number {
  const parts = dateParts(value)
  if (parts === null) {
    throw new Error(`Invalid date-only value: ${value}`)
  }

  return Math.floor(Date.UTC(parts[0], parts[1] - 1, parts[2]) / 86_400_000)
}

export function resolveCseExamTarget(
  configuredDates: readonly string[],
  now = new Date(),
): CseExamTargetState {
  const dates = normalizeCseExamDates(configuredDates)
  if (dates.length === 0) {
    return {
      status: 'not-configured',
      targetDate: null,
      daysRemaining: null,
      weeksRemaining: null,
      remainingDays: null,
    }
  }

  const today = getManilaDateKey(now)
  const targetDate = dates.find((date) => date >= today)
  if (targetDate === undefined) {
    return {
      status: 'no-upcoming-date',
      targetDate: null,
      daysRemaining: null,
      weeksRemaining: null,
      remainingDays: null,
    }
  }

  const daysRemaining = dateOrdinal(targetDate) - dateOrdinal(today)
  if (daysRemaining === 0) {
    return {
      status: 'today',
      targetDate,
      daysRemaining: 0,
      weeksRemaining: 0,
      remainingDays: 0,
    }
  }

  return {
    status: 'future',
    targetDate,
    daysRemaining,
    weeksRemaining: Math.floor(daysRemaining / 7),
    remainingDays: daysRemaining % 7,
  }
}

export function formatCseExamDate(date: string): string {
  const parts = dateParts(date)
  if (parts === null) {
    return date
  }

  return new Intl.DateTimeFormat('en-PH', {
    timeZone: CSE_EXAM_TIME_ZONE,
    dateStyle: 'long',
  }).format(new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 4)))
}

export interface CseCalendarDay {
  date: string
  day: number
  isToday: boolean
  isTarget: boolean
}

export interface CseCalendarMonth {
  label: string
  leadingBlankCount: number
  days: CseCalendarDay[]
}

export function createCseCalendarMonth(
  targetDate: string | null,
  now = new Date(),
): CseCalendarMonth {
  const today = getManilaDateKey(now)
  const visibleDate = targetDate !== null && isCseExamDate(targetDate)
    ? targetDate
    : today
  const parts = dateParts(visibleDate)
  if (parts === null) {
    throw new Error('A calendar month could not be resolved.')
  }

  const [year, month] = parts
  const firstDay = new Date(Date.UTC(year, month - 1, 1))
  const dayCount = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const monthLabel = new Intl.DateTimeFormat('en-PH', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  }).format(firstDay)
  const days = Array.from({ length: dayCount }, (_, index) => {
    const day = index + 1
    const date = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return {
      date,
      day,
      isToday: date === today,
      isTarget: date === targetDate,
    }
  })

  return {
    label: monthLabel,
    leadingBlankCount: firstDay.getUTCDay(),
    days,
  }
}
