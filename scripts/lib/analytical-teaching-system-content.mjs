const clone = (value) => JSON.parse(JSON.stringify(value))
const compact = (value, limit = 120) => String(value ?? '').replace(/\s+/gu, ' ').trim().slice(0, limit)
const callout = (title, text, variant = 'info') => ({ blockType: 'callout', content: { title, text, variant } })
const paragraph = (text) => ({ blockType: 'paragraph', content: { text } })

function visualForExample(config, lesson, example, exampleIndex) {
  const steps = Array.isArray(example.content.steps) ? example.content.steps.map((step) => compact(step)) : []
  const problem = compact(example.content.problem, 150)
  const answer = compact(example.content.answer, 150)
  const organize = steps[0] ?? 'Translate the given information into the topic structure.'
  const test = steps[1] ?? 'Apply the candidate rule to every relevant clue.'
  return {
    kind: 'transformation',
    ariaLabel: 'Reasoning board for ' + lesson.title + ' example ' + (exampleIndex + 1) + ': organize the evidence, test the rule, and verify the answer.',
    stages: [
      { label: 'Given', expression: [{ text: problem }] },
      { label: 'Organize', expression: [{ text: organize, emphasis: 'highlight' }] },
      { label: 'Test', expression: [{ text: test }] },
      { label: 'Verify', expression: [{ text: answer, emphasis: 'final' }] },
    ],
    transitions: [
      {
        label: 'structure the evidence',
        whatChanged: 'The prompt becomes an explicit relationship, pattern, condition, order, or data set.',
        why: 'Organized evidence is easier to test than an unstructured sentence.',
        source: organize,
        arrow: 'straight',
      },
      {
        label: 'test the rule',
        whatChanged: 'A candidate rule is checked against all relevant evidence.',
        why: 'A rule that fits only one clue or transition is not yet proven.',
        source: test,
        arrow: 'straight',
      },
      {
        label: 'verify the result',
        whatChanged: 'The result is compared with the original question and every condition.',
        why: 'Verification catches reversed direction, omitted conditions, and arithmetic slips.',
        source: answer,
        arrow: 'straight',
      },
    ],
    memoryTip: {
      title: config.memoryRule,
      rule: config.method,
      reason: config.memoryReason,
      examples: [organize, answer],
    },
  }
}

function canonicalBlocks(config, lesson) {
  const source = config.blocksFor(lesson.slug).map(clone)
  const firstHeading = source.find((block) => block.blockType === 'heading')
  if (firstHeading !== undefined) {
    firstHeading.content.level = 1
    firstHeading.content.text = lesson.title
  }
  let exampleIndex = 0
  for (const block of source) {
    if (block.blockType !== 'example') continue
    if (exampleIndex >= 2) continue
    block.content.visual = visualForExample(config, lesson, block, exampleIndex)
    exampleIndex += 1
  }
  if (exampleIndex < 2) throw new Error(config.topicTitle + ' lesson ' + lesson.slug + ' must have at least two worked examples.')
  const summaryIndex = source.findLastIndex((block) => block.blockType === 'summary')
  const summary = summaryIndex >= 0 ? source.splice(summaryIndex, 1)[0] : { blockType: 'summary', content: { items: [] } }
  source.push(callout(
    'CSE reasoning method',
    config.method + '. ' + config.methodReason,
    'important',
  ))
  source.push(callout(
    'Memory rule — ' + config.memoryRule,
    config.memoryRule + '. Why: ' + config.memoryReason,
    'important',
  ))
  if (lesson.lessonType !== 'reading') {
    source.push(paragraph(
      'Practice CTA: continue to the linked ' + lesson.title + ' activity. Its existing route, generator or fixed questions, scoring, explanations, Smart Recovery ownership, and curriculum lock remain unchanged.',
    ))
  }
  const items = Array.isArray(summary.content.items) ? summary.content.items.slice() : []
  items.push('Test the proposed rule against every relevant clue before choosing.')
  items.push('Verify the final answer against the original question.')
  summary.content.items = Array.from(new Set(items))
  source.push(summary)
  return source
}

export function buildAnalyticalTeachingSystem(config) {
  if (!Array.isArray(config.lessonSpecs) || config.lessonSpecs.length === 0) throw new Error('Analytical lesson specs are required.')
  return config.lessonSpecs.map((lesson, index) => ({
    title: lesson.title,
    slug: lesson.slug,
    lessonType: lesson.lessonType,
    estimatedMinutes: lesson.minutes,
    position: index + 1,
    blocks: canonicalBlocks(config, lesson),
  }))
}
