import { describe, expect, it } from 'vitest'
import publisherSource from '../scripts/create-and-publish-pronouns-modifiers-teaching-system.mjs?raw'
import registrySource from '../scripts/lib/teaching-publisher-registry.mjs?raw'
import routeSource from '../src/worker/routes/admin/lesson-block.routes.ts?raw'
import serviceSource from '../src/worker/services/admin/admin-content.service.ts?raw'
import { classifyChangedFiles, validateDeploymentPolicy } from '../scripts/lib/safe-release.mjs'
import { resolveTeachingPublisher } from '../scripts/lib/teaching-publisher-registry.mjs'
import { runTeachingReleasePipeline } from '../scripts/lib/safe-teaching-release.mjs'

const operation='pronouns-and-modifiers-teaching-system-v1'
const capabilityPath=`/lessons/:lessonId/${operation}/capability`
const reconciliationPath=`/lessons/:lessonId/${operation}`
const plan={topicSlug:'pronouns-and-modifiers',lessonCount:12,writesRequired:true,totals:{blocksCreated:0,blocksUpdated:122,blocksDeleted:0},unrelatedTopicsModified:0}
const canonical={topicSlug:'pronouns-and-modifiers',lessonCount:12,writeRequired:false,updated:false,totals:{blocksCreated:0,blocksUpdated:0,blocksDeleted:0},unrelatedTopicsModified:0}
const published={topicSlug:'pronouns-and-modifiers',updated:true,totals:{blocksCreated:0,blocksUpdated:122,blocksDeleted:0},unrelatedTopicsModified:0}

describe('Pronouns and Modifiers capability alignment',()=>{
  it('resolves the authoritative registry entry and credential policy',()=>{expect(resolveTeachingPublisher('pronouns-and-modifiers')).toMatchObject({topicSlug:'pronouns-and-modifiers',script:'scripts/create-and-publish-pronouns-modifiers-teaching-system.mjs',passwordEnv:'CSE_PRONOUNS_MODIFIERS_ADMIN_PASSWORD',confirmation:'publish-pronouns-modifiers-teaching-system-v1',capabilityCheck:true});expect(registrySource).toContain("'pronouns-and-modifiers'")})
  it('keeps publisher capability and reconciliation paths identical to the Worker routes',()=>{expect(routeSource).toContain(`'${capabilityPath}'`);expect(routeSource).toContain(`'${reconciliationPath}'`);expect(publisherSource).toContain(`/${operation}/capability`);expect(publisherSource).toContain(`/${operation}`);expect(serviceSource).toContain(`operation: '${operation}'`)})
  it('forces deployment for Worker route changes and rejects skip-deploy',()=>{const risk=classifyChangedFiles(['src/worker/routes/admin/lesson-block.routes.ts','scripts/create-and-publish-pronouns-modifiers-teaching-system.mjs']);expect(risk).toMatchObject({deploymentRequired:true,runtimeFiles:['src/worker/routes/admin/lesson-block.routes.ts']});expect(()=>validateDeploymentPolicy(risk,true)).toThrow('--skip-deploy is not permitted')})
  it('runs capability only after deploy/health and allows validation after a valid capability',async()=>{const calls:string[]=[];const validations=[plan,plan,canonical];const publications=[published,canonical];const result=await runTeachingReleasePipeline({safeRelease:()=>{calls.push('deploy-health')},verifyCapability:()=>{calls.push('capability');return{supported:true}},validate:()=>{calls.push('validate');return validations.shift()!},publish:()=>{calls.push('publish');return publications.shift()!},inspect:()=>({allMatch:true})});expect(result.status).toBe('published');expect(calls.slice(0,3)).toEqual(['deploy-health','capability','validate'])})
  it('blocks a capability 404 before validation or production mutation',async()=>{let validated=false;let publishedCalled=false;await expect(runTeachingReleasePipeline({safeRelease:()=>undefined,verifyCapability:()=>{throw new Error('404 NOT_FOUND capability')},validate:()=>{validated=true;return plan},publish:()=>{publishedCalled=true;return published}})).rejects.toThrow('404 NOT_FOUND capability');expect(validated).toBe(false);expect(publishedCalled).toBe(false)})
  it('keeps deletion safety fail-closed',async()=>{let publishedCalled=false;const unsafe={...plan,deletionPlanFingerprint:'fp',deletions:[{learnerContentAssessment:'requires-human-review'}],totals:{blocksCreated:0,blocksUpdated:122,blocksDeleted:1}};const result=await runTeachingReleasePipeline({safeRelease:()=>undefined,verifyCapability:()=>({supported:true}),validate:()=>unsafe,publish:()=>{publishedCalled=true;return published}});expect(result.status).toBe('content-review-required');expect(publishedCalled).toBe(false)})
})
