import {
  SMART_RECOVERY_TAXONOMY_VERSION,
  generatorSkillMappings,
} from './smart-recovery-skills'

export const SMART_RECOVERY_FORMULA_VERSION = 1 as const

export type WeaknessFormulaVersion = typeof SMART_RECOVERY_FORMULA_VERSION
export type EvidenceSource =
  | 'generated_practice'
  | 'subject_assessment'
  | 'mock_exam'
export type WeaknessStatus =
  | 'not_enough_data'
  | 'needs_more_practice'
  | 'improving'
  | 'strong'
export type WeaknessTrend =
  | 'not_available'
  | 'improving'
  | 'stable'
  | 'declining'

export interface EvidenceWindowConfiguration {
  lookbackDays: number
  maximumItemsPerSkill: number
  minimumEvidenceItems: number
  recentItemCount: number
  recentWeightMultiplier: number
  sourceWeights: Readonly<Record<EvidenceSource, number>>
  needsMorePracticeBelowPercent: number
  strongAtOrAbovePercent: number
  meaningfulTrendPercent: number
  maximumMistakePatterns: number
}

export const SMART_RECOVERY_EVIDENCE_WINDOW: EvidenceWindowConfiguration =
  Object.freeze({
    lookbackDays: 180,
    maximumItemsPerSkill: 20,
    minimumEvidenceItems: 5,
    recentItemCount: 5,
    recentWeightMultiplier: 1.5,
    sourceWeights: Object.freeze({
      generated_practice: 1,
      subject_assessment: 1.25,
      mock_exam: 1.5,
    }),
    needsMorePracticeBelowPercent: 60,
    strongAtOrAbovePercent: 80,
    meaningfulTrendPercent: 15,
    maximumMistakePatterns: 3,
  })

export interface GeneratedEvidenceRecord {
  userId: number
  sourceType: EvidenceSource
  attemptPublicId: string
  attemptSubmittedAt: string
  snapshotPublicId: string
  generatorSlug: string
  generatorVersion: number
  generatorSeed: string
  selectedAnswer: string | null
  correctAnswer: string
  isCorrect: 0 | 1
  selectedDistractorType: string | null
  subjectSlug: string
  topicSlug: string | null
}

export interface NormalizedSkillEvidence {
  userId: number
  skillSlug: string
  sourceType: EvidenceSource
  attemptPublicId: string
  attemptSubmittedAt: string
  snapshotPublicId: string
  generatorSlug: string
  generatorVersion: number
  generatorSeed: string
  wasAnswered: boolean
  wasCorrect: boolean
  distractorType: string | null
  subjectSlug: string
  topicSlug: string | null
}

export interface SkillCatalogEntry {
  slug: string
  title: string
  description: string | null
  taxonomyVersion: number
  subjectSlug: string
  subjectTitle: string
  topicSlug: string | null
  topicTitle: string | null
  relatedLessonSlug: string | null
  relatedLessonTitle: string | null
}

export interface MistakePatternSummary {
  distractorType: string
  count: number
  percentOfClassifiedMistakes: number
}

export interface EvidenceSourceSummary {
  sourceType: EvidenceSource
  evidenceCount: number
  answeredCount: number
  correctCount: number
  accuracyPercent: number | null
}

export interface SkillWeaknessSummary {
  skill: SkillCatalogEntry
  status: WeaknessStatus
  trend: WeaknessTrend
  evidenceCount: number
  answeredCount: number
  correctCount: number
  incorrectCount: number
  unansweredCount: number
  accuracyPercent: number | null
  recentAccuracyPercent: number | null
  previousAccuracyPercent: number | null
  lastPracticedAt: string | null
  mistakePatterns: MistakePatternSummary[]
}

export interface SmartRecoveryEvidenceScope {
  submittedGeneratedAttemptsOnly: true
  fixedQuestionEvidenceIncluded: false
  ambiguousGeneratorMappingsIncluded: false
}

export interface SmartRecoveryDashboardSummary {
  taxonomyVersion: typeof SMART_RECOVERY_TAXONOMY_VERSION
  formulaVersion: WeaknessFormulaVersion
  calculatedAt: string
  evidenceWindow: EvidenceWindowConfiguration
  evidenceScope: SmartRecoveryEvidenceScope
  state: 'not_enough_data' | 'has_priorities' | 'no_current_weakness'
  eligibleEvidenceCount: number
  excludedEvidenceCount: number
  skillsWithEvidence: number
  needsMorePractice: SkillWeaknessSummary[]
  improving: SkillWeaknessSummary[]
  strong: SkillWeaknessSummary[]
}

export interface SmartRecoveryDetailsResponse {
  taxonomyVersion: typeof SMART_RECOVERY_TAXONOMY_VERSION
  formulaVersion: WeaknessFormulaVersion
  calculatedAt: string
  evidenceWindow: EvidenceWindowConfiguration
  evidenceScope: SmartRecoveryEvidenceScope
  summary: SkillWeaknessSummary
  sourceBreakdown: EvidenceSourceSummary[]
}

export interface NormalizedEvidenceCollection {
  evidence: NormalizedSkillEvidence[]
  excludedCount: number
}

const directMappingByGenerator = new Map(
  generatorSkillMappings
    .filter((mapping) => mapping.mappingKind === 'direct')
    .map((mapping) => [
      `${mapping.generatorSlug}@${mapping.generatorVersion}`,
      mapping,
    ]),
)

function roundPercent(value: number): number {
  return Math.round(value * 10) / 10
}

function rawAccuracy(items: readonly NormalizedSkillEvidence[]): number | null {
  if (items.length === 0) return null
  return roundPercent(
    (items.filter((item) => item.wasCorrect).length / items.length) * 100,
  )
}

function compareEvidence(
  left: NormalizedSkillEvidence,
  right: NormalizedSkillEvidence,
): number {
  const dateOrder =
    Date.parse(right.attemptSubmittedAt) - Date.parse(left.attemptSubmittedAt)
  if (dateOrder !== 0) return dateOrder
  const attemptOrder = left.attemptPublicId.localeCompare(right.attemptPublicId)
  return attemptOrder !== 0
    ? attemptOrder
    : left.snapshotPublicId.localeCompare(right.snapshotPublicId)
}

export function normalizeGeneratedEvidence(
  records: readonly GeneratedEvidenceRecord[],
  skillCatalog: ReadonlyMap<string, SkillCatalogEntry>,
): NormalizedEvidenceCollection {
  const evidence: NormalizedSkillEvidence[] = []
  let excludedCount = 0

  for (const record of records) {
    const mapping = directMappingByGenerator.get(
      `${record.generatorSlug}@${record.generatorVersion}`,
    )
    const skill =
      mapping === undefined ? undefined : skillCatalog.get(mapping.skillSlug)
    const contextMatches =
      skill !== undefined &&
      skill.taxonomyVersion === SMART_RECOVERY_TAXONOMY_VERSION &&
      skill.subjectSlug === record.subjectSlug &&
      skill.topicSlug === record.topicSlug

    if (mapping === undefined || skill === undefined || !contextMatches) {
      excludedCount += 1
      continue
    }

    const wasAnswered = record.selectedAnswer !== null
    const wasCorrect = wasAnswered && record.isCorrect === 1
    evidence.push({
      userId: record.userId,
      skillSlug: mapping.skillSlug,
      sourceType: record.sourceType,
      attemptPublicId: record.attemptPublicId,
      attemptSubmittedAt: record.attemptSubmittedAt,
      snapshotPublicId: record.snapshotPublicId,
      generatorSlug: record.generatorSlug,
      generatorVersion: record.generatorVersion,
      generatorSeed: record.generatorSeed,
      wasAnswered,
      wasCorrect,
      distractorType:
        wasAnswered && !wasCorrect ? record.selectedDistractorType : null,
      subjectSlug: record.subjectSlug,
      topicSlug: record.topicSlug,
    })
  }

  return { evidence, excludedCount }
}

function windowEvidence(
  evidence: readonly NormalizedSkillEvidence[],
  skillSlug: string,
  calculatedAt: Date,
  configuration: EvidenceWindowConfiguration,
): NormalizedSkillEvidence[] {
  const cutoff =
    calculatedAt.getTime() - configuration.lookbackDays * 24 * 60 * 60 * 1000
  const deduplicated = new Map<string, NormalizedSkillEvidence>()
  for (const item of [...evidence].sort(compareEvidence)) {
    const timestamp = Date.parse(item.attemptSubmittedAt)
    if (
      item.skillSlug !== skillSlug ||
      !Number.isFinite(timestamp) ||
      timestamp < cutoff ||
      timestamp > calculatedAt.getTime()
    ) {
      continue
    }
    const key = `${item.sourceType}:${item.snapshotPublicId}`
    if (!deduplicated.has(key)) deduplicated.set(key, item)
  }
  return [...deduplicated.values()].slice(0, configuration.maximumItemsPerSkill)
}

function trendFor(
  recentAccuracy: number | null,
  previousAccuracy: number | null,
  meaningfulTrendPercent: number,
): WeaknessTrend {
  if (recentAccuracy === null || previousAccuracy === null) {
    return 'not_available'
  }
  const change = recentAccuracy - previousAccuracy
  if (change >= meaningfulTrendPercent) return 'improving'
  if (change <= -meaningfulTrendPercent) return 'declining'
  return 'stable'
}

function statusFor(
  evidenceCount: number,
  accuracyPercent: number | null,
  trend: WeaknessTrend,
  configuration: EvidenceWindowConfiguration,
): WeaknessStatus {
  if (
    evidenceCount < configuration.minimumEvidenceItems ||
    accuracyPercent === null
  ) {
    return 'not_enough_data'
  }
  if (accuracyPercent < configuration.needsMorePracticeBelowPercent) {
    return 'needs_more_practice'
  }
  if (
    accuracyPercent >= configuration.strongAtOrAbovePercent &&
    trend !== 'declining'
  ) {
    return 'strong'
  }
  return 'improving'
}

function mistakePatterns(
  items: readonly NormalizedSkillEvidence[],
  maximumPatterns: number,
): MistakePatternSummary[] {
  const counts = new Map<string, number>()
  for (const item of items) {
    if (item.wasAnswered && !item.wasCorrect && item.distractorType !== null) {
      counts.set(item.distractorType, (counts.get(item.distractorType) ?? 0) + 1)
    }
  }
  const classifiedCount = [...counts.values()].reduce(
    (total, count) => total + count,
    0,
  )
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, maximumPatterns)
    .map(([distractorType, count]) => ({
      distractorType,
      count,
      percentOfClassifiedMistakes: roundPercent(
        (count / classifiedCount) * 100,
      ),
    }))
}

export function calculateSkillWeakness(
  skill: SkillCatalogEntry,
  evidence: readonly NormalizedSkillEvidence[],
  calculatedAt: Date,
  configuration: EvidenceWindowConfiguration = SMART_RECOVERY_EVIDENCE_WINDOW,
): SkillWeaknessSummary {
  const items = windowEvidence(evidence, skill.slug, calculatedAt, configuration)
  const recent = items.slice(0, configuration.recentItemCount)
  const previous = items.slice(
    configuration.recentItemCount,
    configuration.recentItemCount * 2,
  )
  const weighted = items.reduce(
    (totals, item, index) => {
      const recencyWeight =
        index < configuration.recentItemCount
          ? configuration.recentWeightMultiplier
          : 1
      const weight = configuration.sourceWeights[item.sourceType] * recencyWeight
      return {
        correct: totals.correct + (item.wasCorrect ? weight : 0),
        total: totals.total + weight,
      }
    },
    { correct: 0, total: 0 },
  )
  const accuracyPercent =
    weighted.total === 0
      ? null
      : roundPercent((weighted.correct / weighted.total) * 100)
  const recentAccuracyPercent = rawAccuracy(recent)
  const previousAccuracyPercent = rawAccuracy(previous)
  const trend = trendFor(
    recentAccuracyPercent,
    previousAccuracyPercent,
    configuration.meaningfulTrendPercent,
  )
  const answeredCount = items.filter((item) => item.wasAnswered).length
  const correctCount = items.filter((item) => item.wasCorrect).length

  return {
    skill,
    status: statusFor(items.length, accuracyPercent, trend, configuration),
    trend,
    evidenceCount: items.length,
    answeredCount,
    correctCount,
    incorrectCount: answeredCount - correctCount,
    unansweredCount: items.length - answeredCount,
    accuracyPercent,
    recentAccuracyPercent,
    previousAccuracyPercent,
    lastPracticedAt: items[0]?.attemptSubmittedAt ?? null,
    mistakePatterns: mistakePatterns(
      items,
      configuration.maximumMistakePatterns,
    ),
  }
}

export function calculateEvidenceSourceBreakdown(
  skillSlug: string,
  evidence: readonly NormalizedSkillEvidence[],
  calculatedAt: Date,
  configuration: EvidenceWindowConfiguration = SMART_RECOVERY_EVIDENCE_WINDOW,
): EvidenceSourceSummary[] {
  const items = windowEvidence(evidence, skillSlug, calculatedAt, configuration)
  const sources: EvidenceSource[] = [
    'generated_practice',
    'subject_assessment',
    'mock_exam',
  ]
  return sources.map((sourceType) => {
    const sourceItems = items.filter((item) => item.sourceType === sourceType)
    const answeredCount = sourceItems.filter((item) => item.wasAnswered).length
    const correctCount = sourceItems.filter((item) => item.wasCorrect).length
    return {
      sourceType,
      evidenceCount: sourceItems.length,
      answeredCount,
      correctCount,
      accuracyPercent: rawAccuracy(sourceItems),
    }
  })
}

export function compareWeaknessPriority(
  left: SkillWeaknessSummary,
  right: SkillWeaknessSummary,
): number {
  const accuracyOrder =
    (left.accuracyPercent ?? 101) - (right.accuracyPercent ?? 101)
  if (accuracyOrder !== 0) return accuracyOrder
  if (left.evidenceCount !== right.evidenceCount) {
    return right.evidenceCount - left.evidenceCount
  }
  return left.skill.slug.localeCompare(right.skill.slug)
}
