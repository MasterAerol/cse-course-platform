import { describe, expect, it } from 'vitest'

import { configuredCseExamDates } from '../src/shared/cse-exam-config'
import {
  createCseCalendarMonth,
  getManilaDateKey,
  parseCseExamDates,
  resolveCseExamTarget,
} from '../src/shared/cse-exam-target'

describe('centralized CSE exam target', () => {
  it('keeps the version-controlled source empty until an official target is approved', () => {
    expect(configuredCseExamDates).toEqual([])
  })

  it('parses only real date-only values and returns them deterministically', () => {
    expect(parseCseExamDates('2027-08-09, invalid, 2027-02-29, 2027-08-09, 2028-03-12')).toEqual([
      '2027-08-09',
      '2028-03-12',
    ])
    expect(parseCseExamDates(undefined)).toEqual([])
  })

  it('selects the next future target and returns calm day and week precision', () => {
    expect(
      resolveCseExamTarget(
        ['2026-08-01', '2026-08-30', '2027-03-01'],
        new Date('2026-08-20T03:00:00.000Z'),
      ),
    ).toEqual({
      status: 'future',
      targetDate: '2026-08-30',
      daysRemaining: 10,
      weeksRemaining: 1,
      remainingDays: 3,
    })
  })

  it('shows exam day in Manila and never returns a negative countdown', () => {
    expect(
      resolveCseExamTarget(
        ['2026-08-20'],
        new Date('2026-08-19T16:00:00.000Z'),
      ),
    ).toMatchObject({ status: 'today', daysRemaining: 0 })

    expect(
      resolveCseExamTarget(
        ['2026-08-19'],
        new Date('2026-08-20T00:00:00.000Z'),
      ),
    ).toEqual({
      status: 'no-upcoming-date',
      targetDate: null,
      daysRemaining: null,
      weeksRemaining: null,
      remainingDays: null,
    })
  })

  it('keeps no-date configuration explicit', () => {
    expect(resolveCseExamTarget([])).toEqual({
      status: 'not-configured',
      targetDate: null,
      daysRemaining: null,
      weeksRemaining: null,
      remainingDays: null,
    })
  })

  it('uses the Asia/Manila boundary rather than the host timezone', () => {
    expect(getManilaDateKey(new Date('2026-08-20T15:59:59.000Z'))).toBe('2026-08-20')
    expect(getManilaDateKey(new Date('2026-08-20T16:00:00.000Z'))).toBe('2026-08-21')
    expect(resolveCseExamTarget(['2026-08-21'], new Date('2026-08-20T15:59:59.000Z')).status).toBe('future')
    expect(resolveCseExamTarget(['2026-08-21'], new Date('2026-08-20T16:00:00.000Z')).status).toBe('today')
  })

  it('marks today and the target independently in the calendar model', () => {
    const calendar = createCseCalendarMonth('2026-08-25', new Date('2026-08-20T03:00:00.000Z'))
    expect(calendar.label).toBe('August 2026')
    expect(calendar.days.find((day) => day.isToday)?.date).toBe('2026-08-20')
    expect(calendar.days.find((day) => day.isTarget)?.date).toBe('2026-08-25')
  })
})
