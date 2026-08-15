#!/usr/bin/env node

import { fractionsLessonBySlug, fractionsLessonSpecs } from './lib/fractions-teaching-system-content.mjs'

const csrfHeaderValue = 'same-origin-admin-mutation'
const lessonSpecs = fractionsLessonSpecs.map(({ title, slug, lessonType, estimatedMinutes }) =>
  [title, slug, lessonType, estimatedMinutes],
)

const generatedPracticeByLessonSlug = {
  'equivalent-fractions': 'equivalent-fractions',
  'simplifying-fractions': 'simplifying-fractions',
  'comparing-and-ordering-fractions': 'comparing-fractions',
  'adding-fractions': 'adding-fractions',
  'subtracting-fractions': 'subtracting-fractions',
  'multiplying-fractions': 'multiplying-fractions',
  'dividing-fractions': 'dividing-fractions',
}

function parseArgs() {
  const args = new Map()

  for (let index = 2; index < process.argv.length; index += 1) {
    const key = process.argv[index]
    const value = process.argv[index + 1]

    if (key?.startsWith('--') !== true || value === undefined) {
      throw new Error(`Invalid argument near ${key ?? '(end)'}.`)
    }

    args.set(key.slice(2), value)
    index += 1
  }

  return args
}

function lessonBlocks(slug) {
  const lesson = fractionsLessonBySlug.get(slug)
  if (lesson === undefined) throw new Error(`Missing canonical Fractions lesson content for ${slug}.`)
  return lesson.blocks
}

const mixedPracticeQuestions = [
  ['A class has 36 students. If 15 are members of the math club, what fraction of the class are math club members?', '5/12', ['15/36', '12/5', '5/36'], '15/36 simplifies by 3 to 5/12.'],
  ['Convert 17/5 to a mixed number.', '3 2/5', ['2 3/5', '3 1/5', '4 2/5'], '17 ÷ 5 = 3 remainder 2, so the mixed number is 3 2/5.'],
  ['Convert 4 3/7 to an improper fraction.', '31/7', ['28/7', '25/7', '7/31'], '4 × 7 + 3 = 31, so the improper fraction is 31/7.'],
  ['Simplify 24/36.', '2/3', ['12/18', '3/2', '4/6'], 'The greatest common divisor is 12. 24/36 = 2/3.'],
  ['Which is greater: 5/8 or 3/4?', '3/4', ['5/8', '8/5', '4/3'], '3/4 = 6/8, which is greater than 5/8.'],
  ['A worker finished 1/6 of a task before lunch and 1/3 after lunch. How much was finished?', '1/2', ['2/9', '2/6', '1/9'], '1/3 = 2/6, so 1/6 + 2/6 = 3/6 = 1/2.'],
  ['A warehouse had 7/10 of its supplies remaining. After using 1/5 more, what fraction remained?', '1/2', ['6/5', '6/10', '8/15'], '1/5 = 2/10, so 7/10 - 2/10 = 5/10 = 1/2.'],
  ['A road crew completed 2/3 of a road. Of the completed part, 3/4 was already inspected. What fraction of the whole road was inspected?', '1/2', ['5/7', '6/12', '3/8'], '2/3 × 3/4 = 6/12 = 1/2.'],
]

const quizQuestions = [
  ['In the fraction 7/12, what is the numerator?', '7', ['12', '19', '5'], 'The numerator is the top number, so it is 7.'],
  ['Which fraction is a proper fraction?', '4/9', ['9/4', '5/5', '12/7'], 'A proper fraction has a numerator less than the denominator.'],
  ['Which fraction is improper?', '11/8', ['3/8', '5/9', '7/10'], '11/8 is improper because the numerator is greater than the denominator.'],
  ['Convert 13/4 to a mixed number.', '3 1/4', ['2 5/4', '4 1/3', '3 4/1'], '13 ÷ 4 = 3 remainder 1, so 13/4 = 3 1/4.'],
  ['Which fraction is equivalent to 2/3?', '8/12', ['4/9', '2/6', '6/2'], 'Multiplying numerator and denominator by 4 gives 8/12.'],
  ['Simplify 30/45.', '2/3', ['3/2', '10/15', '5/9'], 'Divide 30 and 45 by 15 to get 2/3.'],
  ['Which is greater: 4/7 or 3/5?', '3/5', ['4/7', '7/4', '5/3'], '4 × 5 = 20, while 3 × 7 = 21, so 3/5 is greater.'],
  ['Arrange from least to greatest: 1/2, 2/3, 3/4.', '1/2, 2/3, 3/4', ['3/4, 2/3, 1/2', '2/3, 1/2, 3/4', '1/2, 3/4, 2/3'], 'Their values are 0.5, about 0.667, and 0.75.'],
  ['Add 3/8 + 2/8.', '5/8', ['5/16', '1/8', '6/8'], 'The denominators are the same, so add 3 + 2 and keep 8.'],
  ['Add 1/4 + 1/6.', '5/12', ['2/10', '1/10', '2/24'], 'Use denominator 12: 3/12 + 2/12 = 5/12.'],
  ['Subtract 5/6 - 1/3.', '1/2', ['4/3', '4/6', '2/3'], '1/3 = 2/6, so 5/6 - 2/6 = 3/6 = 1/2.'],
  ['Multiply 2/5 × 3/4.', '3/10', ['5/9', '6/20', '8/15'], '2 × 3 = 6 and 5 × 4 = 20; 6/20 simplifies to 3/10.'],
  ['Divide 3/4 ÷ 2/5.', '15/8', ['6/20', '8/15', '5/6'], 'Keep 3/4, change to multiplication, and flip 2/5 to 5/2.'],
  ['Compute 1/2 + 2/3 × 3/4.', '1', ['7/8', '9/8', '5/6'], 'Multiply first: 2/3 × 3/4 = 1/2. Then 1/2 + 1/2 = 1.'],
  ['A team used 3/5 of its budget. Of the used amount, 1/3 went to materials. What fraction of the whole budget went to materials?', '1/5', ['4/8', '3/15', '2/5'], '1/3 of 3/5 is 1/3 × 3/5 = 3/15 = 1/5.'],
]

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

async function main() {
  const args = parseArgs()
  const baseUrl = args.get('base-url') ?? 'http://127.0.0.1:5173'

  if (args.get('confirm') !== 'create-fractions-draft') {
    throw new Error('Pass --confirm create-fractions-draft to create draft Fractions content.')
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

    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
    })
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
    const password = args.get('password') ?? process.env.CSE_FRACTIONS_ADMIN_PASSWORD

    if (email === undefined || password === undefined) {
      throw new Error(
        'Pass --cookie, or pass --email with --password or CSE_FRACTIONS_ADMIN_PASSWORD.',
      )
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

  let topic = subject.topics.find((item) => item.slug === 'fractions')

  if (topic === undefined) {
    const percentages = subject.topics.find((item) => item.slug === 'percentages')
    const created = await request(`/api/admin/subjects/${subject.id}/topics`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Fractions',
        slug: 'fractions',
        description: 'A structured introduction to understanding, simplifying, comparing, and calculating with fractions.',
        position: (percentages?.position ?? subject.topics.length) + 1,
        status: 'draft',
      }),
    })
    topic = created.topic
  }

  for (const [index, [title, slug, lessonType, estimatedMinutes]] of lessonSpecs.entries()) {
    detail = await request(`/api/admin/courses/${courseId}`)
    const refreshedSubject = detail.subjects.find((item) => item.slug === 'numerical-ability')
    const refreshedTopic = refreshedSubject?.topics.find((item) => item.slug === 'fractions')

    if (refreshedTopic === undefined) {
      throw new Error('Fractions topic disappeared during creation.')
    }

    let lesson = refreshedTopic.lessons.find((item) => item.slug === slug)

    if (lesson === undefined) {
      const created = await request(`/api/admin/topics/${refreshedTopic.id}/lessons`, {
        method: 'POST',
        body: JSON.stringify({
          title,
          slug,
          lessonType,
          summary: `Draft lesson for ${title}.`,
          estimatedMinutes,
          position: index + 1,
          isPreview: false,
          requiresPrevious: true,
          status: 'draft',
        }),
      })
      lesson = created.lesson
    }

    const blocks = await request(`/api/admin/lessons/${lesson.id}/blocks`)

    if (blocks.blocks.length === 0) {
      for (const [blockIndex, block] of lessonBlocks(slug).entries()) {
        await request(`/api/admin/lessons/${lesson.id}/blocks`, {
          method: 'POST',
          body: JSON.stringify({ ...block, position: blockIndex + 1 }),
        })
      }
    }

    const generatorSlug = generatedPracticeByLessonSlug[slug]

    if (generatorSlug !== undefined) {
      await request(`/api/admin/lessons/${lesson.id}/practice-set`, {
        method: 'PUT',
        body: JSON.stringify({
          title,
          instructions: 'Answer five generated fraction questions. Review the explanation after each attempt.',
          passingScore: 60,
          questionCount: 5,
          maximumAttempts: null,
          showExplanations: true,
          status: 'draft',
          questionSource: 'generated',
          generatorSlug,
          generatorVersion: 1,
          difficulty: { easy: 2, medium: 2, hard: 1 },
        }),
      })
    }

    if (slug === 'mixed-fraction-applications') {
      const saved = await request(`/api/admin/lessons/${lesson.id}/practice-set`, {
        method: 'PUT',
        body: JSON.stringify({
          title: 'Mixed Fraction Applications',
          instructions: 'Solve each applied fraction question using exact fraction steps.',
          passingScore: 60,
          questionCount: 8,
          maximumAttempts: null,
          showExplanations: true,
          status: 'draft',
          questionSource: 'fixed',
        }),
      })
      const current = await request(`/api/admin/lessons/${lesson.id}/practice-set`)

      for (const [questionIndex, item] of mixedPracticeQuestions.entries()) {
        const input = fixedQuestion(item[0], item[1], item[2], item[3], questionIndex + 1)
        const existing = current.questions.find((question) => question.position === input.position)

        if (existing === undefined) {
          await request(`/api/admin/practice-sets/${saved.practiceSet.id}/questions`, {
            method: 'POST',
            body: JSON.stringify(input),
          })
        }
      }
    }

    if (slug === 'fractions-topic-quiz') {
      const saved = await request(`/api/admin/lessons/${lesson.id}/quiz`, {
        method: 'PUT',
        body: JSON.stringify({
          title: 'Fractions Topic Quiz',
          description: 'A draft fixed quiz covering beginner fraction skills.',
          quizType: 'topic',
          passingScore: 70,
          timeLimitMinutes: null,
          maximumAttempts: null,
          shuffleQuestions: false,
          shuffleChoices: false,
          showExplanations: true,
          status: 'draft',
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
        }
      }
    }
  }

  console.log('Fractions draft topic creation completed.')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
