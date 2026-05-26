'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface ToastMessage {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([])

  const toast = React.useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-[var(--radius-card)] shadow-lg pointer-events-auto',
                'border text-sm font-medium',
                t.type === 'success' && 'bg-[var(--color-surface-card)] border-[var(--color-border)] text-[var(--color-foreground)]',
                t.type === 'error' && 'bg-red-50 border-red-200 text-red-700',
                t.type === 'info' && 'bg-[var(--color-surface-card)] border-[var(--color-border)] text-[var(--color-foreground)]',
              )}
            >
              {t.type === 'success' && <CheckCircle2 size={15} className="flex-shrink-0 text-[var(--color-primary)]" />}
              {t.type === 'error' && <AlertCircle size={15} className="text-red-500 flex-shrink-0" />}
              <span>{t.message}</span>
              <button
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                className="ml-1 opacity-40 hover:opacity-70 transition-opacity"
              >
                <X size={13} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
