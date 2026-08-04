export interface MockResultItem { subjectSlug: string; subjectTitle: string; subjectPosition: number; topicSlug: string; topicTitle: string; topicPosition: number; isCorrect: boolean | null }

export interface MockResultBreakdown { slug: string; title: string; position: number; total: number; correct: number; incorrect: number; unanswered: number; percentage: number; status: 'Strong' | 'Developing' | 'Needs Review' }

export function mockScore(correct: number, total = 150): { rawScore: number; percentage: number; passed: boolean } {
  const percentage = Number(((correct / total) * 100).toFixed(2))
  return { rawScore: correct, percentage, passed: correct >= Math.ceil(total * 0.8) }
}

function breakdown(items: MockResultItem[], key: 'subject' | 'topic'): MockResultBreakdown[] {
  const groups = new Map<string, MockResultBreakdown>()
  for (const item of items) {
    const slug = key === 'subject' ? item.subjectSlug : item.topicSlug
    const current = groups.get(slug) ?? { slug, title: key === 'subject' ? item.subjectTitle : item.topicTitle, position: key === 'subject' ? item.subjectPosition : item.topicPosition, total: 0, correct: 0, incorrect: 0, unanswered: 0, percentage: 0, status: 'Needs Review' as const }
    current.total += 1
    if (item.isCorrect === true) current.correct += 1
    else if (item.isCorrect === false) current.incorrect += 1
    else current.unanswered += 1
    groups.set(slug, current)
  }
  return [...groups.values()].map((item): MockResultBreakdown => {
    const percentage = Number(((item.correct / item.total) * 100).toFixed(2))
    const status: MockResultBreakdown['status'] = percentage >= 80 ? 'Strong' : percentage >= 60 ? 'Developing' : 'Needs Review'
    return { ...item, percentage, status }
  }).sort((a, b) => a.position - b.position || a.slug.localeCompare(b.slug))
}

export function calculateMockBreakdowns(items: MockResultItem[]) { return { subjects: breakdown(items, 'subject'), topics: breakdown(items, 'topic') } }
export function strongestAndWeakest(items: MockResultBreakdown[]) { const ranked = [...items].sort((a, b) => b.percentage - a.percentage || a.position - b.position || a.slug.localeCompare(b.slug)); return { strongest: ranked[0] ?? null, weakest: [...ranked].sort((a, b) => a.percentage - b.percentage || a.position - b.position || a.slug.localeCompare(b.slug))[0] ?? null } }
