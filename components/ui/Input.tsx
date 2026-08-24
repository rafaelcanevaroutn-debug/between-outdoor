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
          <label className="text-sm font-medium text-[#F0FFF4]">
            {label}
          </label>
        )}
        <div className={`
          relative flex items-center w-full rounded-lg text-sm bg-[#0A0F0A] border
          ${error ? 'border-red-500 focus-within:ring-1 focus-within:ring-red-500' : 'border-[#1E2D1E] focus-within:ring-1 focus-within:ring-[#34D17E] focus-within:border-[#34D17E]'}
          transition-colors duration-150 overflow-hidden
        `}>
          {prefix && (
            <div className="flex items-center border-r border-[#1E2D1E] bg-[#0A0F0A] text-[#F0FFF4] h-full shrink-0">
              {prefix}
            </div>
          )}
          <input
            ref={ref}
            className={`
              w-full px-3 py-2.5 bg-transparent text-[#F0FFF4] placeholder-[#4A6B4A]
              focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed
              ${className}
            `}
            {...props}
          />
        </div>
        {hint && !error && <p className="text-xs text-[#6B8F71]">{hint}</p>}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input
