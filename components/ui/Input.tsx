import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string
  error?: string
  hint?: string
  prefix?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, prefix, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-sm font-medium text-[var(--tinta)]">
            {label}
          </label>
        )}
        <div className={`
          relative flex items-center w-full rounded-lg text-sm bg-[var(--nieve)] border
          ${error ? 'border-red-500 focus-within:ring-1 focus-within:ring-red-500' : 'border-[var(--linea)] focus-within:ring-1 focus-within:ring-[var(--cardon)] focus-within:border-[var(--cardon)] shadow-sm'}
          transition-colors duration-150 overflow-hidden
        `}>
          {prefix && (
            <div className="flex items-center border-r border-[var(--linea)] bg-[var(--blanco-piedra)] text-[var(--piedra)] h-full shrink-0">
              {prefix}
            </div>
          )}
          <input
            ref={ref}
            className={`
              w-full px-3 py-2.5 bg-transparent text-[var(--tinta)] placeholder:text-[var(--piedra)]
              focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed
              ${className}
            `}
            {...props}
          />
        </div>
        {hint && !error && <p className="text-xs text-[var(--piedra)]">{hint}</p>}
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input
