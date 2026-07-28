export type PracticeQuestionSource = 'fixed' | 'generated'

export interface PracticeEditorVisibility {
  showFixedQuestionEditor: boolean
  showGeneratedConfiguration: boolean
}

export function getPracticeEditorVisibility(
  questionSource: PracticeQuestionSource,
): PracticeEditorVisibility {
  return {
    showFixedQuestionEditor: questionSource === 'fixed',
    showGeneratedConfiguration: questionSource === 'generated',
  }
}
