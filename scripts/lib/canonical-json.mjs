import { createHash } from 'node:crypto'

function sortJson(value) {
  if (Array.isArray(value)) return value.map(sortJson)
  if (value === null || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, sortJson(value[key])]),
  )
}

export const canonicalJson = (value) => JSON.stringify(sortJson(value))
export const sameJson = (left, right) => canonicalJson(left) === canonicalJson(right)
export const jsonFingerprint = (value) =>
  createHash('sha256').update(canonicalJson(value)).digest('hex')
