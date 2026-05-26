import * as React from 'react'
import { cn } from '@/lib/utils'

/*
 * Input primitive per BRAND.md §5. White/Wispy Clouds bg, 1.5px Deep Teal @20% border,
 * 12px radius, focus state Sea Green ring + full-opacity border.
 */
const baseField =
  'w-full rounded-[var(--radius-input)] bg-[var(--color-surface-card)] border-[1.5px] border-[var(--color-border-strong)] text-[var(--color-foreground)] placeholder:text-[var(--color-foreground-faint)] px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_25%,transparent)] disabled:opacity-50 disabled:cursor-not-allowed'

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type = 'text', ...props }, ref) => (
  <input ref={ref} type={type} className={cn(baseField, className)} {...props} />
))
Input.displayName = 'Input'

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(baseField, 'min-h-[80px] resize-y leading-normal', className)}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      'block text-sm font-medium text-[var(--color-foreground)] mb-1.5',
      className
    )}
    {...props}
  />
))
Label.displayName = 'Label'
