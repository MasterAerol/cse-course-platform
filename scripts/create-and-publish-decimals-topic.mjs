#!/usr/bin/env node

import { decimalsLessonSpecs } from './lib/decimals-teaching-system-content.mjs'

const csrfHeaderValue = 'same-origin-admin-mutation'
const confirmation = 'create-validate-publish-decimals'

const generatedPracticeByLessonSlug = {
  'comparing-and-ordering-decimals': 'comparing-decimals',
  'rounding-decimals': 'rounding-decimals',
  'adding-decimals': 'adding-decimals',
  'subtracting-decimals': 'subtracting-decimals',
  'multiplying-decimals': 'multiplying-decimals',
  'dividing-decimals': 'dividing-decimals',
  'fractions-decimals-and-percentages-decimals': 'decimal-conversions',
}

const expectedGeneratorSlugs = Object.values(generatedPracticeByLessonSlug)

const lessonSpecs = decimalsLessonSpecs.map(({ title, slug, lessonType, estimatedMinutes }) => ({
  title,
  slug,
  lessonType,
  minutes: estimatedMinutes,
}))

function lessonBlocks(spec) {
  const canonical = decimalsLessonSpecs.find((lesson) => lesson.slug === spec.slug)
  if (canonical === undefined) throw new Error(`No canonical Decimals content for ${spec.slug}.`)
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

const applicationQuestions = [
  ['Maria bought a notebook for ₱38.75 and a pen for ₱12.50. How much did she spend?', '₱51.25', ['₱50.25', '₱512.50', '₱26.25'], 'Add money amounts by aligning decimal points: 38.75 + 12.50 = 51.25.'],
  ['A ribbon is 2.5 meters long. Ana cuts off 0.75 meter. How much ribbon remains?', '1.75 meters', ['3.25 meters', '1.85 meters', '17.5 meters'], 'Subtract 0.75 from 2.50 to get 1.75 meters.'],
  ['A runner covers 3.6 km in the morning and 4.25 km in the afternoon. What is the total distance?', '7.85 km', ['7.21 km', '78.5 km', '0.65 km'], 'Add 3.60 + 4.25 = 7.85 km.'],
  ['A store has 15.5 kg of rice and sells 4.75 kg. How many kilograms remain?', '10.75 kg', ['11.25 kg', '107.5 kg', '20.25 kg'], 'Subtract 4.75 from 15.50 to get 10.75 kg.'],
  ['A bottle holds 1.25 liters. How much do 4 bottles hold?', '5 liters', ['4.25 liters', '0.3125 liter', '50 liters'], 'Multiply 1.25 by 4 to get 5 liters.'],
  ['A ₱96.80 bill is shared equally by 4 friends. How much does each friend pay?', '₱24.20', ['₱23.20', '₱242.00', '₱100.80'], 'Divide 96.80 by 4 to get 24.20.'],
  ['Round 18.746 to the nearest hundredth.', '18.75', ['18.74', '18.7', '187.46'], 'The thousandths digit is 6, so 18.746 rounds up to 18.75.'],
  ['Write 0.35 as a percentage.', '35%', ['3.5%', '350%', '0.35%'], 'Multiply the decimal by 100: 0.35 = 35%.'],
]

const quizQuestions = [
  ['In 5.482, which digit is in the hundredths place?', '8', ['4', '2', '5'], 'The hundredths place is the second digit to the right of the decimal point.'],
  ['How is 0.6 read?', 'six tenths', ['six hundredths', 'sixty ones', 'six thousandths'], 'One decimal place means tenths.'],
  ['Write nine hundredths as a decimal.', '0.09', ['0.9', '9.00', '0.009'], 'Hundredths need two decimal places, so nine hundredths is 0.09.'],
  ['Which decimal is greater: 0.47 or 0.5?', '0.5', ['0.47', '0.047', '0.05'], '0.5 is 0.50, and 0.50 is greater than 0.47.'],
  ['Arrange from least to greatest: 1.2, 1.05, 1.15.', '1.05, 1.15, 1.2', ['1.2, 1.15, 1.05', '1.15, 1.05, 1.2', '1.05, 1.2, 1.15'], 'Compare as 1.20, 1.05, and 1.15.'],
  ['Round 6.84 to the nearest tenth.', '6.8', ['6.9', '6.84', '68.4'], 'The hundredths digit is 4, so the tenths digit stays 8.'],
  ['Round 14.376 to the nearest hundredth.', '14.38', ['14.37', '14.4', '143.76'], 'The thousandths digit is 6, so 14.37 rounds up to 14.38.'],
  ['Compute 3.45 + 2.8.', '6.25', ['5.125', '62.5', '0.65'], 'Write 2.8 as 2.80, then add 3.45 + 2.80 = 6.25.'],
  ['Compute 9.6 - 3.85.', '5.75', ['6.25', '57.5', '13.45'], 'Write 9.6 as 9.60, then subtract 3.85 to get 5.75.'],
  ['Compute 1.2 x 0.4.', '0.48', ['4.8', '1.6', '0.048'], '12 x 4 = 48, with two decimal places total, so the product is 0.48.'],
  ['Compute 7.5 / 3.', '2.5', ['22.5', '0.25', '4.5'], '7.5 divided by 3 is 2.5.'],
  ['Write 3/4 as a decimal.', '0.75', ['0.34', '7.5', '0.075'], '3 divided by 4 equals 0.75.'],
  ['Write 0.82 as a percentage.', '82%', ['8.2%', '820%', '0.82%'], 'Multiply by 100 to convert a decimal to percent.'],
  ['A snack costs ₱18.50. How much do 3 snacks cost?', '₱55.50', ['₱21.50', '₱5.55', '₱555.00'], '18.50 x 3 = 55.50.'],
  ['A tank had 12.5 liters of water. It lost 2.75 liters, then gained 1.4 liters. How much water is in the tank?', '11.15 liters', ['9.75 liters', '111.5 liters', '16.65 liters'], '12.50 - 2.75 = 9.75, then 9.75 + 1.40 = 11.15.'],
]

function hasRawHtml(value) {
  if (typeof value === 'string') {
    return /<\/?[a-z][^>]*>/i.test(value)
  }

  if (Array.isArray(value)) {
    return value.some(hasRawHtml)
  }

  if (value !== null && typeof value === 'object') {
    return Object.values(value).some(hasRawHtml)
  }

  return false
}

function validateFixedQuestions(entity, questions, expectedCount) {
  const failures = []

  if (questions.length !== expectedCount) {
    failures.push(`${entity} expected ${expectedCount} questions, found ${questions.length}.`)
  }

  for (const question of questions) {
    if (question.choices.length !== 4) {
      failures.push(`${entity} question ${question.position} does not have four choices.`)
    }

    if (question.choices.filter((choice) => choice.isCorrect).length !== 1) {
      failures.push(`${entity} question ${question.position} does not have exactly one correct choice.`)
    }

    const visibleChoices = new Set(question.choices.map((choice) => choice.text.trim().toLowerCase()))

    if (visibleChoices.size !== question.choices.length) {
      failures.push(`${entity} question ${question.position} has duplicate visible choices.`)
    }
  }

  return failures
}

async function main() {
  const args = parseArgs()
  const baseUrl = args.get('base-url') ?? 'http://127.0.0.1:5173'

  if (args.get('confirm') !== confirmation) {
    throw new Error(`Pass --confirm ${confirmation} to create, validate, and publish Decimals.`)
  }

  let cookie = args.get('cookie') ?? null

  async function request(path, options = {}) {
    const headers = new Headers(options.headers)
    headers.set('accept', 'application/json')

    if (cookie !== null) {
      headers.set('cookie', cookie)
    }

    if (options.body !== undefined) {
      headers.set('content-type', 'application/json')
    }

    if (options.method !== undefined && options.method !== 'GET') {
      headers.set('x-cse-admin-csrf', csrfHeaderValue)
    }

    const response = await fetch(`${baseUrl}${path}`, { ...options, headers })
    const setCookie = response.headers.get('set-cookie')

    if (setCookie !== null) {
      cookie = setCookie.split(';')[0]
    }

    const body = await response.json()

    if (!response.ok || body.success !== true) {
      throw new Error(`${options.method ?? 'GET'} ${path} failed: ${JSON.stringify(body)}`)
    }

    return body.data
  }

  if (cookie === null) {
    const email = args.get('email')
    const password = args.get('password') ?? process.env.CSE_DECIMALS_ADMIN_PASSWORD

    if (email === undefined || password === undefined) {
      throw new Error('Pass --cookie, or pass --email with --password or CSE_DECIMALS_ADMIN_PASSWORD.')
    }

    await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  const dashboard = await request('/api/admin/dashboard')
  const courseId = dashboard.cseProfessional?.id

  if (courseId === undefined) {
    throw new Error('CSE Professional course was not found.')
  }

  let detail = await request(`/api/admin/courses/${courseId}`)
  const subject = detail.subjects.find((item) => item.slug === 'numerical-ability')

  if (subject === undefined) {
    throw new Error('Numerical Ability subject was not found.')
  }

  let topic = subject.topics.find((item) => item.slug === 'decimals')

  if (topic === undefined) {
    const fractions = subject.topics.find((item) => item.slug === 'fractions')
    const created = await request(`/api/admin/subjects/${subject.id}/topics`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Decimals',
        slug: 'decimals',
        description: 'A complete CSE review topic for decimal place value, operations, conversions, and applications.',
        position: (fractions?.position ?? subject.topics.length) + 1,
        status: 'draft',
      }),
    })
    topic = created.topic
  }

  const createdContent = []

  for (const [index, spec] of lessonSpecs.entries()) {
    detail = await request(`/api/admin/courses/${courseId}`)
    const refreshedSubject = detail.subjects.find((item) => item.slug === 'numerical-ability')
    const refreshedTopic = refreshedSubject?.topics.find((item) => item.slug === 'decimals')

    if (refreshedTopic === undefined) {
      throw new Error('Decimals topic disappeared during creation.')
    }

    let lesson = refreshedTopic.lessons.find((item) => item.slug === spec.slug)

    if (lesson === undefined) {
      const created = await request(`/api/admin/topics/${refreshedTopic.id}/lessons`, {
        method: 'POST',
        body: JSON.stringify({
          title: spec.title,
          slug: spec.slug,
          lessonType: spec.lessonType,
          summary: `${spec.title} for the Decimals topic.`,
          estimatedMinutes: spec.minutes,
          position: index + 1,
          isPreview: false,
          requiresPrevious: true,
          status: 'draft',
        }),
      })
      lesson = created.lesson
    } else if (lesson.lessonType !== spec.lessonType) {
      throw new Error(`Lesson ${spec.slug} has stored type ${lesson.lessonType}, expected ${spec.lessonType}.`)
    } else if (lesson.status !== 'published') {
      const updated = await request(`/api/admin/lessons/${lesson.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: spec.title,
          summary: `${spec.title} for the Decimals topic.`,
          estimatedMinutes: spec.minutes,
          position: index + 1,
          status: 'draft',
          updatedAt: lesson.updatedAt,
        }),
      })
      lesson = updated.lesson
    }

    const currentBlocks = await request(`/api/admin/lessons/${lesson.id}/blocks`)

    for (const [blockIndex, block] of lessonBlocks(spec).entries()) {
      const position = blockIndex + 1
      const existing = currentBlocks.blocks.find((item) => item.position === position)

      if (existing === undefined) {
        await request(`/api/admin/lessons/${lesson.id}/blocks`, {
          method: 'POST',
          body: JSON.stringify({ ...block, position }),
        })
      } else {
        await request(`/api/admin/lesson-blocks/${existing.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ ...block, position }),
        })
      }
    }

    const generatorSlug = generatedPracticeByLessonSlug[spec.slug]

    if (generatorSlug !== undefined) {
      await request(`/api/admin/lessons/${lesson.id}/practice-set`, {
        method: 'PUT',
        body: JSON.stringify({
          title: spec.title,
          instructions: 'Answer five generated decimal questions. Review explanations after submission.',
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

    if (spec.slug === 'decimal-applications') {
      const saved = await request(`/api/admin/lessons/${lesson.id}/practice-set`, {
        method: 'PUT',
        body: JSON.stringify({
          title: 'Decimal Applications',
          instructions: 'Solve each application using decimal arithmetic and units.',
          passingScore: 60,
          questionCount: applicationQuestions.length,
          maximumAttempts: null,
          showExplanations: true,
          status: lesson.status === 'published' ? 'published' : 'draft',
          questionSource: 'fixed',
        }),
      })
      const current = await request(`/api/admin/lessons/${lesson.id}/practice-set`)

      for (const [questionIndex, item] of applicationQuestions.entries()) {
        const input = fixedQuestion(item[0], item[1], item[2], item[3], questionIndex + 1)
        const existing = current.questions.find((question) => question.position === input.position)

        if (existing === undefined) {
          await request(`/api/admin/practice-sets/${saved.practiceSet.id}/questions`, {
            method: 'POST',
            body: JSON.stringify(input),
          })
        } else {
          await request(`/api/admin/practice-questions/${existing.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              ...input,
              updatedAt: existing.updatedAt,
              choices: input.choices.map((choice) => ({
                ...choice,
                id: existing.choices.find((oldChoice) => oldChoice.position === choice.position)?.id,
              })),
            }),
          })
        }
      }
    }

    if (spec.slug === 'decimals-topic-quiz') {
      const saved = await request(`/api/admin/lessons/${lesson.id}/quiz`, {
        method: 'PUT',
        body: JSON.stringify({
          title: 'Decimals Topic Quiz',
          description: 'A 15-question fixed quiz covering the Decimals topic.',
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

      for (const [questionIndex, item] of quizQuestions.entries()) {
        const input = {
          ...fixedQuestion(item[0], item[1], item[2], item[3], questionIndex + 1),
          questionType: 'multiple_choice',
        }
        const existing = current.questions.find((question) => question.position === input.position)

        if (existing === undefined) {
          await request(`/api/admin/quizzes/${saved.quiz.id}/questions`, {
            method: 'POST',
            body: JSON.stringify(input),
          })
        } else {
          await request(`/api/admin/questions/${existing.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              ...input,
              updatedAt: existing.updatedAt,
              choices: input.choices.map((choice) => ({
                ...choice,
                id: existing.choices.find((oldChoice) => oldChoice.position === choice.position)?.id,
              })),
            }),
          })
        }
      }
    }

    createdContent.push(`${index + 1}. ${spec.title} (${spec.lessonType})`)
  }

  const validationFailures = []
  const registeredGenerators = await request('/api/admin/practice-generators')
  const registeredGeneratorKeys = new Set(
    registeredGenerators.generators.map((generator) => `${generator.slug}@${generator.version}`),
  )

  for (const slug of expectedGeneratorSlugs) {
    if (!registeredGeneratorKeys.has(`${slug}@1`)) {
      validationFailures.push(`Generator ${slug}@1 is not registered.`)
    }
  }

  detail = await request(`/api/admin/courses/${courseId}`)
  const numericalAbility = detail.subjects.find((item) => item.slug === 'numerical-ability')
  const fractions = numericalAbility?.topics.find((item) => item.slug === 'fractions')
  const decimals = numericalAbility?.topics.find((item) => item.slug === 'decimals')

  if (decimals === undefined) {
    validationFailures.push('Decimals topic was not found under Numerical Ability.')
  } else {
    if (fractions !== undefined && decimals.position !== fractions.position + 1) {
      validationFailures.push(`Decimals must follow Fractions. Fractions position ${fractions.position}, Decimals position ${decimals.position}.`)
    }

    if (decimals.lessons.length !== lessonSpecs.length) {
      validationFailures.push(`Decimals expected ${lessonSpecs.length} lessons, found ${decimals.lessons.length}.`)
    }

    const positions = new Set(decimals.lessons.map((lesson) => lesson.position))

    if (positions.size !== decimals.lessons.length) {
      validationFailures.push('Decimals lesson positions are not unique.')
    }

    for (const spec of lessonSpecs) {
      const lesson = decimals.lessons.find((item) => item.slug === spec.slug)

      if (lesson === undefined) {
        validationFailures.push(`Lesson ${spec.slug} is missing.`)
        continue
      }

      if (lesson.lessonType !== spec.lessonType) {
        validationFailures.push(`Lesson ${spec.slug} type is ${lesson.lessonType}, expected ${spec.lessonType}.`)
      }

      const blocks = await request(`/api/admin/lessons/${lesson.id}/blocks`)

      if (blocks.blocks.length === 0) {
        validationFailures.push(`Lesson ${spec.slug} has no content blocks.`)
      }

      for (const block of blocks.blocks) {
        if (hasRawHtml(block.content)) {
          validationFailures.push(`Lesson ${spec.slug} block ${block.position} contains raw HTML.`)
        }
      }

      const generatorSlug = generatedPracticeByLessonSlug[spec.slug]

      if (generatorSlug !== undefined) {
        const practice = await request(`/api/admin/lessons/${lesson.id}/practice-set`)

        if (practice.practiceSet === null) {
          validationFailures.push(`Generated practice ${spec.slug} is missing its practice set.`)
        } else if (
          practice.practiceSet.questionSource !== 'generated' ||
          practice.practiceSet.generator?.slug !== generatorSlug ||
          practice.practiceSet.generator?.version !== 1 ||
          practice.practiceSet.generator?.difficulty.easy !== 2 ||
          practice.practiceSet.generator?.difficulty.medium !== 2 ||
          practice.practiceSet.generator?.difficulty.hard !== 1 ||
          practice.practiceSet.questionCount !== 5 ||
          practice.practiceSet.passingScore !== 60 ||
          practice.practiceSet.maximumAttempts !== null ||
          practice.practiceSet.showExplanations !== true
        ) {
          validationFailures.push(`Generated practice ${spec.slug} has an incomplete or invalid generator configuration.`)
        }
      }

      if (spec.slug === 'decimal-applications') {
        const practice = await request(`/api/admin/lessons/${lesson.id}/practice-set`)

        validationFailures.push(...validateFixedQuestions('Decimal Applications', practice.questions, applicationQuestions.length))
      }

      if (spec.slug === 'decimals-topic-quiz') {
        const quiz = await request(`/api/admin/lessons/${lesson.id}/quiz`)

        validationFailures.push(...validateFixedQuestions('Decimals Topic Quiz', quiz.questions, quizQuestions.length))
      }
    }
  }

  if (validationFailures.length > 0) {
    console.error('Decimals validation failed. Nothing was published.')
    for (const failure of validationFailures) {
      console.error(`- ${failure}`)
    }
    process.exitCode = 1
    return
  }

  const changedStatuses = []

  async function rememberAndPatch(entityType, entity, path, body) {
    changedStatuses.push({ entityType, entity, path, previousStatus: entity.status, updatedAt: entity.updatedAt })

    return request(path, {
      method: 'PATCH',
      body: JSON.stringify({ ...body, updatedAt: entity.updatedAt }),
    })
  }

  try {
    detail = await request(`/api/admin/courses/${courseId}`)
    const publishTopic = detail.subjects
      .find((item) => item.slug === 'numerical-ability')
      ?.topics.find((item) => item.slug === 'decimals')

    if (publishTopic === undefined) {
      throw new Error('Decimals topic was not found before publishing.')
    }

    for (const spec of lessonSpecs) {
      const lesson = publishTopic.lessons.find((item) => item.slug === spec.slug)

      if (lesson === undefined) {
        throw new Error(`Lesson ${spec.slug} was not found before publishing.`)
      }

      const generatorSlug = generatedPracticeByLessonSlug[spec.slug]

      if (generatorSlug !== undefined) {
        await request(`/api/admin/lessons/${lesson.id}/practice-set`, {
          method: 'PUT',
          body: JSON.stringify({
            title: spec.title,
            instructions: 'Answer five generated decimal questions. Review explanations after submission.',
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
      }

      if (spec.slug === 'decimal-applications') {
        await request(`/api/admin/lessons/${lesson.id}/practice-set`, {
          method: 'PUT',
          body: JSON.stringify({
            title: 'Decimal Applications',
            instructions: 'Solve each application using decimal arithmetic and units.',
            passingScore: 60,
            questionCount: applicationQuestions.length,
            maximumAttempts: null,
            showExplanations: true,
            status: 'published',
            questionSource: 'fixed',
          }),
        })
      }

      if (spec.slug === 'decimals-topic-quiz') {
        await request(`/api/admin/lessons/${lesson.id}/quiz`, {
          method: 'PUT',
          body: JSON.stringify({
            title: 'Decimals Topic Quiz',
            description: 'A 15-question fixed quiz covering the Decimals topic.',
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
      }
    }

    detail = await request(`/api/admin/courses/${courseId}`)
    const lessonTopic = detail.subjects
      .find((item) => item.slug === 'numerical-ability')
      ?.topics.find((item) => item.slug === 'decimals')

    if (lessonTopic === undefined) {
      throw new Error('Decimals topic was not found before lesson publication.')
    }

    for (const spec of lessonSpecs) {
      const lesson = lessonTopic.lessons.find((item) => item.slug === spec.slug)

      if (lesson === undefined) {
        throw new Error(`Lesson ${spec.slug} disappeared before publishing.`)
      }

      if (lesson.status !== 'published') {
        await rememberAndPatch('lesson', lesson, `/api/admin/lessons/${lesson.id}`, {
          status: 'published',
        })
      }
    }

    detail = await request(`/api/admin/courses/${courseId}`)
    const finalTopic = detail.subjects
      .find((item) => item.slug === 'numerical-ability')
      ?.topics.find((item) => item.slug === 'decimals')

    if (finalTopic === undefined) {
      throw new Error('Decimals topic disappeared before topic publication.')
    }

    if (finalTopic.status !== 'published') {
      await rememberAndPatch('topic', finalTopic, `/api/admin/topics/${finalTopic.id}`, {
        status: 'published',
      })
    }
  } catch (error) {
    console.error(`Decimals publish failed: ${error instanceof Error ? error.message : String(error)}`)
    console.error('Attempting to roll back Decimals statuses changed during this run.')

    for (const change of changedStatuses.reverse()) {
      try {
        await request(change.path, {
          method: 'PATCH',
          body: JSON.stringify({
            status: change.previousStatus,
            updatedAt: change.updatedAt,
          }),
        })
      } catch (rollbackError) {
        console.error(`Rollback failed for ${change.entityType}: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`)
      }
    }

    process.exitCode = 1
    return
  }

  console.log('Decimals topic created, validated, and published.')
  console.log('Created content:')
  for (const item of createdContent) {
    console.log(`- ${item}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
