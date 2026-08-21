import { Link } from 'react-router'

type BrandVariant = 'header' | 'primary' | 'mark'

interface PasaWiseBrandProps {
  className?: string
  linked?: boolean
  variant?: BrandVariant
}

const sources: Record<BrandVariant, string> = {
  header: '/brand/pasawise-logo-header.svg',
  primary: '/brand/pasawise-logo-primary.svg',
  mark: '/brand/pasawise-brandmark.svg',
}

export function PasaWiseBrand({
  className = '',
  linked = false,
  variant = 'header',
}: PasaWiseBrandProps) {
  const imageElement = (
    <img
      className={`pasawise-brand pasawise-brand--${variant}${className === '' ? '' : ` ${className}`}`}
      src={sources[variant]}
      alt="PasaWise"
    />
  )
  const image =
    variant === 'header' ? (
      <picture className="pasawise-brand-picture">
        <source media="(max-width: 25rem)" srcSet={sources.mark} />
        {imageElement}
      </picture>
    ) : (
      imageElement
    )

  if (!linked) {
    return image
  }

  const linkClassName = variant === 'primary'
    ? 'brand-link brand-link--primary'
    : 'brand-link'

  return (
    <Link className={linkClassName} to="/" aria-label="PasaWise home">
      {image}
    </Link>
  )
}
