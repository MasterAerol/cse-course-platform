export interface PublisherPlan {topic:string;lessonCount:number;blocksCreated:number;blocksUpdated:number;blocksDeleted:number;deletions:Array<Record<string,unknown>>;deletionPlanFingerprint:string|null;writeRequired:boolean;unrelatedTopicsModified:number;warnings:unknown[];blockers:unknown[]}
export function normalizePublisherPlan(value:Record<string,unknown>):PublisherPlan
export function analyzeTeachingPlan(plan:PublisherPlan):{allowed:boolean;reason:string|null;approvalFingerprint:string|null}
export function sameValidationSnapshot(a:PublisherPlan,b:PublisherPlan):boolean
export function isIdempotentResult(value:Record<string,unknown>):boolean