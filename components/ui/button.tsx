import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/*
 * Button variants are named semantically (primary/secondary/ghost/...) per BRAND.md §5.
 * The previous palette used `default | outline | ghost | destructive | amber`. None of
 * these had call sites in the app at the time of the brand restyling, so we renamed
 * straight to semantic names without alias variants. If old names are reintroduced,
 * add them here as alias entries that map to the new visual treatment.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium text-sm transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)]',
        secondary:
          'border-[1.5px] border-[var(--color-foreground)] bg-transparent text-[var(--color-foreground)] hover:bg-[var(--color-muted)]',
        ghost:
          'bg-transparent text-[var(--color-foreground)] hover:bg-[var(--color-muted)]',
        soft:
          'bg-[var(--color-muted)] text-[var(--color-foreground)] hover:bg-[var(--color-accent)]',
        dark:
          'bg-[var(--color-surface-dark)] text-[var(--color-primary-foreground)] hover:opacity-90',
        destructive:
          'bg-red-600 text-white hover:bg-red-700',
      },
      size: {
        default: 'h-10 px-5 py-2 rounded-full',
        sm: 'h-8 px-3 py-1 text-xs rounded-full',
        lg: 'h-12 px-7 py-3 rounded-full',
        icon: 'h-9 w-9 p-0 rounded-full',
        square: 'h-10 px-5 py-2 rounded-[var(--radius-card)]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
