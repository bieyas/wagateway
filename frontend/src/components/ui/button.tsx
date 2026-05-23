import { cn } from '@/lib/utils'
import { forwardRef, type ButtonHTMLAttributes } from 'react'

type Variant = 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary' | 'success'
type Size = 'default' | 'sm' | 'lg' | 'icon' | 'icon-sm'

const variantStyles: Record<Variant, string> = {
  default:     'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-200',
  success:     'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-200',
  outline:     'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300',
  ghost:       'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
  destructive: 'bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-200',
  secondary:   'bg-gray-100 text-gray-700 hover:bg-gray-200',
}
const sizeStyles: Record<Size, string> = {
  default:  'h-9 px-4 py-2 text-sm rounded-lg',
  sm:       'h-8 px-3 text-xs rounded-md',
  lg:       'h-11 px-6 text-sm rounded-xl font-semibold',
  icon:     'h-9 w-9 rounded-lg',
  'icon-sm':'h-8 w-8 rounded-md',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
        variantStyles[variant], sizeStyles[size], className,
      )}
      {...props}
    >
      {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  ),
)
Button.displayName = 'Button'
