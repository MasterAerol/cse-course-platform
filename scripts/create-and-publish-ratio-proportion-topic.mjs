#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { ratioProportionLessonSpecs } from './lib/ratio-proportion-teaching-system-content.mjs'

const confirmation = 'create-validate-publish-ratio-proportion'
const csrfHeaderValue = 'same-origin-admin-mutation'
const topicSlug = 'ratio-and-proportion'

const generatedPracticeByLessonSlug = {
  'writing-and-simplifying-ratios': 'simplifying-ratios',
  'equivalent-ratios': 'equivalent-ratios',
  'comparing-ratios': 'comparing-ratios',
  'solving-proportions': 'solving-proportions',
  'direct-proportion': 'direct-proportion',
  'inverse-proportion': 'inverse-proportion',
  'sharing-an-amount-in-a-ratio': 'ratio-sharing',
  'ratio-and-proportion-word-problems': 'ratio-word-problems',
}

const lessonSpecs = ratioProportionLessonSpecs.map(({ title, slug, lessonType, estimatedMinutes }, index) => ({
  title,
  slug,
  lessonType,
  minutes: estimatedMinutes,
  position: index + 1,
}))

function lessonBlocks(slug) {
  const canonical = ratioProportionLessonSpecs.find((lesson) => lesson.slug === slug)
  if (canonical === undefined) throw new Error(`No canonical Ratio and Proportion content for ${slug}.`)
  return canonical.blocks
}

function fixedQuestion(prompt, correct, distractors, explanation, position) {
  return {
    prompt,
    explanation,
    points: 1,
    position,
    status: 'active',
    choices: [correct, ...distractors].map((text, index) => ({
      text,
      isCorrect: index === 0,
      position: index + 1,
    })),
  }
}

const mixedQuestions = [
  ['There are 6 blue folders and 9 red folders. What is the ratio of blue to red folders?', '6:9', ['9:6', '3:9', '6:15'], 'The requested order is blue to red, so the ratio is 6:9.'],
  ['Simplify 24:36.', '2:3', ['3:2', '4:6', '12:36'], 'Divide both terms by the GCD, 12: 24:36 = 2:3.'],
  ['Complete 5:8 = 20:x.', '32', ['23', '25', '40'], 'The scale factor is 4, so x = 8 \u00d7 4 = 32.'],
  ['Which is greater, 3:4 or 5:7?', '3:4', ['5:7', 'They are equal', 'Cannot be determined'], 'Cross-products are 3 \u00d7 7 = 21 and 5 \u00d7 4 = 20, so 3:4 is greater.'],
  ['Solve 4/7 = 20/x.', '35', ['28', '23', '80'], '4x = 7 \u00d7 20 = 140, so x = 35.'],
  ['Three shirts cost \u20b1750. How much do 8 shirts cost at the same price per shirt?', '\u20b12,000', ['\u20b12,003', '\u20b1281.25', '\u20b16,000'], 'The unit price is \u20b1250; 8 \u00d7 \u20b1250 = \u20b12,000.'],
  ['Eight equally productive workers finish a task in 15 days. How many days for 12 workers?', '10 days', ['22.5 days', '15 days', '5 days'], 'Worker-days are constant: 8 \u00d7 15 \u00f7 12 = 10 days.'],
  ['Share \u20b115,000 in the ratio 2:3. What is the larger share?', '\u20b19,000', ['\u20b16,000', '\u20b15,000', '\u20b17,500'], 'There are 5 parts. One part is \u20b13,000, so the larger share is 3 \u00d7 \u20b13,000 = \u20b19,000.'],
]

const quizQuestions = [
  ['What does the ratio 2:5 mean?', '2 of the first quantity for every 5 of the second', ['Subtract 2 from 5', 'The quantities are equal', '5 of the first for every 2 of the second'], 'A ratio is an ordered comparison.'],
  ['There are 4 managers and 12 staff members. What is managers to staff?', '4:12', ['12:4', '4:16', '8:12'], 'Managers are named first, so write 4:12.'],
  ['Simplify 50 cm : 2 m.', '1:4', ['25:1', '50:2', '1:25'], 'Convert 2 m to 200 cm, then simplify 50:200 to 1:4.'],
  ['Simplify 42:56.', '3:4', ['4:3', '21:56', '6:7'], 'The GCD is 14, so 42:56 = 3:4.'],
  ['Which ratio is equivalent to 7:9?', '21:27', ['14:27', '16:18', '9:7'], 'Multiply both terms by 3.'],
  ['Which is greater, 5:8 or 3:5?', '5:8', ['3:5', 'They are equal', 'Cannot be determined'], '5 \u00d7 5 = 25 and 3 \u00d7 8 = 24, so 5:8 is greater.'],
  ['Which statement is a proportion?', '2:3 = 8:12', ['2:3', '2 + 3 = 5', '2:3 = 6:8'], 'A proportion equates equivalent ratios.'],
  ['Solve 6/7 = 24/x.', '28', ['25', '144', '7'], '6x = 168, so x = 28.'],
  ['For 3/5 = 12/20, which cross-products verify the proportion?', '3 \u00d7 20 and 5 \u00d7 12', ['3 \u00d7 5 and 12 \u00d7 20', '3 + 20 and 5 + 12', '3 \u00d7 12 and 5 \u00d7 20'], 'The cross-products are numerator times opposite denominator.'],
  ['Five kilograms of rice cost \u20b1325. What do 8 kilograms cost at the same rate?', '\u20b1520', ['\u20b1328', '\u20b1203.13', '\u20b12,600'], 'The unit price is \u20b165; 8 \u00d7 \u20b165 = \u20b1520.'],
  ['Ten equally productive workers take 18 days. How many days would 15 workers take?', '12 days', ['27 days', '18 days', '8 days'], '10 \u00d7 18 \u00f7 15 = 12 days.'],
  ['Share \u20b124,000 in the ratio 3:5. What is the smaller share?', '\u20b19,000', ['\u20b115,000', '\u20b14,800', '\u20b18,000'], 'There are 8 parts worth \u20b13,000 each; the smaller share is 3 parts or \u20b19,000.'],
  ['A map scale is 1:50,000. How many ground centimeters does 3 map centimeters represent?', '150,000 cm', ['50,003 cm', '16,666.67 cm', '1,500,000 cm'], '3 \u00d7 50,000 = 150,000 cm.'],
  ['Six pumps fill equal tanks in 8 hours. At the same constant rate, how long would 12 pumps take for the same total work?', '4 hours', ['16 hours', '8 hours', '2 hours'], 'For fixed work, pumps and time are inverse: 6 \u00d7 8 \u00f7 12 = 4.'],
  ['A budget is shared between supplies and training in the ratio 2:3. If supplies receive \u20b140,000, what is the total budget?', '\u20b1100,000', ['\u20b160,000', '\u20b1120,000', '\u20b166,666.67'], 'Two parts equal \u20b140,000, so one part is \u20b120,000 and five parts total \u20b1100,000.'],
]

function hasRawHtml(value) {
  if (typeof value === 'string') return /<\/?[a-z][^>]*>/iu.test(value)
  if (Array.isArray(value)) return value.some(hasRawHtml)
  if (value !== null && typeof value === 'object') {
    return Object.values(value).some(hasRawHtml)
  }
  return false
}

function validateFixedQuestions(label, questions, expectedCount) {
  const failures = []

  if (questions.length !== expectedCount) {
    failures.push(`${label} expected ${expectedCount} questions, found ${questions.length}.`)
  }

  for (const question of questions) {
    const visible = new Set(
      question.choices.map((choice) => choice.text.trim().toLowerCase()),
    )
    if (question.choices.length !== 4) {
      failures.push(`${label} question ${question.position} must have four choices.`)
    }
    if (question.choices.filter((choice) => choice.isCorrect).length !== 1) {
      failures.push(`${label} question ${question.position} must have one correct choice.`)
    }
    if (visible.size !== question.choices.length) {
      failures.push(`${label} question ${question.position} has duplicate choices.`)
    }
    if (question.explanation?.trim().length < 12) {
      failures.push(`${label} question ${question.position} needs a meaningful explanation.`)
    }
  }

  return failures
}

function runGeneratorQualityGate() {
  const vitestEntry = fileURLToPath(
    new URL('../node_modules/vitest/vitest.mjs', import.meta.url),
  )
  const result = spawnSync(process.execPath, [
    vitestEntry,
    'run',
    'tests/worker.test.ts',
    '-t',
    'Dynamic ratio and proportion generator engine',
  ], {
    stdio: 'inherit',
    shell: false,
  })

  if (result.status !== 0) {
    const detail =
      result.error instanceof Error ? ` ${result.error.message}` : ''
    throw new Error(
      `The 1,000-question-per-generator quality gate failed.${detail}`,
    )
  }
}

async function main() {
  const args = parseArgs()
  const baseUrl = args.get('base-url') ?? 'http://127.0.0.1:5173'

  if (args.get('confirm') !== confirmation) {
    throw new Error(`Pass --confirm ${confirmation} to continue.`)
  }

  runGeneratorQualityGate()
  let cookie = args.get('cookie') ?? null

  async function request(path, options = {}) {
    const headers = new Headers(options.headers)
    headers.set('accept', 'application/json')
    if (cookie !== null) headers.set('cookie', cookie)
    if (options.body !== undefined) headers.set('content-type', 'application/json')
    if (options.method !== undefined && options.method !== 'GET') {
      headers.set('x-cse-admin-csrf', csrfHeaderValue)
    }

    const response = await fetch(`${baseUrl}${path}`, { ...options, headers })
    const setCookie = response.headers.get('set-cookie')
    if (setCookie !== null) cookie = setCookie.split(';')[0]
    const body = await response.json()

    if (!response.ok || body.success !== true) {
      throw new Error(`${options.method ?? 'GET'} ${path} failed: ${JSON.stringify(body)}`)
    }
    return body.data
  }

  if (cookie === null) {
    const email = args.get('email')
    const password =
      args.get('password') ?? process.env.CSE_RATIO_PROPORTION_ADMIN_PASSWORD
    if (email === undefined || password === undefined) {
      throw new Error('Pass --cookie, or --email with --password or CSE_RATIO_PROPORTION_ADMIN_PASSWORD.')
    }
    await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  const dashboard = await request('/api/admin/dashboard')
  const courseId = dashboard.cseProfessional?.id
  if (courseId === undefined) throw new Error('CSE Professional course was not found.')

  let detail = await request(`/api/admin/courses/${courseId}`)
  let subject = detail.subjects.find((item) => item.slug === 'numerical-ability')
  if (subject === undefined) throw new Error('Numerical Ability subject was not found.')

  let topic = subject.topics.find((item) => item.slug === topicSlug)
  if (topic === undefined) {
    const decimals = subject.topics.find((item) => item.slug === 'decimals')
    if (decimals === undefined) throw new Error('Decimals must exist before Ratio and Proportion.')
    const created = await request(`/api/admin/subjects/${subject.id}/topics`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Ratio and Proportion',
        slug: topicSlug,
        description: 'A structured course on understanding ratios, simplifying and comparing ratios, solving proportions, direct and inverse relationships, sharing quantities, and practical applications.',
        position: decimals.position + 1,
        status: 'draft',
      }),
    })
    topic = created.topic
  }

  for (const spec of lessonSpecs) {
    detail = await request(`/api/admin/courses/${courseId}`)
    subject = detail.subjects.find((item) => item.slug === 'numerical-ability')
    topic = subject?.topics.find((item) => item.slug === topicSlug)
    if (topic === undefined) throw new Error('Ratio and Proportion disappeared during creation.')

    let lesson = topic.lessons.find((item) => item.slug === spec.slug)
    if (lesson === undefined) {
      const created = await request(`/api/admin/topics/${topic.id}/lessons`, {
        method: 'POST',
        body: JSON.stringify({
          title: spec.title,
          slug: spec.slug,
          lessonType: spec.lessonType,
          summary: `${spec.title} in the Ratio and Proportion topic.`,
          estimatedMinutes: spec.minutes,
          position: spec.position,
          isPreview: false,
          requiresPrevious: true,
          status: 'draft',
        }),
      })
      lesson = created.lesson
    } else if (lesson.lessonType !== spec.lessonType) {
      throw new Error(`${spec.slug} has stored type ${lesson.lessonType}; expected ${spec.lessonType}.`)
    } else if (lesson.status !== 'published') {
      const updated = await request(`/api/admin/lessons/${lesson.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: spec.title,
          summary: `${spec.title} in the Ratio and Proportion topic.`,
          estimatedMinutes: spec.minutes,
          position: spec.position,
          isPreview: false,
          requiresPrevious: true,
          status: 'draft',
          updatedAt: lesson.updatedAt,
        }),
      })
      lesson = updated.lesson
    }

    const desiredBlocks = lessonBlocks(spec.slug)
    if (!Array.isArray(desiredBlocks)) throw new Error(`No blocks defined for ${spec.slug}.`)
    const currentBlocks = await request(`/api/admin/lessons/${lesson.id}/blocks`)
    for (const [index, block] of desiredBlocks.entries()) {
      const position = index + 1
      const existing = currentBlocks.blocks.find((item) => item.position === position)
      const path = existing === undefined
        ? `/api/admin/lessons/${lesson.id}/blocks`
        : `/api/admin/lesson-blocks/${existing.id}`
      await request(path, {
        method: existing === undefined ? 'POST' : 'PATCH',
        body: JSON.stringify({ ...block, position }),
      })
    }

    const generatorSlug = generatedPracticeByLessonSlug[spec.slug]
    if (generatorSlug !== undefined) {
      await request(`/api/admin/lessons/${lesson.id}/practice-set`, {
        method: 'PUT',
        body: JSON.stringify({
          title: spec.title,
          instructions: 'Answer five generated questions, then review the worked explanations.',
          passingScore: 60,
          questionCount: 5,
          maximumAttempts: null,
          showExplanations: true,
          status: lesson.status === 'published' ? 'published' : 'draft',
          questionSource: 'generated',
          generatorSlug,
          generatorVersion: 1,
          difficulty: { easy: 2, medium: 2, hard: 1 },
        }),
      })
    }

    if (spec.slug === 'mixed-ratio-and-proportion-applications') {
      const saved = await request(`/api/admin/lessons/${lesson.id}/practice-set`, {
        method: 'PUT',
        body: JSON.stringify({
          title: spec.title,
          instructions: 'Classify each relationship and solve using exact ratio reasoning.',
          passingScore: 60,
          questionCount: 8,
          maximumAttempts: null,
          showExplanations: true,
          status: lesson.status === 'published' ? 'published' : 'draft',
          questionSource: 'fixed',
        }),
      })
      const current = await request(`/api/admin/lessons/${lesson.id}/practice-set`)
      for (const [index, item] of mixedQuestions.entries()) {
        const input = fixedQuestion(item[0], item[1], item[2], item[3], index + 1)
        const existing = current.questions.find((question) => question.position === input.position)
        const path = existing === undefined
          ? `/api/admin/practice-sets/${saved.practiceSet.id}/questions`
          : `/api/admin/practice-questions/${existing.id}`
        const body = existing === undefined ? input : {
          ...input,
          updatedAt: existing.updatedAt,
          choices: input.choices.map((choice) => ({
            ...choice,
            id: existing.choices.find((old) => old.position === choice.position)?.id,
          })),
        }
        await request(path, {
          method: existing === undefined ? 'POST' : 'PATCH',
          body: JSON.stringify(body),
        })
      }
    }

    if (spec.slug === 'ratio-and-proportion-topic-quiz') {
      const saved = await request(`/api/admin/lessons/${lesson.id}/quiz`, {
        method: 'PUT',
        body: JSON.stringify({
          title: spec.title,
          description: 'A fixed 15-question quiz covering Ratio and Proportion.',
          quizType: 'topic',
          passingScore: 70,
          timeLimitMinutes: null,
          maximumAttempts: null,
          shuffleQuestions: false,
          shuffleChoices: false,
          showExplanations: true,
          status: lesson.status === 'published' ? 'published' : 'draft',
        }),
      })
      const current = await request(`/api/admin/lessons/${lesson.id}/quiz`)
      for (const [index, item] of quizQuestions.entries()) {
        const input = {
          ...fixedQuestion(item[0], item[1], item[2], item[3], index + 1),
          questionType: 'multiple_choice',
        }
        const existing = current.questions.find((question) => question.position === input.position)
        const path = existing === undefined
          ? `/api/admin/quizzes/${saved.quiz.id}/questions`
          : `/api/admin/questions/${existing.id}`
        const body = existing === undefined ? input : {
          ...input,
          updatedAt: existing.updatedAt,
          choices: input.choices.map((choice) => ({
            ...choice,
            id: existing.choices.find((old) => old.position === choice.position)?.id,
          })),
        }
        await request(path, {
          method: existing === undefined ? 'POST' : 'PATCH',
          body: JSON.stringify(body),
        })
      }
    }
  }

  const failures = []
  const registry = await request('/api/admin/practice-generators')
  const registered = new Set(
    registry.generators.map((generator) => `${generator.slug}@${generator.version}`),
  )
  for (const generatorSlug of Object.values(generatedPracticeByLessonSlug)) {
    if (!registered.has(`${generatorSlug}@1`)) {
      failures.push(`Generator ${generatorSlug}@1 is not registered.`)
    }
  }

  detail = await request(`/api/admin/courses/${courseId}`)
  subject = detail.subjects.find((item) => item.slug === 'numerical-ability')
  const decimals = subject?.topics.find((item) => item.slug === 'decimals')
  topic = subject?.topics.find((item) => item.slug === topicSlug)
  if (topic === undefined) {
    failures.push('Ratio and Proportion was not found under Numerical Ability.')
  } else {
    if (decimals === undefined || topic.position !== decimals.position + 1) {
      failures.push('Ratio and Proportion must be positioned immediately after Decimals.')
    }
    if (topic.lessons.length !== 12) failures.push(`Expected 12 lessons; found ${topic.lessons.length}.`)
    if (new Set(topic.lessons.map((lesson) => lesson.position)).size !== topic.lessons.length) {
      failures.push('Lesson positions must be unique.')
    }

    for (const spec of lessonSpecs) {
      const lesson = topic.lessons.find((item) => item.slug === spec.slug)
      if (lesson === undefined) {
        failures.push(`Missing lesson ${spec.slug}.`)
        continue
      }
      if (lesson.lessonType !== spec.lessonType) failures.push(`${spec.slug} has an incorrect type.`)
      if (lesson.requiresPrevious !== true || lesson.isPreview !== false) {
        failures.push(`${spec.slug} does not preserve sequential locking.`)
      }
      const blocks = await request(`/api/admin/lessons/${lesson.id}/blocks`)
      if (blocks.blocks.length < 3) failures.push(`${spec.slug} lacks meaningful instructional blocks.`)
      if (blocks.blocks.some((block) => hasRawHtml(block.content))) {
        failures.push(`${spec.slug} contains raw HTML.`)
      }

      const generatorSlug = generatedPracticeByLessonSlug[spec.slug]
      if (generatorSlug !== undefined) {
        const practice = await request(`/api/admin/lessons/${lesson.id}/practice-set`)
        const set = practice.practiceSet
        if (
          set === null ||
          set.questionSource !== 'generated' ||
          set.generator?.slug !== generatorSlug ||
          set.generator?.version !== 1 ||
          set.generator?.difficulty.easy !== 2 ||
          set.generator?.difficulty.medium !== 2 ||
          set.generator?.difficulty.hard !== 1 ||
          set.questionCount !== 5 ||
          set.passingScore !== 60 ||
          set.maximumAttempts !== null ||
          set.showExplanations !== true
        ) failures.push(`${spec.slug} has an invalid generated practice configuration.`)
      }
      if (spec.slug === 'mixed-ratio-and-proportion-applications') {
        const practice = await request(`/api/admin/lessons/${lesson.id}/practice-set`)
        failures.push(...validateFixedQuestions('Mixed Applications', practice.questions, 8))
      }
      if (spec.slug === 'ratio-and-proportion-topic-quiz') {
        const quiz = await request(`/api/admin/lessons/${lesson.id}/quiz`)
        failures.push(...validateFixedQuestions('Topic Quiz', quiz.questions, 15))
      }
    }
  }

  if (failures.length > 0) {
    console.error('Ratio and Proportion validation failed. Nothing was published.')
    for (const failure of failures) console.error(`- ${failure}`)
    process.exitCode = 1
    return
  }

  const rollbackActions = []
  try {
    detail = await request(`/api/admin/courses/${courseId}`)
    topic = detail.subjects
      .find((item) => item.slug === 'numerical-ability')
      ?.topics.find((item) => item.slug === topicSlug)
    if (topic === undefined) throw new Error('Topic disappeared before publication.')

    for (const spec of lessonSpecs) {
      const lesson = topic.lessons.find((item) => item.slug === spec.slug)
      if (lesson === undefined) throw new Error(`${spec.slug} disappeared before publication.`)
      const generatorSlug = generatedPracticeByLessonSlug[spec.slug]

      if (generatorSlug !== undefined) {
        const current = await request(`/api/admin/lessons/${lesson.id}/practice-set`)
        if (current.practiceSet.status !== 'published') {
          await request(`/api/admin/lessons/${lesson.id}/practice-set`, {
            method: 'PUT',
            body: JSON.stringify({
              title: spec.title,
              instructions: 'Answer five generated questions, then review the worked explanations.',
              passingScore: 60,
              questionCount: 5,
              maximumAttempts: null,
              showExplanations: true,
              status: 'published',
              questionSource: 'generated',
              generatorSlug,
              generatorVersion: 1,
              difficulty: { easy: 2, medium: 2, hard: 1 },
            }),
          })
          rollbackActions.push(async () => request(`/api/admin/lessons/${lesson.id}/practice-set`, {
            method: 'PUT',
            body: JSON.stringify({
              title: spec.title,
              instructions: 'Answer five generated questions, then review the worked explanations.',
              passingScore: 60,
              questionCount: 5,
              maximumAttempts: null,
              showExplanations: true,
              status: current.practiceSet.status,
              questionSource: 'generated',
              generatorSlug,
              generatorVersion: 1,
              difficulty: { easy: 2, medium: 2, hard: 1 },
            }),
          }))
        }
      }

      if (spec.slug === 'mixed-ratio-and-proportion-applications') {
        const current = await request(`/api/admin/lessons/${lesson.id}/practice-set`)
        if (current.practiceSet.status !== 'published') {
          await request(`/api/admin/lessons/${lesson.id}/practice-set`, {
            method: 'PUT',
            body: JSON.stringify({
              title: spec.title,
              instructions: 'Classify each relationship and solve using exact ratio reasoning.',
              passingScore: 60,
              questionCount: 8,
              maximumAttempts: null,
              showExplanations: true,
              status: 'published',
              questionSource: 'fixed',
            }),
          })
          rollbackActions.push(async () => request(`/api/admin/lessons/${lesson.id}/practice-set`, {
            method: 'PUT',
            body: JSON.stringify({
              title: spec.title,
              instructions: 'Classify each relationship and solve using exact ratio reasoning.',
              passingScore: 60,
              questionCount: 8,
              maximumAttempts: null,
              showExplanations: true,
              status: current.practiceSet.status,
              questionSource: 'fixed',
            }),
          }))
        }
      }

      if (spec.slug === 'ratio-and-proportion-topic-quiz') {
        const current = await request(`/api/admin/lessons/${lesson.id}/quiz`)
        if (current.quiz.status !== 'published') {
          await request(`/api/admin/lessons/${lesson.id}/quiz`, {
            method: 'PUT',
            body: JSON.stringify({
              title: spec.title,
              description: 'A fixed 15-question quiz covering Ratio and Proportion.',
              quizType: 'topic',
              passingScore: 70,
              timeLimitMinutes: null,
              maximumAttempts: null,
              shuffleQuestions: false,
              shuffleChoices: false,
              showExplanations: true,
              status: 'published',
            }),
          })
          rollbackActions.push(async () => request(`/api/admin/lessons/${lesson.id}/quiz`, {
            method: 'PUT',
            body: JSON.stringify({
              title: spec.title,
              description: 'A fixed 15-question quiz covering Ratio and Proportion.',
              quizType: 'topic',
              passingScore: 70,
              timeLimitMinutes: null,
              maximumAttempts: null,
              shuffleQuestions: false,
              shuffleChoices: false,
              showExplanations: true,
              status: current.quiz.status,
            }),
          }))
        }
      }
    }

    detail = await request(`/api/admin/courses/${courseId}`)
    topic = detail.subjects
      .find((item) => item.slug === 'numerical-ability')
      ?.topics.find((item) => item.slug === topicSlug)
    if (topic === undefined) throw new Error('Topic disappeared before lesson publication.')

    for (const spec of lessonSpecs) {
      const lesson = topic.lessons.find((item) => item.slug === spec.slug)
      if (lesson === undefined) throw new Error(`${spec.slug} disappeared before lesson publication.`)
      if (lesson.status !== 'published') {
        await request(`/api/admin/lessons/${lesson.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'published', updatedAt: lesson.updatedAt }),
        })
        rollbackActions.push(async () => {
          const refreshed = await request(`/api/admin/courses/${courseId}`)
          const current = refreshed.subjects
            .find((item) => item.slug === 'numerical-ability')
            ?.topics.find((item) => item.slug === topicSlug)
            ?.lessons.find((item) => item.id === lesson.id)
          if (current !== undefined) {
            return request(`/api/admin/lessons/${lesson.id}`, {
              method: 'PATCH',
              body: JSON.stringify({ status: lesson.status, updatedAt: current.updatedAt }),
            })
          }
        })
      }
    }

    detail = await request(`/api/admin/courses/${courseId}`)
    topic = detail.subjects
      .find((item) => item.slug === 'numerical-ability')
      ?.topics.find((item) => item.slug === topicSlug)
    if (topic === undefined) throw new Error('Topic disappeared before final publication.')
    if (topic.status !== 'published') {
      const previousStatus = topic.status
      await request(`/api/admin/topics/${topic.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'published', updatedAt: topic.updatedAt }),
      })
      rollbackActions.push(async () => {
        const refreshed = await request(`/api/admin/courses/${courseId}`)
        const current = refreshed.subjects
          .find((item) => item.slug === 'numerical-ability')
          ?.topics.find((item) => item.slug === topicSlug)
        if (current !== undefined) {
          return request(`/api/admin/topics/${topic.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: previousStatus, updatedAt: current.updatedAt }),
          })
        }
      })
    }
  } catch (error) {
    console.error(`Publication failed: ${error instanceof Error ? error.message : String(error)}`)
    console.error('Rolling back statuses changed during this run.')
    for (const rollback of rollbackActions.reverse()) {
      try {
        await rollback()
      } catch (rollbackError) {
        console.error(`Rollback failed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`)
      }
    }
    process.exitCode = 1
    return
  }

  console.log('Ratio and Proportion was created, validated, and published.')
  for (const spec of lessonSpecs) {
    console.log(`- ${spec.position}. ${spec.title} (${spec.lessonType})`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
