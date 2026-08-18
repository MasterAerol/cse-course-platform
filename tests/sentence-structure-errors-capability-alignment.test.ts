import { describe, expect, it } from 'vitest'
import publisherSource from '../scripts/create-and-publish-sentence-structure-errors-teaching-system.mjs?raw'
import registrySource from '../scripts/lib/teaching-publisher-registry.mjs?raw'
import routeSource from '../src/worker/routes/admin/lesson-block.routes.ts?raw'
import serviceSource from '../src/worker/services/admin/admin-content.service.ts?raw'
import { classifyChangedFiles, validateDeploymentPolicy } from '../scripts/lib/safe-release.mjs'
import { resolveTeachingPublisher } from '../scripts/lib/teaching-publisher-registry.mjs'
const operation='sentence-structure-and-error-identification-teaching-system-v1'
describe('Sentence Structure capability alignment',()=>{
 it('aligns registry, publisher, route, service, credentials, and exact confirmation',()=>{expect(resolveTeachingPublisher('sentence-structure-and-error-identification')).toMatchObject({script:'scripts/create-and-publish-sentence-structure-errors-teaching-system.mjs',passwordEnv:'CSE_SENTENCE_STRUCTURE_ERRORS_ADMIN_PASSWORD',confirmation:'publish-sentence-structure-and-error-identification-teaching-system-v1',capabilityCheck:true});expect(registrySource).toContain("'sentence-structure-and-error-identification'");expect(publisherSource).toContain(`const operation='${operation}'`);expect(routeSource).toContain(`/${operation}/capability`);expect(routeSource).toContain(`/${operation}'`);expect(serviceSource).toContain(`operation: '${operation}'`)})
 it('requires deploy for runtime changes and rejects skip-deploy',()=>{const risk=classifyChangedFiles(['src/worker/routes/admin/lesson-block.routes.ts','scripts/create-and-publish-sentence-structure-errors-teaching-system.mjs']);expect(risk.deploymentRequired).toBe(true);expect(()=>validateDeploymentPolicy(risk,true)).toThrow('--skip-deploy is not permitted')})
})
