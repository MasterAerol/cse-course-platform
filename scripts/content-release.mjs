import {spawnSync} from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import {pathToFileURL} from 'node:url'
import {resolveTeachingPublisher} from './lib/teaching-publisher-registry.mjs'
import {analyzeTeachingPlan,normalizePublisherPlan,resolveContentReleasePreflight,runContentReleasePipeline} from './lib/safe-teaching-release.mjs'

const booleanOptions=new Set(['codex','dry-run','help'])
const valueOptions=new Set(['topic','confirm','base-url','email'])

export function parseContentReleaseArgs(argv=process.argv.slice(2)){
 const result=new Map()
 for(let index=0;index<argv.length;index+=1){
  const token=argv[index]
  if(!token?.startsWith('--'))throw new Error(`Invalid argument near ${token??'(end)'}.`)
  const name=token.slice(2)
  if(!booleanOptions.has(name)&&!valueOptions.has(name))throw new Error(`Unknown option --${name}.`)
  if(result.has(name))throw new Error(`Duplicate --${name}.`)
  if(booleanOptions.has(name)){result.set(name,'true');continue}
  const value=argv[++index]
  if(!value||value.startsWith('--'))throw new Error(`Missing value for --${name}.`)
  result.set(name,value)
 }
 return result
}

function run(command,args,environment={}){const result=spawnSync(command,args,{encoding:'utf8',shell:false,windowsHide:true,env:{...process.env,...environment}});if(result.error)throw result.error;if(result.status!==0)throw new Error(result.stderr||result.stdout||`${command} failed`);return result.stdout}
function publisher(meta,args,environment){const output=run(process.execPath,[path.resolve(meta.script),...args],environment).trim();try{return JSON.parse(output)}catch{throw new Error('Publisher did not return machine-readable JSON.')}}
function qaVerification(baseUrl,topicSlug){if(!process.env.CSE_QA_STUDENT_PASSWORD)return undefined;return()=>{run(process.execPath,[path.resolve('scripts/verify-qa-student-topic-access.mjs'),'--base-url',baseUrl,'--qa-email','test@pasawise.com','--topic',topicSlug],{CSE_QA_STUDENT_PASSWORD:process.env.CSE_QA_STUDENT_PASSWORD});return{status:'passed',account:'test@pasawise.com',productionContentMutated:false}}}

export async function main(argv=process.argv.slice(2),environment=process.env){
 const args=parseContentReleaseArgs(argv)
 if(args.has('help')){console.log('Usage: npm.cmd run content:release -- --codex --topic average --confirm publish-content');return}
 const meta=resolveTeachingPublisher(args.get('topic'))
 const dryRun=args.has('dry-run')
 if(!dryRun&&args.get('confirm')!=='publish-content')throw new Error('--confirm publish-content is required.')
 const preflight=resolveContentReleasePreflight({meta,environment,explicitEmail:args.get('email'),baseUrl:args.get('base-url')})
 const publisherEnvironment={[meta.passwordEnv]:preflight.password}
 const validate=()=>publisher(meta,['--base-url',preflight.baseUrl,'--email',preflight.email,'--validate-only'],publisherEnvironment)
 console.log(JSON.stringify({phase:'content-preflight',topic:meta.topicSlug,baseUrl:preflight.baseUrl,codexMode:args.has('codex'),credentialsConfigured:true,passwordLogged:false}))
 if(dryRun){
  const plan=normalizePublisherPlan(validate())
  const safety=analyzeTeachingPlan(plan)
  console.log('CONTENT RELEASE — DRY RUN PASS')
  console.log('CONTENT_RELEASE_JSON')
  console.log(JSON.stringify({status:'dry-run',topic:meta.topicSlug,plan,safety,productionContentWritePerformed:false},null,2))
  return
 }
 const result=await runContentReleasePipeline({
  validate,
  publish:(fingerprint)=>{const writeArgs=['--base-url',preflight.baseUrl,'--email',preflight.email,'--confirm',meta.confirmation];if(fingerprint)writeArgs.push('--approve-deletions',fingerprint);return publisher(meta,writeArgs,publisherEnvironment)},
  inspect:meta.inspectorScript?()=>JSON.parse(run(process.execPath,[path.resolve(meta.inspectorScript)]).trim()):undefined,
  qaVerify:qaVerification(preflight.baseUrl,meta.topicSlug),
 })
 if(result.status==='content-review-required'){
  console.error('AUTOMATIC TEACHING RELEASE — CONTENT REVIEW REQUIRED')
  console.error(JSON.stringify({topic:meta.topicSlug,reason:result.safety.reason,deletions:result.firstPlan.deletions,productionContentWritePerformed:false},null,2))
  process.exitCode=2
  return
 }
 console.log('CONTENT RELEASE — PASS')
 console.log(`Topic: ${meta.topicSlug}`)
 console.log(`Result: ${result.status}`)
 console.log(`QA verification: ${result.qa.status}`)
 console.log(`Live: ${preflight.baseUrl}`)
 console.log('CONTENT_RELEASE_JSON')
 console.log(JSON.stringify({status:result.status,topic:meta.topicSlug,content:result,live:preflight.baseUrl,productionContentWritePerformed:result.status==='published'},null,2))
}

const direct=process.argv[1]!==undefined&&import.meta.url===pathToFileURL(process.argv[1]).href
if(direct)main().catch((error)=>{console.error(`AUTOMATIC RELEASE — BLOCKED\n\nReason:\n${error instanceof Error?error.message:String(error)}\n\nNo production content write performed.`);process.exitCode=1})
