import {
  skillDefinitions,
  SMART_RECOVERY_TAXONOMY_VERSION,
  type SkillSlug,
  type SkillSubject,
} from './smart-recovery-skills'

export type FixedQuestionAssessmentType = 'fixed-practice' | 'topic-quiz'
export type FixedQuestionMappingStatus = 'pending-question-review'

export interface FixedQuestionSourceManifestEntry {
  sourceId: string
  assessmentType: FixedQuestionAssessmentType
  subjectSlug: SkillSubject
  topicSlug: string
  lessonSlug: string
  publisherSource: string
  collectionName: string
  expectedQuestionCount: number
  candidateSkillSlugs: readonly SkillSlug[]
  mappingStatus: FixedQuestionMappingStatus
  taxonomyVersion: typeof SMART_RECOVERY_TAXONOMY_VERSION
}

export interface FixedQuestionMappingManifestEntry {
  questionKey: string
  sourceId: string
  position: number
  subjectSlug: SkillSubject
  topicSlug: string
  lessonSlug: string
  assessmentType: FixedQuestionAssessmentType
  candidateSkillSlugs: readonly SkillSlug[]
  primarySkillSlug: SkillSlug | null
  mappingStatus: FixedQuestionMappingStatus
  taxonomyVersion: typeof SMART_RECOVERY_TAXONOMY_VERSION
}

interface TopicFixedSourceSpec {
  subjectSlug: SkillSubject
  topicSlug: string
  publisherSource: string
  practiceLessonSlug?: string
  practiceCollection?: string
  practiceCount?: number
  quizLessonSlug: string
  quizCollection?: string
  quizCount: number
}

const standard = (input: Omit<TopicFixedSourceSpec, 'practiceCount' | 'quizCount'>): TopicFixedSourceSpec => ({
  ...input,
  practiceCount: input.practiceLessonSlug === undefined ? undefined : 8,
  quizCount: 15,
})

const numerical = 'numerical-ability' as const
const analytical = 'analytical-ability' as const
const verbal = 'verbal-ability' as const
const general = 'general-information' as const

const topicSourceSpecs: readonly TopicFixedSourceSpec[] = [
  { subjectSlug: numerical, topicSlug: 'percentages', publisherSource: 'migrations/0006_seed_percentages_topic_quiz.sql', quizLessonSlug: 'percentages-topic-quiz', quizCollection: 'questions positions 1-10', quizCount: 10 },
  standard({ subjectSlug: numerical, topicSlug: 'fractions', publisherSource: 'scripts/create-fractions-topic.mjs', practiceLessonSlug: 'mixed-fraction-applications', practiceCollection: 'mixedPracticeQuestions', quizLessonSlug: 'fractions-topic-quiz', quizCollection: 'quizQuestions' }),
  standard({ subjectSlug: numerical, topicSlug: 'decimals', publisherSource: 'scripts/create-and-publish-decimals-topic.mjs', practiceLessonSlug: 'decimal-applications', practiceCollection: 'applicationQuestions', quizLessonSlug: 'decimals-topic-quiz', quizCollection: 'quizQuestions' }),
  standard({ subjectSlug: numerical, topicSlug: 'ratio-and-proportion', publisherSource: 'scripts/create-and-publish-ratio-proportion-topic.mjs', practiceLessonSlug: 'mixed-ratio-and-proportion-applications', quizLessonSlug: 'ratio-and-proportion-topic-quiz' }),
  standard({ subjectSlug: numerical, topicSlug: 'average', publisherSource: 'scripts/create-and-publish-average-topic.mjs', practiceLessonSlug: 'mixed-average-applications', quizLessonSlug: 'average-topic-quiz' }),
  standard({ subjectSlug: numerical, topicSlug: 'number-problems', publisherSource: 'scripts/create-and-publish-number-problems-topic.mjs', practiceLessonSlug: 'mixed-number-problems-practice', quizLessonSlug: 'number-problems-topic-quiz' }),
  standard({ subjectSlug: numerical, topicSlug: 'age-problems', publisherSource: 'scripts/create-and-publish-age-problems-topic.mjs', practiceLessonSlug: 'mixed-age-problems-practice', quizLessonSlug: 'age-problems-topic-quiz' }),
  standard({ subjectSlug: numerical, topicSlug: 'work-and-rate-problems', publisherSource: 'scripts/create-and-publish-work-rate-topic.mjs', practiceLessonSlug: 'mixed-work-and-rate-practice', quizLessonSlug: 'work-and-rate-topic-quiz' }),
  standard({ subjectSlug: numerical, topicSlug: 'distance-speed-and-time', publisherSource: 'scripts/create-and-publish-distance-speed-time-topic.mjs', practiceLessonSlug: 'mixed-distance-speed-and-time-practice', quizLessonSlug: 'distance-speed-and-time-topic-quiz' }),
  standard({ subjectSlug: numerical, topicSlug: 'simple-interest', publisherSource: 'scripts/create-and-publish-simple-interest-topic.mjs', practiceLessonSlug: 'mixed-simple-interest-practice', quizLessonSlug: 'simple-interest-topic-quiz' }),
  standard({ subjectSlug: analytical, topicSlug: 'logical-reasoning-fundamentals', publisherSource: 'scripts/create-and-publish-logical-reasoning-fundamentals-topic.mjs', practiceLessonSlug: 'mixed-logical-reasoning-practice', quizLessonSlug: 'logical-reasoning-fundamentals-topic-quiz' }),
  standard({ subjectSlug: analytical, topicSlug: 'analogy-and-classification', publisherSource: 'scripts/create-and-publish-analogy-classification-topic.mjs', practiceLessonSlug: 'mixed-analogy-and-classification-practice', quizLessonSlug: 'analogy-and-classification-topic-quiz' }),
  standard({ subjectSlug: analytical, topicSlug: 'number-series', publisherSource: 'scripts/create-and-publish-number-series-topic.mjs', practiceLessonSlug: 'mixed-number-series-practice', quizLessonSlug: 'number-series-topic-quiz' }),
  standard({ subjectSlug: analytical, topicSlug: 'letter-series', publisherSource: 'scripts/create-and-publish-letter-series-topic.mjs', practiceLessonSlug: 'mixed-letter-series-practice', quizLessonSlug: 'letter-series-topic-quiz' }),
  standard({ subjectSlug: analytical, topicSlug: 'coding-and-decoding', publisherSource: 'scripts/create-and-publish-coding-decoding-topic.mjs', practiceLessonSlug: 'mixed-coding-and-decoding-practice', quizLessonSlug: 'coding-and-decoding-topic-quiz' }),
  standard({ subjectSlug: analytical, topicSlug: 'ordering-and-ranking', publisherSource: 'scripts/create-and-publish-ordering-ranking-topic.mjs', practiceLessonSlug: 'mixed-ordering-and-ranking-practice', quizLessonSlug: 'ordering-and-ranking-topic-quiz' }),
  standard({ subjectSlug: analytical, topicSlug: 'syllogisms', publisherSource: 'scripts/create-and-publish-syllogisms-topic.mjs', practiceLessonSlug: 'mixed-syllogism-practice', quizLessonSlug: 'syllogisms-topic-quiz' }),
  standard({ subjectSlug: analytical, topicSlug: 'seating-and-arrangement-problems', publisherSource: 'scripts/create-and-publish-seating-arrangements-topic.mjs', practiceLessonSlug: 'mixed-seating-and-arrangement-practice', quizLessonSlug: 'seating-and-arrangement-topic-quiz' }),
  standard({ subjectSlug: analytical, topicSlug: 'data-interpretation', publisherSource: 'scripts/create-and-publish-data-interpretation-topic.mjs', practiceLessonSlug: 'mixed-data-interpretation-practice', quizLessonSlug: 'data-interpretation-topic-quiz' }),
  standard({ subjectSlug: verbal, topicSlug: 'vocabulary-and-word-meaning', publisherSource: 'scripts/create-and-publish-vocabulary-word-meaning-topic.mjs', practiceLessonSlug: 'mixed-vocabulary-practice', quizLessonSlug: 'vocabulary-and-word-meaning-topic-quiz' }),
  standard({ subjectSlug: verbal, topicSlug: 'synonyms-and-antonyms', publisherSource: 'scripts/create-and-publish-synonyms-antonyms-topic.mjs', practiceLessonSlug: 'mixed-synonyms-and-antonyms-practice', quizLessonSlug: 'synonyms-and-antonyms-topic-quiz' }),
  standard({ subjectSlug: verbal, topicSlug: 'context-clues', publisherSource: 'scripts/create-and-publish-context-clues-topic.mjs', practiceLessonSlug: 'context-clues-fixed-practice', quizLessonSlug: 'context-clues-topic-quiz' }),
  standard({ subjectSlug: verbal, topicSlug: 'sentence-completion', publisherSource: 'scripts/create-and-publish-sentence-completion-topic.mjs', practiceLessonSlug: 'mixed-sentence-completion-practice', quizLessonSlug: 'sentence-completion-topic-quiz' }),
  standard({ subjectSlug: verbal, topicSlug: 'grammar-and-correct-usage', publisherSource: 'scripts/create-and-publish-grammar-usage-topic.mjs', practiceLessonSlug: 'mixed-grammar-and-correct-usage-practice', quizLessonSlug: 'grammar-and-correct-usage-topic-quiz' }),
  standard({ subjectSlug: verbal, topicSlug: 'subject-verb-agreement', publisherSource: 'scripts/create-and-publish-subject-verb-agreement-topic.mjs', practiceLessonSlug: 'mixed-subject-verb-agreement-practice', quizLessonSlug: 'subject-verb-agreement-topic-quiz' }),
  standard({ subjectSlug: verbal, topicSlug: 'pronouns-and-modifiers', publisherSource: 'scripts/create-and-publish-pronouns-modifiers-topic.mjs', practiceLessonSlug: 'mixed-pronouns-modifiers-practice', quizLessonSlug: 'pronouns-and-modifiers-topic-quiz' }),
  standard({ subjectSlug: verbal, topicSlug: 'sentence-structure-and-error-identification', publisherSource: 'scripts/create-and-publish-sentence-structure-errors-topic.mjs', practiceLessonSlug: 'mixed-error-identification-practice', quizLessonSlug: 'sentence-structure-error-identification-topic-quiz' }),
  standard({ subjectSlug: verbal, topicSlug: 'paragraph-organization', publisherSource: 'scripts/create-and-publish-paragraph-organization-topic.mjs', practiceLessonSlug: 'mixed-paragraph-organization-practice', quizLessonSlug: 'paragraph-organization-topic-quiz' }),
  standard({ subjectSlug: verbal, topicSlug: 'reading-comprehension', publisherSource: 'scripts/create-and-publish-reading-comprehension-topic.mjs', practiceLessonSlug: 'mixed-reading-comprehension-practice', quizLessonSlug: 'reading-comprehension-topic-quiz' }),
  { subjectSlug: general, topicSlug: 'philippine-constitution-fundamentals', publisherSource: 'scripts/create-and-publish-philippine-constitution-topic.mjs', practiceLessonSlug: 'mixed-philippine-constitution-practice', practiceCount: 12, quizLessonSlug: 'philippine-constitution-topic-quiz', quizCount: 20 },
  { subjectSlug: general, topicSlug: 'ra-6713-code-of-conduct', publisherSource: 'scripts/create-and-publish-ra-6713-topic.mjs', practiceLessonSlug: 'mixed-ra-6713-practice', practiceCount: 12, quizLessonSlug: 'ra-6713-topic-quiz', quizCount: 20 },
  { subjectSlug: general, topicSlug: 'peace-and-human-rights', publisherSource: 'scripts/create-and-publish-peace-human-rights-topic.mjs', practiceLessonSlug: 'mixed-peace-human-rights-practice', practiceCount: 12, quizLessonSlug: 'peace-human-rights-topic-quiz', quizCount: 20 },
  { subjectSlug: general, topicSlug: 'environment-management-and-protection', publisherSource: 'scripts/create-and-publish-environment-management-topic.mjs', practiceLessonSlug: 'mixed-environment-management-practice', practiceCount: 12, quizLessonSlug: 'environment-management-topic-quiz', quizCount: 20 },
]

function candidateSkills(topicSlug: string): readonly SkillSlug[] {
  return skillDefinitions
    .filter((skill) => skill.topicSlug === topicSlug)
    .map((skill) => skill.slug)
}

function sourceEntry(
  spec: TopicFixedSourceSpec,
  assessmentType: FixedQuestionAssessmentType,
): FixedQuestionSourceManifestEntry {
  const practice = assessmentType === 'fixed-practice'
  const lessonSlug = practice ? spec.practiceLessonSlug : spec.quizLessonSlug
  const expectedQuestionCount = practice
    ? spec.practiceCount
    : spec.quizCount
  if (lessonSlug === undefined || expectedQuestionCount === undefined) {
    throw new Error(`Incomplete fixed source manifest for ${spec.topicSlug}.`)
  }
  return {
    sourceId: `${assessmentType}:${lessonSlug}`,
    assessmentType,
    subjectSlug: spec.subjectSlug,
    topicSlug: spec.topicSlug,
    lessonSlug,
    publisherSource: spec.publisherSource,
    collectionName: practice
      ? (spec.practiceCollection ?? 'mixedQuestions')
      : (spec.quizCollection ?? 'quizQuestions'),
    expectedQuestionCount,
    candidateSkillSlugs: candidateSkills(spec.topicSlug),
    mappingStatus: 'pending-question-review',
    taxonomyVersion: SMART_RECOVERY_TAXONOMY_VERSION,
  }
}

export const fixedQuestionSourceManifest: readonly FixedQuestionSourceManifestEntry[] =
  Object.freeze(topicSourceSpecs.flatMap((spec) => [
    ...(spec.practiceLessonSlug === undefined
      ? []
      : [sourceEntry(spec, 'fixed-practice')]),
    sourceEntry(spec, 'topic-quiz'),
  ]))

export const fixedQuestionMappingManifest: readonly FixedQuestionMappingManifestEntry[] =
  Object.freeze(fixedQuestionSourceManifest.flatMap((source) =>
    Array.from({ length: source.expectedQuestionCount }, (_, index) => ({
      questionKey: `${source.sourceId}:${index + 1}`,
      sourceId: source.sourceId,
      position: index + 1,
      subjectSlug: source.subjectSlug,
      topicSlug: source.topicSlug,
      lessonSlug: source.lessonSlug,
      assessmentType: source.assessmentType,
      candidateSkillSlugs: source.candidateSkillSlugs,
      primarySkillSlug: null,
      mappingStatus: 'pending-question-review' as const,
      taxonomyVersion: SMART_RECOVERY_TAXONOMY_VERSION,
    })),
  ))

