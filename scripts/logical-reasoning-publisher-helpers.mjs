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
