import { z } from 'zod'

import {
  adminIdSchema,
  adminStatusSchema,
  adminUpdatedAtSchema,
  optionalTextSchema,
  positivePositionSchema,
  requiredTitleSchema,
} from './common.schemas'

export const lessonBlockTypeSchema = z.enum([
  'heading',
  'paragraph',
  'callout',
  'formula',
  'example',
  'illustrated-guided-teaching',
  'image',
  'video',
  'divider',
  'summary',
])

export const lessonBlockIdParamsSchema = z.object({
  blockId: adminIdSchema,
})

export const lessonBlockCreateSchema = z
  .object({
    blockType: lessonBlockTypeSchema,
    content: z.unknown(),
    position: positivePositionSchema.optional(),
  })
  .strict()

export const lessonBlockUpdateSchema = z
  .object({
    blockType: lessonBlockTypeSchema.optional(),
    content: z.unknown().optional(),
    position: positivePositionSchema.optional(),
  })
  .strict()
export const percentageGuidedTeachingRepairSchema = z
  .object({ content: z.unknown() })
  .strict()

export const percentageTeachingSystemReconcileSchema = z
  .object({
    blocks: z.array(z.object({
      blockType: lessonBlockTypeSchema,
      content: z.unknown(),
      position: positivePositionSchema,
    }).strict()).min(1).max(100),
  })
  .strict()
  .refine(
    (value) => value.blocks.every((block, index) => block.position === index + 1),
    { path: ['blocks'], message: 'Block positions must be consecutive and start at 1.' },
  )

export const fractionsTeachingSystemReconcileSchema =
  percentageTeachingSystemReconcileSchema

export const decimalsTeachingSystemReconcileSchema =
  percentageTeachingSystemReconcileSchema

export const ratioProportionTeachingSystemReconcileSchema =
  percentageTeachingSystemReconcileSchema
export const averageTeachingSystemReconcileSchema =
  percentageTeachingSystemReconcileSchema
export const numberProblemsTeachingSystemReconcileSchema =
  percentageTeachingSystemReconcileSchema
export const ageProblemsTeachingSystemReconcileSchema =
  percentageTeachingSystemReconcileSchema
export const workRateTeachingSystemReconcileSchema =
  percentageTeachingSystemReconcileSchema
export const distanceSpeedTimeTeachingSystemReconcileSchema =
  percentageTeachingSystemReconcileSchema
export const vocabularyWordMeaningTeachingSystemReconcileSchema =
  percentageTeachingSystemReconcileSchema
export const synonymsAntonymsTeachingSystemReconcileSchema =
  percentageTeachingSystemReconcileSchema
export const contextCluesTeachingSystemReconcileSchema =
  percentageTeachingSystemReconcileSchema
export const sentenceCompletionTeachingSystemReconcileSchema =
  percentageTeachingSystemReconcileSchema
export const simpleInterestTeachingSystemReconcileSchema =
  percentageTeachingSystemReconcileSchema

export const generatedDifficultyConfigSchema = z
  .object({
    easy: z.coerce.number().int().min(0).max(20).default(0),
    medium: z.coerce.number().int().min(0).max(20).default(0),
    hard: z.coerce.number().int().min(0).max(20).default(0),
  })
  .strict()
  .refine(
    (value) => value.easy + value.medium + value.hard > 0,
    'At least one generated question is required.',
  )

export const practiceSetIdParamsSchema = z.object({
  practiceSetId: adminIdSchema,
})

export const practiceQuestionIdParamsSchema = z.object({
  practiceQuestionId: adminIdSchema,
})

export const practiceSetInputSchema = z
  .object({
    title: requiredTitleSchema,
    instructions: optionalTextSchema(2_000),
    passingScore: z.coerce.number().int().min(0).max(100),
    questionCount: z.coerce.number().int().positive().max(100),
    maximumAttempts: z.coerce.number().int().positive().nullable().optional(),
    showExplanations: z.boolean().default(true),
    status: adminStatusSchema.default('draft'),
    questionSource: z.enum(['fixed', 'generated']).default('fixed'),
    generatorSlug: z.string().trim().min(1).optional(),
    generatorVersion: z.coerce.number().int().positive().optional(),
    difficulty: generatedDifficultyConfigSchema.optional(),
    updatedAt: adminUpdatedAtSchema.optional(),
  })
  .superRefine((value, context) => {
    if (
      value.questionSource === 'generated' &&
      value.difficulty !== undefined &&
      value.difficulty.easy + value.difficulty.medium + value.difficulty.hard !==
        value.questionCount
    ) {
      context.addIssue({
        code: 'custom',
        path: ['difficulty'],
        message:
          'Easy, medium, and hard counts must equal the total question count.',
      })
    }
  })
  .strict()

const fixedChoiceInputSchema = z
  .object({
    id: z.number().int().positive().optional(),
    text: z.string().trim().min(1).max(500),
    isCorrect: z.boolean(),
    position: positivePositionSchema,
  })
  .strict()

export const fixedQuestionInputSchema = z
  .object({
    prompt: z.string().trim().min(1).max(2_000),
    explanation: optionalTextSchema(2_000),
    points: z.coerce.number().int().positive().max(100),
    position: positivePositionSchema,
    status: z.enum(['active', 'archived']).default('active'),
    choices: z.array(fixedChoiceInputSchema).length(4),
    updatedAt: adminUpdatedAtSchema.optional(),
  })
  .strict()
  .refine(
    (value) => value.choices.filter((choice) => choice.isCorrect).length === 1,
    {
      path: ['choices'],
      message: 'Exactly one choice must be correct.',
    },
  )
  .refine(
    (value) =>
      new Set(value.choices.map((choice) => choice.text.toLowerCase())).size ===
      value.choices.length,
    {
      path: ['choices'],
      message: 'Choice text must be unique.',
    },
  )
  .refine(
    (value) =>
      new Set(value.choices.map((choice) => choice.position)).size ===
      value.choices.length,
    {
      path: ['choices'],
      message: 'Choice positions must be unique.',
    },
  )

export const quizIdParamsSchema = z.object({
  quizId: adminIdSchema,
})

export const quizQuestionIdParamsSchema = z.object({
  questionId: adminIdSchema,
})

export const quizInputSchema = z
  .object({
    title: requiredTitleSchema,
    description: optionalTextSchema(2_000),
    quizType: z.enum(['lesson', 'topic', 'subject', 'mock']).default('lesson'),
    passingScore: z.coerce.number().int().min(0).max(100),
    timeLimitMinutes: z.coerce.number().int().positive().nullable().optional(),
    maximumAttempts: z.coerce.number().int().positive().nullable().optional(),
    shuffleQuestions: z.boolean().default(false),
    shuffleChoices: z.boolean().default(false),
    showExplanations: z.boolean().default(true),
    status: adminStatusSchema.default('draft'),
    updatedAt: adminUpdatedAtSchema.optional(),
  })
  .strict()

export const quizQuestionInputSchema = fixedQuestionInputSchema.extend({
  questionType: z.enum(['multiple_choice', 'true_false']).default('multiple_choice'),
})

export const auditLogFilterSchema = z.object({
  action: z.string().trim().max(80).optional(),
  entityType: z.string().trim().max(80).optional(),
  actor: z.coerce.number().int().positive().optional(),
  from: z.string().trim().max(40).optional(),
  to: z.string().trim().max(40).optional(),
  limit: z.coerce.number().int().positive().max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
})

export type LessonBlockCreateInput = z.infer<typeof lessonBlockCreateSchema>
export type LessonBlockUpdateInput = z.infer<typeof lessonBlockUpdateSchema>
export type PercentageTeachingSystemReconcileInput = z.infer<typeof percentageTeachingSystemReconcileSchema>
export type FractionsTeachingSystemReconcileInput = z.infer<typeof fractionsTeachingSystemReconcileSchema>
export type DecimalsTeachingSystemReconcileInput = z.infer<typeof decimalsTeachingSystemReconcileSchema>
export type RatioProportionTeachingSystemReconcileInput = z.infer<typeof ratioProportionTeachingSystemReconcileSchema>
export type AverageTeachingSystemReconcileInput = z.infer<typeof averageTeachingSystemReconcileSchema>
export type NumberProblemsTeachingSystemReconcileInput = z.infer<typeof numberProblemsTeachingSystemReconcileSchema>
export type AgeProblemsTeachingSystemReconcileInput = z.infer<typeof ageProblemsTeachingSystemReconcileSchema>
export type WorkRateTeachingSystemReconcileInput = z.infer<typeof workRateTeachingSystemReconcileSchema>
export type DistanceSpeedTimeTeachingSystemReconcileInput = z.infer<typeof distanceSpeedTimeTeachingSystemReconcileSchema>
export type SimpleInterestTeachingSystemReconcileInput = z.infer<typeof simpleInterestTeachingSystemReconcileSchema>
export type VocabularyWordMeaningTeachingSystemReconcileInput = z.infer<typeof vocabularyWordMeaningTeachingSystemReconcileSchema>
export type SynonymsAntonymsTeachingSystemReconcileInput = z.infer<typeof synonymsAntonymsTeachingSystemReconcileSchema>
export type ContextCluesTeachingSystemReconcileInput = z.infer<typeof contextCluesTeachingSystemReconcileSchema>
export type SentenceCompletionTeachingSystemReconcileInput = z.infer<typeof sentenceCompletionTeachingSystemReconcileSchema>
export type PracticeSetInput = z.infer<typeof practiceSetInputSchema>
export type FixedQuestionInput = z.infer<typeof fixedQuestionInputSchema>
export type QuizInput = z.infer<typeof quizInputSchema>
export type QuizQuestionInput = z.infer<typeof quizQuestionInputSchema>
export type AuditLogFilterInput = z.infer<typeof auditLogFilterSchema>


