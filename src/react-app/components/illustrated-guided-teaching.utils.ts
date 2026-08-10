export function getNextGuidedTeachingStepIndex(
  currentStepIndex: number,
  totalSteps: number,
): number {
  if (totalSteps <= 0) {
    return 0
  }

  return Math.min(currentStepIndex + 1, totalSteps - 1)
}

export function getPreviousGuidedTeachingStepIndex(
  currentStepIndex: number,
): number {
  return Math.max(currentStepIndex - 1, 0)
}

export function clampGuidedTeachingStepIndex(
  stepIndex: number,
  totalSteps: number,
): number {
  if (totalSteps <= 0) {
    return 0
  }

  if (stepIndex <= 0) {
    return 0
  }

  if (stepIndex >= totalSteps) {
    return totalSteps - 1
  }

  return stepIndex
}
