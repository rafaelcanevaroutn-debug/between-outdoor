'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, children, disabled, className = '', ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--nieve)] disabled:opacity-50 disabled:cursor-not-allowed'

    const variants = {
      primary: 'bg-[var(--cardon)] text-[var(--nieve)] hover:bg-[var(--cardon-tenue)] focus:ring-[var(--cardon)]',
      secondary: 'bg-[var(--blanco-piedra)] text-[var(--tinta)] border border-[var(--linea)] hover:bg-[var(--piedra-clara)] focus:ring-[var(--cardon)]',
      ghost: 'text-[var(--piedra)] hover:text-[var(--tinta)] hover:bg-[var(--blanco-piedra)] focus:ring-[var(--cardon)]',
      danger: 'bg-red-900/20 text-red-400 border border-red-900/40 hover:bg-red-900/30 focus:ring-red-500',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
export default Button
