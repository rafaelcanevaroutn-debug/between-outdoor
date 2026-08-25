interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export default function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      className={`
        bg-white/70 border border-[var(--linea)] rounded-[20px] shadow-[var(--sombra-reposo)]
        ${onClick ? 'cursor-pointer hover:border-[var(--piedra-clara)] hover:-translate-y-0.5 hover:shadow-[var(--sombra-alta)] transition-all duration-200' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
