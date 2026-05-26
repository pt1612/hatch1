'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

interface BackButtonProps {
  href: string
  label?: string
}

export default function BackButton({ href, label = 'Back' }: BackButtonProps) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 mb-5 text-[13px] text-[var(--color-foreground-muted)] hover:text-[var(--color-primary)] transition-colors no-underline"
    >
      <ChevronLeft className="w-4 h-4" />
      {label}
    </Link>
  )
}
