export interface PublisherPlan {
  topic: string
  lessonCount: number
  blocksCreated: number
  blocksUpdated: number
  blocksDeleted: number
  deletions: Array<Record<string, unknown>>
  deletionPlanFingerprint: string | null
  writeRequired: boolean
  migrationRequired: boolean
  dbRepairRequired: boolean
  unrelatedTopicsModified: number
  warnings: unknown[]
  blockers: unknown[]
}

export interface ContentReleaseOperations {
  validate: () => Record<string, unknown> | Promise<Record<string, unknown>>
  publish: (approvalFingerprint: string | null) => Record<string, unknown> | Promise<Record<string, unknown>>
  inspect?: () => Record<string, unknown> | Promise<Record<string, unknown>>
  qaVerify?: () => unknown | Promise<unknown>
}

export function normalizePublisherPlan(value: Record<string, unknown>): PublisherPlan
export function analyzeTeachingPlan(plan: PublisherPlan): { allowed: boolean; reason: string | null; approvalFingerprint: string | null }
export function sameValidationSnapshot(a: PublisherPlan, b: PublisherPlan): boolean
export function isIdempotentResult(value: Record<string, unknown>): boolean
export const DEFAULT_CONTENT_BASE_URL: string
export function validateContentBaseUrl(value: string): string
export function resolveTeachingCredentials(
  meta: { passwordEnv: string },
  environment?: Record<string, string | undefined>,
  explicitEmail?: string,
): { email: string; passwordEnv: string; password: string }
export function resolveContentReleasePreflight(options: {
  meta: { passwordEnv: string }
  environment?: Record<string, string | undefined>
  explicitEmail?: string
  baseUrl?: string
}): { email: string; passwordEnv: string; password: string; baseUrl: string }
export function buildTeachingSafeReleaseArgs(options: { codex?: boolean; message: string; capabilityCheck?: boolean }): string[]
export function verifyCapabilityWithRetry<T>(verify: () => T | Promise<T>, options?: { attempts?: number; delayMs?: number; sleep?: (milliseconds: number) => unknown | Promise<unknown> }): Promise<T>
export function validateContentInspection(value: Record<string, unknown>): Record<string, unknown>
export function runContentReleasePipeline(operations: ContentReleaseOperations): Promise<Record<string, unknown>>
export function runTeachingReleasePipeline(
  operations: ContentReleaseOperations & { safeRelease: () => unknown | Promise<unknown>; verifyCapability?: () => unknown | Promise<unknown> },
): Promise<Record<string, unknown>>