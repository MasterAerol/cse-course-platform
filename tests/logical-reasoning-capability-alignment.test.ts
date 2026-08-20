import { describe, expect, it } from 'vitest'
import { resolveTeachingPublisher } from '../scripts/lib/teaching-publisher-registry.mjs'
import { classifyChangedFiles, validateDeploymentPolicy } from '../scripts/lib/safe-release.mjs'
import routes from '../src/worker/routes/admin/lesson-block.routes.ts?raw'
import service from '../src/worker/services/admin/admin-content.service.ts?raw'
import publisher from '../scripts/create-and-publish-logical-reasoning-teaching-system.mjs?raw'
describe('Logical Reasoning Teaching Release capability', () => {
  it('uses the shared Analytical capability and atomic reconciliation route', () => {
    expect(routes).toContain('/lessons/:lessonId/analytical-teaching-system-v1/capability')
    expect(routes).toContain('/lessons/:lessonId/analytical-teaching-system-v1')
    expect(service).toContain("'logical-reasoning-fundamentals'")
    expect(service).toContain("subject?.slug !== 'analytical-ability'")
    expect(service).toContain('reconcileTeachingSystemLessonBlocksWithAudit')
    expect(service).toContain('ANALYTICAL_TEACHING_SYSTEM_TARGET_MISMATCH')
  })
  it('registers the exact confirmation and secure credential policy', () => {
    const resolved = resolveTeachingPublisher('logicalReasoning')
    expect(resolved).toMatchObject({
      topicSlug:'logical-reasoning-fundamentals',
      script:'scripts/create-and-publish-logical-reasoning-teaching-system.mjs',
      passwordEnv:'CSE_LOGICAL_REASONING_ADMIN_PASSWORD',
      confirmation:'publish-logical-reasoning-fundamentals-teaching-system-v1',
      capabilityCheck:true,
    })
    expect(publisher).not.toMatch(/password\s*=\s*['"][^'"]+['"]/u)
  })
  it('classifies shared Worker runtime changes as deployment-required', () => {
    const risk = classifyChangedFiles(['src/worker/routes/admin/lesson-block.routes.ts','scripts/create-and-publish-logical-reasoning-teaching-system.mjs'])
    expect(risk.deploymentRequired).toBe(true)
    expect(() => validateDeploymentPolicy(risk,true)).toThrow('--skip-deploy is not permitted')
  })
})
