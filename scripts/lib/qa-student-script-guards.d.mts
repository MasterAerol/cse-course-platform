export const supportedQaStudentOptions: Readonly<{
  booleanFlags: string[]
  valueOptions: string[]
}>
export function parseArgs(argv?: string[]): Map<string, string>
export function isQaEmail(email: string): boolean
export function normalizeBaseUrl(baseUrl: string): string
export function resolveApiUrl(baseUrl: string, path: string): string
export function isLocalBaseUrl(baseUrl: string): boolean
export function formatNetworkError(
  error: unknown,
  method: string,
  url: string,
): string
export function formatHttpError(
  status: number,
  method: string,
  url: string,
  body: unknown,
): string