import Image from 'next/image'

interface BetweenLogoProps {
  variant?: 'wordmark' | 'mark'
  width?: number
  priority?: boolean
  className?: string
}

export default function BetweenLogo({
  variant = 'wordmark',
  width = variant === 'wordmark' ? 126 : 32,
  priority = false,
  className = '',
}: BetweenLogoProps) {
  const isWordmark = variant === 'wordmark'
  const height = isWordmark ? Math.round(width * 120 / 420) : width

  return (
    <Image
      src={isWordmark ? '/logos/between-wordmark-canonical.svg' : '/logos/between-b-contextual-mark.svg'}
      alt="Between"
      width={width}
      height={height}
      priority={priority}
      className={className}
    />
  )
}
