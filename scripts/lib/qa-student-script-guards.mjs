const booleanFlags = new Set(['help', 'remote', 'inspect-only'])
const valueOptions = new Set([
  'base-url',
  'qa-email',
  'admin-email',
  'mode',
  'confirm',
  'cookie',
  'allow-non-qa-email',
])

export const supportedQaStudentOptions = Object.freeze({
  booleanFlags: [...booleanFlags],
  valueOptions: [...valueOptions],
})

export function parseArgs(argv = process.argv.slice(2)) {
  const args = new Map()
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index]
    if (typeof key !== 'string' || !key.startsWith('--')) {
      throw new Error(`Invalid argument near ${key ?? '(end)'}. Boolean flags do not take values.`)
    }

    const name = key.slice(2)
    if (!booleanFlags.has(name) && !valueOptions.has(name)) {
      throw new Error(`Unsupported option --${name}. Run with --help for usage.`)
    }
    if (args.has(name)) {
      throw new Error(`Option --${name} was provided more than once.`)
    }
    if (booleanFlags.has(name)) {
      args.set(name, 'true')
      continue
    }

    const value = argv[index + 1]
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`Missing value for --${name}.`)
    }
    args.set(name, value)
    index += 1
  }
  return args
}

export function isQaEmail(email) {
  const [localPart] = email.toLowerCase().split('@')
  return localPart !== undefined
    && /(^|[+._-])(qa|test)([+._-]|$)/u.test(localPart)
}

export function normalizeBaseUrl(baseUrl) {
  let url
  try {
    url = new URL(baseUrl)
  } catch {
    throw new Error(`Invalid --base-url: ${baseUrl}`)
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('--base-url must use http:// or https://.')
  }
  if (url.username !== '' || url.password !== '') {
    throw new Error('--base-url must not contain credentials.')
  }
  if (url.search !== '' || url.hash !== '') {
    throw new Error('--base-url must not contain a query string or fragment.')
  }
  if (url.pathname !== '/' && url.pathname !== '') {
    throw new Error('--base-url must be an origin without a path.')
  }
  return url.origin
}

export function resolveApiUrl(baseUrl, path) {
  if (!path.startsWith('/')) throw new Error('API paths must start with /.')
  return new URL(path, `${normalizeBaseUrl(baseUrl)}/`).href
}

export function isLocalBaseUrl(baseUrl) {
  const hostname = new URL(normalizeBaseUrl(baseUrl)).hostname
  return hostname === '127.0.0.1'
    || hostname === 'localhost'
    || hostname === '[::1]'
}

export function formatNetworkError(error, method, url) {
  const cause = error instanceof Error && error.cause !== undefined
    ? error.cause
    : null
  const causeCode = cause !== null && typeof cause === 'object' && 'code' in cause
    ? String(cause.code)
    : null
  const causeMessage = cause instanceof Error
    ? cause.message
    : error instanceof Error
      ? error.message
      : String(error)
  return [
    `Failed to ${method} ${url}.`,
    'No HTTP response was received.',
    `Cause: ${causeCode === null ? causeMessage : `${causeCode}: ${causeMessage}`}`,
    'Check the base URL, DNS, TLS certificate, network connection, and Worker availability.',
  ].join('\n')
}

export function formatHttpError(status, method, url, body) {
  const code = body !== null && typeof body === 'object'
    && 'error' in body && body.error !== null && typeof body.error === 'object'
    && 'code' in body.error
    ? String(body.error.code)
    : 'HTTP_ERROR'
  const message = body !== null && typeof body === 'object'
    && 'error' in body && body.error !== null && typeof body.error === 'object'
    && 'message' in body.error
    ? String(body.error.message)
    : 'The server returned an unsuccessful response.'
  return `HTTP ${status} while calling ${method} ${url}.\n${code}: ${message}`
}