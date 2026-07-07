interface FondoElementProps {
  data: string | null
  w: number
  h: number
}

export default function FondoElement({ data, w, h }: FondoElementProps) {
  const bg = data || ''
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        width: w,
        height: h,
        backgroundColor: '#110D06',
        backgroundImage: bg ? `url(${bg})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* overlay gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.82) 100%)',
        }}
      />
    </div>
  )
}
