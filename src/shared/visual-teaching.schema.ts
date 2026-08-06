import { z } from 'zod'

export const visualTokenSchema = z
  .object({
    text: z.string().min(1).max(80),
    emphasis: z
      .enum(['normal', 'highlight', 'circled', 'crossed', 'final'])
      .optional(),
  })
  .strict()

export const visualStageSchema = z
  .object({
    label: z.string().min(1).max(80),
    expression: z.array(visualTokenSchema).min(1).max(16),
    annotation: z.string().min(1).max(160).optional(),
  })
  .strict()

export const visualTransitionSchema = z
  .object({
    label: z.string().min(1).max(80),
    whatChanged: z.string().min(1).max(240),
    why: z.string().min(1).max(500),
    source: z.string().min(1).max(240),
    arrow: z.enum(['straight', 'curved']),
    movement: z.enum(['left', 'right', 'down']).optional(),
  })
  .strict()

export const visualMemoryTipSchema = z
  .object({
    title: z.string().min(1).max(100),
    rule: z.string().min(1).max(300),
    reason: z.string().min(1).max(500),
    examples: z.array(z.string().min(1).max(160)).min(1).max(8),
  })
  .strict()

export const visualTeachingSchema = z
  .object({
    kind: z.enum([
      'transformation',
      'decimal-movement',
      'fraction-equivalence',
      'ratio-scaling',
      'average-sharing',
      'rate-table',
      'formula-choice',
    ]),
    ariaLabel: z.string().min(1).max(240),
    stages: z.array(visualStageSchema).min(2).max(8),
    transitions: z.array(visualTransitionSchema).min(1).max(7),
    memoryTip: visualMemoryTipSchema,
  })
  .strict()
  .superRefine((visual, context) => {
    if (visual.transitions.length !== visual.stages.length - 1) {
      context.addIssue({
        code: 'custom',
        message: 'Provide exactly one transition between each pair of stages.',
        path: ['transitions'],
      })
    }
  })

export type VisualTeaching = z.infer<typeof visualTeachingSchema>