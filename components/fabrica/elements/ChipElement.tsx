interface ChipElementProps {
  data: string | null
  tokenValue?: string
  w?: number
  size?: number  // font size in logical canvas units (default 36)
}

export default function ChipElement({ data, tokenValue, size }: ChipElementProps) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 12,
        paddingLeft: 28,
        paddingRight: 28,
        borderRadius: 100,
        backgroundColor: tokenValue ?? '#C45B1E',
        color: '#FFF8F0',
        fontFamily: 'system-ui, sans-serif',
        fontSize: size ?? 36,
        fontWeight: 600,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {data ?? ''}
    </div>
  )
}
