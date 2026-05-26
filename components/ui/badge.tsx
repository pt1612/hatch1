import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/*
 * Badge variants are semantic per BRAND.md §1. The previous names
 * (`default | outline | sage | linen | destructive`) had no call sites at restyling
 * time, so renamed straight to brand-semantic names — no alias variants needed.
 */
const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--color-muted)] text-[var(--color-foreground)] border-[var(--color-border)]',
        primary:
          'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] border-transparent',
        info:
          'bg-[color-mix(in_srgb,var(--color-secondary)_18%,transparent)] text-[var(--color-foreground)] border-[color-mix(in_srgb,var(--color-secondary)_25%,transparent)]',
        accent:
          'bg-[var(--color-accent)] text-[var(--color-accent-foreground)] border-transparent',
        warning:
          'bg-[var(--color-warning)] text-[var(--color-warning-foreground)] border-transparent',
        warm:
          'bg-[var(--color-warm)] text-[var(--color-warm-foreground)] border-transparent',
        outline:
          'bg-transparent text-[var(--color-foreground)] border-[var(--color-border-strong)]',
        destructive:
          'bg-red-50 text-red-600 border-red-200',
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
