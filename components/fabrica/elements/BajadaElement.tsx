interface BajadaElementProps {
  data: string | null
  tokenValue?: string
  w?: number
  size?: number
}

export default function BajadaElement({ data, tokenValue, w, size }: BajadaElementProps) {
  return (
    <div
      style={{
        width: w ?? 'fit-content',
        color: tokenValue ?? '#F2E8D4',
        fontFamily: 'system-ui, sans-serif',
        fontSize: size ?? 40,
        fontWeight: 400,
        lineHeight: 1.4,
        opacity: 0.85,
        whiteSpace: 'pre-wrap',
      }}
    >
      {data ?? ''}
    </div>
  )
}
