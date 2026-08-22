export const RELEASE_CONFIRMATION: string
export const DEFAULT_HEALTH_URL: string
export const DEFAULT_LIVE_URL: string
export const FALLBACK_HEALTH_URL: string
export const FALLBACK_LIVE_URL: string
export const MAX_CHANGED_FILE_BYTES: number
export const APPROVED_COMMERCIAL_INFRASTRUCTURE: Readonly<{ migrationFile:string; migrationName:string; migrationSha256:string; databaseName:string; wranglerFile:string; r2Binding:string; r2Bucket:string }>
export const APPROVED_GOOGLE_AUTH_INFRASTRUCTURE: Readonly<{ migrationFile:string; migrationName:string; migrationSha256:string; databaseName:string; wranglerFile:string; googleClientId:string }>
export const APPROVED_AUTH_UX_INFRASTRUCTURE: Readonly<{ migrationFile:string; migrationName:string; migrationSha256:string; databaseName:string; wranglerFile:string; requiredSecrets:readonly string[]; rateLimits:ReadonlyArray<{ name:string; namespace_id:string; simple:{ limit:number; period:number } }> }>
export const APPROVED_COMMERCIAL_BETA_INFRASTRUCTURE: Readonly<{ migrationFile:string; migrationName:string; migrationSha256:string; databaseName:string; wranglerFile:string; requiredSecrets:readonly string[] }>
export type ReleaseOptions = { message: string; dryRun: boolean; codex: boolean; skipValidation: boolean; skipDeploy: boolean; deployCurrent: boolean }
export type RiskBlocker = { code: string; reason: string; files: string[] }
export function parseReleaseArgs(argv?: string[]): Map<string, string>
export function validateReleaseOptions(args: Map<string, string>): ReleaseOptions
export function normalizeGitPath(file: string): string
export type ApprovedAuthUxWranglerCandidate = { kind:'authentication-ux'; requiredSecrets:string[]; rateLimits:Array<{ name:string; namespace_id:string; simple:{ limit:number; period:number } }>; registrationMode:'closed' }
export type ApprovedCommercialWranglerCandidate = { kind:'commercial-r2'; binding:string; bucketName:string }
export type ApprovedGoogleAuthWranglerCandidate = { kind:'google-auth'; clientId:string; registrationMode:'closed' }
export type ApprovedCommercialSimulationWranglerCandidate = { kind:'commercial-simulation'; registrationMode:'open'; requiredSecrets:string[] }
export function validateApprovedMigrationCandidate(input:{ files:string[]; content:string }):{ name:string; sha256:string; databaseName:string }
export function validateApprovedMigrationRelease(input:{ files:string[]; content:string; appliedMigrations:string[]; pendingMigrations:string[] }):{ name:string; sha256:string; databaseName:string; applied:true; pending:[] }
export function validateApprovedWranglerCandidate(input:{ files:string[]; baselineContent:string; currentContent:string }):ApprovedCommercialWranglerCandidate | ApprovedGoogleAuthWranglerCandidate | ApprovedAuthUxWranglerCandidate | ApprovedCommercialSimulationWranglerCandidate
export function parseWorkerSecretNames(output:string):string[]
export function validateApprovedWranglerRelease(input:{ files:string[]; baselineContent:string; currentContent:string; bucketState?:{ exists:boolean; name:string; devUrlEnabled:boolean; customDomains:string[] }; secretNames?:string[] }):{ binding:string; bucketName:string; private:true } | ApprovedGoogleAuthWranglerCandidate | (ApprovedAuthUxWranglerCandidate & { secretsConfigured:true }) | (ApprovedCommercialSimulationWranglerCandidate & { secretsConfigured:true })
export function parseAppliedMigrationNames(output:string):string[]
export function parsePendingMigrations(output:string):string[]
export function parseR2BucketInfo(output:string):{ exists:true; name:string }
export function parseR2DevUrlEnabled(output:string):boolean
export function parseR2CustomDomains(output:string):string[]
export type GitStatusEntry = { file:string; status:string; untracked:boolean; staged:boolean }
export function parseStatusPorcelainZDetailed(output:string):GitStatusEntry[]
export function isReleaseRelevantPath(file:string):boolean
export function selectPreflightReleaseScope(entries:GitStatusEntry[]):{ approvedFiles:string[]; ignoredUntrackedFiles:string[] }
export function validateConcurrentReleaseScope(approvedFiles:string[],entries:GitStatusEntry[]):{ ignoredUntrackedFiles:string[] }
export function buildScopedStageArgs(approvedFiles:string[]):string[]
export function validateStagedScope(approvedFiles:string[],stagedFiles:string[]):{ approvedCount:number; stagedCount:number }
export interface ReleaseRisk { files: string[]; runtimeFiles: string[]; migrations: string[]; publishers: string[]; wranglerConfig: string[]; productionMutationScripts: string[]; developmentArtifacts: string[]; blockers: RiskBlocker[]; publisherRequired: boolean; deploymentRequired: boolean }
export function classifyChangedFiles(files: string[]): ReleaseRisk
export function validateDeploymentPolicy(risk: ReleaseRisk, skipDeploy: boolean): { deploymentRequired: boolean; skipDeploy: boolean }
export function detectSecrets(file: string, content: string): string[]
export function inspectChangedFiles(root: string, files: string[], options?: { maxBytes?: number }): { secretFindings: Array<{ file: string; kind: string }>; largeFiles: Array<{ file: string; bytes: number }>; suspiciousTemporaryFiles: Array<{ file: string; bytes: number }>; productionMutationSignals: Array<{ file: string; kind: string }> }
export function parseStatusPorcelainZ(output: string): string[]
export function validateHealthResponse(status: number, body: string): unknown
export function formatBytes(bytes: number): string
export type PreflightSnapshot = { root: string; cwd: string; branch: string; detached: boolean; operation: string | null; conflicts: string[]; remote: string; files: string[] }
export function validatePreflightSnapshot(snapshot: PreflightSnapshot): 'clean' | 'changed'
export function validateCleanDeploymentSync(head: string, upstream: string): { head: string; upstream: string }
export function runReleasePhases(phases: Array<{ name: string; run: () => unknown | Promise<unknown> }>): Promise<string[]>
