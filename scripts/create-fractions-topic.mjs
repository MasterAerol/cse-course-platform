#!/usr/bin/env node

import { fractionCommonDenominatorVisual } from './lib/visual-teaching-content.mjs'

const csrfHeaderValue = 'same-origin-admin-mutation'
const lessonSpecs = [
  ['Introduction to Fractions', 'introduction-to-fractions', 'reading', 8],
  ['Parts of a Fraction', 'parts-of-a-fraction', 'reading', 8],
  ['Proper, Improper, and Mixed Fractions', 'proper-improper-and-mixed-fractions', 'reading', 10],
  ['Equivalent Fractions', 'equivalent-fractions', 'practice', 10],
  ['Simplifying Fractions', 'simplifying-fractions', 'practice', 10],
  ['Comparing and Ordering Fractions', 'comparing-and-ordering-fractions', 'practice', 10],
  ['Adding Fractions', 'adding-fractions', 'practice', 10],
  ['Subtracting Fractions', 'subtracting-fractions', 'practice', 10],
  ['Multiplying Fractions', 'multiplying-fractions', 'practice', 10],
  ['Dividing Fractions', 'dividing-fractions', 'practice', 10],
  ['Mixed Fraction Applications', 'mixed-fraction-applications', 'practice', 12],
  ['Fractions Topic Quiz', 'fractions-topic-quiz', 'quiz', 15],
]

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

function slugLabel(slug) {
  return slug
    .split('-')
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ')
}

function paragraph(text) {
  return { blockType: 'paragraph', content: { text } }
}

function heading(text, level = 2) {
  return { blockType: 'heading', content: { level, text } }
}

function callout(title, text, variant = 'info') {
  return { blockType: 'callout', content: { title, text, variant } }
}

function formula(expression, description) {
  return { blockType: 'formula', content: { expression, description } }
}

function example(title, problem, steps, answer, visual) {
  return { blockType: 'example', content: { title, problem, steps, answer, ...(visual === undefined ? {} : { visual }) } }
}

function summary(items) {
  return { blockType: 'summary', content: { items } }
}

function lessonBlocks(slug) {
  const sharedPractice = {
    'equivalent-fractions': {
      concept: 'Equivalent fractions name the same value using different numerators and denominators.',
      procedure: 'Multiply or divide the numerator and denominator by the same nonzero number.',
      examples: [
        ['Scale up', 'Find an equivalent fraction for 2/5 with denominator 20.', ['5 × 4 = 20.', 'Multiply the numerator by the same 4.', '2 × 4 = 8.'], '2/5 = 8/20.'],
        ['Scale down', 'Is 9/12 equivalent to 3/4?', ['Divide 9 and 12 by 3.', '9 ÷ 3 = 3 and 12 ÷ 3 = 4.'], 'Yes, 9/12 = 3/4.'],
      ],
      mistakes: 'Changing only the numerator or only the denominator changes the value of the fraction.',
    },
    'simplifying-fractions': {
      concept: 'Simplifying a fraction means writing an equal fraction with smaller numbers.',
      procedure: 'Divide the numerator and denominator by their greatest common divisor.',
      examples: [
        ['Simplify 18/24', 'Write 18/24 in simplest form.', ['The greatest common divisor of 18 and 24 is 6.', '18 ÷ 6 = 3 and 24 ÷ 6 = 4.'], '18/24 = 3/4.'],
        ['Simplify 20/45', 'Write 20/45 in simplest form.', ['The greatest common divisor is 5.', '20 ÷ 5 = 4 and 45 ÷ 5 = 9.'], '20/45 = 4/9.'],
      ],
      mistakes: 'Do not subtract the common factor. Simplifying uses division.',
    },
    'comparing-and-ordering-fractions': {
      concept: 'Fractions can be compared by using common denominators or cross multiplication.',
      procedure: 'For two fractions a/b and c/d, compare a × d with c × b.',
      examples: [
        ['Compare 3/5 and 5/8', 'Which is greater?', ['3 × 8 = 24.', '5 × 5 = 25.', 'Since 25 is larger, 5/8 is greater.'], '5/8 is greater.'],
        ['Compare 2/3 and 3/7', 'Which is greater?', ['2 × 7 = 14.', '3 × 3 = 9.', 'Since 14 is larger, 2/3 is greater.'], '2/3 is greater.'],
      ],
      mistakes: 'A larger denominator does not automatically mean a larger fraction.',
    },
    'adding-fractions': {
      concept: 'Fractions can be added when they refer to equal-sized parts.',
      procedure: 'Use a common denominator, add the numerators, and simplify the result.',
      examples: [
        ['Like denominators', 'Add 2/7 + 3/7.', ['The denominator is already 7.', '2 + 3 = 5.'], '2/7 + 3/7 = 5/7.'],
        ['Unlike denominators', 'Add 1/4 + 1/6.', ['The least common denominator is 12.', '1/4 = 3/12 and 1/6 = 2/12.', '3/12 + 2/12 = 5/12.'], 'The sum is 5/12.', fractionCommonDenominatorVisual],
      ],
      mistakes: 'Do not add denominators. Denominators describe the size of the parts.',
    },
    'subtracting-fractions': {
      concept: 'Subtracting fractions means finding the remaining part after removing a fraction.',
      procedure: 'Use a common denominator, subtract the numerators, and simplify.',
      examples: [
        ['Like denominators', 'Subtract 7/8 - 3/8.', ['The denominator stays 8.', '7 - 3 = 4.', '4/8 simplifies to 1/2.'], 'The difference is 1/2.'],
        ['Unlike denominators', 'Subtract 5/6 - 1/4.', ['The least common denominator is 12.', '5/6 = 10/12 and 1/4 = 3/12.', '10/12 - 3/12 = 7/12.'], 'The difference is 7/12.'],
      ],
      mistakes: 'Keep the subtraction order. Reversing the fractions changes the result.',
    },
    'multiplying-fractions': {
      concept: 'Multiplying fractions finds a fraction of a fraction or a repeated fractional part.',
      procedure: 'Multiply numerators, multiply denominators, then simplify.',
      examples: [
        ['Direct multiplication', 'Multiply 2/3 × 5/8.', ['2 × 5 = 10.', '3 × 8 = 24.', '10/24 simplifies to 5/12.'], 'The product is 5/12.'],
        ['Fraction of a group', 'Find 1/2 of 3/5 of a task.', ['Multiply 1/2 × 3/5.', '1 × 3 = 3 and 2 × 5 = 10.'], 'The result is 3/10 of the task.'],
      ],
      mistakes: 'Do not cross-multiply as if comparing fractions.',
    },
    'dividing-fractions': {
      concept: 'Dividing by a fraction asks how many of that fractional part fit into another amount.',
      procedure: 'Keep the first fraction, change division to multiplication, and flip the second fraction.',
      examples: [
        ['Keep, change, flip', 'Compute 3/4 ÷ 2/5.', ['Keep 3/4.', 'Change ÷ to ×.', 'Flip 2/5 to 5/2.', '3/4 × 5/2 = 15/8.'], 'The quotient is 15/8.'],
        ['Simpler division', 'Compute 2/3 ÷ 1/6.', ['Keep 2/3 and flip 1/6 to 6/1.', '2/3 × 6/1 = 12/3.', '12/3 = 4.'], 'The quotient is 4.'],
      ],
      mistakes: 'Do not flip the first fraction. Only the divisor is flipped.',
    },
  }

  if (slug === 'introduction-to-fractions') {
    return [
      heading('What a fraction means', 2),
      paragraph('A fraction represents part of a whole. The whole may be one object, one group, one quantity, or one measured amount.'),
      paragraph('When a whole is divided into equal parts, a fraction tells how many of those equal parts are being considered.'),
      callout('Equal parts matter', 'A fraction is meaningful only when the parts are equal in size. Three unequal slices are not automatically three fourths.'),
      { blockType: 'image', content: { src: '/images/fraction-three-fourths.svg', alt: 'A whole divided into four equal parts with three shaded.', caption: 'Three shaded parts out of four equal parts represent 3/4.' } },
      example('One half', 'A piece of paper is divided into 2 equal parts and 1 part is shaded.', ['There are 2 equal parts in the whole.', '1 part is selected.'], '1 out of 2 equal parts is 1/2.'),
      example('Three fourths', 'A whole is divided into 4 equal parts and 3 are shaded.', ['There are 4 equal parts.', '3 parts are selected.'], '3 out of 4 equal parts is 3/4.'),
      example('A group fraction', 'In an office team, 5 employees out of 8 are assigned to field work.', ['The whole group has 8 employees.', 'The selected group has 5 employees.'], 'The field-work group is 5/8 of the team.'),
      paragraph('Fractions are numbers. They can be placed on a number line, compared, added, subtracted, multiplied, and divided.'),
      summary(['A fraction names part of a whole.', 'The whole must be divided into equal parts.', 'Fractions can describe objects, groups, quantities, and measurements.', 'Fractions are numbers, not only drawings.']),
    ]
  }

  if (slug === 'parts-of-a-fraction') {
    return [
      heading('The parts of a fraction', 2),
      paragraph('A fraction has a numerator, a denominator, and a fraction bar. In 3/5, the numerator is 3 and the denominator is 5.'),
      formula('numerator / denominator', 'The denominator tells how many equal parts make the whole. The numerator tells how many parts are selected.'),
      example('Reading 3/5', 'What does 3/5 mean?', ['The denominator 5 means the whole has 5 equal parts.', 'The numerator 3 means 3 of those parts are selected.'], '3/5 is read as three fifths.'),
      example('Reading 7/10', 'What does 7/10 mean?', ['The denominator 10 means tenths.', 'The numerator 7 means seven selected tenths.'], '7/10 is read as seven tenths.'),
      callout('Denominator cannot be zero', 'A denominator of zero is not allowed because a whole cannot be divided into zero equal parts.', 'warning'),
      paragraph('Common mistakes include reversing numerator and denominator, treating unequal pieces as valid fraction parts, and writing zero as the denominator.'),
      summary(['The numerator is the top number.', 'The denominator is the bottom number.', 'The fraction bar separates the two parts.', 'The denominator cannot be zero.']),
    ]
  }

  if (slug === 'proper-improper-and-mixed-fractions') {
    return [
      heading('Proper, improper, and mixed fractions', 2),
      paragraph('A proper fraction has a numerator less than its denominator, such as 3/5. Its value is less than one whole.'),
      paragraph('An improper fraction has a numerator greater than or equal to its denominator, such as 7/4. Its value is at least one whole.'),
      paragraph('A mixed number combines a whole number and a proper fraction, such as 1 3/4.'),
      formula('improper to mixed: numerator ÷ denominator', 'The quotient becomes the whole number. The remainder becomes the new numerator.'),
      example('Convert 11/4 to a mixed number', 'Write 11/4 as a mixed number.', ['11 ÷ 4 = 2 remainder 3.', 'The quotient 2 is the whole number.', 'The remainder 3 becomes the numerator, and the denominator stays 4.'], '11/4 = 2 3/4.'),
      formula('mixed to improper: whole × denominator + numerator', 'Keep the same denominator after converting.'),
      example('Convert 3 2/5 to an improper fraction', 'Write 3 2/5 as an improper fraction.', ['3 × 5 = 15.', '15 + 2 = 17.', 'Keep the denominator 5.'], '3 2/5 = 17/5.'),
      callout('Why conversions matter', 'Many operations are easier after changing mixed numbers to improper fractions first.'),
      summary(['Proper fractions are less than one whole.', 'Improper fractions are one whole or more.', 'Mixed numbers combine a whole number and a proper fraction.', 'Conversion uses division or multiplication with the denominator.']),
    ]
  }

  const practice = sharedPractice[slug]

  if (practice !== undefined) {
    return [
      heading(slugLabel(slug), 2),
      paragraph(practice.concept),
      formula(practice.procedure, 'Use this process carefully before choosing an answer.'),
      example(practice.examples[0][0], practice.examples[0][1], practice.examples[0][2], practice.examples[0][3]),
      example(practice.examples[1][0], practice.examples[1][1], practice.examples[1][2], practice.examples[1][3]),
      callout('Common mistake', practice.mistakes, 'warning'),
      paragraph('In CSE-style review, solve first and then compare with the choices. Avoid choosing based only on which option looks familiar.'),
      summary([practice.concept, practice.procedure, 'Use the practice activity to check whether the procedure is automatic and accurate.']),
    ]
  }

  if (slug === 'mixed-fraction-applications') {
    return [
      heading('Mixed fraction applications', 2),
      paragraph('This lesson combines the fraction skills from the topic: identifying, converting, simplifying, comparing, and calculating.'),
      paragraph('Application questions often hide a simple fraction operation inside a work, inventory, distance, or group context.'),
      example('Project completed', 'A team completed 3/8 of a report in the morning and 2/8 in the afternoon.', ['The denominators are the same.', 'Add the numerators: 3 + 2 = 5.'], 'The team completed 5/8 of the report.'),
      example('Inventory remaining', 'A store used 1/3 of a sack of rice and later used 1/6 more.', ['Use denominator 6.', '1/3 = 2/6.', '2/6 + 1/6 = 3/6 = 1/2.'], 'The store used 1/2 of the sack.'),
      callout('Read the context slowly', 'Decide first whether the problem is asking you to identify, compare, add, subtract, multiply, or divide fractions.'),
      summary(['Translate the situation into a fraction statement.', 'Use exact fraction arithmetic.', 'Simplify final answers when possible.', 'Check that the answer makes sense in the context.']),
    ]
  }

  return [
    heading('Fractions Topic Quiz', 2),
    paragraph('This quiz checks the main fraction skills in the topic. It is not based on official CSC questions.'),
    callout('Before you start', 'Review numerator and denominator, fraction types, conversions, simplification, comparison, and the four operations.'),
    summary(['Read each item carefully.', 'Solve using exact fraction steps.', 'Simplify answers before choosing.']),
  ]
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
