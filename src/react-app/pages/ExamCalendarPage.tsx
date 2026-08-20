import { Link } from 'react-router'

import { useAuth } from '../auth/use-auth'
import { CseExamCalendar, CseExamTargetCard } from '../components/CseExamTarget'
import { LearnerTopbar } from '../components/LearnerTopbar'

export function ExamCalendarPage() {
  const { cseExamDates } = useAuth()

  return (
    <main className="page-shell exam-calendar-page">
      <LearnerTopbar as="header" mobileCollapsible showSignOut>
        <Link className="dashboard-nav-link" to="/dashboard">Dashboard</Link>
        <Link className="dashboard-nav-link" to="/courses">Courses</Link>
        <Link aria-current="page" className="dashboard-nav-link dashboard-nav-link--active" to="/exam-calendar">Exam calendar</Link>
      </LearnerTopbar>
      <header className="exam-calendar-page__header">
        <div>
          <p className="eyebrow">CSE Exam Calendar</p>
          <h1>Keep your exam target in view.</h1>
          <p>A calm, date-focused view of the next configured CSE target. No invented schedules or events.</p>
        </div>
      </header>
      <div className="exam-calendar-page__grid">
        <CseExamTargetCard configuredDates={cseExamDates} />
        <CseExamCalendar configuredDates={cseExamDates} />
      </div>
      <section className="exam-calendar-note">
        <h2>Plan around official information</h2>
        <p>PasaWise displays only centrally configured target dates. Always confirm filing periods, testing centers, and current requirements through official Civil Service Commission advisories.</p>
      </section>
    </main>
  )
}
