interface ProgressBarProps {
  value: number
}

export function ProgressBar({ value }: ProgressBarProps) {
  const safeValue = Math.max(0, Math.min(100, Math.round(value)))

  return (
    <progress
      className="progress"
      aria-label={`${safeValue}% complete`}
      max="100"
      value={safeValue}
    />
  )
}
