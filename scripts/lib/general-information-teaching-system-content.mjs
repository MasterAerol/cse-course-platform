const clone = (value) => JSON.parse(JSON.stringify(value))
const compact = (value, limit = 80) => String(value ?? '').replace(/\s+/gu, ' ').trim().slice(0, limit)
const callout = (title, text, variant = 'info') => ({ blockType: 'callout', content: { title, text, variant } })
const paragraph = (text) => ({ blockType: 'paragraph', content: { text } })

function visualForScenario(config, lesson, example, exampleIndex) {
  const steps = Array.isArray(example.content.steps) ? example.content.steps.map((step) => compact(step)) : []
  const scenario = compact(example.content.problem)
  const conclusion = compact(example.content.answer)
  const principle = steps[0] ?? 'Identify the authoritative concept, role, right, duty, or environmental rule.'
  const application = steps[1] ?? 'Apply that principle only to the actor and situation described.'
  return {
    kind: 'transformation',
    ariaLabel: 'Teaching board for ' + lesson.title + ' scenario ' + (exampleIndex + 1) + ': identify the principle, apply it to the stated facts, and verify the conclusion.',
    stages: [
      { label: 'Scenario', expression: [{ text: scenario }] },
      { label: 'Principle', expression: [{ text: principle, emphasis: 'highlight' }] },
      { label: 'Apply', expression: [{ text: application }] },
      { label: 'Conclusion', expression: [{ text: conclusion, emphasis: 'final' }] },
    ],
    transitions: [
      {
        label: 'identify the governing idea',
        whatChanged: 'The scenario is matched to its authoritative concept, role, right, duty, or rule.',
        why: 'Related institutions and principles can sound alike but have different scopes.',
        source: principle,
        arrow: 'straight',
      },
      {
        label: 'apply exact scope',
        whatChanged: 'The principle is applied only to the stated actor and facts.',
        why: 'An attractive statement can still be wrong when it is too broad or applies to another actor.',
        source: application,
        arrow: 'straight',
      },
      {
        label: 'verify the conclusion',
        whatChanged: 'The conclusion is checked against the authoritative wording and the complete scenario.',
        why: 'Verification prevents familiar terms and absolute wording from replacing the actual rule.',
        source: conclusion,
        arrow: 'straight',
      },
    ],
    memoryTip: {
      title: config.memoryRule,
      rule: config.method,
      reason: config.memoryReason,
      examples: [principle, conclusion],
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
    if (block.blockType !== 'example' || exampleIndex >= 2) continue
    block.content.visual = visualForScenario(config, lesson, block, exampleIndex)
    exampleIndex += 1
  }
  if (exampleIndex < 2) throw new Error(config.topicTitle + ' lesson ' + lesson.slug + ' must have two authoritative scenario examples.')
  const summaryIndex = source.findLastIndex((block) => block.blockType === 'summary')
  const summary = summaryIndex >= 0 ? source.splice(summaryIndex, 1)[0] : { blockType: 'summary', content: { items: [] } }
  source.push(callout('CSE recognition method', config.method + '. ' + config.methodReason, 'important'))
  source.push(callout('Memory rule — ' + config.memoryRule, config.memoryRule + '. Why: ' + config.memoryReason, 'important'))
  if (lesson.lessonType !== 'reading') source.push(paragraph('Practice CTA: continue to the linked ' + lesson.title + ' activity. Its existing route, generated or fixed questions, answer keys, scoring, explanations, Smart Recovery ownership, and curriculum lock remain unchanged.'))
  const items = Array.isArray(summary.content.items) ? summary.content.items.slice() : []
  items.push('Identify the authoritative concept before matching an answer choice.')
  items.push('Verify the actor, scope, facts, and application before choosing.')
  summary.content.items = Array.from(new Set(items))
  source.push(summary)
  return source
}

export function buildGeneralInformationTeachingSystem(config) {
  if (!Array.isArray(config.lessonSpecs) || config.lessonSpecs.length === 0) throw new Error('General Information lesson specs are required.')
  return config.lessonSpecs.map((lesson, index) => ({ title: lesson.title, slug: lesson.slug, lessonType: lesson.lessonType, estimatedMinutes: lesson.minutes, position: index + 1, blocks: canonicalBlocks(config, lesson) }))
}
