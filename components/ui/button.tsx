import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--color-amber)] text-white shadow hover:bg-[#A8612A] hover:shadow-[0_4px_12px_rgba(199,123,58,0.25)]',
        outline:
          'border border-[var(--color-border)] bg-transparent text-[var(--color-ink)] hover:border-[var(--color-amber)] hover:text-[var(--color-amber)]',
        ghost:
          'bg-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-linen)] hover:text-[var(--color-ink)]',
        destructive:
          'bg-red-600 text-white hover:bg-red-700',
        amber:
          'bg-[var(--color-amber-bg)] text-[var(--color-amber)] border border-[rgba(199,123,58,0.2)] hover:bg-[rgba(199,123,58,0.15)]',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-7 px-3 py-1 text-xs',
        lg: 'h-11 px-6 py-3',
        icon: 'h-8 w-8 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
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
