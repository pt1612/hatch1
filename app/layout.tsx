import type { Metadata } from 'next'
import './globals.css'
import { ToastProvider } from '@/components/ui/toast'

export const metadata: Metadata = {
  title: 'Hatch — From idea to venture',
  description: 'From idea to venture — step by step.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Lora:ital,wght@0,400;0,500;1,400;1,500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="min-h-full antialiased"
        style={{
          backgroundColor: 'var(--color-cream)',
          color: 'var(--color-text-main)',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
