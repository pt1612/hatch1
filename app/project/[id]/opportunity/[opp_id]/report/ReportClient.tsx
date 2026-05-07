'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import TopNav from '@/components/TopNav'
import BackButton from '@/components/BackButton'
import { Loader2, AlertCircle, RefreshCw, Map } from 'lucide-react'
import { POTENTIAL_BADGE, CHALLENGE_BADGE } from '@/lib/constants'
import type { Opportunity, InterviewReport, DimensionScore } from '@/lib/types'

const POTENTIAL_DIMS = [
  { key: 'reason_to_buy', label: 'Reason to Buy' },
  { key: 'market_volume', label: 'Market Volume' },
  { key: 'economic_viability', label: 'Economic Viability' },
]
const CHALLENGE_DIMS = [
  { key: 'implementation_obstacles', label: 'Implementation Obstacles' },
  { key: 'time_to_revenue', label: 'Time to Revenue' },
  { key: 'external_risks', label: 'External Risks' },
]

function scoreBgColor(score: number): { bg: string; text: string } {
  if (score <= 3) return { bg: 'rgba(76,175,125,0.10)', text: '#2D7A57' }
  if (score <= 6) return { bg: 'rgba(232,169,106,0.20)', text: '#7A4A20' }
  return { bg: 'rgba(199,123,58,0.20)', text: '#7A3D10' }
}

export default function ReportClient({
  project,
  opportunity,
  existingEvaluation,
}: {
  project: { id: string; title: string }
  opportunity: Opportunity
  existingEvaluation: { id: string; report: unknown } | null
}) {
  const supabase = createClient()
  const existingReport = existingEvaluation?.report as InterviewReport | null

  const [report, setReport] = useState<InterviewReport | null>(existingReport)
  const [loading, setLoading] = useState(!existingReport)
  const [error, setError] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [evaluationId, setEvaluationId] = useState<string | null>(existingEvaluation?.id ?? null)

  useEffect(() => {
    if (!existingReport) generateReport()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function generateReport() {
    setLoading(true)
    setError(false)
    const userContext = localStorage.getItem(`hatch_ctx_${opportunity.id}`) || ''
    try {
      const res = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityName: opportunity.name,
          application: opportunity.application,
          customerSegment: opportunity.customer_segment,
          description: opportunity.description,
          userContext,
        }),
      })
      const { report: generatedReport } = await res.json()
      setReport(generatedReport)
      if (evaluationId) {
        await supabase.from('evaluations').update({ report: generatedReport, messages: [], dimension_scores: {} }).eq('id', evaluationId)
      } else {
        const { data } = await supabase
          .from('evaluations')
          .insert({ opportunity_id: opportunity.id, report: generatedReport, messages: [], dimension_scores: {} })
          .select()
          .single()
        if (data) setEvaluationId(data.id)
      }
      await supabase
        .from('opportunities')
        .update({ potential_score: generatedReport.overall_potential, challenge_score: generatedReport.overall_challenge, phase: 'evaluated' })
        .eq('id', opportunity.id)
      localStorage.removeItem(`hatch_ctx_${opportunity.id}`)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
      setRegenerating(false)
    }
  }

  function handleRegenerate() {
    setRegenerating(true)
    setReport(null)
    generateReport()
  }

  if (loading || regenerating) {
    return (
      <div className="flex min-h-screen" style={{ backgroundColor: 'var(--color-cream)' }}>
        <TopNav projectId={project.id} projectTitle={project.title} />
        <div className="flex-1 overflow-auto p-8 pt-4">
          <BackButton href={`/project/${project.id}/opportunities`} label="Back to opportunities" />
          <h1
            style={{
              fontFamily: "'Lora', Georgia, serif",
              fontWeight: 400,
              fontSize: 22,
              color: 'var(--color-ink)',
              marginBottom: 24,
            }}
          >
            {opportunity.name}
          </h1>
          <div
            className="rounded-2xl p-6 mb-4 flex items-center gap-3"
            style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)' }}
          >
            <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-amber)' }} />
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Generating your 6-dimension evaluation…</p>
          </div>
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl p-5 mb-3 animate-pulse"
              style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="h-4 rounded w-40" style={{ backgroundColor: 'var(--color-linen)' }} />
                <div className="h-5 rounded-full w-16" style={{ backgroundColor: 'var(--color-linen)' }} />
              </div>
              <div className="h-1.5 rounded-full w-full mb-3" style={{ backgroundColor: 'var(--color-linen)' }} />
              <div className="space-y-1.5">
                {[1, 0.8, 0.6].map((w, j) => (
                  <div key={j} className="h-3 rounded" style={{ backgroundColor: 'var(--color-linen)', width: `${w * 100}%` }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen" style={{ backgroundColor: 'var(--color-cream)' }}>
        <TopNav projectId={project.id} projectTitle={project.title} />
        <div className="flex-1 overflow-auto p-8 pt-4">
          <BackButton href={`/project/${project.id}/opportunities`} label="Back to opportunities" />
          <div
            className="rounded-2xl p-6 flex items-start gap-3"
            style={{ backgroundColor: '#FEF2F2', border: '0.5px solid #FECACA' }}
          >
            <AlertCircle size={18} style={{ color: '#DC2626', flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: '#DC2626', marginBottom: 4 }}>Report generation failed</p>
              <p style={{ fontSize: 12, color: '#EF4444', marginBottom: 12 }}>
                Something went wrong while generating the evaluation. Please try again.
              </p>
              <button
                onClick={handleRegenerate}
                className="flex items-center gap-2 py-2 px-4 rounded-lg text-xs font-medium transition-colors"
                style={{ backgroundColor: 'var(--color-amber)', color: '#FFFFFF', border: 'none' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#A8612A')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-amber)')}
              >
                <RefreshCw size={13} />
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!report) return null

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--color-cream)' }}>
      <TopNav projectId={project.id} projectTitle={project.title} />

      <div className="flex-1 overflow-auto p-8 pt-4">
        <BackButton href={`/project/${project.id}/opportunities`} label="Back to opportunities" />

        <div className="max-w-3xl">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1
                style={{
                  fontFamily: "'Lora', Georgia, serif",
                  fontWeight: 400,
                  fontSize: 22,
                  letterSpacing: '-0.02em',
                  color: 'var(--color-ink)',
                }}
              >
                {opportunity.name}
              </h1>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                {opportunity.customer_segment} · {opportunity.application}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
              <span
                className={`px-3 py-1.5 rounded-full text-xs font-medium border ${POTENTIAL_BADGE[report.overall_potential]}`}
                style={{ fontSize: 13 }}
              >
                Potential: {report.overall_potential.replace('_', ' ')}
              </span>
              <span
                className={`px-3 py-1.5 rounded-full text-xs font-medium border ${CHALLENGE_BADGE[report.overall_challenge]}`}
                style={{ fontSize: 13 }}
              >
                Challenge: {report.overall_challenge.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Executive summary */}
          <div
            className="rounded-2xl p-5 mb-5"
            style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)' }}
          >
            <h2
              className="mb-2"
              style={{
                fontSize: 10,
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--color-text-muted)',
                fontFamily: 'inherit',
              }}
            >
              Executive Summary
            </h2>
            <p style={{ fontSize: 13, color: 'var(--color-ink)', lineHeight: '1.7' }}>{report.executive_summary}</p>
          </div>

          {/* Potential dimensions */}
          <h2
            className="mb-3"
            style={{
              fontSize: 10,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--color-text-muted)',
              fontFamily: 'inherit',
            }}
          >
            Potential Dimensions
          </h2>
          <div className="space-y-3 mb-6">
            {POTENTIAL_DIMS.map(({ key, label }) => {
              const dim = (report as unknown as Record<string, DimensionScore>)[key]
              if (!dim) return null
              const { bg, text } = scoreBgColor(dim.score)
              return (
                <div
                  key={key}
                  className="rounded-2xl p-5"
                  style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-ink)' }}>{label}</h3>
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded-full px-3 py-1"
                        style={{ fontSize: 13, fontWeight: 500, backgroundColor: bg, color: text }}
                      >
                        {dim.score}/10
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${POTENTIAL_BADGE[dim.label]}`}>
                        {dim.label.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <div
                    className="rounded-full overflow-hidden mb-3"
                    style={{ height: 4, backgroundColor: 'var(--color-linen)' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${dim.score * 10}%`, backgroundColor: 'var(--color-amber)' }}
                    />
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: '1.7' }}>{dim.analysis}</p>
                </div>
              )
            })}
          </div>

          {/* Challenge dimensions */}
          <h2
            className="mb-3"
            style={{
              fontSize: 10,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--color-text-muted)',
              fontFamily: 'inherit',
            }}
          >
            Challenge Dimensions
          </h2>
          <div className="space-y-3 mb-8">
            {CHALLENGE_DIMS.map(({ key, label }) => {
              const dim = (report as unknown as Record<string, DimensionScore>)[key]
              if (!dim) return null
              const displayScore = 10 - dim.score
              const { bg, text } = scoreBgColor(displayScore)
              return (
                <div
                  key={key}
                  className="rounded-2xl p-5"
                  style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-ink)' }}>{label}</h3>
                      <span
                        className="px-1.5 py-0.5 rounded"
                        style={{ fontSize: 10, fontWeight: 500, backgroundColor: 'var(--color-linen)', color: 'var(--color-text-muted)' }}
                      >
                        low = good
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded-full px-3 py-1"
                        style={{ fontSize: 13, fontWeight: 500, backgroundColor: bg, color: text }}
                      >
                        {displayScore}/10
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${CHALLENGE_BADGE[dim.label]}`}>
                        {dim.label.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <div
                    className="rounded-full overflow-hidden mb-3"
                    style={{ height: 4, backgroundColor: 'var(--color-linen)' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${displayScore * 10}%`, backgroundColor: 'var(--color-amber-light)' }}
                    />
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: '1.7' }}>{dim.analysis}</p>
                </div>
              )
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Link
              href={`/project/${project.id}/opportunities`}
              className="py-2.5 px-4 text-sm font-medium transition-colors"
              style={{
                border: '0.5px solid var(--color-border)',
                color: 'var(--color-ink)',
                borderRadius: 8,
                textDecoration: 'none',
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-amber)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            >
              ← Back to opportunities
            </Link>
            <Link
              href={`/project/${project.id}/map`}
              className="flex items-center gap-2 py-2.5 px-4 text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'var(--color-amber)',
                color: '#FFFFFF',
                borderRadius: 8,
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#A8612A')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-amber)')}
            >
              <Map size={15} />
              View map
            </Link>
          </div>

          <button
            onClick={handleRegenerate}
            className="flex items-center gap-1.5 transition-colors mt-5"
            style={{ fontSize: 12, color: 'var(--color-text-faint)', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-faint)')}
          >
            <RefreshCw size={12} />
            Regenerate evaluation
          </button>
        </div>
      </div>
    </div>
  )
}
