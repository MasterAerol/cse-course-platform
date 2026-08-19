import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useAuth } from '../auth/use-auth'
import { CurriculumSubject } from '../components/CurriculumSubject'
import { EnrollmentBadge } from '../components/EnrollmentBadge'
import { SubjectAssessmentCard } from '../components/SubjectAssessmentCard'
import type { StudentCourseCurriculum } from '../lib/curriculum.types'
import { LearnerTopbar } from '../components/LearnerTopbar'
import { PasaWisePageLoader } from '../components/PasaWiseLoader'
import { MockExamCard } from '../components/MockExamCard'
import { fetchCourseDetail, type CourseDetail } from '../lib/api'

type DetailState =
  | { status: 'loading' }
  | { status: 'loaded'; course: CourseDetail }
  | { status: 'error'; message: string }

type SubjectRoadmap = {
  totalTopics: number
  completedTopics: number
  completedRequiredLessons: number
  totalRequiredLessons: number
  progressPercent: number
  nextLessonTitle: string | null
  nextLessonPublicId: string | null
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Course details could not be loaded.'
}

function getSubjectRoadmap(subject: StudentCourseCurriculum['subjects'][number]): SubjectRoadmap {
  let completedRequiredLessons = 0
  let totalRequiredLessons = 0
  let completedTopics = 0

  let nextLessonTitle: string | null = null
  let nextLessonPublicId: string | null = null

  for (const topic of subject.topics) {
    const requiredLessons = topic.lessons.filter((lesson) => lesson.isRequired)
    const completedRequiredInTopic = requiredLessons.filter(
      (lesson) => lesson.progressStatus === 'completed',
    ).length

    completedRequiredLessons += completedRequiredInTopic
    totalRequiredLessons += requiredLessons.length

    if (
      requiredLessons.length > 0 &&
      requiredLessons.length === completedRequiredInTopic
    ) {
      completedTopics += 1
    }

    if (nextLessonTitle === null) {
      const lesson = topic.lessons.find(
        (value) =>
          value.isAccessible &&
          !value.isLocked &&
          value.progressStatus !== 'completed',
      )

      if (lesson !== undefined) {
        nextLessonTitle = lesson.title
        nextLessonPublicId = lesson.publicId
      }
    }
  }

  const progressPercent =
    totalRequiredLessons === 0
      ? 0
      : Math.round((completedRequiredLessons / totalRequiredLessons) * 100)

  return {
    totalTopics: subject.topics.length,
    completedTopics,
    completedRequiredLessons,
    totalRequiredLessons,
    progressPercent,
    nextLessonTitle,
    nextLessonPublicId,
  }
}

function getNextRecommendedLesson(
  subjects: StudentCourseCurriculum['subjects'],
): { title: string; publicId: string } | null {
  for (const subject of subjects) {
    for (const topic of subject.topics) {
      const lesson = topic.lessons.find(
        (value) =>
          value.isAccessible &&
          !value.isLocked &&
          value.progressStatus !== 'completed',
      )

      if (lesson !== undefined) {
        return { title: lesson.title, publicId: lesson.publicId }
      }
    }
  }

  return null
}

export function CourseDetailPage() {
  const { courseSlug } = useParams()
  const { user } = useAuth()
  const [state, setState] = useState<DetailState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()

    async function loadCourse(): Promise<void> {
      if (courseSlug === undefined) {
        setState({ status: 'error', message: 'Course slug is missing.' })
        return
      }

      try {
        const course = await fetchCourseDetail(courseSlug, controller.signal)
        setState({ status: 'loaded', course })
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          setState({ status: 'error', message: getErrorMessage(error) })
        }
      }
    }

    void loadCourse()

    return () => {
      controller.abort()
    }
  }, [courseSlug])

  if (state.status === 'loading') {
    return <PasaWisePageLoader label="Loading course details…" />
  }

  const nextLesson =
    state.status === 'loaded'
      ? getNextRecommendedLesson(state.course.curriculum)
      : null

  return (
    <main className="page-shell course-detail-page">
      <LearnerTopbar>
        <Link className="button-link button-link--secondary" to="/courses">
          Catalog
        </Link>
        {user === null ? (
          <Link className="button-link" to="/login">
            Sign in
          </Link>
        ) : (
          <Link className="button-link" to="/dashboard">
            Dashboard
          </Link>
        )}
      </LearnerTopbar>

      {state.status === 'error' && (
        <p className="form-error" role="alert">
          {state.message}
        </p>
      )}

      {state.status === 'loaded' && (
        <>
          <section className="page-header course-detail-header">
            <div className="card-heading-row">
              <p className="eyebrow">{state.course.level ?? 'Course'}</p>
              <EnrollmentBadge enrollment={state.course.enrollment} />
            </div>
            <h1>{state.course.title}</h1>
            <p className="course-detail-description">
              {state.course.description ?? state.course.shortDescription}
            </p>
            {user !== null && nextLesson !== null ? (
              <section className="course-detail-next-action">
                <p className="eyebrow">Recommended next</p>
                <h2>Continue where you left off</h2>
                <p className="course-detail-next-action__target">{nextLesson.title}</p>
                <Link
                  className="button-link"
                  to={`/courses/${state.course.slug}/lessons/${nextLesson.publicId}`}
                >
                  Open lesson
                </Link>
              </section>
            ) : null}
          </section>

          <section className="curriculum-panel">
            <div className="course-detail-section-head">
              <h2>Curriculum roadmap</h2>
              <p className="meta-copy">
                Follow the roadmap by subject and topic to finish your preparation.
              </p>
            </div>
            {state.course.curriculum.map((subject) => (
              <div key={subject.slug}>
                <CurriculumSubject
                  courseSlug={state.course.slug}
                  subject={subject}
                  subjectRoadmap={getSubjectRoadmap(subject)}
                />
                {state.course.subjectAssessments
                  .filter((assessment) => assessment.assessment.subjectSlug === subject.slug)
                  .map((assessment) => (
                    <SubjectAssessmentCard key={assessment.assessment.publicId} summary={assessment} />
                  ))}
              </div>
            ))}
            {state.course.slug === 'cse-professional' && user !== null && <MockExamCard />}
            {user === null && (
              <p className="meta-copy">
                Sign in with an enrolled account to open protected lessons.
              </p>
            )}
          </section>
        </>
      )}
    </main>
  )
}