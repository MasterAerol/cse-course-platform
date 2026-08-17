export function parseArgs(argv = process.argv.slice(2)) {
  const args = new Map()
  const booleanFlags = new Set(['remote', 'inspect-only'])
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index]
    if (typeof key !== 'string' || !key.startsWith('--')) {
      throw new Error(`Invalid argument near ${key ?? '(end)'}.`)
    }
    const name = key.slice(2)
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

export function isLocalBaseUrl(baseUrl) {
  const hostname = new URL(baseUrl).hostname
  return hostname === '127.0.0.1'
    || hostname === 'localhost'
    || hostname === '[::1]'
}
