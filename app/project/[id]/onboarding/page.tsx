'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import TopNav from '@/components/TopNav'
import { Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

type EntryPath = 'full' | 'idea' | 'vpc' | 'bmc'

const PATHS: {
  id: EntryPath
  title: string
  description: string
  destination: (id: string) => string
}[] = [
  {
    id: 'full',
    title: 'Parto da zero',
    description: 'Esploro abilità, genero opportunità e valido tutto.',
    destination: (id) => `/project/${id}/abilities` },
  {
    id: 'idea',
    title: "Ho già un'idea",
    description: "Ho già un'idea e voglio validarla con i Twin.",
    destination: (id) => `/project/${id}/idea` },
  {
    id: 'vpc',
    title: 'Ho già la mia proposta di valore',
    description: 'Ho mappato clienti e valore offerto, ora voglio strutturare il business.',
    destination: (id) => `/project/${id}/start-vpc` },
  {
    id: 'bmc',
    title: 'Ho già il mio modello di business',
    description: 'Ho già un canvas, voglio migliorarlo e trovare i gap.',
    destination: (id) => `/project/${id}/start-bmc` },
]

export default function OnboardingPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const supabase = createClient()
  const [projectId, setProjectId] = useState<string | null>(null)
  const [selecting, setSelecting] = useState<EntryPath | null>(null)

  useEffect(() => {
    params.then(({ id }) => setProjectId(id))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSelect(path: EntryPath) {
    if (!projectId || selecting) return
    setSelecting(path)
    await supabase.from('projects').update({ entry_path: path }).eq('id', projectId)
    const selected = PATHS.find((p) => p.id === path)!
    router.push(selected.destination(projectId))
  }

  if (!projectId) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
        <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--color-background)' }}>
      <TopNav projectId={projectId} />

      {/* Decorative line-art OZU echo (md+ only) */}
      <svg
        viewBox="0 0 400 400"
        className="hidden md:block absolute -left-20 top-32 w-[420px] opacity-25 pointer-events-none"
        aria-hidden="true"
      >
        <g fill="none" stroke="var(--color-sea-green)" strokeWidth="1">
          <circle cx="200" cy="200" r="170" />
          <circle cx="197" cy="203" r="170" />
          <circle cx="194" cy="206" r="170" />
        </g>
      </svg>
      {/* Stacked shapes (mobile-visible) */}
      <div className="absolute top-20 right-6 md:right-12 pointer-events-none" aria-hidden="true">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-2xl bg-[var(--color-secondary)] opacity-80 translate-x-2 translate-y-2" />
          <div className="absolute inset-0 rounded-2xl bg-[var(--color-accent)]" />
        </div>
      </div>

      <motion.div
        className="relative flex-1 flex flex-col items-center justify-center px-6 py-16"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        {/* Title */}
        <h1
          style={{
            fontWeight: 400,
            fontSize: 34,
            letterSpacing: '-0.03em',
            color: 'var(--color-foreground)',
            marginBottom: 8,
            textAlign: 'center' }}
        >
          Da dove vuoi partire?
        </h1>
        <p
          style={{
            fontSize: 15,
            color: 'var(--color-foreground-muted)',
            marginBottom: 48,
            textAlign: 'center',
            lineHeight: 1.7 }}
        >
          Scegli il percorso più adatto alla tua situazione.
        </p>

        {/* Path cards — 2×2 on mobile, 4 across on desktop */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 16,
            width: '100%',
            maxWidth: 860 }}
        >
          {PATHS.map((path) => {
            const isLoading = selecting === path.id
            return (
              <motion.div
                key={path.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <button
                  onClick={() => handleSelect(path.id)}
                  disabled={!!selecting}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '28px 24px',
                    backgroundColor: '#FFFFFF',
                    border: selecting === path.id ? '1.5px solid var(--color-primary)' : '0.5px solid var(--color-border)',
                    borderRadius: 16,
                    cursor: selecting ? 'default' : 'pointer',
                    textAlign: 'left',
                    opacity: selecting && !isLoading ? 0.5 : 1,
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    width: '100%' }}
                  onMouseEnter={(e) => {
                    if (!selecting) {
                      const el = e.currentTarget as HTMLButtonElement
                      el.style.borderColor = 'var(--color-primary)'
                      el.style.boxShadow = '0 4px 16px rgba(19,163,137,0.1)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLButtonElement
                    el.style.borderColor = 'var(--color-border)'
                    el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'
                  }}
                >
                  {isLoading ? (
                    <Loader2
                      size={20}
                      className="animate-spin mb-3"
                      style={{ color: 'var(--color-primary)' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
                        border: '0.5px solid rgba(19,163,137,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 14,
                        fontSize: 18 }}
                    >
                      {path.id === 'full' ? '🥚' : path.id === 'idea' ? '💡' : path.id === 'vpc' ? '🗺️' : '📋'}
                    </div>
                  )}
                  <p
                    style={{
                      fontWeight: 400,
                      fontSize: 17,
                      color: 'var(--color-foreground)',
                      marginBottom: 6 }}
                  >
                    {path.title}
                  </p>
                  <p
                    style={{
                      fontSize: 13,
                      color: 'var(--color-foreground-muted)',
                      lineHeight: '1.55' }}
                  >
                    {path.description}
                  </p>
                </button>
              </motion.div>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}
