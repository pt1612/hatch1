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
      className="inline-flex items-center gap-1 transition-colors mb-5"
      style={{ fontSize: 13, color: 'var(--color-text-muted)', textDecoration: 'none' }}
      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-ink)')}
      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
    >
      <ChevronLeft className="w-4 h-4" />
      {label}
    </Link>
  )
}
