interface BadgeProps {
  children: React.ReactNode
  color?: string
  className?: string
}

export default function Badge({ children, color, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}
      style={color ? { backgroundColor: `${color}20`, color, borderColor: `${color}40`, border: '1px solid' } : {}}
    >
      {children}
    </span>
  )
}
