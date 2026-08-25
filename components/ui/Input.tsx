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
      <div className="flex flex-col gap-2 w-full">
        {label && (
          <label className="text-[13px] font-semibold text-[var(--tinta)]">
            {label}
          </label>
        )}
        <div className={`
          relative flex items-center w-full rounded-xl text-sm bg-white/75 border
          ${error ? 'border-red-500 focus-within:ring-2 focus-within:ring-red-500/15' : 'border-[var(--linea)] focus-within:ring-2 focus-within:ring-[var(--cardon)]/10 focus-within:border-[var(--cardon)]'}
          transition-all duration-150 overflow-hidden
        `}>
          {prefix && (
            <div className="flex items-center border-r border-[var(--linea)] bg-[var(--blanco-piedra)] text-[var(--piedra)] h-full shrink-0">
              {prefix}
            </div>
          )}
          <input
            ref={ref}
            className={`
              w-full px-4 py-3 bg-transparent text-[var(--tinta)] placeholder:text-[var(--piedra)]
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
