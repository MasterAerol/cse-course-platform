import { z } from 'zod'

const responseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.unknown(),
}).passthrough()

export function parseSuccessEnvelope(value, context) {
  const parsed = responseEnvelopeSchema.safeParse(value)
  if (!parsed.success) throw new Error(`${context} returned an invalid API response envelope.`)
  return parsed.data.data
}

export function requireRecord(value, label, fields = []) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${label} returned no record.`)
  for (const field of fields) {
    if (!(field in value) || value[field] === null || value[field] === undefined) throw new Error(`${label} is missing ${field}.`)
  }
  return value
}

export function requireArray(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} did not return a list.`)
  return value
}

export function planAnalyticalSubject(subjects, numericalPosition) {
  const matches = subjects.filter((subject) => subject.slug === 'analytical-ability')
  if (matches.length > 1) throw new Error('Duplicate Analytical Ability subjects exist.')
  return { existing: matches[0] ?? null, requiredPosition: numericalPosition + 1 }
}

export function findUniqueBySlug(items, slug, label) {
  const matches = items.filter((item) => item.slug === slug)
  if (matches.length > 1) throw new Error(`Duplicate ${label} records exist for ${slug}.`)
  return matches[0] ?? null
}

export async function rollbackStatusChanges(actions, onError = () => undefined) {
  for (const action of [...actions].reverse()) {
    try { await action() } catch (error) { onError(error) }
  }
}
