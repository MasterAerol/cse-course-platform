export function normalizePublisherPlan(value){if(value===null||typeof value!=='object')throw new Error('Publisher did not return a JSON object.');const totals=value.totals??{};return{topic:value.topicSlug,lessonCount:Number(value.lessonCount??0),blocksCreated:Number(totals.blocksCreated??0),blocksUpdated:Number(totals.blocksUpdated??0),blocksDeleted:Number(totals.blocksDeleted??0),deletions:Array.isArray(value.deletions)?value.deletions:[],deletionPlanFingerprint:value.deletionPlanFingerprint??null,writeRequired:Boolean(value.writesRequired??value.writeRequired),unrelatedTopicsModified:Number(value.unrelatedTopicsModified??0),warnings:Array.isArray(value.warnings)?value.warnings:[],blockers:Array.isArray(value.blockers)?value.blockers:[]}}
export function analyzeTeachingPlan(plan){if(plan.unrelatedTopicsModified!==0)return{allowed:false,reason:'unrelated_topic_mutation'};if(plan.warnings.length||plan.blockers.length)return{allowed:false,reason:'publisher_warning_or_blocker'};if(plan.blocksDeleted===0)return{allowed:true,reason:null,approvalFingerprint:null};if(plan.deletions.length!==plan.blocksDeleted)return{allowed:false,reason:'unclassified_deletions'};const safe=new Set(['safe-duplicate','superseded-with-equivalent-content']);for(const item of plan.deletions){if(!safe.has(item.learnerContentAssessment))return{allowed:false,reason:'content_review_required'};if(item.learnerContentAssessment==='superseded-with-equivalent-content'&&!(item.replacementEvidence&&item.replacementEvidence.canonicalBlockIdentifier&&item.replacementEvidence.conceptFingerprint))return{allowed:false,reason:'missing_replacement_evidence'}}if(!plan.deletionPlanFingerprint)return{allowed:false,reason:'missing_deletion_fingerprint'};return{allowed:true,reason:null,approvalFingerprint:plan.deletionPlanFingerprint}}
export function sameValidationSnapshot(a,b){return JSON.stringify({topic:a.topic,lessonCount:a.lessonCount,blocksCreated:a.blocksCreated,blocksUpdated:a.blocksUpdated,blocksDeleted:a.blocksDeleted,deletions:a.deletions,deletionPlanFingerprint:a.deletionPlanFingerprint})===JSON.stringify({topic:b.topic,lessonCount:b.lessonCount,blocksCreated:b.blocksCreated,blocksUpdated:b.blocksUpdated,blocksDeleted:b.blocksDeleted,deletions:b.deletions,deletionPlanFingerprint:b.deletionPlanFingerprint})}
export function isIdempotentResult(value){const p=normalizePublisherPlan(value);return p.blocksCreated===0&&p.blocksUpdated===0&&p.blocksDeleted===0&&!value.updated&&!p.writeRequired&&p.unrelatedTopicsModified===0}
export function resolveTeachingCredentials(meta, environment = process.env) {
  const email = environment.CSE_CONTENT_ADMIN_EMAIL
  const password = environment.CSE_CONTENT_ADMIN_PASSWORD ?? environment[meta.passwordEnv]
  if (!email || !password) throw new Error('production admin credentials unavailable. Set CSE_CONTENT_ADMIN_EMAIL and CSE_CONTENT_ADMIN_PASSWORD (or the topic-specific password variable).')
  return { email, passwordEnv: meta.passwordEnv, password }
}

export function validateContentInspection(value) {
  if (value === null || typeof value !== 'object') throw new Error('Content inspector did not return a JSON object.')
  if (value.allMatch !== true) throw new Error('Production content inspection did not match the canonical teaching manifest.')
  return value
}

export async function runTeachingReleasePipeline(operations) {
  await operations.safeRelease()
  const firstPlan = normalizePublisherPlan(await operations.validate())
  const safety = analyzeTeachingPlan(firstPlan)
  if (!safety.allowed) return { status: 'content-review-required', firstPlan, safety, qa: { status: 'not-run' } }
  if (!firstPlan.writeRequired) {
    const qa = operations.qaVerify ? await operations.qaVerify() : { status: 'skipped', reason: 'credentials-unavailable' }
    return { status: 'already-canonical', firstPlan, safety, qa }
  }
  const currentPlan = normalizePublisherPlan(await operations.validate())
  if (!sameValidationSnapshot(firstPlan, currentPlan)) throw new Error('Validation snapshot changed before publication; no content write performed.')
  const firstPublish = await operations.publish(safety.approvalFingerprint)
  if (Number(firstPublish?.unrelatedTopicsModified ?? 0) !== 0) throw new Error('Publisher reported unrelated topic mutation.')
  const postPlan = normalizePublisherPlan(await operations.validate())
  if (postPlan.unrelatedTopicsModified !== 0) throw new Error('Post-publish validation reported unrelated topic mutation.')
  if (postPlan.writeRequired) throw new Error('Post-publish validation still requires writes.')
  const secondPublish = await operations.publish(safety.approvalFingerprint)
  if (!isIdempotentResult(secondPublish)) throw new Error('TEACHING RELEASE — IDEMPOTENCY FAILURE')
  const inspection = operations.inspect ? validateContentInspection(await operations.inspect()) : { allMatch: true, source: 'canonical-post-publish-validation' }
  const qa = operations.qaVerify ? await operations.qaVerify() : { status: 'skipped', reason: 'credentials-unavailable' }
  return { status: 'published', firstPlan, safety, firstPublish, postPlan, secondPublish, inspection, qa }
}
