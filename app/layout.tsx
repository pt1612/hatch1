import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/ui/toast'
import { I18nProvider } from '@/lib/i18n/context'

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  style: ['normal', 'italic'],
  variable: '--font-dm-sans',
  display: 'swap' })

export const metadata: Metadata = {
  title: 'Hatch — From idea to venture',
  description: 'From idea to venture — step by step.' }

export default function RootLayout({
  children }: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body className="min-h-full antialiased">
        <I18nProvider>
          <ToastProvider>{children}</ToastProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
