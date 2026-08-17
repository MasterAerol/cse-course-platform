#!/usr/bin/env node
import process from 'node:process'

const allowedValues=new Set(['base-url','qa-email','topic'])
function parse(argv){const result=new Map();for(let index=0;index<argv.length;index+=1){const token=argv[index];if(!token?.startsWith('--'))throw new Error(`Invalid argument near ${token??'(end)'}.`);const name=token.slice(2);if(!allowedValues.has(name))throw new Error(`Unsupported option --${name}.`);const value=argv[++index];if(!value||value.startsWith('--'))throw new Error(`Missing value for --${name}.`);result.set(name,value)}return result}
function required(args,name){const value=args.get(name)?.trim();if(!value)throw new Error(`Pass --${name} <value>.`);return value}
function normalizeOrigin(value){const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('--base-url must be an HTTPS origin without credentials, path, query, or fragment.');return url.origin}

async function main(){
 const args=parse(process.argv.slice(2))
 const baseUrl=normalizeOrigin(required(args,'base-url'))
 const qaEmail=required(args,'qa-email').toLowerCase()
 const topicSlug=required(args,'topic')
 const password=process.env.CSE_QA_STUDENT_PASSWORD
 if(!password)throw new Error('CSE_QA_STUDENT_PASSWORD is unavailable; optional QA verification skipped.')
 let cookie=null
 async function request(path,options={}){
  const headers=new Headers(options.headers)
  headers.set('accept','application/json')
  if(cookie)headers.set('cookie',cookie)
  if(options.body!==undefined)headers.set('content-type','application/json')
  const response=await fetch(new URL(path,`${baseUrl}/`),{...options,headers})
  const setCookie=response.headers.get('set-cookie')
  if(setCookie)cookie=setCookie.split(';')[0]??null
  const body=await response.json()
  if(!response.ok||body?.success!==true)throw new Error(`QA verification request failed: ${options.method??'GET'} ${path} (${response.status}).`)
  return body.data
 }
 await request('/api/auth/login',{method:'POST',body:JSON.stringify({email:qaEmail,password})})
 const me=await request('/api/auth/me')
 if(me?.user?.email!==qaEmail||me?.user?.role!=='student')throw new Error('QA verification returned the wrong account or role.')
 const dashboard=await request('/api/student/dashboard')
 const courses=Array.isArray(dashboard?.courses)?dashboard.courses:[]
 const course=courses.find((entry)=>entry?.course?.slug==='cse-professional')
 const enrollment=course?.enrollment??course?.course?.enrollment
 if(enrollment?.hasAccess!==true)throw new Error('QA student does not have active CSE Professional access.')
 const curriculum=await request('/api/student/courses/cse-professional/curriculum')
 const targetLessons=[]
 for(const subject of curriculum?.subjects??[]){for(const topic of subject?.topics??[]){if(topic?.slug!==topicSlug)continue;for(const lesson of topic?.lessons??[])targetLessons.push(lesson)}}
 if(targetLessons.length===0)throw new Error(`No curriculum lessons found for topic ${topicSlug}.`)
 const locked=targetLessons.filter((lesson)=>lesson?.isAccessible!==true)
 if(locked.length)throw new Error(`${locked.length} target-topic lesson(s) remain locked for the QA student.`)
 for(const lesson of targetLessons)await request(`/api/student/lessons/${encodeURIComponent(lesson.publicId)}`)
 console.log(JSON.stringify({status:'PASS',productionContentMutated:false,qaEmail,topicSlug,targetLessonCount:targetLessons.length,lockedTargetLessonCount:0,lessonRoutesChecked:targetLessons.length},null,2))
}

main().catch((error)=>{
 console.error(error instanceof Error?error.message:String(error))
 process.exitCode=1
})
