import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useAuth } from '../auth/use-auth'
import { CseExamTargetCard } from '../components/CseExamTarget'
import { PasaWiseBrand } from '../components/PasaWiseBrand'
import { fetchHealth } from '../lib/api'

type ConnectionState =
  | { status: 'loading' }
  | { status: 'connected' }
  | { status: 'error'; message: string }

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'The API returned an unexpected response.'
}

export function HomePage() {
  const { user, registrationMode, cseExamDates } = useAuth()
  const [connection, setConnection] = useState<ConnectionState>({
    status: 'loading',
  })

  useEffect(() => {
    const controller = new AbortController()

    async function checkConnection(): Promise<void> {
      try {
        await fetchHealth(controller.signal)
        setConnection({ status: 'connected' })
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          setConnection({ status: 'error', message: getErrorMessage(error) })
        }
      }
    }

    void checkConnection()

    return () => {
      controller.abort()
    }
  }, [])

  return (
    <div className="public-site">
      <header className="public-header">
        <PasaWiseBrand linked variant="header" />
        <nav aria-label="Public navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#subjects">Subjects</a>
          <Link to="/courses">CSE Professional</Link>
          {user === null ? (
            <Link className="button-link" to="/login">Log in</Link>
          ) : (
            <Link className="button-link" to="/dashboard">Dashboard</Link>
          )}
        </nav>
      </header>

      <main>
        <section className="public-hero" aria-labelledby="page-title">
          <div className="public-hero__copy">
            <p className="eyebrow">CSE Professional Review Platform</p>
            <h1 id="page-title">A smarter way to prepare for the Civil Service Exam.</h1>
            <p className="public-tagline">Aral nang wais. Pasa nang handa.</p>
            <p className="intro">
              Study clear lessons, practice fresh questions, discover weak areas,
              recover them, and measure your readiness for the CSE Professional exam.
            </p>
            <div className="button-row">
              {user !== null ? (
                <Link className="button-link" to="/dashboard">Continue reviewing</Link>
              ) : registrationMode === 'open' ? (
                <Link className="button-link" to="/register">Start reviewing</Link>
              ) : (
                <Link className="button-link" to="/login">Log in to PasaWise</Link>
              )}
              <a className="button-link button-link--secondary" href="#how-it-works">
                Explore PasaWise
              </a>
            </div>
            {registrationMode === 'closed' && user === null && (
              <p className="public-access-note">PasaWise currently supports invited learners.</p>
            )}
          </div>
          <aside className="public-product-preview" aria-label="PasaWise learning dashboard preview">
            <div className="public-product-preview__topline">
              <span>PasaWise</span>
              <span>Today</span>
            </div>
            <div className="public-product-preview__focus">
              <span>Continue Learning</span>
              <strong>Your next focused lesson</strong>
              <i />
            </div>
            <div className="public-product-preview__tiles">
              <div><span>Smart Recovery</span><strong>Target weak skills</strong></div>
              <div><span>CSE Readiness</span><strong>Measure real evidence</strong></div>
            </div>
            <p>One clear next step—without clutter.</p>
          </aside>
        </section>

        <section className="public-section" id="how-it-works" aria-labelledby="learning-loop-title">
          <div className="public-section__heading">
            <p className="eyebrow">A complete learning loop</p>
            <h2 id="learning-loop-title">From first lesson to full exam simulation.</h2>
          </div>
          <ol className="learning-loop">
            {[
              ['Learn', 'Clear, beginner-friendly lessons.'],
              ['Practice', 'Fresh questions and focused drills.'],
              ['Analyze', 'See where performance needs work.'],
              ['Recover', 'Smart Recovery targets those skills.'],
              ['Simulate', 'Assessments and a full mock test readiness.'],
            ].map(([title, copy], index) => (
              <li key={title}><span>{index + 1}</span><strong>{title}</strong><p>{copy}</p></li>
            ))}
          </ol>
        </section>

        <section className="public-section" id="subjects" aria-labelledby="subjects-title">
          <div className="public-section__heading">
            <p className="eyebrow">Authoritative curriculum</p>
            <h2 id="subjects-title">Four CSE Professional subjects.</h2>
            <p>Build foundations across every subject tested by the platform.</p>
          </div>
          <div className="subject-showcase">
            {[
              ['N', 'Numerical Ability', 'Build confidence with quantities, operations, and practical problem solving.'],
              ['V', 'Verbal Ability', 'Strengthen vocabulary, grammar, sentence logic, and reading comprehension.'],
              ['A', 'Analytical Ability', 'Practice relationships, patterns, assumptions, and logical conclusions.'],
              ['G', 'General Information', 'Review Philippine government, civic knowledge, and public-service foundations.'],
            ].map(([mark, title, copy]) => (
              <article key={title}><span aria-hidden="true">{mark}</span><h3>{title}</h3><p>{copy}</p></article>
            ))}
          </div>
        </section>

        <section className="public-section public-feature-section" aria-labelledby="features-title">
          <div className="public-section__heading">
            <p className="eyebrow">What makes PasaWise useful</p>
            <h2 id="features-title">Real tools for deliberate preparation.</h2>
          </div>
          <div className="feature-showcase">
            {[
              ['Smart Analysis', 'Turn submitted practice into clear performance signals.'],
              ['Smart Recovery', 'Return to weak skills with focused recovery sets.'],
              ['Mistake Notebook', 'Keep useful explanations from questions you missed.'],
              ['CSE Readiness Score', 'See an explainable estimate based on submitted evidence.'],
              ['Subject Assessments', 'Measure each subject with structured assessment attempts.'],
              ['Full Mock Examination', 'Practice the complete examination flow in one simulation.'],
            ].map(([title, copy]) => (
              <article key={title}><h3>{title}</h3><p>{copy}</p></article>
            ))}
          </div>
        </section>

        <section className="public-section public-target-section" aria-label="CSE exam target">
          <CseExamTargetCard configuredDates={cseExamDates} />
          <div>
            <p className="eyebrow">Prepare with perspective</p>
            <h2>Keep the target visible. Keep today manageable.</h2>
            <p>PasaWise uses Philippine time and never invents or displays an expired target as a negative countdown.</p>
          </div>
        </section>

        <section className="public-final-cta" aria-labelledby="final-cta-title">
          <p className="eyebrow">Ready to prepare smarter?</p>
          <h2 id="final-cta-title">Return to the next right study step.</h2>
          {user !== null ? (
            <Link className="button-link" to="/dashboard">Open your dashboard</Link>
          ) : (
            <Link className="button-link" to="/login">Log in to PasaWise</Link>
          )}
        </section>
      </main>

      <footer className="public-footer">
        <div><PasaWiseBrand variant="header" /><p>Aral nang wais. Pasa nang handa.</p></div>
        <nav aria-label="Footer navigation"><a href="#how-it-works">How it works</a><Link to="/courses">CSE Professional</Link><Link to="/login">Login</Link></nav>
        <div className="public-system-status" aria-live="polite">
          <span className={`status-indicator status-indicator--${connection.status}`} />
          {connection.status === 'loading' && 'Checking platform status'}
          {connection.status === 'connected' && 'Platform available'}
          {connection.status === 'error' && `Platform status unavailable: ${connection.message}`}
        </div>
        <p className="public-disclaimer">PasaWise is an independent review platform and is not affiliated with the Civil Service Commission.</p>
      </footer>
    </div>
  )
}
