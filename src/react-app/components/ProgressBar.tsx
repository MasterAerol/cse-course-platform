interface ProgressBarProps {
  value: number
}

export function ProgressBar({ value }: ProgressBarProps) {
  const safeValue = Math.max(0, Math.min(100, Math.round(value)))

  return (
    <div className="progress" aria-label={`${safeValue}% complete`}>
      <div className="progress__bar" style={{ width: `${safeValue}%` }} />
    </div>
  )
}
