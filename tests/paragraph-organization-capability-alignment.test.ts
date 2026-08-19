import { describe, expect, it } from 'vitest'
import publisherSource from '../scripts/create-and-publish-paragraph-organization-teaching-system.mjs?raw'
import registrySource from '../scripts/lib/teaching-publisher-registry.mjs?raw'
import routeSource from '../src/worker/routes/admin/lesson-block.routes.ts?raw'
import serviceSource from '../src/worker/services/admin/admin-content.service.ts?raw'
import { classifyChangedFiles, validateDeploymentPolicy } from '../scripts/lib/safe-release.mjs'
import { resolveTeachingPublisher } from '../scripts/lib/teaching-publisher-registry.mjs'
const operation='paragraph-organization-teaching-system-v1'
describe('Paragraph Organization capability alignment',()=>{
  it('aligns registry, publisher, route, service, credentials, and exact confirmation',()=>{expect(resolveTeachingPublisher('paragraph-organization')).toMatchObject({script:'scripts/create-and-publish-paragraph-organization-teaching-system.mjs',passwordEnv:'CSE_PARAGRAPH_ORGANIZATION_ADMIN_PASSWORD',confirmation:'publish-paragraph-organization-teaching-system-v1',capabilityCheck:true});expect(registrySource).toContain("'paragraph-organization'");expect(publisherSource).toContain(`const operation='${operation}'`);expect(routeSource).toContain(`/${operation}/capability`);expect(routeSource).toContain(`/${operation}'`);expect(serviceSource).toContain(`operation: '${operation}'`)})
  it('requires deploy for runtime changes and rejects skip-deploy',()=>{const risk=classifyChangedFiles(['src/worker/routes/admin/lesson-block.routes.ts','scripts/create-and-publish-paragraph-organization-teaching-system.mjs']);expect(risk.deploymentRequired).toBe(true);expect(()=>validateDeploymentPolicy(risk,true)).toThrow('--skip-deploy is not permitted')})
})
