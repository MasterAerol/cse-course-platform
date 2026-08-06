import type { LessonBlock } from '../lib/api'
import { VisualTeachingBoard } from './VisualTeachingBoard'

interface LessonBlockRendererProps {
  block: LessonBlock
}

export function LessonBlockRenderer({ block }: LessonBlockRendererProps) {
  switch (block.type) {
    case 'heading':
      return <HeadingBlock block={block} />
    case 'paragraph':
      return <ParagraphBlock block={block} />
    case 'callout':
      return <CalloutBlock block={block} />
    case 'formula':
      return <FormulaBlock block={block} />
    case 'example':
      return <ExampleBlock block={block} />
    case 'image':
      return <ImageBlock block={block} />
    case 'video':
      return <VideoBlock block={block} />
    case 'divider':
      return <DividerBlock />
    case 'summary':
      return <SummaryBlock block={block} />
  }
}

function HeadingBlock({
  block,
}: {
  block: Extract<LessonBlock, { type: 'heading' }>
}) {
  const headingTags = {
    1: 'h1',
    2: 'h2',
    3: 'h3',
  } as const
  const Tag = headingTags[block.content.level]

  return <Tag className="lesson-heading-block">{block.content.text}</Tag>
}

function ParagraphBlock({
  block,
}: {
  block: Extract<LessonBlock, { type: 'paragraph' }>
}) {
  return <p className="lesson-paragraph-block">{block.content.text}</p>
}

function CalloutBlock({
  block,
}: {
  block: Extract<LessonBlock, { type: 'callout' }>
}) {
  return (
    <aside className={`lesson-callout lesson-callout--${block.content.variant}`}>
      <h3>{block.content.title}</h3>
      <p>{block.content.text}</p>
    </aside>
  )
}

function FormulaBlock({
  block,
}: {
  block: Extract<LessonBlock, { type: 'formula' }>
}) {
  return (
    <figure className="lesson-formula">
      <code>{block.content.expression}</code>
      <figcaption>{block.content.description}</figcaption>
    </figure>
  )
}

function ExampleBlock({
  block,
}: {
  block: Extract<LessonBlock, { type: 'example' }>
}) {
  return (
    <section className="lesson-example">
      <h3>{block.content.title}</h3>
      <p>{block.content.problem}</p>
      <ol>
        {block.content.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      {block.content.visual !== undefined && (
        <VisualTeachingBoard visual={block.content.visual} />
      )}
      <p>
        <strong>Answer:</strong> {block.content.answer}
      </p>
    </section>
  )
}

function ImageBlock({
  block,
}: {
  block: Extract<LessonBlock, { type: 'image' }>
}) {
  return (
    <figure className="lesson-image-block">
      <img src={block.content.src} alt={block.content.alt} />
      {block.content.caption !== undefined && (
        <figcaption>{block.content.caption}</figcaption>
      )}
    </figure>
  )
}

function VideoBlock({
  block,
}: {
  block: Extract<LessonBlock, { type: 'video' }>
}) {
  return (
    <section className="lesson-video-block">
      <h3>{block.content.title}</h3>
      <a href={block.content.url} target="_blank" rel="noreferrer">
        Open video
      </a>
    </section>
  )
}

function DividerBlock() {
  return <hr className="lesson-divider" />
}

function SummaryBlock({
  block,
}: {
  block: Extract<LessonBlock, { type: 'summary' }>
}) {
  return (
    <section className="lesson-summary-block">
      <h3>Lesson summary</h3>
      <ul>
        {block.content.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  )
}
