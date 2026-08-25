interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export default function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      className={`
        bg-[var(--blanco-piedra)] border border-[var(--linea)] rounded-xl
        ${onClick ? 'cursor-pointer hover:bg-[var(--piedra-clara)] transition-colors duration-150' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
