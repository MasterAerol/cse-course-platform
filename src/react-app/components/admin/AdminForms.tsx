import { useState } from 'react'

import { LessonBlockRenderer } from '../LessonBlockRenderer'
import type {
  AdminCourse,
  AdminCourseInput,
  AdminLesson,
  AdminLessonBlock,
  AdminLessonBlockInput,
  AdminLessonInput,
  AdminSubjectInput,
  LessonBlock,
} from '../../lib/api'

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function CourseForm({
  course,
  onSubmit,
}: {
  course?: AdminCourse
  onSubmit: (input: AdminCourseInput) => void
}) {
  const [title, setTitle] = useState(course?.title ?? '')
  const [slug, setSlug] = useState(course?.slug ?? '')
  const [description, setDescription] = useState(course?.description ?? '')
  const [status, setStatus] = useState<NonNullable<AdminCourseInput['status']>>(
    course?.status ?? 'draft',
  )

  return (
    <form
      className="admin-form"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit({
          title,
          slug: slug || slugify(title),
          description,
          shortDescription: course?.shortDescription ?? null,
          level: course?.level ?? null,
          thumbnailKey: course?.thumbnailKey ?? null,
          accessDurationDays: course?.accessDurationDays ?? null,
          status,
          updatedAt: course?.updatedAt,
        })
      }}
    >
      <label htmlFor="course-title">Title</label>
      <input
        id="course-title"
        value={title}
        onChange={(event) => {
          setTitle(event.target.value)
          if (course === undefined) {
            setSlug(slugify(event.target.value))
          }
        }}
        required
      />
      <label htmlFor="course-slug">Slug</label>
      <input
        id="course-slug"
        value={slug}
        onChange={(event) => setSlug(event.target.value)}
        required
      />
      <label htmlFor="course-description">Description</label>
      <textarea
        id="course-description"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />
      <label htmlFor="course-status">Status</label>
      <select
        id="course-status"
        value={status}
        onChange={(event) =>
          setStatus(
            event.target.value as NonNullable<AdminCourseInput['status']>,
          )
        }
      >
        <option value="draft">Draft</option>
        <option value="published">Published</option>
        <option value="archived">Archived</option>
      </select>
      <button type="submit">{course === undefined ? 'Create course' : 'Save course'}</button>
    </form>
  )
}

export function SimpleEntityForm({
  label,
  onSubmit,
}: {
  label: string
  onSubmit: (input: AdminSubjectInput) => void
}) {
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')

  return (
    <form
      className="admin-inline-form"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit({
          title,
          slug: slug || slugify(title),
          status: 'draft',
        })
        setTitle('')
        setSlug('')
      }}
    >
      <label>
        {label} title
        <input
          value={title}
          onChange={(event) => {
            setTitle(event.target.value)
            setSlug(slugify(event.target.value))
          }}
          required
        />
      </label>
      <label>
        Slug
        <input
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          required
        />
      </label>
      <button type="submit">Create {label.toLowerCase()}</button>
    </form>
  )
}

export function LessonForm({
  onSubmit,
}: {
  onSubmit: (input: AdminLessonInput) => void
}) {
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [lessonType, setLessonType] =
    useState<NonNullable<AdminLessonInput['lessonType']>>('reading')

  return (
    <form
      className="admin-inline-form"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit({
          title,
          slug: slug || slugify(title),
          lessonType,
          status: 'draft',
          isPreview: false,
          requiresPrevious: true,
        })
        setTitle('')
        setSlug('')
      }}
    >
      <label>
        Lesson title
        <input
          value={title}
          onChange={(event) => {
            setTitle(event.target.value)
            setSlug(slugify(event.target.value))
          }}
          required
        />
      </label>
      <label>
        Slug
        <input
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          required
        />
      </label>
      <label>
        Type
        <select
          value={lessonType}
          onChange={(event) =>
            setLessonType(event.target.value as typeof lessonType)
          }
        >
          <option value="reading">Reading</option>
          <option value="practice">Practice</option>
          <option value="quiz">Quiz</option>
        </select>
      </label>
      <button type="submit">Create lesson</button>
    </form>
  )
}

export function LessonBlockEditor({
  lesson,
  blocks,
  onCreate,
  onMove,
  onDelete,
}: {
  lesson: AdminLesson | null
  blocks: AdminLessonBlock[]
  onCreate: (input: AdminLessonBlockInput) => void
  onMove: (blockId: number, direction: 'up' | 'down') => void
  onDelete: (blockId: number) => void
}) {
  const [type, setType] = useState<AdminLessonBlockInput['blockType']>('heading')
  const [text, setText] = useState('')
  const [items, setItems] = useState('')

  if (lesson === null) {
    return <p>Select a lesson to edit blocks.</p>
  }

  function buildContent(): unknown {
    if (type === 'heading') {
      return { level: 2, text }
    }

    if (type === 'paragraph') {
      return { text }
    }

    if (type === 'formula') {
      return { expression: text, description: 'Admin-authored formula.' }
    }

    if (type === 'example') {
      return {
        title: 'Example',
        problem: text,
        steps: items.split('\n').filter(Boolean),
        answer: 'See solution.',
      }
    }

    if (type === 'summary') {
      return { items: items.split('\n').filter(Boolean) }
    }

    if (type === 'callout') {
      return { variant: 'info', title: 'Note', text }
    }

    if (type === 'image') {
      return { src: text, alt: 'Admin preview image', caption: '' }
    }

    if (type === 'video') {
      return { provider: 'external', url: text, title: 'Admin preview video' }
    }

    return {}
  }

  return (
    <section className="admin-panel">
      <h2>Lesson blocks: {lesson.title}</h2>
      <form
        className="admin-inline-form"
        onSubmit={(event) => {
          event.preventDefault()
          onCreate({ blockType: type, content: buildContent() })
          setText('')
          setItems('')
        }}
      >
        <label>
          Block type
          <select
            value={type}
            onChange={(event) =>
              setType(event.target.value as AdminLessonBlockInput['blockType'])
            }
          >
            <option value="heading">Heading</option>
            <option value="paragraph">Paragraph</option>
            <option value="callout">Callout</option>
            <option value="formula">Formula</option>
            <option value="example">Example</option>
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="divider">Divider</option>
            <option value="summary">Summary</option>
          </select>
        </label>
        {type !== 'divider' && (
          <label>
            Main text / URL / expression
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              required={type !== 'summary'}
            />
          </label>
        )}
        {(type === 'example' || type === 'summary') && (
          <label>
            Steps or summary items, one per line
            <textarea
              value={items}
              onChange={(event) => setItems(event.target.value)}
              required
            />
          </label>
        )}
        <button type="submit">Add block</button>
      </form>
      <div className="admin-preview-panel">
        <p className="eyebrow">Admin preview</p>
        {blocks.length === 0 ? (
          <p>No blocks yet.</p>
        ) : (
          blocks.map((block) => (
            <article className="admin-row" key={block.id}>
              <div className="admin-block-preview">
                <strong>
                  {block.position}. {block.type}
                </strong>
                <LessonBlockRenderer block={block as LessonBlock} />
              </div>
              <div className="button-row">
                <button type="button" onClick={() => onMove(block.id, 'up')}>
                  Move up
                </button>
                <button type="button" onClick={() => onMove(block.id, 'down')}>
                  Move down
                </button>
                <button type="button" onClick={() => onDelete(block.id)}>
                  Delete
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
