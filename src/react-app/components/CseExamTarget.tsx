import { Link } from 'react-router'

import {
  CSE_EXAM_TIME_ZONE,
  createCseCalendarMonth,
  formatCseExamDate,
  resolveCseExamTarget,
} from '../../shared/cse-exam-target'

interface CseExamTargetCardProps {
  configuredDates: readonly string[]
  compact?: boolean
  linkToCalendar?: boolean
  now?: Date
  titleAs?: 'h2' | 'h3'
}

export function CseExamTargetCard({
  configuredDates,
  compact = false,
  linkToCalendar = false,
  now,
  titleAs = 'h2',
}: CseExamTargetCardProps) {
  const target = resolveCseExamTarget(configuredDates, now)
  const Title = titleAs

  return (
    <section
      className={`exam-target-card${compact ? ' exam-target-card--compact' : ''}`}
      aria-labelledby="exam-target-title"
    >
      <div>
        <p className="eyebrow">CSE Exam Target</p>
        <Title id="exam-target-title">Your next CSE target</Title>
      </div>
      {target.status === 'future' && (
        <>
          <p className="exam-target-card__count" aria-label={`${target.daysRemaining} days remaining`}>
            <strong>{target.daysRemaining}</strong>
            <span>{target.daysRemaining === 1 ? 'day remaining' : 'days remaining'}</span>
          </p>
          <time dateTime={target.targetDate}>{formatCseExamDate(target.targetDate)}</time>
          <p className="exam-target-card__weeks">
            {target.weeksRemaining > 0
              ? `${target.weeksRemaining} ${target.weeksRemaining === 1 ? 'week' : 'weeks'}${target.remainingDays > 0 ? `, ${target.remainingDays} ${target.remainingDays === 1 ? 'day' : 'days'}` : ''}`
              : 'Less than one week'}
          </p>
        </>
      )}
      {target.status === 'today' && (
        <>
          <p className="exam-target-card__count exam-target-card__count--today">
            <strong>Exam day</strong>
          </p>
          <time dateTime={target.targetDate}>{formatCseExamDate(target.targetDate)}</time>
          <p className="exam-target-card__weeks">Stay calm and trust your preparation.</p>
        </>
      )}
      {(target.status === 'not-configured' || target.status === 'no-upcoming-date') && (
        <div className="exam-target-card__empty" role="status">
          <strong>Next CSE date not configured</strong>
          <p>
            An upcoming official target will appear here after it is added to PasaWise.
          </p>
        </div>
      )}
      <p className="exam-target-card__timezone">Dates use Philippine time ({CSE_EXAM_TIME_ZONE}).</p>
      {linkToCalendar && (
        <Link className="exam-target-card__link" to="/exam-calendar">
          View exam calendar <span aria-hidden="true">→</span>
        </Link>
      )}
    </section>
  )
}

export function CseExamCalendar({
  configuredDates,
  now,
}: {
  configuredDates: readonly string[]
  now?: Date
}) {
  const target = resolveCseExamTarget(configuredDates, now)
  const calendar = createCseCalendarMonth(target.targetDate, now)
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <section className="exam-calendar" aria-labelledby="exam-calendar-month">
      <header>
        <p className="eyebrow">Calendar</p>
        <h2 id="exam-calendar-month">{calendar.label}</h2>
      </header>
      <div className="exam-calendar__grid" role="grid" aria-label={calendar.label}>
        {weekDays.map((day) => (
          <span className="exam-calendar__weekday" role="columnheader" key={day}>
            {day}
          </span>
        ))}
        {Array.from({ length: calendar.leadingBlankCount }, (_, index) => (
          <span aria-hidden="true" key={`blank-${index}`} />
        ))}
        {calendar.days.map((day) => (
          <time
            className={`exam-calendar__day${day.isToday ? ' is-today' : ''}${day.isTarget ? ' is-target' : ''}`}
            dateTime={day.date}
            aria-current={day.isToday ? 'date' : undefined}
            aria-label={`${day.date}${day.isToday ? ', today' : ''}${day.isTarget ? ', CSE target date' : ''}`}
            role="gridcell"
            key={day.date}
          >
            {day.day}
            {day.isTarget && <span className="sr-only"> CSE target</span>}
          </time>
        ))}
      </div>
      <div className="exam-calendar__legend" aria-label="Calendar legend">
        <span><i className="exam-calendar__legend-today" />Today</span>
        <span><i className="exam-calendar__legend-target" />CSE target</span>
      </div>
    </section>
  )
}
