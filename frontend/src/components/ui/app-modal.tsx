import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog'
import { cn } from '@/lib/utils'

interface AppModalProps {
  open: boolean
  onClose: (open: boolean) => void
  title: string
  description?: React.ReactNode
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap: Record<NonNullable<AppModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
}

export function AppModal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
  className,
}: AppModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={cn(sizeMap[size], className)}>
        <DialogHeader className="mb-1">
          <DialogTitle className="text-base">{title}</DialogTitle>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}
