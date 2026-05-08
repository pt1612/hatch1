'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import TopNav from '@/components/TopNav'
import { Plus, CheckCircle2, Clock, ChevronRight, ChevronDown, Loader2, X } from 'lucide-react'
import type { Opportunity } from '@/lib/types'

export default function OpportunitiesClient({
  project,
  opportunities,
  evaluations,
}: {
  project: { id: string; title: string }
  opportunities: Opportunity[]
  evaluations: { id: string; opportunity_id: string; report: unknown }[]
}) {
  const router = useRouter()
  const supabase = createClient()

  const [showAddForm, setShowAddForm] = useState(false)
  const [newOpp, setNewOpp] = useState({ name: '', application: '', customer_segment: '', description: '' })
  const [adding, setAdding] = useState(false)
  const [collapsedApps, setCollapsedApps] = useState<Set<string>>(new Set())

  const evalMap = evaluations.reduce<Record<string, { id: string; report: unknown }>>((acc, e) => {
    acc[e.opportunity_id] = e
    return acc
  }, {})
  const evaluatedCount = evaluations.filter((e) => e.report !== null).length

  const grouped = opportunities.reduce<{ app: string; opps: Opportunity[] }[]>((acc, opp) => {
    const appName = opp.application?.trim() || 'Other'
    const existing = acc.find((g) => g.app === appName)
    if (existing) existing.opps.push(opp)
    else acc.push({ app: appName, opps: [opp] })
    return acc
  }, [])

  function toggleApp(appName: string) {
    setCollapsedApps((prev) => {
      const next = new Set(prev)
      if (next.has(appName)) next.delete(appName)
      else next.add(appName)
      return next
    })
  }

  async function handleAddOpportunity() {
    if (!newOpp.name.trim()) return
    setAdding(true)
    await supabase.from('opportunities').insert({
      project_id: project.id,
      name: newOpp.name,
      application: newOpp.application,
      customer_segment: newOpp.customer_segment,
      description: newOpp.description,
      phase: 'abilities',
    })
    setNewOpp({ name: '', application: '', customer_segment: '', description: '' })
    setShowAddForm(false)
    setAdding(false)
    router.refresh()
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--color-cream)' }}>
      <TopNav projectId={project.id} projectTitle={project.title} />

      <div className="flex-1 flex overflow-hidden min-h-screen pt-14">
        {/* Main list */}
        <div className="flex-1 overflow-y-auto p-6 page-enter">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1
                style={{
                  fontFamily: "'Lora', Georgia, serif",
                  fontWeight: 400,
                  fontSize: 26,
                  letterSpacing: '-0.02em',
                  color: 'var(--color-ink)',
                }}
              >
                Opportunità
              </h1>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                {opportunities.length} identificate · {evaluatedCount} valutate
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/project/${project.id}/abilities`}
                className="py-2 px-3 rounded-lg text-xs font-medium transition-colors"
                style={{
                  border: '0.5px solid var(--color-border)',
                  color: 'var(--color-ink)',
                  textDecoration: 'none',
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-amber)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
              >
                ← Torna alla chat
              </Link>
              <button
                onClick={() => setShowAddForm((v) => !v)}
                className="flex items-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium"
                style={{
                  backgroundColor: 'var(--color-amber)',
                  color: '#FFFFFF',
                  border: 'none',
                  transition: 'background-color 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#A8612A'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(199,123,58,0.25)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-amber)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <Plus size={14} />
                Aggiungi manualmente
              </button>
            </div>
          </div>

          {/* Progress bar */}
          {opportunities.length > 0 && (
            <div
              className="rounded-full overflow-hidden mb-6"
              style={{ height: 4, backgroundColor: 'var(--color-linen)' }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(evaluatedCount / opportunities.length) * 100}%`,
                  backgroundColor: 'var(--color-amber)',
                  boxShadow: '0 0 8px rgba(199,123,58,0.4)',
                }}
              />
            </div>
          )}

          {/* Manual add form */}
          {showAddForm && (
            <div
              className="rounded-2xl p-5 mb-5"
              style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-ink)' }}>
                  Aggiungi opportunità manualmente
                </h3>
                <button
                  onClick={() => setShowAddForm(false)}
                  style={{ color: 'var(--color-text-faint)' }}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-3">
                {[
                  { key: 'name', label: 'Nome', placeholder: 'es. Monitoraggio IoT in tempo reale' },
                  { key: 'application', label: 'Applicazione', placeholder: 'Caso d\'uso specifico' },
                  { key: 'customer_segment', label: 'Segmento cliente', placeholder: 'Chi ne beneficia di più' },
                  { key: 'description', label: 'Descrizione', placeholder: '1-2 frasi' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label
                      className="block mb-1"
                      style={{
                        fontSize: 10,
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      {label}
                    </label>
                    <input
                      value={newOpp[key as keyof typeof newOpp]}
                      onChange={(e) => setNewOpp((prev) => ({ ...prev, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full px-3 py-2 text-sm outline-none transition-colors"
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '0.5px solid var(--color-border)',
                        borderRadius: 8,
                        color: 'var(--color-ink)',
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
                ))}
                <button
                  onClick={handleAddOpportunity}
                  disabled={adding || !newOpp.name.trim()}
                  className="flex items-center gap-2 py-2 px-4 rounded-lg text-xs font-medium transition-colors disabled:opacity-60"
                  style={{ backgroundColor: 'var(--color-amber)', color: '#FFFFFF', border: 'none' }}
                  onMouseEnter={(e) => !(adding || !newOpp.name.trim()) && ((e.currentTarget).style.backgroundColor = '#A8612A')}
                  onMouseLeave={(e) => ((e.currentTarget).style.backgroundColor = 'var(--color-amber)')}
                >
                  {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Aggiungi opportunità
                </button>
              </div>
            </div>
          )}

          {/* Opportunity cards grouped by application */}
          {opportunities.length === 0 ? (
            <div className="text-center py-16">
              <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4">
                <path d="M50 15 C24 15 10 32 10 52 C10 74 25 88 50 88 C75 88 90 74 90 52 C90 32 76 15 50 15 Z" fill="var(--color-amber-bg)" />
                <circle cx="50" cy="50" r="14" fill="var(--color-linen)" />
              </svg>
              <p style={{ fontSize: 13, fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
                Nessuna opportunità ancora.
              </p>
              <p style={{ fontSize: 12, color: 'var(--color-text-faint)', marginTop: 4 }}>
                Torna alla chat sulle abilità o aggiungine una manualmente.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {grouped.map(({ app, opps }) => {
                const isCollapsed = collapsedApps.has(app)
                const evaluatedInGroup = opps.filter((o) => !!evalMap[o.id]?.report).length
                return (
                  <div
                    key={app}
                    className="rounded-2xl overflow-hidden"
                    style={{ border: '0.5px solid var(--color-border)' }}
                  >
                    <button
                      onClick={() => toggleApp(app)}
                      className="w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors"
                      style={{ backgroundColor: 'var(--color-cream)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-linen)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-cream)')}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-ink)' }} className="truncate">
                          {app}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{
                            fontSize: 10,
                            fontWeight: 500,
                            backgroundColor: '#FFFFFF',
                            color: 'var(--color-text-muted)',
                            border: '0.5px solid var(--color-border)',
                          }}
                        >
                          {evaluatedInGroup}/{opps.length} valutate
                        </span>
                      </div>
                      <ChevronDown
                        size={14}
                        style={{
                          color: 'var(--color-text-faint)',
                          flexShrink: 0,
                          marginLeft: 8,
                          transform: isCollapsed ? 'rotate(-90deg)' : 'none',
                        }}
                      />
                    </button>

                    {!isCollapsed && (
                      <div style={{ borderTop: '0.5px solid var(--color-border)' }}>
                        {opps.map((opp, idx) => {
                          const evaluation = evalMap[opp.id]
                          const isEvaluated = !!evaluation?.report
                          return (
                            <div
                              key={opp.id}
                              className="px-5 py-4 flex items-start gap-4"
                              style={{
                                backgroundColor: '#FFFFFF',
                                borderTop: idx > 0 ? '0.5px solid var(--color-border)' : undefined,
                              }}
                            >
                              <div className="flex-shrink-0 mt-0.5">
                                {isEvaluated ? (
                                  <CheckCircle2 size={16} style={{ color: 'var(--color-sage)' }} />
                                ) : (
                                  <Clock size={16} style={{ color: 'var(--color-linen)' }} />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p
                                      className="mb-0.5"
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 500,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.06em',
                                        color: 'var(--color-text-faint)',
                                      }}
                                    >
                                      {opp.customer_segment}
                                    </p>
                                    <h3 style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-ink)' }}>
                                      {opp.name}
                                    </h3>
                                  </div>
                                  <span
                                    className="flex-shrink-0 px-2.5 py-0.5 rounded-full"
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 500,
                                      backgroundColor: isEvaluated ? 'var(--color-sage-bg)' : 'var(--color-linen)',
                                      color: isEvaluated ? '#2D7A57' : 'var(--color-text-muted)',
                                    }}
                                  >
                                    {isEvaluated ? 'Valutata' : 'In attesa'}
                                  </span>
                                </div>
                                {opp.description && (
                                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4, lineHeight: '1.6' }}>
                                    {opp.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex-shrink-0">
                                {isEvaluated ? (
                                  <Link
                                    href={`/project/${project.id}/opportunity/${opp.id}/report`}
                                    className="flex items-center gap-1 text-xs font-medium transition-colors"
                                    style={{ color: 'var(--color-amber)', textDecoration: 'none' }}
                                  >
                                    Vedi report
                                    <ChevronRight size={12} />
                                  </Link>
                                ) : (
                                  <Link
                                    href={`/project/${project.id}/opportunity/${opp.id}/context`}
                                    className="flex items-center gap-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors"
                                    style={{
                                      backgroundColor: 'var(--color-amber)',
                                      color: '#FFFFFF',
                                      textDecoration: 'none',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#A8612A')}
                                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-amber)')}
                                  >
                                    Valuta
                                    <ChevronRight size={12} />
                                  </Link>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div
          className="w-72 p-5 overflow-auto flex-shrink-0"
          style={{
            backgroundColor: '#FFFFFF',
            borderLeft: '0.5px solid var(--color-border)',
          }}
        >
          <h2
            className="mb-4"
            style={{
              fontSize: 10,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--color-text-muted)',
            }}
          >
            Progresso valutazione
          </h2>
          {opportunities.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--color-text-faint)', fontStyle: 'italic' }}>
              Nessuna opportunità ancora.
            </p>
          ) : (
            <div className="space-y-2">
              {opportunities.map((opp) => {
                const isEvaluated = !!evalMap[opp.id]?.report
                return (
                  <div key={opp.id} className="flex items-center gap-2">
                    {isEvaluated ? (
                      <CheckCircle2 size={14} style={{ color: 'var(--color-sage)', flexShrink: 0 }} />
                    ) : (
                      <Clock size={14} style={{ color: 'var(--color-linen)', flexShrink: 0 }} />
                    )}
                    <span
                      className="truncate"
                      style={{ fontSize: 12, color: 'var(--color-text-main)' }}
                    >
                      {opp.name}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {opportunities.length > 0 && evaluatedCount === opportunities.length && (
            <Link
              href={`/project/${project.id}/map`}
              className="flex items-center justify-center gap-2 w-full mt-5 py-2.5 px-4 rounded-lg text-xs font-medium transition-colors"
              style={{
                backgroundColor: 'var(--color-amber)',
                color: '#FFFFFF',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#A8612A')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-amber)')}
            >
              Vedi mappa
              <ChevronRight size={14} />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
