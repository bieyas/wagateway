import { cn } from '@/lib/utils'
import { forwardRef, type TextareaHTMLAttributes } from 'react'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[80px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-xs placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-400 disabled:cursor-not-allowed disabled:bg-gray-50 resize-none',
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'
