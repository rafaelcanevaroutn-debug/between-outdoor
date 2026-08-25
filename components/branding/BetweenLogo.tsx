interface BetweenLogoProps {
  variant?: 'wordmark' | 'mark'
  width?: number
  priority?: boolean
  className?: string
  tone?: 'default' | 'inverse'
}

export default function BetweenLogo({
  variant = 'wordmark',
  width = variant === 'wordmark' ? 126 : 32,
  priority = false,
  className = '',
  tone = 'default',
}: BetweenLogoProps) {
  const isWordmark = variant === 'wordmark'
  const fontSize = isWordmark ? width * 0.238 : width * 1.02

  return (
    <span
      role="img"
      aria-label="Between"
      data-priority={priority || undefined}
      className={`inline-flex shrink-0 items-baseline ${className}`}
      style={{
        width: isWordmark ? width : undefined,
        height: isWordmark ? fontSize * 1.08 : width,
        fontFamily: 'var(--font-bricolage), sans-serif',
        fontSize,
        fontWeight: 650,
        lineHeight: 1,
        letterSpacing: '-0.055em',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'inline-block',
          marginRight: isWordmark ? '0.045em' : 0,
          background: tone === 'inverse'
            ? 'linear-gradient(168deg, #B9CABB 0 68%, #819B87 68% 100%)'
            : 'linear-gradient(168deg, #3E5C48 0 68%, #2E4A38 68% 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          color: 'transparent',
          letterSpacing: 0,
        }}
      >
        b
      </span>
      {isWordmark && <span aria-hidden="true" style={{ color: tone === 'inverse' ? '#FFFFFF' : 'var(--tinta)' }}>etween</span>}
    </span>
  )
}
