export const RELEASE_CONFIRMATION: string
export const DEFAULT_HEALTH_URL: string
export const DEFAULT_LIVE_URL: string
export const MAX_CHANGED_FILE_BYTES: number
export type ReleaseOptions = { message: string; dryRun: boolean; codex: boolean; skipValidation: boolean; skipDeploy: boolean }
export type RiskBlocker = { code: string; reason: string; files: string[] }
export function parseReleaseArgs(argv?: string[]): Map<string, string>
export function validateReleaseOptions(args: Map<string, string>): ReleaseOptions
export function normalizeGitPath(file: string): string
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
export function runReleasePhases(phases: Array<{ name: string; run: () => unknown | Promise<unknown> }>): Promise<string[]>