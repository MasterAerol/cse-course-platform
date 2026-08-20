import { describe, expect, it } from 'vitest'
import { resolveTeachingPublisher } from '../scripts/lib/teaching-publisher-registry.mjs'
import { app } from '../src/worker/index'
import { classifyChangedFiles } from '../scripts/lib/safe-release.mjs'
import routes from '../src/worker/routes/admin/lesson-block.routes.ts?raw'
import service from '../src/worker/services/admin/admin-content.service.ts?raw'
import sharedPublisher from '../scripts/lib/general-information-teaching-system-publisher.mjs?raw'
import packageJson from '../package.json'
import publisher from '../scripts/create-and-publish-philippine-constitution-teaching-system.mjs?raw'

describe('Philippine Constitution Teaching Release capability',()=>{
  it('adds one shared, restricted, atomic General Information capability',()=>{
    expect(routes).toContain('/lessons/:lessonId/general-information-teaching-system-v1/capability')
    expect(routes).toContain('/lessons/:lessonId/general-information-teaching-system-v1')
    expect(service).toContain("'philippine-constitution-fundamentals'")
    expect(service).toContain("subject?.slug !== 'general-information'")
    expect(service).toContain('reconcileTeachingSystemLessonBlocksWithAudit')
    expect(service).toContain('GENERAL_INFORMATION_TEACHING_SYSTEM_TARGET_MISMATCH')
    const runtimeRoutes=app.routes.map(({method,path})=>({method,path}))
    expect(runtimeRoutes).toEqual(expect.arrayContaining([
      {method:'GET',path:'/api/admin/lessons/:lessonId/general-information-teaching-system-v1/capability'},
      {method:'PUT',path:'/api/admin/lessons/:lessonId/general-information-teaching-system-v1'},
    ]))
    expect(sharedPublisher).toContain("endpointSlug: 'general-information-teaching-system-v1'")
  })
  it('makes the production build fail if either shared General Information route is absent',()=>{
    expect(packageJson.scripts.build).toContain('verify-worker-route-bundle.mjs')
  })
  it('registers exact confirmation and secure credential policy',()=>{
    expect(resolveTeachingPublisher('philippineConstitution')).toMatchObject({
      topicSlug:'philippine-constitution-fundamentals',
      script:'scripts/create-and-publish-philippine-constitution-teaching-system.mjs',
      passwordEnv:'CSE_PHILIPPINE_CONSTITUTION_ADMIN_PASSWORD',
      confirmation:'publish-philippine-constitution-fundamentals-teaching-system-v1',
      capabilityCheck:true,
    })
    expect(publisher).not.toMatch(/password\s*=\s*['"][^'"]+['"]/u)
  })
  it('requires Worker deployment before the first General Information reconciliation',()=>{
    const risk=classifyChangedFiles([
      'src/worker/routes/admin/lesson-block.routes.ts',
      'src/worker/services/admin/admin-content.service.ts',
      'scripts/create-and-publish-philippine-constitution-teaching-system.mjs',
    ])
    expect(risk.deploymentRequired).toBe(true)
    expect(risk.publisherRequired).toBe(true)
  })
})
