import { cn } from '@/lib/utils'
import { forwardRef, type InputHTMLAttributes } from 'react'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-9 w-full rounded-lg border border-gray-200 bg-white px-3 py-1 text-sm text-gray-900 shadow-xs placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0 focus:border-emerald-400 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'
