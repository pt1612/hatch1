'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import TopNav from '@/components/TopNav'
import { Loader2, ArrowRight } from 'lucide-react'

export default function IdeaPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const supabase = createClient()
  const [projectId, setProjectId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', description: '', sector: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    params.then(({ id }) => setProjectId(id))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit() {
    if (!projectId || !form.name.trim()) return
    setSaving(true)
    const { data, error } = await supabase
      .from('opportunities')
      .insert({
        project_id: projectId,
        name: form.name.trim(),
        description: form.description.trim(),
        application: form.sector.trim(),
        customer_segment: '',
        phase: 'abilities',
      })
      .select()
      .single()

    if (!error && data) {
      router.push(`/project/${projectId}/opportunity/${data.id}/context`)
    } else {
      setSaving(false)
    }
  }

  if (!projectId) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: 'var(--color-cream)' }}>
        <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-amber)' }} />
      </div>
    )
  }

  const canSubmit = form.name.trim().length > 0

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-cream)' }}>
      <TopNav projectId={projectId} />

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div style={{ width: '100%', maxWidth: 480 }}>
          <button
            onClick={() => router.push(`/project/${projectId}/onboarding`)}
            style={{
              fontSize: 12,
              color: 'var(--color-text-muted)',
              marginBottom: 32,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            ← Indietro
          </button>

          <h1
            style={{
              fontFamily: "'Lora', Georgia, serif",
              fontWeight: 400,
              fontSize: 28,
              letterSpacing: '-0.02em',
              color: 'var(--color-ink)',
              marginBottom: 8,
            }}
          >
            La tua idea
          </h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 32 }}>
            Descrivi la tua idea — la salveremo come opportunità e partiremo da lì.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Idea name */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 10,
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--color-text-muted)',
                  marginBottom: 6,
                }}
              >
                Nome dell'idea *
              </label>
              <input
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="es. Piattaforma di monitoraggio IoT"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: 14,
                  backgroundColor: '#FFFFFF',
                  border: '0.5px solid var(--color-border)',
                  borderRadius: 8,
                  color: 'var(--color-ink)',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--color-amber)'
                  e.target.style.boxShadow = '0 0 0 3px rgba(199,123,58,0.12)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--color-border)'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            {/* Description */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 10,
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--color-text-muted)',
                  marginBottom: 6,
                }}
              >
                Descrizione
              </label>
              <textarea
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="Descrivi in 2-3 frasi di cosa si tratta, qual è il problema che risolve e per chi."
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: 14,
                  backgroundColor: '#FFFFFF',
                  border: '0.5px solid var(--color-border)',
                  borderRadius: 8,
                  color: 'var(--color-ink)',
                  outline: 'none',
                  resize: 'vertical',
                  lineHeight: '1.6',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--color-amber)'
                  e.target.style.boxShadow = '0 0 0 3px rgba(199,123,58,0.12)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--color-border)'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            {/* Sector */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 10,
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--color-text-muted)',
                  marginBottom: 6,
                }}
              >
                Settore di riferimento
              </label>
              <input
                value={form.sector}
                onChange={(e) => update('sector', e.target.value)}
                placeholder="es. AgriTech, Healthcare, EdTech…"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: 14,
                  backgroundColor: '#FFFFFF',
                  border: '0.5px solid var(--color-border)',
                  borderRadius: 8,
                  color: 'var(--color-ink)',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--color-amber)'
                  e.target.style.boxShadow = '0 0 0 3px rgba(199,123,58,0.12)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--color-border)'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={!canSubmit || saving}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '12px 24px',
                backgroundColor: canSubmit && !saving ? 'var(--color-amber)' : 'var(--color-linen)',
                color: canSubmit && !saving ? '#FFFFFF' : 'var(--color-text-muted)',
                borderRadius: 10,
                border: 'none',
                fontSize: 14,
                fontWeight: 500,
                cursor: canSubmit && !saving ? 'pointer' : 'default',
                transition: 'background-color 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease',
              }}
              onMouseEnter={(e) => {
                if (canSubmit && !saving) {
                  ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = '#A8612A'
                  ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(199,123,58,0.25)'
                }
              }}
              onMouseLeave={(e) => {
                if (canSubmit && !saving) {
                  ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-amber)'
                  ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'
                }
              }}
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  Continua
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
