#!/usr/bin/env node
import {spawnSync} from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import {resolveTeachingPublisher} from './lib/teaching-publisher-registry.mjs'
import {analyzeTeachingPlan,DEFAULT_CONTENT_BASE_URL,normalizePublisherPlan,resolveContentReleasePreflight,runTeachingReleasePipeline} from './lib/safe-teaching-release.mjs'
const LIVE=DEFAULT_CONTENT_BASE_URL
const bools=new Set(['codex','dry-run','allow-production-read','help']),values=new Set(['topic','message','confirm'])
function parse(argv){const out=new Map();for(let i=0;i<argv.length;i++){const raw=argv[i];if(!raw?.startsWith('--'))throw new Error(`Invalid argument near ${raw??'(end)'}.`);const key=raw.slice(2);if(!bools.has(key)&&!values.has(key))throw new Error(`Unknown option --${key}.`);if(out.has(key))throw new Error(`Duplicate --${key}.`);if(bools.has(key)){out.set(key,'true');continue}const value=argv[++i];if(!value||value.startsWith('--'))throw new Error(`Missing value for --${key}.`);out.set(key,value)}return out}
function run(command,args,env={}){const result=spawnSync(command,args,{encoding:'utf8',shell:false,windowsHide:true,env:{...process.env,...env}});if(result.error)throw result.error;if(result.status!==0)throw new Error(result.stderr||result.stdout||`${command} failed`);return result.stdout}
function npm(args){const execPath=process.env.npm_execpath;if(process.platform==='win32'){if(!execPath)throw new Error('npm_execpath unavailable.');return run(process.execPath,[execPath,...args])}return run('npm',args)}
function publisher(meta,args,env){return JSON.parse(run(process.execPath,[path.resolve(meta.script),...args],env).trim())}
function credentials(meta){const resolved=resolveContentReleasePreflight({meta,baseUrl:LIVE});return{email:resolved.email,baseUrl:resolved.baseUrl,env:{[meta.passwordEnv]:resolved.password}}}
function qaVerification(topicSlug){if(!process.env.CSE_QA_STUDENT_PASSWORD)return undefined;return()=>{run(process.execPath,[path.resolve('scripts/verify-qa-student-topic-access.mjs'),'--base-url',LIVE,'--qa-email','test@pasawise.com','--topic',topicSlug],{CSE_QA_STUDENT_PASSWORD:process.env.CSE_QA_STUDENT_PASSWORD});return{status:'passed',account:'test@pasawise.com',productionContentMutated:false}}}
async function main(){const args=parse(process.argv.slice(2));if(args.has('help')){console.log('Usage: npm.cmd run release:teaching -- --codex --topic average --message "Message" --confirm release-production');return}const meta=resolveTeachingPublisher(args.get('topic'));const message=args.get('message');if(!message)throw new Error('--message is required.');const dry=args.has('dry-run');if(!dry&&args.get('confirm')!=='release-production')throw new Error('--confirm release-production is required.');console.log(JSON.stringify({phase:'publisher-discovery',topic:meta.topicSlug,script:meta.script,dryRun:dry}))
 if(dry){npm(['run','release:safe','--','--message',message,'--dry-run']);if(!args.has('allow-production-read')){console.log('TEACHING RELEASE — DRY RUN PASS\nProduction validate-only skipped; add --allow-production-read with credentials to inspect production.');return}const auth=credentials(meta);const raw=publisher(meta,['--base-url',auth.baseUrl,'--email',auth.email,'--validate-only'],auth.env);const plan=normalizePublisherPlan(raw);console.log(JSON.stringify({dryRun:true,plan,safety:analyzeTeachingPlan(plan)},null,2));return}
 let auth
 const getAuth=()=>auth??=credentials(meta)
 const result=await runTeachingReleasePipeline({
  safeRelease:()=>npm(['run','release:safe','--',...(args.has('codex')?['--codex']:[]),'--message',message,'--confirm','release-production']),
  validate:()=>{const current=getAuth();return publisher(meta,['--base-url',current.baseUrl,'--email',current.email,'--validate-only'],current.env)},
  publish:(fingerprint)=>{const current=getAuth();const writeArgs=['--base-url',current.baseUrl,'--email',current.email,'--confirm',meta.confirmation];if(fingerprint)writeArgs.push('--approve-deletions',fingerprint);return publisher(meta,writeArgs,current.env)},
  inspect:meta.inspectorScript?()=>JSON.parse(run(process.execPath,[path.resolve(meta.inspectorScript)]).trim()):undefined,
  qaVerify:qaVerification(meta.topicSlug),
 })
 if(result.status==='content-review-required'){console.error('TEACHING_RELEASE_JSON');console.error(JSON.stringify({status:'content-review-required',topic:meta.topicSlug,application:'released',teachingContent:'BLOCKED',reason:result.safety.reason,deletions:result.firstPlan.deletions,productionContentWritePerformed:false},null,2));process.exitCode=2;return}
 if(result.status==='already-canonical'){console.log(`AUTOMATIC TEACHING RELEASE — PASS\nApplication released; teaching content already canonical.\nQA verification: ${result.qa.status}.\nLive: ${LIVE}`);console.log('TEACHING_RELEASE_JSON');console.log(JSON.stringify({status:result.status,topic:meta.topicSlug,application:'released',content:result,live:LIVE},null,2));return}
 console.log(`AUTOMATIC TEACHING RELEASE — PASS\nApplication released and healthy.\nTeaching content validated, published, inspected, and idempotent.\nQA verification: ${result.qa.status}.\nUnrelated topics modified: 0\nLive: ${LIVE}\nNEXT: Open the live lesson and visually review.`);console.log('TEACHING_RELEASE_JSON');console.log(JSON.stringify({status:result.status,topic:meta.topicSlug,application:'released',content:result,live:LIVE},null,2))
}
main().catch((error)=>{console.error(`TEACHING RELEASE BLOCKED\nReason: ${error instanceof Error?error.message:String(error)}`);process.exitCode=1})