import type { ReactNode } from 'react'

import { PasaWiseBrand } from './PasaWiseBrand'

interface PublicAuthShellProps {
  cardClassName?: string
  children: ReactNode
  labelledBy: string
}

export function PublicAuthShell({
  cardClassName = '',
  children,
  labelledBy,
}: PublicAuthShellProps) {
  const cardClasses = [
    'auth-card',
    'auth-card--authentication',
    cardClassName,
  ].filter((className) => className.length > 0).join(' ')

  return (
    <main className="auth-page auth-page--public">
      <section className={cardClasses} aria-labelledby={labelledBy}>
        <PasaWiseBrand linked variant="primary" />
        {children}
      </section>
    </main>
  )
}
