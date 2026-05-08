import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--color-amber-bg)] text-[var(--color-amber)] border border-[rgba(199,123,58,0.2)]',
        outline:
          'border border-[var(--color-border)] text-[var(--color-text-muted)]',
        sage:
          'bg-[var(--color-sage-bg)] text-[#2D7A57] border border-[rgba(76,175,125,0.2)]',
        linen:
          'bg-[var(--color-linen)] text-[var(--color-text-muted)]',
        destructive:
          'bg-red-50 text-red-600 border border-red-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
