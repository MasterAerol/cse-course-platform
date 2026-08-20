import { spawn } from 'node:child_process'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { readingComprehensionLessonSpecs } from '../scripts/lib/reading-comprehension-teaching-system-content.mjs'

interface StoredBlock { id:number; type:string; content:unknown; position:number }
const root=path.resolve(import.meta.dirname,'..')
const script=path.join(root,'scripts','create-and-publish-reading-comprehension-teaching-system.mjs')
const lessons=readingComprehensionLessonSpecs.map((spec,index)=>({...spec,id:401+index,position:index+1,status:'published' as const}))
const blocksByLesson=new Map<number,StoredBlock[]>()
let nextBlockId=4_000
let mutationCalls=0
let capabilityCalls=0
let baseUrl=''
let server:ReturnType<typeof createServer>
let preservedRetainedBlockId=0
const productionCounts=[12,10,10,10,10,10,10,10,10,10,10,10]
const productionBlockCount=productionCounts.reduce((sum,count)=>sum+count,0)
const desiredBlockCount=lessons.reduce((sum,item)=>sum+item.blocks.length,0)
for(const [lessonIndex,item] of lessons.entries()){const blocks=Array.from({length:productionCounts[lessonIndex]??0},(_,index):StoredBlock=>({id:nextBlockId++,type:'paragraph',content:{text:`Current production ${item.slug} block ${index+1}`},position:index+1}));if(item.slug==='inference-implied-meaning')preservedRetainedBlockId=blocks[4]?.id??0;blocksByLesson.set(item.id,blocks)}
function send(response:ServerResponse,data:unknown,status=200){response.writeHead(status,{'content-type':'application/json'});response.end(JSON.stringify({success:status<400,data}))}
function readBody(request:IncomingMessage):Promise<Record<string,unknown>>{return new Promise((resolve,reject)=>{let raw='';request.setEncoding('utf8');request.on('data',(chunk:string)=>{raw+=chunk});request.on('end',()=>{try{const parsed=JSON.parse(raw) as unknown;if(parsed===null||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('Object body required.');resolve(parsed as Record<string,unknown>)}catch(error:unknown){reject(error instanceof Error?error:new Error('Invalid request body.'))}});request.on('error',reject)})}
function findBlock(blockId:number){for(const blocks of blocksByLesson.values()){const index=blocks.findIndex((block)=>block.id===blockId);if(index>=0)return{blocks,index}}return null}
async function handle(request:IncomingMessage,response:ServerResponse){
  const url=request.url??''
  if(url==='/api/admin/dashboard'){send(response,{cseProfessional:{id:1}});return}
  if(url==='/api/admin/courses/1'){send(response,{subjects:[{slug:'verbal-ability',topics:[{slug:'reading-comprehension',lessons:lessons.map(({id,slug,title,lessonType,estimatedMinutes,status,position})=>({id,slug,title,lessonType,estimatedMinutes,status,position}))}]}]});return}
  const capability=url.match(/^\/api\/admin\/lessons\/(\d+)\/reading-comprehension-teaching-system-v1\/capability$/u)
  if(capability?.[1]!==undefined&&request.method==='GET'){capabilityCalls+=1;send(response,{supported:true,operation:'reading-comprehension-teaching-system-v1',topicSlug:'reading-comprehension'});return}
  const reconcile=url.match(/^\/api\/admin\/lessons\/(\d+)\/reading-comprehension-teaching-system-v1$/u)
  if(reconcile?.[1]!==undefined&&request.method==='PUT'){
    mutationCalls+=1;const lessonId=Number(reconcile[1]);const existing=blocksByLesson.get(lessonId);if(existing===undefined){send(response,{message:'Missing lesson'},404);return}
    const input=await readBody(request);const desired=input.blocks as Array<{blockType:string;content:unknown;position:number}>;const allowed=existing.filter((block)=>block.type!=='illustrated-guided-teaching');const next=desired.map((block,index):StoredBlock=>({id:allowed[index]?.id??nextBlockId++,type:block.blockType,content:structuredClone(block.content),position:block.position}));blocksByLesson.set(lessonId,next);send(response,{blocks:next,writeRequired:true,createdCount:Math.max(0,desired.length-allowed.length),updatedCount:Math.min(desired.length,allowed.length),deletedCount:existing.length-allowed.length+Math.max(0,allowed.length-desired.length)});return
  }
  const list=url.match(/^\/api\/admin\/lessons\/(\d+)\/blocks$/u)
  if(list?.[1]!==undefined&&request.method==='GET'){const blocks=blocksByLesson.get(Number(list[1]));if(blocks===undefined){send(response,{message:'Missing lesson'},404);return}send(response,{blocks:blocks.slice().sort((a,b)=>a.position-b.position)});return}
  send(response,{message:`Unexpected ${request.method} ${url}`},404)
}
beforeAll(async()=>{server=createServer((request,response)=>{void handle(request,response).catch((error:unknown)=>send(response,{message:error instanceof Error?error.message:'Request failed'},500))});await new Promise<void>((resolve)=>server.listen(0,'127.0.0.1',resolve));const address=server.address();if(address===null||typeof address==='string')throw new Error('Test server address missing.');baseUrl=`http://127.0.0.1:${address.port}`})
afterAll(async()=>{await new Promise<void>((resolve,reject)=>server.close((error)=>error?reject(error):resolve()))})
function runPublisher(extraArgs:string[]=[]):Promise<{stdout:string;stderr:string;status:number|null}>{return new Promise((resolve,reject)=>{const child=spawn(process.execPath,[script,'--base-url',baseUrl,'--cookie','test-admin-session','--confirm','publish-reading-comprehension-teaching-system-v1',...extraArgs],{cwd:root,windowsHide:true});let stdout='';let stderr='';child.stdout.on('data',(chunk)=>{stdout+=String(chunk)});child.stderr.on('data',(chunk)=>{stderr+=String(chunk)});child.on('error',reject);child.on('close',(status)=>resolve({stdout,stderr,status}))})}
describe('Reading Comprehension Teaching System v1 publisher',()=>{
  it('validates read-only, publishes canonically, preserves IDs, proves idempotency, and fails closed on unknown deletion',async()=>{
    const validation=await runPublisher(['--validate-only']);expect(validation).toMatchObject({status:0,stderr:''});expect(JSON.parse(validation.stdout)).toMatchObject({valid:true,topicSlug:'reading-comprehension',lessonCount:12,writesRequired:true,deletionReviewRequired:false,deletionPlanFingerprint:null,totals:{lessonsChanged:12,blocksCreated:desiredBlockCount-productionBlockCount,blocksUpdated:productionBlockCount,blocksDeleted:0,guidedBlocksRemoved:0},unrelatedTopicsModified:0,migrationRequired:false,dbRepairRequired:false});expect(mutationCalls).toBe(0);expect(capabilityCalls).toBeGreaterThan(0)
    const first=await runPublisher();expect(first).toMatchObject({status:0,stderr:''});expect(JSON.parse(first.stdout)).toMatchObject({published:true,updated:true,topicSlug:'reading-comprehension',lessonCount:12,totals:{lessonsChanged:12,blocksCreated:desiredBlockCount-productionBlockCount,blocksUpdated:productionBlockCount,blocksDeleted:0,guidedBlocksRemoved:0},unrelatedTopicsModified:0});expect(findBlock(preservedRetainedBlockId)).not.toBeNull()
    for(const item of lessons){const blocks=blocksByLesson.get(item.id)??[];expect(blocks).toHaveLength(item.blocks.length);expect(blocks.map((block)=>block.position)).toEqual(item.blocks.map((_,index)=>index+1));expect(blocks.some((block)=>block.type==='illustrated-guided-teaching')).toBe(false)}
    const mutationsAfterFirst=mutationCalls;const second=await runPublisher();expect(second).toMatchObject({status:0,stderr:''});expect(JSON.parse(second.stdout)).toMatchObject({published:true,updated:false,topicSlug:'reading-comprehension',totals:{lessonsChanged:0,blocksCreated:0,blocksUpdated:0,blocksDeleted:0,guidedBlocksRemoved:0},unrelatedTopicsModified:0});expect(mutationCalls).toBe(mutationsAfterFirst)
    const firstLesson=blocksByLesson.get(lessons[0].id);if(firstLesson===undefined)throw new Error('First lesson fixture missing.');firstLesson.push({id:nextBlockId++,type:'paragraph',content:{text:'Unknown unique legacy learner content.'},position:firstLesson.length+1})
    const deletionValidation=await runPublisher(['--validate-only']);expect(deletionValidation).toMatchObject({status:0,stderr:''});const plan=JSON.parse(deletionValidation.stdout) as {deletionPlanFingerprint:string;deletions:Array<Record<string,unknown>>;deletionReviewRequired:boolean};expect(plan.deletionReviewRequired).toBe(true);expect(plan.deletionPlanFingerprint).toMatch(/^[a-f0-9]{64}$/u);expect(plan.deletions).toEqual([expect.objectContaining({topic:'reading-comprehension',lessonSlug:'understanding-reading-comprehension',blockType:'paragraph',identifier:'Unknown unique legacy learner content.',reason:'The block is beyond the canonical lesson block sequence.',learnerContentAssessment:'requires-human-review'})])
    const blocked=await runPublisher();expect(blocked.status).toBe(1);expect(blocked.stderr).toContain(`Review every planned deletion, then pass --approve-deletions ${plan.deletionPlanFingerprint}.`);expect(mutationCalls).toBe(mutationsAfterFirst)
  })
})
