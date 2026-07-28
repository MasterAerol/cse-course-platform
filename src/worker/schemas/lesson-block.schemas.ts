import { z } from 'zod'

interface BaseLessonBlock {
  id: number
  position: number
}

const headingContentSchema = z
  .object({
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    text: z.string().min(1).max(180),
  })
  .strict()

const paragraphContentSchema = z
  .object({
    text: z.string().min(1).max(2_000),
  })
  .strict()

const calloutContentSchema = z
  .object({
    variant: z.enum(['info', 'important', 'warning']),
    title: z.string().min(1).max(120),
    text: z.string().min(1).max(1_000),
  })
  .strict()

const formulaContentSchema = z
  .object({
    expression: z.string().min(1).max(240),
    description: z.string().min(1).max(500),
  })
  .strict()

const exampleContentSchema = z
  .object({
    title: z.string().min(1).max(160),
    problem: z.string().min(1).max(1_000),
    steps: z.array(z.string().min(1).max(500)).min(1).max(12),
    answer: z.string().min(1).max(500),
  })
  .strict()

const imageContentSchema = z
  .object({
    src: z.string().min(1).max(500),
    alt: z.string().min(1).max(240),
    caption: z.string().min(1).max(500).optional(),
  })
  .strict()

const videoContentSchema = z
  .object({
    provider: z.enum(['external']),
    url: z.string().url().max(1_000),
    title: z.string().min(1).max(180),
  })
  .strict()

const dividerContentSchema = z.object({}).strict()

const summaryContentSchema = z
  .object({
    items: z.array(z.string().min(1).max(300)).min(1).max(12),
  })
  .strict()

export type LessonBlock =
  | (BaseLessonBlock & {
      type: 'heading'
      content: z.infer<typeof headingContentSchema>
    })
  | (BaseLessonBlock & {
      type: 'paragraph'
      content: z.infer<typeof paragraphContentSchema>
    })
  | (BaseLessonBlock & {
      type: 'callout'
      content: z.infer<typeof calloutContentSchema>
    })
  | (BaseLessonBlock & {
      type: 'formula'
      content: z.infer<typeof formulaContentSchema>
    })
  | (BaseLessonBlock & {
      type: 'example'
      content: z.infer<typeof exampleContentSchema>
    })
  | (BaseLessonBlock & {
      type: 'image'
      content: z.infer<typeof imageContentSchema>
    })
  | (BaseLessonBlock & {
      type: 'video'
      content: z.infer<typeof videoContentSchema>
    })
  | (BaseLessonBlock & {
      type: 'divider'
      content: z.infer<typeof dividerContentSchema>
    })
  | (BaseLessonBlock & {
      type: 'summary'
      content: z.infer<typeof summaryContentSchema>
    })

export type LessonBlockType = LessonBlock['type']

const schemasByBlockType = {
  heading: headingContentSchema,
  paragraph: paragraphContentSchema,
  callout: calloutContentSchema,
  formula: formulaContentSchema,
  example: exampleContentSchema,
  image: imageContentSchema,
  video: videoContentSchema,
  divider: dividerContentSchema,
  summary: summaryContentSchema,
} satisfies Record<LessonBlockType, z.ZodType>

export function validateLessonBlockContent(
  blockType: LessonBlockType,
  content: unknown,
): z.infer<(typeof schemasByBlockType)[LessonBlockType]> {
  return schemasByBlockType[blockType].parse(content)
}

export interface LessonBlockParseResult {
  block: LessonBlock | null
  malformed: boolean
}

export function parseLessonBlock(input: {
  id: number
  blockType: string
  contentJson: string
  position: number
}): LessonBlockParseResult {
  const blockType = input.blockType as LessonBlockType
  const schema = schemasByBlockType[blockType]

  if (schema === undefined) {
    return { block: null, malformed: true }
  }

  let parsedJson: unknown

  try {
    parsedJson = JSON.parse(input.contentJson)
  } catch {
    return { block: null, malformed: true }
  }

  const content = schema.safeParse(parsedJson)

  if (!content.success) {
    return { block: null, malformed: true }
  }

  return {
    block: {
      id: input.id,
      position: input.position,
      type: blockType,
      content: content.data,
    } as LessonBlock,
    malformed: false,
  }
}
