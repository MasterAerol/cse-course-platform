import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import {
  CourseForm,
  LessonBlockEditor,
  LessonForm,
  SimpleEntityForm,
} from '../../components/admin/AdminForms'
import { AdminPageHeader, StatusBadge } from '../../components/admin/AdminUi'
import {
  createAdminLesson,
  createAdminLessonBlock,
  createAdminPracticeQuestion,
  createAdminQuizQuestion,
  createAdminSubject,
  createAdminTopic,
  deleteAdminLessonBlock,
  fetchAdminCourseDetail,
  fetchAdminLessonBlocks,
  fetchAdminPracticeGenerators,
  fetchAdminPracticeSet,
  fetchAdminQuiz,
  moveAdminLesson,
  moveAdminLessonBlock,
  moveAdminPracticeQuestion,
  moveAdminQuizQuestion,
  moveAdminSubject,
  moveAdminTopic,
  saveAdminPracticeSet,
  saveAdminQuiz,
  updateAdminCourse,
  updateAdminLesson,
  updateAdminPracticeQuestion,
  updateAdminQuizQuestion,
  updateAdminSubject,
  updateAdminTopic,
  type AdminCourse,
  type AdminFixedQuestionInput,
  type AdminLesson,
  type AdminLessonBlock,
  type AdminPracticeGenerator,
  type AdminPracticeQuestion,
  type AdminPracticeSet,
  type AdminQuiz,
  type AdminQuizQuestion,
  type AdminSubject,
  type AdminTopic,
  ApiClientError,
} from '../../lib/api'
import {
  getPracticeEditorVisibility,
  type PracticeQuestionSource,
} from './practice-editor-visibility'

type BuilderState =
  | { status: 'loading' }
  | {
      status: 'loaded'
      course: AdminCourse
      subjects: AdminSubject[]
    }
  | { status: 'error'; message: string }

type AssessmentState =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'practice'
      practiceSet: AdminPracticeSet | null
      questions: AdminPracticeQuestion[]
    }
  | {
      status: 'quiz'
      quiz: AdminQuiz | null
      questions: AdminQuizQuestion[]
    }
  | { status: 'error'; message: string }

type PageMessage =
  | { kind: 'success'; text: string }
  | { kind: 'error'; text: string }

function parseCourseId(value: string | undefined): number | null {
  if (value === undefined || !/^\d+$/.test(value)) {
    return null
  }
  return Number(value)
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

function getAdminMutationErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'LESSON_TYPE_CHANGE_BLOCKED') {
      return 'Lesson type changes are blocked after a lesson has content or attempts. Keep the existing lesson type and retry.'
    }

    if (error.code === 'PUBLISH_VALIDATION_FAILED') {
      return error.message
    }
  }

  return getErrorMessage(error, 'Admin change could not be saved.')
}

export function AdminCourseBuilderPage() {
  const params = useParams()
  const courseId = parseCourseId(params.courseId)
  const [state, setState] = useState<BuilderState>({ status: 'loading' })
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null)
  const [blocks, setBlocks] = useState<AdminLessonBlock[]>([])
  const [assessmentState, setAssessmentState] = useState<AssessmentState>({
    status: 'idle',
  })
  const [message, setMessage] = useState<PageMessage | null>(null)

  const selectedLesson = useMemo(() => {
    if (state.status !== 'loaded' || selectedLessonId === null) {
      return null
    }

    for (const subject of state.subjects) {
      for (const topic of subject.topics) {
        const lesson = topic.lessons.find((item) => item.id === selectedLessonId)
        if (lesson !== undefined) {
          return lesson
        }
      }
    }

    return null
  }, [selectedLessonId, state])

  const loadCourse = useCallback(async (signal?: AbortSignal): Promise<void> => {
    if (courseId === null) {
      setState({ status: 'error', message: 'Invalid course id.' })
      return
    }

    try {
      const detail = await fetchAdminCourseDetail(courseId, signal)
      setState({
        status: 'loaded',
        course: detail.course,
        subjects: detail.subjects,
      })
    } catch (error) {
      if (signal?.aborted) {
        return
      }
      setState({
        status: 'error',
        message: getErrorMessage(error, 'Course could not be loaded.'),
      })
    }
  }, [courseId])

  const reloadLessonAssets = useCallback(async (
    lesson: AdminLesson | null,
  ): Promise<void> => {
    await Promise.resolve()
    setBlocks([])
    setAssessmentState({ status: 'idle' })

    if (lesson === null) {
      return
    }

    if (lesson.lessonType === 'reading') {
      setBlocks(await fetchAdminLessonBlocks(lesson.id))
      return
    }

    setAssessmentState({ status: 'loading' })
    if (lesson.lessonType === 'practice') {
      const response = await fetchAdminPracticeSet(lesson.id)
      setAssessmentState({
        status: 'practice',
        practiceSet: response.practiceSet,
        questions: response.questions,
      })
      return
    }

    const response = await fetchAdminQuiz(lesson.id)
    setAssessmentState({
      status: 'quiz',
      quiz: response.quiz,
      questions: response.questions,
    })
  }, [])

  async function afterMutation(success: string): Promise<void> {
    setMessage({ kind: 'success', text: success })
    await loadCourse()
    await reloadLessonAssets(selectedLesson)
  }

  function runMutation(operation: () => Promise<void>): void {
    setMessage(null)
    operation().catch((error: unknown) =>
      setMessage({
        kind: 'error',
        text: getAdminMutationErrorMessage(error),
      }),
    )
  }

  useEffect(() => {
    const controller = new AbortController()
    void Promise.resolve().then(() => loadCourse(controller.signal))
    return () => controller.abort()
  }, [loadCourse])

  useEffect(() => {
    void Promise.resolve()
      .then(() => reloadLessonAssets(selectedLesson))
      .catch((error: unknown) =>
        setAssessmentState({
          status: 'error',
          message: getErrorMessage(error, 'Lesson assets could not be loaded.'),
        }),
      )
  }, [reloadLessonAssets, selectedLesson])

  if (state.status === 'loading') {
    return (
      <main className="admin-page">
        <p>Loading course builder…</p>
      </main>
    )
  }

  if (state.status === 'error') {
    return (
      <main className="admin-page">
        <p className="form-error" role="alert">
          {state.message}
        </p>
      </main>
    )
  }

  return (
    <main className="admin-page">
      <AdminPageHeader
        title={state.course.title}
        description="Build the course hierarchy and safely publish content."
        actions={
          <Link className="button-link button-link--secondary" to="/admin/courses">
            Back to courses
          </Link>
        }
      />
      {message !== null && (
        <p
          className={message.kind === 'error' ? 'form-error' : 'form-success'}
          role="status"
        >
          {message.text}
        </p>
      )}

      <section className="admin-panel">
        <h2>Course settings</h2>
        <CourseForm
          course={state.course}
          onSubmit={(input) =>
            runMutation(async () => {
              await updateAdminCourse(state.course.id, {
                ...input,
                updatedAt: state.course.updatedAt,
              })
              await afterMutation('Course saved.')
            })
          }
        />
      </section>

      <section className="admin-builder-grid">
        <div className="admin-panel">
          <h2>Curriculum tree</h2>
          <SimpleEntityForm
            label="Subject"
            onSubmit={(input) =>
              runMutation(async () => {
                await createAdminSubject(state.course.id, input)
                await afterMutation('Subject created.')
              })
            }
          />
          {state.subjects.map((subject) => (
            <SubjectNode
              key={subject.id}
              subject={subject}
              selectedLessonId={selectedLessonId}
              onSelectLesson={setSelectedLessonId}
              onMoveSubject={(direction) =>
                runMutation(async () => {
                  await moveAdminSubject(subject.id, direction)
                  await afterMutation('Subject reordered.')
                })
              }
              onStatusSubject={(status) =>
                runMutation(async () => {
                  await updateAdminSubject(subject.id, {
                    title: subject.title,
                    slug: subject.slug,
                    description: subject.description,
                    status,
                    updatedAt: subject.updatedAt,
                  })
                  await afterMutation('Subject status saved.')
                })
              }
              onCreateTopic={(input) =>
                runMutation(async () => {
                  await createAdminTopic(subject.id, input)
                  await afterMutation('Topic created.')
                })
              }
              onMoveTopic={(topic, direction) =>
                runMutation(async () => {
                  await moveAdminTopic(topic.id, direction)
                  await afterMutation('Topic reordered.')
                })
              }
              onStatusTopic={(topic, status) =>
                runMutation(async () => {
                  await updateAdminTopic(topic.id, {
                    title: topic.title,
                    slug: topic.slug,
                    description: topic.description,
                    status,
                    updatedAt: topic.updatedAt,
                  })
                  await afterMutation('Topic status saved.')
                })
              }
              onCreateLesson={(topic, input) =>
                runMutation(async () => {
                  const created = await createAdminLesson(topic.id, input)
                  setSelectedLessonId(created.id)
                  await afterMutation('Lesson created.')
                })
              }
              onMoveLesson={(lesson, direction) =>
                runMutation(async () => {
                  await moveAdminLesson(lesson.id, direction)
                  await afterMutation('Lesson reordered.')
                })
              }
              onStatusLesson={(lesson, status) =>
                runMutation(async () => {
                  await updateAdminLesson(lesson.id, {
                    status,
                    updatedAt: lesson.updatedAt,
                  })
                  await afterMutation('Lesson status saved.')
                })
              }
            />
          ))}
        </div>

        <div className="admin-panel">
          <h2>Selected lesson</h2>
          {selectedLesson === null ? (
            <p>Select a lesson from the curriculum tree.</p>
          ) : (
            <LessonInspector
              lesson={selectedLesson}
              blocks={blocks}
              assessmentState={assessmentState}
              onCreateBlock={(input) =>
                runMutation(async () => {
                  await createAdminLessonBlock(selectedLesson.id, input)
                  setBlocks(await fetchAdminLessonBlocks(selectedLesson.id))
                  setMessage({ kind: 'success', text: 'Block added.' })
                })
              }
              onMoveBlock={(blockId, direction) =>
                runMutation(async () => {
                  await moveAdminLessonBlock(blockId, direction)
                  setBlocks(await fetchAdminLessonBlocks(selectedLesson.id))
                  setMessage({ kind: 'success', text: 'Block reordered.' })
                })
              }
              onDeleteBlock={(blockId) =>
                runMutation(async () => {
                  await deleteAdminLessonBlock(blockId)
                  setBlocks(await fetchAdminLessonBlocks(selectedLesson.id))
                  setMessage({ kind: 'success', text: 'Block deleted.' })
                })
              }
              onReloadAssessment={() => reloadLessonAssets(selectedLesson)}
            />
          )}
        </div>
      </section>
    </main>
  )
}

function SubjectNode({
  subject,
  selectedLessonId,
  onSelectLesson,
  onMoveSubject,
  onStatusSubject,
  onCreateTopic,
  onMoveTopic,
  onStatusTopic,
  onCreateLesson,
  onMoveLesson,
  onStatusLesson,
}: {
  subject: AdminSubject
  selectedLessonId: number | null
  onSelectLesson: (lessonId: number) => void
  onMoveSubject: (direction: 'up' | 'down') => void
  onStatusSubject: (status: 'draft' | 'published' | 'archived') => void
  onCreateTopic: Parameters<typeof SimpleEntityForm>[0]['onSubmit']
  onMoveTopic: (topic: AdminTopic, direction: 'up' | 'down') => void
  onStatusTopic: (
    topic: AdminTopic,
    status: 'draft' | 'published' | 'archived',
  ) => void
  onCreateLesson: (topic: AdminTopic, input: Parameters<typeof LessonForm>[0]['onSubmit'] extends (input: infer Input) => void ? Input : never) => void
  onMoveLesson: (lesson: AdminLesson, direction: 'up' | 'down') => void
  onStatusLesson: (
    lesson: AdminLesson,
    status: 'draft' | 'published' | 'archived',
  ) => void
}) {
  return (
    <article className="admin-tree-node">
      <header>
        <div>
          <h3>
            {subject.position}. {subject.title}
          </h3>
          <StatusBadge status={subject.status} />
        </div>
        <AdminActions
          onMove={onMoveSubject}
          onStatus={onStatusSubject}
          status={subject.status}
        />
      </header>
      <SimpleEntityForm label="Topic" onSubmit={onCreateTopic} />
      {subject.topics.map((topic) => (
        <section className="admin-tree-node admin-tree-node--nested" key={topic.id}>
          <header>
            <div>
              <h4>
                {topic.position}. {topic.title}
              </h4>
              <StatusBadge status={topic.status} />
            </div>
            <AdminActions
              onMove={(direction) => onMoveTopic(topic, direction)}
              onStatus={(status) => onStatusTopic(topic, status)}
              status={topic.status}
            />
          </header>
          <LessonForm onSubmit={(input) => onCreateLesson(topic, input)} />
          {topic.lessons.map((lesson) => (
            <article
              className={
                selectedLessonId === lesson.id
                  ? 'admin-row admin-row--selected'
                  : 'admin-row'
              }
              key={lesson.id}
            >
              <button
                className="admin-link-button"
                type="button"
                onClick={() => onSelectLesson(lesson.id)}
              >
                {lesson.position}. {lesson.title} ({lesson.lessonType})
              </button>
              <div className="button-row">
                <StatusBadge status={lesson.status} />
                <button type="button" onClick={() => onMoveLesson(lesson, 'up')}>
                  Up
                </button>
                <button type="button" onClick={() => onMoveLesson(lesson, 'down')}>
                  Down
                </button>
                <select
                  aria-label={`Status for ${lesson.title}`}
                  value={lesson.status}
                  onChange={(event) =>
                    onStatusLesson(
                      lesson,
                      event.target.value as 'draft' | 'published' | 'archived',
                    )
                  }
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </article>
          ))}
        </section>
      ))}
    </article>
  )
}

function AdminActions({
  status,
  onMove,
  onStatus,
}: {
  status: 'draft' | 'published' | 'archived'
  onMove: (direction: 'up' | 'down') => void
  onStatus: (status: 'draft' | 'published' | 'archived') => void
}) {
  return (
    <div className="button-row">
      <button type="button" onClick={() => onMove('up')}>
        Up
      </button>
      <button type="button" onClick={() => onMove('down')}>
        Down
      </button>
      <select
        aria-label="Status"
        value={status}
        onChange={(event) =>
          onStatus(event.target.value as 'draft' | 'published' | 'archived')
        }
      >
        <option value="draft">Draft</option>
        <option value="published">Published</option>
        <option value="archived">Archived</option>
      </select>
    </div>
  )
}

const defaultGeneratedPracticeSlugByLessonSlug: Record<string, string> = {
  'equivalent-fractions': 'equivalent-fractions',
  'simplifying-fractions': 'simplifying-fractions',
  'comparing-and-ordering-fractions': 'comparing-fractions',
  'adding-fractions': 'adding-fractions',
  'subtracting-fractions': 'subtracting-fractions',
  'multiplying-fractions': 'multiplying-fractions',
  'dividing-fractions': 'dividing-fractions',
}

function LessonInspector({
  lesson,
  blocks,
  assessmentState,
  onCreateBlock,
  onMoveBlock,
  onDeleteBlock,
  onReloadAssessment,
}: {
  lesson: AdminLesson
  blocks: AdminLessonBlock[]
  assessmentState: AssessmentState
  onCreateBlock: Parameters<typeof LessonBlockEditor>[0]['onCreate']
  onMoveBlock: Parameters<typeof LessonBlockEditor>[0]['onMove']
  onDeleteBlock: Parameters<typeof LessonBlockEditor>[0]['onDelete']
  onReloadAssessment: () => Promise<void>
}) {
  if (lesson.lessonType === 'reading') {
    return (
      <LessonBlockEditor
        lesson={lesson}
        blocks={blocks}
        onCreate={onCreateBlock}
        onMove={onMoveBlock}
        onDelete={onDeleteBlock}
      />
    )
  }

  if (assessmentState.status === 'loading') {
    return <p>Loading assessment editor…</p>
  }

  if (assessmentState.status === 'error') {
    return (
      <p className="form-error" role="alert">
        {assessmentState.message}
      </p>
    )
  }

  if (lesson.lessonType === 'practice' && assessmentState.status === 'practice') {
    return (
      <PracticeEditor
        key={`${lesson.id}-${assessmentState.practiceSet?.updatedAt ?? 'new'}`}
        lesson={lesson}
        practiceSet={assessmentState.practiceSet}
        questions={assessmentState.questions}
        onReload={onReloadAssessment}
      />
    )
  }

  if (lesson.lessonType === 'quiz' && assessmentState.status === 'quiz') {
    return (
      <QuizEditor
        lesson={lesson}
        quiz={assessmentState.quiz}
        questions={assessmentState.questions}
        onReload={onReloadAssessment}
      />
    )
  }

  return <p>Select a supported lesson type.</p>
}

function PracticeEditor({
  lesson,
  practiceSet,
  questions,
  onReload,
}: {
  lesson: AdminLesson
  practiceSet: AdminPracticeSet | null
  questions: AdminPracticeQuestion[]
  onReload: () => Promise<void>
}) {
  const [generators, setGenerators] = useState<AdminPracticeGenerator[]>([])
  const [generatorLoadError, setGeneratorLoadError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [status, setStatus] = useState(practiceSet?.status ?? 'draft')
  const [source, setSource] = useState<PracticeQuestionSource>(
    practiceSet?.questionSource ?? 'fixed',
  )
  const [instructions, setInstructions] = useState(
    practiceSet?.instructions ??
      'Answer five generated fraction questions. Review the explanation after each attempt.',
  )
  const [passingScore, setPassingScore] = useState(
    String(practiceSet?.passingScore ?? 60),
  )
  const [questionCount, setQuestionCount] = useState(
    String(practiceSet?.questionCount ?? 5),
  )
  const [maximumAttempts, setMaximumAttempts] = useState(
    practiceSet?.maximumAttempts === null ||
      practiceSet?.maximumAttempts === undefined
      ? ''
      : String(practiceSet.maximumAttempts),
  )
  const [showExplanations, setShowExplanations] = useState(
    practiceSet?.showExplanations ?? true,
  )
  const defaultGeneratorSlug =
    practiceSet?.generator?.slug ??
    defaultGeneratedPracticeSlugByLessonSlug[lesson.slug] ??
    'finding-percentage'
  const [generatorSlug, setGeneratorSlug] = useState(defaultGeneratorSlug)
  const [generatorVersion, setGeneratorVersion] = useState(
    String(practiceSet?.generator?.version ?? 1),
  )
  const [easyCount, setEasyCount] = useState(
    String(practiceSet?.generator?.difficulty.easy ?? 2),
  )
  const [mediumCount, setMediumCount] = useState(
    String(practiceSet?.generator?.difficulty.medium ?? 2),
  )
  const [hardCount, setHardCount] = useState(
    String(practiceSet?.generator?.difficulty.hard ?? 1),
  )
  const visibility = getPracticeEditorVisibility(source)
  const matchingGenerators = generators.filter(
    (generator) => generator.slug === generatorSlug,
  )
  const selectedGenerator = generators.find(
    (generator) =>
      generator.slug === generatorSlug &&
      generator.version === Number(generatorVersion),
  )
  const generatedDifficultyTotal =
    Number(easyCount) + Number(mediumCount) + Number(hardCount)

  useEffect(() => {
    const controller = new AbortController()

    fetchAdminPracticeGenerators(controller.signal)
      .then((items) => {
        setGenerators(items)
        setGeneratorLoadError(null)
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setGeneratorLoadError(
            getErrorMessage(error, 'Generator registry could not be loaded.'),
          )
        }
      })

    return () => controller.abort()
  }, [])

  function handleSourceChange(nextSource: PracticeQuestionSource): void {
    if (nextSource === source) {
      return
    }

    if (
      nextSource === 'generated' &&
      questions.length > 0 &&
      !window.confirm(
        'Switching to generated questions will hide the fixed-question editor for this practice set. Existing fixed questions stay saved but become inactive while generated mode is selected.',
      )
    ) {
      return
    }

    if (
      nextSource === 'fixed' &&
      practiceSet?.generator !== null &&
      practiceSet?.generator !== undefined &&
      !window.confirm(
        'Switching to fixed questions will remove the active generated configuration when you save. Continue?',
      )
    ) {
      return
    }

    setSource(nextSource)
  }

  function parseNonNegativeInteger(value: string, label: string): number {
    if (!/^\d+$/u.test(value)) {
      throw new Error(`${label} must be a nonnegative whole number.`)
    }

    return Number(value)
  }

  function parsePositiveInteger(value: string, label: string): number {
    const parsed = parseNonNegativeInteger(value, label)

    if (parsed < 1) {
      throw new Error(`${label} must be at least 1.`)
    }

    return parsed
  }

  function parseNullablePositiveInteger(
    value: string,
    label: string,
  ): number | null {
    if (value.trim() === '') {
      return null
    }

    return parsePositiveInteger(value, label)
  }

  async function handleSave(): Promise<void> {
    setFormError(null)

    try {
      const parsedPassingScore = parseNonNegativeInteger(
        passingScore,
        'Passing score',
      )
      const parsedQuestionCount = parsePositiveInteger(
        questionCount,
        'Total question count',
      )
      const parsedMaximumAttempts = parseNullablePositiveInteger(
        maximumAttempts,
        'Maximum attempts',
      )

      if (parsedPassingScore > 100) {
        throw new Error('Passing score must be between 0 and 100.')
      }

      if (source === 'generated') {
        const parsedEasy = parseNonNegativeInteger(easyCount, 'Easy count')
        const parsedMedium = parseNonNegativeInteger(
          mediumCount,
          'Medium count',
        )
        const parsedHard = parseNonNegativeInteger(hardCount, 'Hard count')
        const parsedGeneratorVersion = parsePositiveInteger(
          generatorVersion,
          'Generator version',
        )

        if (parsedEasy + parsedMedium + parsedHard !== parsedQuestionCount) {
          throw new Error(
            'Easy, medium, and hard counts must equal the total question count.',
          )
        }

        if (selectedGenerator === undefined) {
          throw new Error('Choose a supported generator and version.')
        }

        await saveAdminPracticeSet(lesson.id, {
          title: `${lesson.title} Practice`,
          instructions: instructions.trim() === '' ? null : instructions,
          passingScore: parsedPassingScore,
          questionCount: parsedQuestionCount,
          maximumAttempts: parsedMaximumAttempts,
          showExplanations,
          status,
          questionSource: source,
          generatorSlug,
          generatorVersion: parsedGeneratorVersion,
          difficulty: {
            easy: parsedEasy,
            medium: parsedMedium,
            hard: parsedHard,
          },
          updatedAt: practiceSet?.updatedAt,
        })
      } else {
        await saveAdminPracticeSet(lesson.id, {
          title: `${lesson.title} Practice`,
          instructions: instructions.trim() === '' ? null : instructions,
          passingScore: parsedPassingScore,
          questionCount: parsedQuestionCount,
          maximumAttempts: parsedMaximumAttempts,
          showExplanations,
          status,
          questionSource: source,
          updatedAt: practiceSet?.updatedAt,
        })
      }

      await onReload()
    } catch (error) {
      setFormError(getAdminMutationErrorMessage(error))
    }
  }

  return (
    <section className="admin-panel">
      <h3>Practice set: {lesson.title}</h3>
      <form
        className="admin-inline-form"
        onSubmit={(event) => {
          event.preventDefault()
          void handleSave()
        }}
      >
        {formError !== null && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}
        <label>
          Question source
          <select
            value={source}
            onChange={(event) =>
              handleSourceChange(event.target.value as PracticeQuestionSource)
            }
          >
            <option value="fixed">Fixed questions</option>
            <option value="generated">Generated questions</option>
          </select>
        </label>
        <label>
          Status
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as 'draft' | 'published' | 'archived')
            }
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label>
          Instructions
          <textarea
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            rows={3}
          />
        </label>
        <label>
          Passing score
          <input
            inputMode="numeric"
            value={passingScore}
            onChange={(event) => setPassingScore(event.target.value)}
          />
        </label>
        <label>
          Maximum attempts
          <input
            inputMode="numeric"
            placeholder="Blank means unlimited"
            value={maximumAttempts}
            onChange={(event) => setMaximumAttempts(event.target.value)}
          />
        </label>
        <label className="admin-checkbox-label">
          <input
            type="checkbox"
            checked={showExplanations}
            onChange={(event) => setShowExplanations(event.target.checked)}
          />
          Show explanations after submission
        </label>
        {visibility.showGeneratedConfiguration && (
          <section className="admin-preview-panel admin-generated-config">
            <h4>Generated Practice Configuration</h4>
            <p>
              Generated practice sets create questions automatically at attempt
              start. They do not require manually entered fixed questions.
            </p>
            {generatorLoadError !== null && (
              <p className="form-error" role="alert">
                {generatorLoadError}
              </p>
            )}
            <label>
              Generator slug
              <select
                value={generatorSlug}
                onChange={(event) => {
                  const nextSlug = event.target.value
                  const nextGenerator = generators.find(
                    (generator) => generator.slug === nextSlug,
                  )

                  setGeneratorSlug(nextSlug)
                  setGeneratorVersion(String(nextGenerator?.version ?? 1))
                }}
              >
                {generators.map((generator) => (
                  <option
                    key={`${generator.slug}-v${generator.version}`}
                    value={generator.slug}
                  >
                    {generator.title} ({generator.slug})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Generator version
              <select
                value={generatorVersion}
                onChange={(event) => setGeneratorVersion(event.target.value)}
              >
                {matchingGenerators.map((generator) => (
                  <option
                    key={`${generator.slug}-version-${generator.version}`}
                    value={generator.version}
                  >
                    v{generator.version}
                  </option>
                ))}
              </select>
            </label>
            <div className="admin-generated-grid">
              <label>
                Easy question count
                <input
                  inputMode="numeric"
                  value={easyCount}
                  onChange={(event) => setEasyCount(event.target.value)}
                />
              </label>
              <label>
                Medium question count
                <input
                  inputMode="numeric"
                  value={mediumCount}
                  onChange={(event) => setMediumCount(event.target.value)}
                />
              </label>
              <label>
                Hard question count
                <input
                  inputMode="numeric"
                  value={hardCount}
                  onChange={(event) => setHardCount(event.target.value)}
                />
              </label>
              <label>
                Total question count
                <input
                  inputMode="numeric"
                  value={questionCount}
                  onChange={(event) => setQuestionCount(event.target.value)}
                />
              </label>
            </div>
            <p>
              Difficulty total: {Number.isFinite(generatedDifficultyTotal)
                ? generatedDifficultyTotal
                : 'Invalid'}{' '}
              / configured total {questionCount}
            </p>
            {selectedGenerator !== undefined && (
              <p>
                Supported difficulties:{' '}
                {selectedGenerator.supportedDifficulties.join(', ')}
              </p>
            )}
          </section>
        )}
        <button type="submit">Save practice set</button>
      </form>
      {visibility.showFixedQuestionEditor && practiceSet === null ? (
        <p>Save the practice set before adding fixed questions.</p>
      ) : visibility.showFixedQuestionEditor && practiceSet !== null ? (
        <FixedQuestionManager
          label="practice"
          parentId={practiceSet.id}
          questions={questions}
          createQuestion={createAdminPracticeQuestion}
          moveQuestion={moveAdminPracticeQuestion}
          updateQuestion={updateAdminPracticeQuestion}
          onReload={onReload}
        />
      ) : (
        <div className="admin-preview-panel">
          <h4>Fixed practice questions hidden</h4>
          <p>
            This practice set uses generated questions. Manual fixed questions
            are not required and are not shown while generated mode is active.
          </p>
        </div>
      )}
    </section>
  )
}

function QuizEditor({
  lesson,
  quiz,
  questions,
  onReload,
}: {
  lesson: AdminLesson
  quiz: AdminQuiz | null
  questions: AdminQuizQuestion[]
  onReload: () => Promise<void>
}) {
  const [status, setStatus] = useState(quiz?.status ?? 'draft')

  return (
    <section className="admin-panel">
      <h3>Quiz: {lesson.title}</h3>
      <form
        className="admin-inline-form"
        onSubmit={(event) => {
          event.preventDefault()
          void saveAdminQuiz(lesson.id, {
            title: `${lesson.title} Quiz`,
            description: quiz?.description ?? null,
            quizType: 'topic',
            passingScore: quiz?.passingScore ?? 70,
            timeLimitMinutes: quiz?.timeLimitMinutes ?? null,
            maximumAttempts: quiz?.maximumAttempts ?? null,
            shuffleQuestions: quiz?.shuffleQuestions ?? false,
            shuffleChoices: quiz?.shuffleChoices ?? false,
            showExplanations: true,
            status,
            updatedAt: quiz?.updatedAt,
          }).then(onReload)
        }}
      >
        <label>
          Status
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as 'draft' | 'published' | 'archived')
            }
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <button type="submit">Save quiz</button>
      </form>
      {quiz === null ? (
        <p>Save the quiz before adding fixed questions.</p>
      ) : (
        <FixedQuestionManager
          label="quiz"
          parentId={quiz.id}
          questions={questions}
          createQuestion={createAdminQuizQuestion}
          moveQuestion={moveAdminQuizQuestion}
          updateQuestion={updateAdminQuizQuestion}
          onReload={onReload}
        />
      )}
    </section>
  )
}

function FixedQuestionManager({
  label,
  parentId,
  questions,
  createQuestion,
  moveQuestion,
  updateQuestion,
  onReload,
}: {
  label: 'practice' | 'quiz'
  parentId: number
  questions: Array<AdminPracticeQuestion | AdminQuizQuestion>
  createQuestion: (
    parentId: number,
    input: AdminFixedQuestionInput,
  ) => Promise<AdminPracticeQuestion | AdminQuizQuestion>
  moveQuestion: (questionId: number, direction: 'up' | 'down') => Promise<boolean>
  updateQuestion: (
    questionId: number,
    input: AdminFixedQuestionInput,
  ) => Promise<AdminPracticeQuestion | AdminQuizQuestion>
  onReload: () => Promise<void>
}) {
  return (
    <div className="admin-preview-panel">
      <h4>Fixed {label} questions</h4>
      <FixedQuestionForm
        onSubmit={(input) =>
          createQuestion(parentId, input).then(() => onReload())
        }
        nextPosition={questions.length + 1}
      />
      {questions.map((question) => (
        <article className="admin-row" key={question.id}>
          <div>
            <strong>
              {question.position}. {question.prompt}
            </strong>
            <StatusBadge status={question.status} />
            <ol>
              {question.choices.map((choice) => (
                <li key={choice.id}>
                  {choice.text}
                  {choice.isCorrect ? ' ✓' : ''}
                </li>
              ))}
            </ol>
          </div>
          <div className="button-row">
            <button
              type="button"
              onClick={() => {
                void moveQuestion(question.id, 'up')
                  .then(() => onReload())
                  .catch(() => undefined)
              }}
            >
              Up
            </button>
            <button
              type="button"
              onClick={() => {
                void moveQuestion(question.id, 'down')
                  .then(() => onReload())
                  .catch(() => undefined)
              }}
            >
              Down
            </button>
            <button
              type="button"
              onClick={() => {
                void updateQuestion(question.id, {
                  prompt: question.prompt,
                  explanation: question.explanation,
                  points: question.points,
                  position: question.position,
                  status: question.status === 'active' ? 'archived' : 'active',
                  updatedAt: question.updatedAt,
                  choices: question.choices.map((choice) => ({
                    id: choice.id,
                    text: choice.text,
                    isCorrect: choice.isCorrect,
                    position: choice.position,
                  })),
                })
                  .then(() => onReload())
                  .catch(() => undefined)
              }}
            >
              {question.status === 'active' ? 'Archive' : 'Restore'}
            </button>
          </div>
        </article>
      ))}
    </div>
  )
}

function FixedQuestionForm({
  nextPosition,
  onSubmit,
}: {
  nextPosition: number
  onSubmit: (input: AdminFixedQuestionInput) => Promise<unknown>
}) {
  const [prompt, setPrompt] = useState('')
  const [choices, setChoices] = useState(['', '', '', ''])
  const [correctIndex, setCorrectIndex] = useState(0)

  return (
    <form
      className="admin-inline-form"
      onSubmit={(event) => {
        event.preventDefault()
        void onSubmit({
          prompt,
          explanation: null,
          points: 1,
          position: nextPosition,
          status: 'active',
          choices: choices.map((choice, index) => ({
            text: choice,
            isCorrect: index === correctIndex,
            position: index + 1,
          })),
        })
          .then(() => {
            setPrompt('')
            setChoices(['', '', '', ''])
            setCorrectIndex(0)
          })
          .catch(() => undefined)
      }}
    >
      <label>
        Prompt
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          required
        />
      </label>
      {choices.map((choice, index) => (
        <label key={index}>
          Choice {index + 1}
          <input
            value={choice}
            onChange={(event) => {
              const next = [...choices]
              next[index] = event.target.value
              setChoices(next)
            }}
            required
          />
          <input
            checked={correctIndex === index}
            name="correct-choice"
            onChange={() => setCorrectIndex(index)}
            type="radio"
          />
          Correct
        </label>
      ))}
      <button type="submit">Add fixed question</button>
    </form>
  )
}
