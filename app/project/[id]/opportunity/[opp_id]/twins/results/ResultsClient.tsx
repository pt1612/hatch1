'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import TopNav from '@/components/TopNav'
import BackButton from '@/components/BackButton'
import { Loader2, ChevronRight, RefreshCw, Download } from 'lucide-react'
import type { DigitalTwin, TwinMessage, TwinReport, Opportunity } from '@/lib/types'

const VERDICT_CONFIG = {
  strong_fit: {
    headline: 'Validazione di mercato confermata con alta risonanza.',
    label: 'Strong Fit',
    tagline: 'Forte allineamento tra problema e soluzione proposta.',
    bgColor: 'var(--color-sage)',
    badgeStyle: { backgroundColor: 'rgba(76,175,125,0.15)', color: '#2D7A57' },
  },
  weak_fit: {
    headline: 'Risonanza parziale rilevata — serve un raffinamento.',
    label: 'Weak Fit',
    tagline: 'Esiste un certo allineamento ma il fit necessita di miglioramenti significativi.',
    bgColor: 'var(--color-amber)',
    badgeStyle: { backgroundColor: 'rgba(232,169,106,0.2)', color: '#7A4A20' },
  },
  pivot_needed: {
    headline: 'Mismatch di mercato identificato — consigliato un pivot strategico.',
    label: 'Pivot Needed',
    tagline: 'È consigliato un ripensamento fondamentale del problema o della soluzione.',
    bgColor: '#C0392B',
    badgeStyle: { backgroundColor: 'rgba(220,38,38,0.1)', color: '#DC2626' },
  },
}

function MetricCard({ label, score, description }: { label: string; score: number; description: string }) {
  const displayScore = (score / 10).toFixed(1)
  const color = score >= 70 ? 'var(--color-sage)' : score >= 40 ? 'var(--color-amber)' : '#DC2626'
  const barColor = score >= 70 ? 'var(--color-sage)' : score >= 40 ? 'var(--color-amber)' : '#EF4444'

  return (
    <div
      className="rounded-2xl p-5"
      style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)' }}
    >
      <p
        className="mb-3"
        style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-muted)' }}
      >
        {label}
      </p>
      <p style={{ fontSize: 36, fontWeight: 700, marginBottom: 2, color }}>{displayScore}</p>
      <p style={{ fontSize: 11, color: 'var(--color-text-faint)', marginBottom: 12 }}>su 10</p>
      <div className="w-full rounded-full overflow-hidden" style={{ height: 4, backgroundColor: 'var(--color-linen)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: barColor }}
        />
      </div>
      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 12, lineHeight: '1.6' }}>{description}</p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-40 rounded-2xl" style={{ backgroundColor: 'var(--color-linen)' }} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-36 rounded-2xl" style={{ backgroundColor: 'var(--color-linen)' }} />
        <div className="h-36 rounded-2xl" style={{ backgroundColor: 'var(--color-linen)' }} />
      </div>
      <div className="h-32 rounded-2xl" style={{ backgroundColor: 'var(--color-linen)' }} />
    </div>
  )
}

export default function ResultsClient({
  project,
  opportunity,
  twins,
  messages,
  existingReport,
  twinSessionId,
}: {
  project: { id: string; title: string }
  opportunity: Opportunity
  twins: DigitalTwin[]
  messages: TwinMessage[]
  existingReport: TwinReport | null
  twinSessionId: string | null
}) {
  const supabase = createClient()
  const [report, setReport] = useState<TwinReport | null>(existingReport)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generateReport() {
    if (messages.length === 0) {
      setError('Nessun messaggio trovato. Completa almeno un\'intervista prima di generare i risultati.')
      return
    }
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/generate-twin-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityId: opportunity.id,
          projectInfo: { name: opportunity.name, problem: opportunity.description, target: opportunity.customer_segment, solution: opportunity.application },
          twins,
          messages,
        }),
      })
      if (!res.ok) throw new Error('Generation failed')
      const { report: generated } = await res.json()
      setReport(generated)
      if (twinSessionId) {
        await supabase.from('twin_sessions').update({ report: generated }).eq('id', twinSessionId)
      } else {
        await supabase.from('twin_sessions').insert({ opportunity_id: opportunity.id, report: generated })
      }
      if (generated.whereToPlay && Array.isArray(generated.whereToPlay)) {
        for (const entry of generated.whereToPlay) {
          const twinIdx = parseInt((entry.twinId as string).replace('twin', '')) - 1
          const { data: twinRow } = await supabase
            .from('twins').select('id').eq('opportunity_id', opportunity.id)
            .order('created_at', { ascending: true }).range(twinIdx, twinIdx).maybeSingle()
          if (twinRow) {
            const entryGains = (entry.gains?.length > 0) ? entry.gains : (generated.gains ?? []).slice(0, 3)
            const entryPains = (entry.pains?.length > 0) ? entry.pains : (generated.pains ?? []).slice(0, 3)
            const entryJobs = (entry.jobsToBeDone?.length > 0) ? entry.jobsToBeDone : (generated.jobsToBeDone ?? []).slice(0, 3)
            await supabase.from('twin_interviews').update({
              segment_attractiveness: entry.segmentAttractiveness,
              ability_to_serve: entry.abilityToServe,
              gains: entryGains, pains: entryPains, jobs_to_be_done: entryJobs,
            }).eq('twin_id', twinRow.id).select('id, gains, pains, jobs_to_be_done')
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Qualcosa è andato storto. Riprova.')
    } finally {
      setGenerating(false)
    }
  }

  const verdict = report ? VERDICT_CONFIG[report.verdict] : null

  // ── Download conversation as .txt ──────────────────────────────────────────
  function downloadConversation() {
    const today = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const separator = '─────────────────────────────'

    const lines: string[] = [
      'HATCH — Twin Interview Report',
      `Project: ${project.title}`,
      `Date: ${today}`,
      '',
    ]

    twins.forEach((twin, idx) => {
      lines.push(separator)
      lines.push('')
      lines.push(`TWIN ${idx + 1} — ${twin.name}`)
      lines.push(`Role: ${twin.role}`)
      lines.push(`Sector: ${twin.segment}`)
      lines.push(`Profile: ${twin.personality ?? ''}`)
      lines.push('')
      lines.push('CONVERSATION:')

      const twinMessages = messages.filter(
        (m) => !m.twinId || m.twinId === twin.id || m.twinName === twin.name
      )
      if (twinMessages.length === 0) {
        // Fallback: include all messages for single-twin sessions
        messages.forEach((m) => {
          lines.push(m.role === 'assistant' ? `Twin: ${m.content}` : `AI: ${m.content}`)
        })
      } else {
        twinMessages.forEach((m) => {
          lines.push(m.role === 'assistant' ? `Twin: ${m.content}` : `AI: ${m.content}`)
        })
      }
      lines.push('')
    })

    lines.push(separator)

    const blob = new Blob([lines.join('\n')], { type: 'text/plain; charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `twin-interview-${project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--color-cream)' }}>
      <TopNav projectId={project.id} projectTitle={project.title} />

      <div className="flex-1 overflow-auto p-8 pt-14 max-w-3xl">
        <BackButton href={`/project/${project.id}/opportunity/${opportunity.id}/twins/interview`} label="Torna alle interviste" />

        <div className="flex items-start justify-between mb-6">
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
              Risultati di validazione
            </h1>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>{opportunity.name}</p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={downloadConversation}
              className="flex items-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex-shrink-0"
              style={{
                backgroundColor: '#FFFFFF',
                border: '0.5px solid var(--color-border)',
                color: 'var(--color-ink)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-linen)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
            >
              <Download size={13} />
              Scarica conversazione
            </button>
          )}
        </div>

        {generating && (
          <div className="mb-6">
            <LoadingSkeleton />
            <div className="flex items-center gap-2 mt-4" style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
              <Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-amber)' }} />
              Analisi delle trascrizioni delle interviste…
            </div>
          </div>
        )}

        {error && !generating && (
          <div
            className="rounded-2xl p-5 mb-6"
            style={{ backgroundColor: '#FEF2F2', border: '0.5px solid #FECACA' }}
          >
            <p style={{ fontSize: 13, color: '#DC2626', marginBottom: 12 }}>{error}</p>
            <button
              onClick={generateReport}
              className="flex items-center gap-2"
              style={{ fontSize: 12, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <RefreshCw size={12} /> Riprova
            </button>
          </div>
        )}

        {!report && !generating && !error && (
          <div
            className="rounded-2xl p-8 text-center mb-6"
            style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)' }}
          >
            <svg width="64" height="64" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4">
              <rect x="20" y="20" width="60" height="60" rx="8" fill="var(--color-amber-bg)" />
              <rect x="30" y="60" width="10" height="20" rx="2" fill="var(--color-amber-light)" opacity="0.7" />
              <rect x="45" y="45" width="10" height="35" rx="2" fill="var(--color-amber)" opacity="0.7" />
              <rect x="60" y="35" width="10" height="45" rx="2" fill="var(--color-amber)" />
            </svg>
            <h3 style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-ink)', marginBottom: 8 }}>
              Pronto per generare i risultati
            </h3>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 20, maxWidth: 320, margin: '0 auto 20px', lineHeight: '1.6' }}>
              L'AI analizzerà le trascrizioni delle interviste e produrrà un verdetto di validazione, un punteggio di intensità del problema e uno di risonanza del valore.
            </p>
            <button
              onClick={generateReport}
              className="inline-flex items-center gap-2 py-2.5 px-5 text-sm font-medium transition-colors"
              style={{ backgroundColor: 'var(--color-amber)', color: '#FFFFFF', borderRadius: 10, border: 'none' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#A8612A')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-amber)')}
            >
              Genera risultati
              <ChevronRight size={15} />
            </button>
          </div>
        )}

        {report && verdict && (
          <div className="space-y-5">
            {/* Verdict card */}
            <div className="rounded-2xl p-6 text-white" style={{ backgroundColor: verdict.bgColor }}>
              <div className="flex items-start justify-between mb-3">
                <span
                  className="px-2.5 py-1 rounded-full text-xs font-medium"
                  style={verdict.badgeStyle}
                >
                  {verdict.label}
                </span>
                <button
                  onClick={generateReport}
                  disabled={generating}
                  className="flex items-center gap-1 transition-colors"
                  style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', background: 'none', border: 'none', cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
                >
                  <RefreshCw size={11} />
                  Rigenera
                </button>
              </div>
              <h2
                style={{
                  fontFamily: "'Lora', Georgia, serif",
                  fontWeight: 400,
                  fontSize: 20,
                  lineHeight: '1.4',
                  marginBottom: 8,
                }}
              >
                {verdict.headline}
              </h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: '1.6' }}>{report.summary}</p>
            </div>

            {/* Metric cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MetricCard label="Intensità del problema" score={report.problemIntensity} description="Quanto intensamente i clienti target vivono il problema in base ai segnali delle interviste." />
              <MetricCard label="Risonanza del valore" score={report.valueResonance} description="Quanto la soluzione proposta risuona con i bisogni espressi dai clienti e la loro disponibilità a pagare." />
            </div>

            {/* Recurring themes */}
            {report.recurringThemes?.length > 0 && (
              <div
                className="rounded-2xl p-5"
                style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)' }}
              >
                <h3
                  className="mb-3"
                  style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}
                >
                  Temi ricorrenti
                </h3>
                <div className="flex flex-wrap gap-2">
                  {report.recurringThemes.map((theme, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-full"
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        backgroundColor: 'var(--color-amber-bg)',
                        color: 'var(--color-amber)',
                        border: '0.5px solid rgba(199,123,58,0.2)',
                      }}
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Main objections */}
            {report.mainObjections?.length > 0 && (
              <div
                className="rounded-2xl p-5"
                style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)' }}
              >
                <h3
                  className="mb-3"
                  style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}
                >
                  Obiezioni principali
                </h3>
                <div className="flex flex-wrap gap-2">
                  {report.mainObjections.map((obj, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-full"
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        backgroundColor: 'var(--color-linen)',
                        color: 'var(--color-text-main)',
                        border: '0.5px solid var(--color-border)',
                      }}
                    >
                      {obj}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Next steps */}
            {report.nextSteps?.length > 0 && (
              <div
                className="rounded-2xl p-5"
                style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)' }}
              >
                <h3
                  className="mb-3"
                  style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}
                >
                  Prossimi passi consigliati
                </h3>
                <ol className="space-y-2">
                  {report.nextSteps.map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span
                        className="w-5 h-5 rounded-full text-white flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ fontSize: 10, fontWeight: 600, backgroundColor: 'var(--color-amber)' }}
                      >
                        {i + 1}
                      </span>
                      <p style={{ fontSize: 13, color: 'var(--color-ink)', lineHeight: '1.6' }}>{step}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <Link
              href={`/project/${project.id}/opportunity/${opportunity.id}/vpc`}
              className="flex items-center justify-center gap-2 w-full py-3 px-6 text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'var(--color-amber)',
                color: '#FFFFFF',
                borderRadius: 10,
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#A8612A')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-amber)')}
            >
              Vedi Value Proposition Canvas
              <ChevronRight size={15} />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
