import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'outline' | 'secondary' | 'info'

const variants: Record<BadgeVariant, string> = {
  default:     'bg-emerald-50 text-emerald-700 border border-emerald-200',
  success:     'bg-emerald-50 text-emerald-700 border border-emerald-200',
  warning:     'bg-amber-50 text-amber-700 border border-amber-200',
  destructive: 'bg-red-50 text-red-700 border border-red-200',
  info:        'bg-blue-50 text-blue-700 border border-blue-200',
  outline:     'bg-white text-gray-600 border border-gray-200',
  secondary:   'bg-gray-100 text-gray-600 border border-transparent',
}

const dots: Record<BadgeVariant, string> = {
  default:     'bg-emerald-500',
  success:     'bg-emerald-500',
  warning:     'bg-amber-500',
  destructive: 'bg-red-500',
  info:        'bg-blue-500',
  outline:     'bg-gray-400',
  secondary:   'bg-gray-400',
}

interface BadgeProps {
  variant?: BadgeVariant
  className?: string
  dot?: boolean
  children: React.ReactNode
}

export function Badge({ variant = 'default', className, dot, children }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
      variants[variant], className,
    )}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dots[variant])} />}
      {children}
    </span>
  )
}
