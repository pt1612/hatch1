'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import TopNav from '@/components/TopNav'
import BackButton from '@/components/BackButton'
import { ChevronRight, Check, Loader2, Plus, X } from 'lucide-react'
import { computeCategory } from '@/lib/types'
import type { Opportunity, Strategy, Classification } from '@/lib/types'

export default function StrategyClient({
  project,
  opportunities,
  existingStrategy,
}: {
  project: { id: string; title: string }
  opportunities: Opportunity[]
  existingStrategy: Strategy | null
}) {
  const router = useRouter()
  const supabase = createClient()

  const [pursueNowIds, setPursueNowIds] = useState<string[]>(
    existingStrategy?.pursue_now_opportunity_ids ?? []
  )
  const [classifications, setClassifications] = useState<Record<string, Classification>>(
    existingStrategy?.classifications ?? {}
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const evaluatedOpps = opportunities.filter((o) => !!o.potential_score)
  const pursueNowOpps = opportunities.filter((o) => pursueNowIds.includes(o.id))
  const otherOpps = opportunities.filter((o) => !pursueNowIds.includes(o.id))

  function togglePursueNow(oppId: string) {
    setPursueNowIds((prev) =>
      prev.includes(oppId) ? prev.filter((id) => id !== oppId) : [...prev, oppId]
    )
  }

  function handleToggleClassification(oppId: string, field: 'product_fit' | 'market_fit', value: boolean) {
    setClassifications((prev) => {
      const current = prev[oppId] ?? { product_fit: false, market_fit: false, category: 'storage' }
      const updated = { ...current, [field]: value }
      updated.category = computeCategory(updated.product_fit, updated.market_fit)
      return { ...prev, [oppId]: updated }
    })
  }

  async function handleSave() {
    setSaving(true)
    const firstPursueNowId = pursueNowIds[0] ?? null
    const payload = {
      project_id: project.id,
      primary_opportunity_id: firstPursueNowId,
      pursue_now_opportunity_ids: pursueNowIds,
      classifications,
    }
    if (existingStrategy) {
      await supabase.from('strategies').update(payload).eq('id', existingStrategy.id)
    } else {
      await supabase.from('strategies').insert(payload)
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
  }

  const growthOpps = otherOpps.filter((o) => classifications[o.id]?.category === 'growth')
  const backupOpps = otherOpps.filter((o) => classifications[o.id]?.category === 'backup')
  const storageOpps = otherOpps.filter(
    (o) => !classifications[o.id] || classifications[o.id]?.category === 'storage'
  )

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--color-cream)' }}>
      <TopNav projectId={project.id} projectTitle={project.title} />

      <div className="flex-1 overflow-auto p-8 pt-14">
        <BackButton href={`/project/${project.id}/map`} label="Torna alla mappa" />
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
              Prioritizzazione Strategica
            </h1>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
              Agile Focus Dartboard
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 py-2.5 px-4 text-sm font-medium transition-colors disabled:opacity-60"
            style={{ backgroundColor: 'var(--color-amber)', color: '#FFFFFF', borderRadius: 8, border: 'none' }}
            onMouseEnter={(e) => !saving && ((e.currentTarget).style.backgroundColor = '#A8612A')}
            onMouseLeave={(e) => ((e.currentTarget).style.backgroundColor = 'var(--color-amber)')}
          >
            {saving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : saved ? (
              <><Check size={15} />Salvato</>
            ) : (
              'Salva strategia'
            )}
          </button>
        </div>

        {opportunities.length === 0 ? (
          <div className="text-center py-16">
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Nessuna opportunità ancora.</p>
            <Link
              href={`/project/${project.id}/opportunities`}
              style={{ fontSize: 12, color: 'var(--color-amber)', marginTop: 4, display: 'block' }}
            >
              Aggiungi prima le opportunità
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Column 1: Pursue Now */}
            <div>
              <h2
                className="mb-3"
                style={{
                  fontFamily: 'inherit',
                  fontSize: 10,
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--color-text-muted)',
                }}
              >
                Persegui ora
              </h2>

              {pursueNowOpps.length > 0 && (
                <div className="space-y-3 mb-4">
                  {pursueNowOpps.map((opp) => (
                    <div
                      key={opp.id}
                      className="rounded-2xl p-4"
                      style={{ backgroundColor: 'var(--color-amber)', color: '#FFFFFF' }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p style={{ fontSize: 13, fontWeight: 500 }}>{opp.name}</p>
                        <button
                          onClick={() => togglePursueNow(opp.id)}
                          className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-colors"
                          style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)')}
                        >
                          <X size={11} className="text-white" />
                        </button>
                      </div>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginBottom: 12 }}>
                        {opp.customer_segment} · {opp.application}
                      </p>
                      {(opp.potential_score || opp.challenge_score) && (
                        <div className="flex gap-1.5 flex-wrap mb-3">
                          {opp.potential_score && (
                            <span
                              className="px-2 py-0.5 rounded-full"
                              style={{ fontSize: 10, fontWeight: 500, backgroundColor: 'rgba(255,255,255,0.2)', color: '#FFFFFF' }}
                            >
                              Potential: {opp.potential_score.replace('_', ' ')}
                            </span>
                          )}
                          {opp.challenge_score && (
                            <span
                              className="px-2 py-0.5 rounded-full"
                              style={{ fontSize: 10, fontWeight: 500, backgroundColor: 'rgba(255,255,255,0.2)', color: '#FFFFFF' }}
                            >
                              Challenge: {opp.challenge_score.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      )}
                      <Link
                        href={`/project/${project.id}/opportunity/${opp.id}/twins/setup`}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors w-fit"
                        style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#FFFFFF', textDecoration: 'none' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)')}
                      >
                        Entra nella fase Twin
                        <ChevronRight size={12} />
                      </Link>
                    </div>
                  ))}
                </div>
              )}

              {evaluatedOpps.length > 0 && (
                <div>
                  <p
                    className="mb-2"
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: 'var(--color-text-faint)',
                    }}
                  >
                    {pursueNowOpps.length === 0 ? 'Seleziona opportunità da perseguire' : 'Aggiungi altri'}
                  </p>
                  <div className="space-y-2">
                    {evaluatedOpps
                      .filter((o) => !pursueNowIds.includes(o.id))
                      .map((opp) => (
                        <button
                          key={opp.id}
                          onClick={() => togglePursueNow(opp.id)}
                          className="w-full text-left rounded-xl p-3 transition-colors group"
                          style={{
                            backgroundColor: '#FFFFFF',
                            border: '0.5px solid var(--color-border)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--color-amber)'
                            e.currentTarget.style.backgroundColor = 'var(--color-amber-bg)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--color-border)'
                            e.currentTarget.style.backgroundColor = '#FFFFFF'
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="truncate" style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-ink)' }}>{opp.name}</p>
                              <p className="truncate" style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                                {opp.customer_segment} · {opp.application}
                              </p>
                            </div>
                            <Plus size={14} style={{ flexShrink: 0, marginLeft: 8, color: 'var(--color-amber)' }} />
                          </div>
                        </button>
                      ))}
                  </div>
                  {evaluatedOpps.filter((o) => !pursueNowIds.includes(o.id)).length === 0 && (
                    <p style={{ fontSize: 12, color: 'var(--color-text-faint)', fontStyle: 'italic' }}>
                      Tutte le opportunità valutate sono già in Persegui ora.
                    </p>
                  )}
                </div>
              )}

              {evaluatedOpps.length === 0 && (
                <p style={{ fontSize: 12, color: 'var(--color-text-faint)', fontStyle: 'italic' }}>
                  Valuta prima le opportunità per selezionarle qui.
                </p>
              )}
            </div>

            {/* Column 2: Keep Options Open */}
            <div>
              <h2
                className="mb-3"
                style={{
                  fontFamily: 'inherit',
                  fontSize: 10,
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--color-text-muted)',
                }}
              >
                Mantieni opzioni aperte
              </h2>
              {otherOpps.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--color-text-faint)', fontStyle: 'italic' }}>Nessun'altra opportunità.</p>
              ) : (
                <div className="space-y-3">
                  {otherOpps.map((opp) => {
                    const cls = classifications[opp.id] ?? { product_fit: false, market_fit: false, category: 'storage' }
                    const catStyle =
                      cls.category === 'growth'
                        ? { bg: 'var(--color-sage-bg)', color: '#2D7A57' }
                        : cls.category === 'backup'
                        ? { bg: 'var(--color-amber-bg)', color: 'var(--color-amber)' }
                        : { bg: 'var(--color-linen)', color: 'var(--color-text-muted)' }
                    const isEvaluated = !!opp.potential_score

                    return (
                      <div
                        key={opp.id}
                        className="rounded-2xl p-4"
                        style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)' }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <p className="truncate" style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-ink)' }}>{opp.name}</p>
                            <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{opp.customer_segment}</p>
                          </div>
                          <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                            {!isEvaluated && (
                              <span
                                className="px-2 py-0.5 rounded-full"
                                style={{ fontSize: 10, fontWeight: 500, backgroundColor: 'var(--color-linen)', color: 'var(--color-text-muted)' }}
                              >
                                Non valutata
                              </span>
                            )}
                            <span
                              className="px-2 py-0.5 rounded-full"
                              style={{ fontSize: 10, fontWeight: 500, backgroundColor: catStyle.bg, color: catStyle.color }}
                            >
                              {cls.category}
                            </span>
                          </div>
                        </div>
                        {['product_fit', 'market_fit'].map((field) => (
                          <div key={field} className="flex items-center justify-between mb-1" style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                            <span>{field === 'product_fit' ? 'Product fit' : 'Market fit'}</span>
                            <button
                              onClick={() => handleToggleClassification(opp.id, field as 'product_fit' | 'market_fit', !cls[field as keyof typeof cls])}
                              className="relative flex-shrink-0 w-9 h-5 rounded-full transition-colors"
                              style={{ backgroundColor: cls[field as keyof typeof cls] ? 'var(--color-amber)' : 'var(--color-linen)' }}
                            >
                              <span
                                className="absolute top-0.5 left-0 w-4 h-4 bg-white rounded-full shadow transition-transform"
                                style={{ transform: cls[field as keyof typeof cls] ? 'translateX(16px)' : 'translateX(2px)' }}
                              />
                            </button>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Column 3: Strategy Summary */}
            <div>
              <h2
                className="mb-3"
                style={{
                  fontFamily: 'inherit',
                  fontSize: 10,
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--color-text-muted)',
                }}
              >
                Riepilogo strategia
              </h2>

              <div className="space-y-4">
                {[
                  {
                    title: `Persegui ora (${pursueNowOpps.length})`,
                    items: pursueNowOpps,
                    dotColor: 'var(--color-amber)',
                    emptyText: 'Nessuno selezionato',
                  },
                  {
                    title: 'Mantieni opzioni aperte',
                    items: [...growthOpps, ...backupOpps],
                    dotColor: 'var(--color-sage)',
                    emptyText: 'Nessuno ancora',
                  },
                  {
                    title: 'Archivia',
                    items: storageOpps,
                    dotColor: 'var(--color-linen)',
                    emptyText: 'Nessuno',
                  },
                ].map(({ title, items, dotColor, emptyText }) => (
                  <div
                    key={title}
                    className="rounded-2xl p-4"
                    style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)' }}
                  >
                    <p
                      className="mb-2"
                      style={{
                        fontSize: 10,
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      {title}
                    </p>
                    {items.length === 0 ? (
                      <p style={{ fontSize: 12, color: 'var(--color-text-faint)', fontStyle: 'italic' }}>{emptyText}</p>
                    ) : (
                      <div className="space-y-1">
                        {items.map((o) => (
                          <p key={o.id} className="flex items-center gap-1.5" style={{ fontSize: 12, color: 'var(--color-ink)' }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: dotColor, display: 'inline-block', flexShrink: 0 }} />
                            {o.name}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
