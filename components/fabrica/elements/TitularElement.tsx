interface TitularElementProps {
  data: string | null
  tokenValue?: string
  w?: number
  size?: number
}

export default function TitularElement({ data, tokenValue, w, size }: TitularElementProps) {
  return (
    <div
      style={{
        width: w ?? 'fit-content',
        color: tokenValue ?? '#F2E8D4',
        fontFamily: 'Georgia, serif',
        fontSize: size ?? 80,
        fontWeight: 700,
        lineHeight: 1.05,
        letterSpacing: '-0.02em',
        whiteSpace: 'pre-wrap',
      }}
    >
      {data ?? ''}
    </div>
  )
}
