interface PasaWiseLoaderProps {
  compact?: boolean
  label?: string
}

export function PasaWiseLoader({
  compact = false,
  label = 'Loading',
}: PasaWiseLoaderProps) {
  return (
    <div
      className={`pasawise-loader${compact ? ' pasawise-loader--compact' : ''}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <img
        src="/brand/pasawise-animated-loader.svg"
        alt=""
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  )
}

export function PasaWisePageLoader({
  label = 'Loading page',
}: {
  label?: string
}) {
  return (
    <main className="pasawise-page-loader">
      <PasaWiseLoader label={label} />
    </main>
  )
}
