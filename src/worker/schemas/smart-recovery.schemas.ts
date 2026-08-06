import { z } from 'zod'

export const smartRecoverySkillParamsSchema = z.object({
  skillSlug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
})
