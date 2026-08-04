#!/usr/bin/env node
const [,,baseUrl,email]=process.argv
const password=process.env.CSE_MOCK_STUDENT_PASSWORD
if(!baseUrl||!email||!password)throw new Error('Usage: CSE_MOCK_STUDENT_PASSWORD=<password> node scripts/verify-full-cse-mock-flow.mjs <base-url> <email>')
let cookie=null
async function request(path,init={}){const headers=new Headers(init.headers);headers.set('accept','application/json');if(cookie)headers.set('cookie',cookie);if(init.body!==undefined)headers.set('content-type','application/json');const response=await fetch(`${baseUrl}${path}`,{...init,headers});const setCookie=response.headers.get('set-cookie');if(setCookie)cookie=setCookie.split(';')[0];const body=await response.json();if(!response.ok||body.success!==true)throw new Error(`${init.method??'GET'} ${path}: ${JSON.stringify(body)}`);return body.data}
await request('/api/auth/login',{method:'POST',body:JSON.stringify({email,password})})
const created=await request('/api/student/mock-examinations/full-cse-professional-mock-examination/attempts',{method:'POST',body:JSON.stringify({mode:'untimed'})})
if(created.totalCount!==150||created.questions.length!==0)throw new Error('Instruction payload is invalid.')
const attemptId=created.attempt.publicId
const started=await request(`/api/student/mock-exam-attempts/${attemptId}/start`,{method:'POST'})
if(started.questions.length!==150||started.attempt.deadlineAt!==null)throw new Error('Untimed start payload is invalid.')
const question=started.questions[0]
await request(`/api/student/mock-exam-attempts/${attemptId}/answers/${question.publicId}`,{method:'PUT',body:JSON.stringify({selectedChoicePublicId:question.choices[0].publicId})})
await request(`/api/student/mock-exam-attempts/${attemptId}/review-flags/${question.publicId}`,{method:'PUT',body:JSON.stringify({markedForReview:true})})
const resumed=await request(`/api/student/mock-exam-attempts/${attemptId}`)
const preSubmit=await request(`/api/student/mock-exam-attempts/${attemptId}/submission-review`)
if(resumed.answeredCount!==1||resumed.markedForReviewCount!==1||preSubmit.unansweredCount!==149)throw new Error('Resume or review-summary counts are invalid.')
const result=await request(`/api/student/mock-exam-attempts/${attemptId}/submit`,{method:'POST'})
const repeated=await request(`/api/student/mock-exam-attempts/${attemptId}/submit`,{method:'POST'})
const review=await request(`/api/student/mock-exam-attempts/${attemptId}/review`)
if(result.totalPoints!==150||result.subjects.length!==4||result.topics.length!==33||repeated.attempt.submittedAt!==result.attempt.submittedAt||review.questions.length!==150)throw new Error('Result, idempotency, or review validation failed.')
const timedCreated=await request('/api/student/mock-examinations/full-cse-professional-mock-examination/attempts',{method:'POST',body:JSON.stringify({mode:'timed'})})
const timed=await request(`/api/student/mock-exam-attempts/${timedCreated.attempt.publicId}/start`,{method:'POST'})
const deadlineMinutes=(Date.parse(timed.attempt.deadlineAt)-Date.parse(timed.attempt.startedAt))/60_000
if(timed.questions.length!==150||deadlineMinutes!==190)throw new Error('Timed deadline is not exactly 190 minutes.')
await request(`/api/student/mock-exam-attempts/${timedCreated.attempt.publicId}/submit`,{method:'POST'})
console.log(JSON.stringify({attemptId,questions:started.questions.length,answered:resumed.answeredCount,marked:resumed.markedForReviewCount,subjects:result.subjects.length,topics:result.topics.length,idempotent:true,timedQuestions:timed.questions.length,deadlineMinutes}))
