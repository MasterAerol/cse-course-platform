import fs from 'node:fs'

import {describe,expect,it} from 'vitest'

import {main,parseContentReleaseArgs} from '../scripts/content-release.mjs'
import {resolveTeachingPublisher} from '../scripts/lib/teaching-publisher-registry.mjs'
import {DEFAULT_CONTENT_BASE_URL,resolveContentReleasePreflight,runContentReleasePipeline,runTeachingReleasePipeline,validateContentBaseUrl} from '../scripts/lib/safe-teaching-release.mjs'

type JsonResult=Record<string,unknown>
type ContentOperations=Parameters<typeof runContentReleasePipeline>[0]

const pending:JsonResult={topicSlug:'average',lessonCount:12,writesRequired:true,totals:{blocksCreated:0,blocksUpdated:2,blocksDeleted:0},unrelatedTopicsModified:0}
const canonical:JsonResult={topicSlug:'average',lessonCount:12,writeRequired:false,updated:false,totals:{blocksCreated:0,blocksUpdated:0,blocksDeleted:0},unrelatedTopicsModified:0}
const written:JsonResult={topicSlug:'average',updated:true,totals:{blocksCreated:0,blocksUpdated:2,blocksDeleted:0},unrelatedTopicsModified:0}
function next(values:JsonResult[]){const value=values.shift();if(value===undefined)throw new Error('mock response queue exhausted');return value}
function contentOperations(overrides:Partial<ContentOperations>={}){const validations=[pending,pending,canonical];const publications=[written,canonical];const calls:string[]=[];const operations:ContentOperations={validate:()=>{calls.push('validate');return next(validations)},publish:(fingerprint)=>{calls.push(`publish:${fingerprint??'none'}`);return next(publications)},...overrides};return{calls,operations}}

describe('Content Release Workflow',()=>{
 it('exposes the requested package command',()=>{const pkg:unknown=JSON.parse(fs.readFileSync('package.json','utf8'));if(pkg===null||typeof pkg!=='object'||!('scripts' in pkg)||pkg.scripts===null||typeof pkg.scripts!=='object')throw new Error('package scripts missing');expect((pkg.scripts as Record<string,unknown>)['content:release']).toBe('node scripts/content-release.mjs')})

 it('publishes to the canonical production origin by default',()=>{expect(DEFAULT_CONTENT_BASE_URL).toBe('https://pasawise.com')})

 it('resolves standard credentials before the legacy password',()=>{const meta=resolveTeachingPublisher('average');const result=resolveContentReleasePreflight({meta,environment:{CSE_CONTENT_ADMIN_EMAIL:'admin@example.com',CSE_CONTENT_ADMIN_PASSWORD:'shared',CSE_AVERAGE_ADMIN_PASSWORD:'legacy'}});expect(result).toEqual({email:'admin@example.com',password:'shared',passwordEnv:'CSE_AVERAGE_ADMIN_PASSWORD',baseUrl:DEFAULT_CONTENT_BASE_URL})})

 it('supports a legacy topic password and explicit safe email fallback',()=>{const meta=resolveTeachingPublisher('average');const result=resolveContentReleasePreflight({meta,environment:{CSE_AVERAGE_ADMIN_PASSWORD:'legacy'},explicitEmail:'admin@example.com'});expect(result.email).toBe('admin@example.com');expect(result.password).toBe('legacy')})

 it('blocks missing credentials without exposing a value',()=>{const meta=resolveTeachingPublisher('average');expect(()=>resolveContentReleasePreflight({meta,environment:{}})).toThrow('Production content release credentials are not configured');expect(()=>resolveContentReleasePreflight({meta,environment:{CSE_CONTENT_ADMIN_EMAIL:'admin@example.com'}})).toThrow('No production content write performed')})

 it('blocks the Codex content command before publisher execution when secrets are absent',async()=>{await expect(main(['--codex','--topic','average','--confirm','publish-content'],{})).rejects.toThrow('Production content release credentials are not configured')})

 it('accepts only a credential-free HTTPS origin',()=>{expect(validateContentBaseUrl(`${DEFAULT_CONTENT_BASE_URL}/`)).toBe(DEFAULT_CONTENT_BASE_URL);expect(()=>validateContentBaseUrl('http://example.com')).toThrow('HTTPS origin');expect(()=>validateContentBaseUrl('https://user:pass@example.com')).toThrow('without credentials');expect(()=>validateContentBaseUrl('https://example.com/path')).toThrow('without credentials')})

 it('keeps Codex mode noninteractive and rejects password CLI arguments',()=>{expect(parseContentReleaseArgs(['--codex','--topic','average','--confirm','publish-content'])).toEqual(new Map([['codex','true'],['topic','average'],['confirm','publish-content']]));expect(()=>parseContentReleaseArgs(['--password','secret-value'])).toThrow('Unknown option --password')})

 it('runs content-only publication without a Git or deployment phase',async()=>{const fixture=contentOperations();const result=await runContentReleasePipeline(fixture.operations);expect(result.status).toBe('published');expect(fixture.calls).toEqual(['validate','validate','publish:none','validate','publish:none'])})

 it.each([{flag:'migrationRequired',reason:'migration_required'},{flag:'dbRepairRequired',reason:'db_repair_required'}])('blocks $flag before content write',async({flag,reason})=>{let writes=0;const blocked={...pending,[flag]:true};const result=await runContentReleasePipeline(contentOperations({validate:()=>blocked,publish:()=>{writes+=1;return canonical}}).operations);expect(result.status).toBe('content-review-required');expect(result.safety).toMatchObject({allowed:false,reason});expect(writes).toBe(0)})

 it('stops invalid admin authentication before any content write',async()=>{let writes=0;const fixture=contentOperations({validate:()=>{throw new Error('HTTP 401 invalid admin authentication')},publish:()=>{writes+=1;return canonical}});await expect(runContentReleasePipeline(fixture.operations)).rejects.toThrow('HTTP 401');expect(writes).toBe(0)})

 it('runs Safe Release before the same shared content pipeline',async()=>{const fixture=contentOperations();const calls:string[]=[];await runTeachingReleasePipeline({...fixture.operations,safeRelease:()=>{calls.push('safe-release')},validate:()=>{calls.push('validate');return canonical}});expect(calls).toEqual(['safe-release','validate'])})
})
