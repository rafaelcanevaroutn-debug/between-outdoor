interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export default function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      className={`
        bg-[#111A11] border border-[#1E2D1E] rounded-xl
        ${onClick ? 'cursor-pointer hover:bg-[#162216] transition-colors duration-150' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
