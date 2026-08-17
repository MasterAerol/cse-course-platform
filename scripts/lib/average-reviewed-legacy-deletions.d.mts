export interface AverageReviewedCanonicalEvidence {
  positions: number[]
  canonicalBlockIdentifier: string
  requiredStrings: string[]
  practiceLinkage?: string
}

export interface AverageReviewedLegacyDeletion {
  topic: 'average'
  lessonSlug: string
  legacyBlockId: number
  blockType: string
  expectedIdentifier: string
  expectedContent: Record<string, unknown>
  expectedContentFingerprint: string
  canonicalEvidence: AverageReviewedCanonicalEvidence
}

export interface AverageDeletionBlock {
  id: number
  type: string
  position?: number
  content: Record<string, unknown>
}

export interface AverageCanonicalLesson {
  slug: string
  blocks: Array<{ blockType: string; content: Record<string, unknown> }>
}

export type AverageDeletionClassification =
  | { learnerContentAssessment: 'requires-human-review' }
  | {
      learnerContentAssessment: 'superseded-with-equivalent-content'
      replacementEvidence: { canonicalBlockIdentifier: string; conceptFingerprint: string }
      reviewedLegacyContentFingerprint: string
    }

export const averagePracticeLinkage: Readonly<Record<string, string>>
export const reviewedAverageLegacyDeletions: readonly AverageReviewedLegacyDeletion[]
export function classifyReviewedAverageDeletion(input: {
  topic?: string
  lessonSlug: string
  block: AverageDeletionBlock
  canonicalLesson: AverageCanonicalLesson | undefined
}): AverageDeletionClassification