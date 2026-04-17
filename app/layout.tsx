import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Hatch — From opportunity to venture',
  description: 'From opportunity to venture — step by step.',
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
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="min-h-full bg-[#F4F5F0] text-gray-900 antialiased"
        style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
      >
        {children}
      </body>
    </html>
  )
}
