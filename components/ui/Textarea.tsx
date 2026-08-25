import { TextareaHTMLAttributes, forwardRef } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-[var(--tinta)]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`
            w-full px-3 py-2.5 rounded-lg text-sm
            bg-[var(--nieve)] border border-[var(--linea)]
            text-[var(--tinta)] placeholder-[var(--piedra)]
            focus:outline-none focus:ring-1 focus:ring-[var(--cardon)] focus:border-[var(--cardon)]
            transition-colors duration-150
            resize-y min-h-[80px]
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-red-500 focus:ring-red-500' : ''}
            ${className}
          `}
          {...props}
        />
        {hint && !error && <p className="text-xs text-[var(--piedra)]">{hint}</p>}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
export default Textarea
