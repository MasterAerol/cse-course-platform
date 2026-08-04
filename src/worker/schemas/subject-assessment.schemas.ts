import { z } from 'zod'

const slug = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)

export const subjectAssessmentSlugParamsSchema = z
  .object({ assessmentSlug: slug })
  .strict()

export const subjectAssessmentAttemptParamsSchema = z
  .object({
    attemptPublicId: slug,
  })
  .strict()

export const subjectAssessmentAnswerParamsSchema =
  subjectAssessmentAttemptParamsSchema
    .extend({ snapshotPublicId: slug })
    .strict()

export const saveSubjectAssessmentAnswerSchema = z
  .object({ selectedChoicePublicId: slug })
  .strict()

export const subjectAssessmentTopicSlugSchema = slug
export const numericalAbilityTopicSlugSchema = subjectAssessmentTopicSlugSchema

const difficultySchema = z
  .object({
    easy: z.number().int().nonnegative(),
    medium: z.number().int().nonnegative(),
    hard: z.number().int().nonnegative(),
  })
  .strict()

const generatorConfigSchema = z
  .object({
    slug,
    version: z.number().int().positive(),
    rotationPosition: z.number().int().positive(),
    selectionWeight: z.number().int().positive(),
  })
  .strict()

const topicConfigSchema = z
  .object({
    topicSlug: subjectAssessmentTopicSlugSchema,
    topicTitle: z.string().trim().min(1).max(160),
    position: z.number().int().positive(),
    count: z.number().int().positive(),
    difficulty: difficultySchema,
    generators: z.array(generatorConfigSchema).min(1),
  })
  .strict()
  .superRefine((topic, context) => {
    if (
      topic.difficulty.easy +
        topic.difficulty.medium +
        topic.difficulty.hard !==
      topic.count
    ) {
      context.addIssue({
        code: 'custom',
        path: ['difficulty'],
        message: 'Difficulty counts must equal the topic question count.',
      })
    }
  })

export const subjectAssessmentBlueprintInputSchema = z
  .object({
    subjectSlug: z.enum(['numerical-ability', 'analytical-ability', 'verbal-ability', 'general-information']),
    version: z.number().int().positive(),
    totalQuestions: z.number().int().positive(),
    passingScorePercent: z.number().int().min(0).max(100),
    topics: z.array(topicConfigSchema).min(1),
  })
  .strict()
  .superRefine((blueprint, context) => {
    const topicTotal = blueprint.topics.reduce(
      (sum, topic) => sum + topic.count,
      0,
    )
    if (topicTotal !== blueprint.totalQuestions) {
      context.addIssue({
        code: 'custom',
        path: ['topics'],
        message: 'Topic counts must equal the blueprint total.',
      })
    }

    if (new Set(blueprint.topics.map((topic) => topic.topicSlug)).size !== blueprint.topics.length) {
      context.addIssue({
        code: 'custom',
        path: ['topics'],
        message: 'Blueprint topics must be unique.',
      })
    }
  })

export const adminSubjectAssessmentInputSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    slug,
    description: z.string().trim().min(1).max(1_000),
    position: z.number().int().positive(),
    passingScore: z.number().int().min(0).max(100),
    questionCount: z.number().int().positive(),
    maximumAttempts: z.number().int().positive().nullable(),
    timeLimitMinutes: z.number().int().positive().nullable(),
    showExplanations: z.boolean(),
    status: z.enum(['draft', 'published']),
    blueprint: subjectAssessmentBlueprintInputSchema,
    updatedAt: z.string().min(1).optional(),
  })
  .strict()

export type AdminSubjectAssessmentInput = z.infer<
  typeof adminSubjectAssessmentInputSchema
>
export type SubjectAssessmentBlueprintInput = z.infer<
  typeof subjectAssessmentBlueprintInputSchema
>
