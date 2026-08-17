export interface PublisherPlan {topic:string;lessonCount:number;blocksCreated:number;blocksUpdated:number;blocksDeleted:number;deletions:Array<Record<string,unknown>>;deletionPlanFingerprint:string|null;writeRequired:boolean;unrelatedTopicsModified:number;warnings:unknown[];blockers:unknown[]}
export function normalizePublisherPlan(value:Record<string,unknown>):PublisherPlan
export function analyzeTeachingPlan(plan:PublisherPlan):{allowed:boolean;reason:string|null;approvalFingerprint:string|null}
export function sameValidationSnapshot(a:PublisherPlan,b:PublisherPlan):boolean
export function isIdempotentResult(value:Record<string,unknown>):boolean
export function resolveTeachingCredentials(meta:{passwordEnv:string},environment?:Record<string,string|undefined>):{email:string;passwordEnv:string;password:string}
export function validateContentInspection(value:Record<string,unknown>):Record<string,unknown>
export function runTeachingReleasePipeline(operations:{safeRelease:()=>unknown|Promise<unknown>;validate:()=>Record<string,unknown>|Promise<Record<string,unknown>>;publish:(approvalFingerprint:string|null)=>Record<string,unknown>|Promise<Record<string,unknown>>;inspect?:()=>Record<string,unknown>|Promise<Record<string,unknown>>;qaVerify?:()=>unknown|Promise<unknown>}):Promise<Record<string,unknown>>
