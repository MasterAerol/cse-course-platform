export const requiredTopics: readonly string[]
export const topicTitles: readonly string[]
export const generatorPools: readonly (readonly string[])[]
export const verbalAbilityBlueprintV1: {
  subjectSlug: 'verbal-ability'
  version: 1
  totalQuestions: 50
  passingScorePercent: 70
  topics: Array<{
    topicSlug: string
    topicTitle: string
    position: number
    count: number
    difficulty: { easy: number; medium: number; hard: number }
    generators: Array<{ slug: string; version: number; rotationPosition: number; selectionWeight: number }>
  }>
}