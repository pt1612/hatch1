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
      className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-5"
    >
      <ChevronLeft className="w-4 h-4" />
      {label}
    </Link>
  )
}
