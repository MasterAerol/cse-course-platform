#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { generatorPools,requiredTopics } from './general-information-assessment-blueprint.mjs'
import { assessmentSlug,baseInput,confirmation,passwordEnvironmentName,shouldRestorePublishedStatus } from './general-information-assessment-publisher-config.mjs'

function parseArgs(){const values=new Map();for(let index=2;index<process.argv.length;index+=2){const key=process.argv[index],value=process.argv[index+1];if(!key?.startsWith('--')||value===undefined)throw new Error(`Invalid argument near ${key??'(end)'}.`);values.set(key.slice(2),value)}return values}

function qualityGate(){
  const vitest=fileURLToPath(new URL('../node_modules/vitest/vitest.mjs',import.meta.url))
  const focused=spawnSync(process.execPath,[vitest,'run','tests/general-information-subject-assessment.test.ts','tests/general-information-assessment-publisher.test.ts','tests/subject-assessment-card.test.ts','tests/subject-assessment-submit.test.ts'],{stdio:'inherit',shell:false})
  if(focused.status!==0)throw new Error('The General Information assessment focused gate failed, including the 300-attempt/12,000-question stress validation.')
  const lifecycle=spawnSync(process.execPath,[vitest,'run','tests/subject-assessment.test.ts','tests/verbal-subject-assessment.test.ts','tests/analytical-subject-assessment.test.ts'],{stdio:'inherit',shell:false})
  if(lifecycle.status!==0)throw new Error('The shared Numerical, Analytical, and Verbal assessment lifecycle regression gate failed.')
}

export async function publishGeneralInformationAssessment({baseUrl,cookie:initialCookie,email,password,skipQualityGate=false}){
  const options={baseUrl,cookie:initialCookie,email,password}
  let cookie=options.cookie??null
  async function request(path,init={}){const headers=new Headers(init.headers);headers.set('accept','application/json');if(cookie!==null)headers.set('cookie',cookie);if(init.body!==undefined)headers.set('content-type','application/json');if(init.method!==undefined&&init.method!=='GET')headers.set('x-cse-admin-csrf','same-origin-admin-mutation');const response=await fetch(`${options.baseUrl}${path}`,{...init,headers});const setCookie=response.headers.get('set-cookie');if(setCookie!==null)cookie=setCookie.split(';')[0];const body=await response.json();if(!response.ok||body.success!==true)throw new Error(`${init.method??'GET'} ${path} failed (${response.status}): ${JSON.stringify(body)}`);return body.data}
  if(cookie===null){if(options.email===undefined||options.password===undefined)throw new Error(`Pass --cookie, or --email with --password or ${passwordEnvironmentName}.`);await request('/api/auth/login',{method:'POST',body:JSON.stringify({email:options.email,password:options.password})})}
  const dashboard=await request('/api/admin/dashboard');const courseId=dashboard.cseProfessional?.id;if(courseId===undefined)throw new Error('CSE Professional was not found.')
  const detail=await request(`/api/admin/courses/${courseId}`);const subject=detail.subjects.find((item)=>item.slug==='general-information');if(subject===undefined||subject.status!=='published')throw new Error('Published General Information was not found.')
  const missingTopics=requiredTopics.filter((slug)=>subject.topics.find((topic)=>topic.slug===slug)?.status!=='published');if(missingTopics.length>0)throw new Error(`Required published topics missing: ${missingTopics.join(', ')}`)
  const registry=await request('/api/admin/practice-generators');const registered=new Set(registry.generators.map((item)=>`${item.slug}@${item.version}`));const missingGenerators=generatorPools.flat().filter((slug)=>!registered.has(`${slug}@1`));if(missingGenerators.length>0)throw new Error(`Required generators missing: ${missingGenerators.join(', ')}`)
  const prior=(await request(`/api/admin/subject-assessments/${assessmentSlug}`)).assessment
  const draft=(await request(`/api/admin/subject-assessments/${assessmentSlug}`,{method:'PUT',body:JSON.stringify({...baseInput,status:'draft',...(prior===null?{}:{updatedAt:prior.updatedAt})})})).assessment
  try{
    if(draft.status!=='draft')throw new Error('Assessment did not enter draft status before validation.')
    if(!skipQualityGate)qualityGate()
    const validation=await request(`/api/admin/subject-assessments/${assessmentSlug}/validate`,{method:'POST'})
    if(validation.questionCount!==40||validation.topicCount!==4)throw new Error(`Unexpected validation result: ${JSON.stringify(validation)}`)
    const published=(await request(`/api/admin/subject-assessments/${assessmentSlug}`,{method:'PUT',body:JSON.stringify({...baseInput,status:'published',updatedAt:draft.updatedAt})})).assessment
    if(published.status!=='published'||published.questionCount!==40||published.blueprint.topics.length!==4)throw new Error('Published assessment failed its final shape check.')
  }catch(error){
    if(shouldRestorePublishedStatus(prior?.status)){const current=(await request(`/api/admin/subject-assessments/${assessmentSlug}`)).assessment;await request(`/api/admin/subject-assessments/${assessmentSlug}`,{method:'PUT',body:JSON.stringify({...baseInput,status:'published',updatedAt:current.updatedAt})})}
    throw error
  }
  return{courseId,assessmentSlug,questionCount:40,topicCount:4}
}

async function main(){const options=parseArgs();if(options.get('confirm')!==confirmation)throw new Error(`Pass --confirm ${confirmation} to continue.`);const result=await publishGeneralInformationAssessment({baseUrl:options.get('base-url')??'http://127.0.0.1:5173',cookie:options.get('cookie'),email:options.get('email'),password:options.get('password')??process.env[passwordEnvironmentName]});console.log(`General Information Subject Assessment was created as draft, validated, and published with ${result.questionCount} questions across ${result.topicCount} topics.`)}
if(process.argv[1]!==undefined&&fileURLToPath(import.meta.url)===fileURLToPath(new URL(`file:///${process.argv[1].replaceAll('\\','/')}`)))main().catch((error)=>{console.error(error instanceof Error?error.message:String(error));process.exitCode=1})
