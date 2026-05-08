'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import TopNav from '@/components/TopNav'
import { Loader2 } from 'lucide-react'

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
    destination: (id) => `/project/${id}/abilities`,
  },
  {
    id: 'idea',
    title: "Ho già un'idea",
    description: "Ho già un'idea e voglio validarla con i Twin.",
    destination: (id) => `/project/${id}/idea`,
  },
  {
    id: 'vpc',
    title: 'Ho già la mia proposta di valore',
    description: 'Ho mappato clienti e valore offerto, ora voglio strutturare il business.',
    destination: (id) => `/project/${id}/start-vpc`,
  },
  {
    id: 'bmc',
    title: 'Ho già il mio modello di business',
    description: 'Ho già un canvas, voglio migliorarlo e trovare i gap.',
    destination: (id) => `/project/${id}/start-bmc`,
  },
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
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: 'var(--color-cream)' }}>
        <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-amber)' }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-cream)' }}>
      <TopNav projectId={projectId} />

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 page-enter">
        {/* Title */}
        <h1
          style={{
            fontFamily: "'Lora', Georgia, serif",
            fontWeight: 400,
            fontSize: 32,
            letterSpacing: '-0.02em',
            color: 'var(--color-ink)',
            marginBottom: 8,
            textAlign: 'center',
          }}
        >
          Da dove vuoi partire?
        </h1>
        <p
          style={{
            fontSize: 13,
            color: 'var(--color-text-muted)',
            marginBottom: 48,
            textAlign: 'center',
          }}
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
            maxWidth: 860,
          }}
        >
          {PATHS.map((path) => {
            const isLoading = selecting === path.id
            return (
              <button
                key={path.id}
                onClick={() => handleSelect(path.id)}
                disabled={!!selecting}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '28px 24px',
                  backgroundColor: '#FFFFFF',
                  border: selecting === path.id ? '1.5px solid var(--color-amber)' : '0.5px solid var(--color-border)',
                  borderRadius: 16,
                  cursor: selecting ? 'default' : 'pointer',
                  textAlign: 'left',
                  opacity: selecting && !isLoading ? 0.5 : 1,
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
                onMouseEnter={(e) => {
                  if (!selecting) {
                    const el = e.currentTarget as HTMLButtonElement
                    el.style.borderColor = 'var(--color-amber)'
                    el.style.boxShadow = '0 4px 16px rgba(199,123,58,0.1)'
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
                    style={{ color: 'var(--color-amber)' }}
                  />
                ) : (
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: 'var(--color-amber-bg)',
                      border: '0.5px solid rgba(199,123,58,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 14,
                      fontSize: 18,
                    }}
                  >
                    {path.id === 'full' ? '🥚' : path.id === 'idea' ? '💡' : path.id === 'vpc' ? '🗺️' : '📋'}
                  </div>
                )}
                <p
                  style={{
                    fontFamily: "'Lora', Georgia, serif",
                    fontWeight: 400,
                    fontSize: 17,
                    color: 'var(--color-ink)',
                    marginBottom: 6,
                  }}
                >
                  {path.title}
                </p>
                <p
                  style={{
                    fontSize: 13,
                    color: 'var(--color-text-muted)',
                    lineHeight: '1.55',
                  }}
                >
                  {path.description}
                </p>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
