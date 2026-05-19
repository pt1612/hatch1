'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import TopNav from '@/components/TopNav'
import BackButton from '@/components/BackButton'
import { Loader2, AlertCircle, RefreshCw, Map, Save, Check, Minus, Plus, ChevronDown } from 'lucide-react'
import type { Opportunity, InterviewReport, DimensionScore } from '@/lib/types'
import { numericToLabel } from '@/lib/types'
import { POTENTIAL_BADGE, CHALLENGE_BADGE } from '@/lib/constants'
import { motion, type Variants } from 'framer-motion'
import { useI18n } from '@/lib/i18n/context'

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
}

const POTENTIAL_DIM_KEYS = ['reason_to_buy', 'market_volume', 'economic_viability'] as const
const CHALLENGE_DIM_KEYS = ['implementation_obstacles', 'time_to_revenue', 'external_risks'] as const
const ALL_DIM_KEYS = [
  'reason_to_buy', 'market_volume', 'economic_viability',
  'implementation_obstacles', 'time_to_revenue', 'external_risks',
]

function barColor(key: string): string {
  const isChallenge = ['implementation_obstacles', 'time_to_revenue', 'external_risks'].includes(key)
  return isChallenge ? 'var(--color-warm-gray)' : 'var(--color-amber)'
}

function extractScoresFromReport(r: InterviewReport): Record<string, number> {
  const get = (k: string) => ((r as unknown as Record<string, DimensionScore>)[k]?.score ?? 5)
  return Object.fromEntries(ALL_DIM_KEYS.map((k) => [k, get(k)]))
}

function computeOverall(userScores: Record<string, number>) {
  const pot = ['reason_to_buy', 'market_volume', 'economic_viability']
  const chal = ['implementation_obstacles', 'time_to_revenue', 'external_risks']
  const avg = (keys: string[]) => {
    const vals = keys.map((k) => userScores[k]).filter((v) => v != null)
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  }
  const pa = avg(pot)
  const ca = avg(chal)
  return {
    potential: pa != null ? numericToLabel(pa) : null,
    challenge: ca != null ? numericToLabel(ca) : null,
  }
}

// ─── Score stepper ────────────────────────────────────────────────────────────

function ScoreStepper({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(Math.max(1, value - 1))}
        className="flex items-center justify-center transition-colors"
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          border: '0.5px solid var(--color-border)',
          backgroundColor: '#FFFFFF',
          color: 'var(--color-text-muted)',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-amber)'
          e.currentTarget.style.color = 'var(--color-amber)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-border)'
          e.currentTarget.style.color = 'var(--color-text-muted)'
        }}
      >
        <Minus size={10} />
      </button>
      <input
        type="number"
        min={1}
        max={10}
        value={value}
        onChange={(e) => {
          const v = Math.max(1, Math.min(10, parseInt(e.target.value) || 1))
          onChange(v)
        }}
        className="text-center outline-none"
        style={{
          width: 42,
          height: 28,
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--color-ink)',
          border: '0.5px solid var(--color-border)',
          borderRadius: 6,
          backgroundColor: '#FFFFFF',
        }}
        onFocus={(e) => (e.target.style.borderColor = 'var(--color-amber)')}
        onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
      />
      <span style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>/10</span>
      <button
        onClick={() => onChange(Math.min(10, value + 1))}
        className="flex items-center justify-center transition-colors"
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          border: '0.5px solid var(--color-border)',
          backgroundColor: '#FFFFFF',
          color: 'var(--color-text-muted)',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-amber)'
          e.currentTarget.style.color = 'var(--color-amber)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-border)'
          e.currentTarget.style.color = 'var(--color-text-muted)'
        }}
      >
        <Plus size={10} />
      </button>
    </div>
  )
}

// ─── Dimension card ───────────────────────────────────────────────────────────

function DimensionCard({
  dimKey,
  label,
  userScore,
  aiScore,
  analysis,
  onScoreChange,
  onUseAI,
}: {
  dimKey: string
  label: string
  userScore: number
  aiScore: number | undefined
  analysis: string | undefined
  onScoreChange: (v: number) => void
  onUseAI: () => void
}) {
  const { t } = useI18n()
  const aiDiffers = aiScore != null && aiScore !== userScore

  return (
    <motion.div
      variants={itemVariants}
      className="rounded-2xl p-5"
      style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)' }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-ink)', paddingTop: 2 }}>
          {label}
        </h3>
        <div className="flex items-center gap-3 flex-shrink-0">
          <ScoreStepper value={userScore} onChange={onScoreChange} />
          {aiScore != null && (
            <div className="flex items-center gap-1.5">
              <span
                style={{
                  fontSize: 11,
                  color: aiDiffers ? 'var(--color-text-muted)' : 'var(--color-text-faint)',
                  whiteSpace: 'nowrap',
                }}
              >
                AI: {aiScore}/10
              </span>
              {aiDiffers && (
                <button
                  onClick={onUseAI}
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    color: 'var(--color-amber)',
                    backgroundColor: 'var(--color-amber-bg)',
                    border: '0.5px solid rgba(199,123,58,0.25)',
                    borderRadius: 5,
                    padding: '2px 7px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(199,123,58,0.15)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-amber-bg)')}
                >
                  {t.report_use_ai}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div
        className="rounded-full overflow-hidden mb-3"
        style={{ height: 4, backgroundColor: 'var(--color-linen)' }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${userScore * 10}%`,
            backgroundColor: barColor(dimKey),
            boxShadow: `0 0 8px ${barColor(dimKey)}66`,
          }}
        />
      </div>

      {analysis && (
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: '1.7' }}>{analysis}</p>
      )}
    </motion.div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ReportClient({
  project,
  opportunity,
  existingEvaluation,
}: {
  project: { id: string; title: string }
  opportunity: Opportunity
  existingEvaluation: { id: string; report: unknown; dimension_scores: unknown } | null
}) {
  const supabase = createClient()
  const { t, lang } = useI18n()
  const existingReport = existingEvaluation?.report as InterviewReport | null

  const DIM_LABEL: Record<string, string> = {
    reason_to_buy:             t.dim_reason_to_buy,
    market_volume:             t.dim_market_volume,
    economic_viability:        t.dim_economic_viability,
    implementation_obstacles:  t.dim_implementation_obstacles,
    time_to_revenue:           t.dim_time_to_revenue,
    external_risks:            t.dim_external_risks,
  }
  const existingDimScores = existingEvaluation?.dimension_scores as Record<string, number> | null

  // AI report — used for analysis text and AI score suggestions
  const [aiReport, setAiReport] = useState<InterviewReport | null>(existingReport)
  const [loadingAI, setLoadingAI] = useState(!existingReport)
  const [errorAI, setErrorAI] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [evaluationId, setEvaluationId] = useState<string | null>(existingEvaluation?.id ?? null)

  // User's chosen scores per dimension
  const [userScores, setUserScores] = useState<Record<string, number>>(
    existingDimScores && Object.keys(existingDimScores).length > 0
      ? existingDimScores
      : existingReport
      ? extractScoresFromReport(existingReport)
      : {}
  )

  // Save state
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  // Collapsible dimension groups
  const [potentialExpanded, setPotentialExpanded] = useState(false)
  const [challengeExpanded, setChallengeExpanded] = useState(false)

  useEffect(() => {
    if (!existingReport) generateReport()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function generateReport() {
    setLoadingAI(true)
    setErrorAI(false)
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
          language: lang,
        }),
      })
      const { report: generatedReport } = await res.json()
      setAiReport(generatedReport)

      // Only initialize user scores from AI if not already set by user
      setUserScores((prev) =>
        Object.keys(prev).length === 0 ? extractScoresFromReport(generatedReport) : prev
      )

      if (evaluationId) {
        await supabase
          .from('evaluations')
          .update({ report: generatedReport, messages: [] })
          .eq('id', evaluationId)
      } else {
        const { data } = await supabase
          .from('evaluations')
          .insert({
            opportunity_id: opportunity.id,
            report: generatedReport,
            messages: [],
            dimension_scores: {},
          })
          .select()
          .single()
        if (data) setEvaluationId(data.id)
      }

      localStorage.removeItem(`hatch_ctx_${opportunity.id}`)
    } catch {
      setErrorAI(true)
    } finally {
      setLoadingAI(false)
      setRegenerating(false)
    }
  }

  function handleRegenerate() {
    setRegenerating(true)
    setAiReport(null)
    generateReport()
  }

  function setDimScore(key: string, value: number) {
    setSaved(false)
    setUserScores((prev) => ({ ...prev, [key]: value }))
  }

  function useAIScore(key: string) {
    const aiScore = (aiReport as unknown as Record<string, DimensionScore>)?.[key]?.score
    if (aiScore != null) setDimScore(key, aiScore)
  }

  async function handleSave() {
    const { potential: potScore, challenge: chalScore } = computeOverall(userScores)
    if (!potScore || !chalScore) return

    setSaving(true)
    const updatedReport = aiReport
      ? { ...aiReport, overall_potential: potScore, overall_challenge: chalScore }
      : null

    if (evaluationId) {
      await supabase
        .from('evaluations')
        .update({ dimension_scores: userScores, report: updatedReport })
        .eq('id', evaluationId)
    } else {
      const { data } = await supabase
        .from('evaluations')
        .insert({
          opportunity_id: opportunity.id,
          dimension_scores: userScores,
          report: updatedReport,
          messages: [],
        })
        .select()
        .single()
      if (data) setEvaluationId(data.id)
    }

    await supabase
      .from('opportunities')
      .update({ potential_score: potScore, challenge_score: chalScore, phase: 'evaluated' })
      .eq('id', opportunity.id)

    setSaving(false)
    setSaved(true)
  }

  // ── Loading state (initial AI generation) ──────────────────────────────────

  if (loadingAI || regenerating) {
    return (
      <div className="flex min-h-screen" style={{ backgroundColor: 'var(--color-cream)' }}>
        <TopNav projectId={project.id} projectTitle={project.title} />
        <div className="flex-1 overflow-auto p-8 pt-14">
          <BackButton href={`/project/${project.id}/opportunities`} label={t.report_back} />
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
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
              {t.report_generating}
            </p>
          </div>
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl p-5 mb-3 animate-pulse"
              style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="h-4 rounded w-40" style={{ backgroundColor: 'var(--color-linen)' }} />
                <div className="h-6 rounded w-32" style={{ backgroundColor: 'var(--color-linen)' }} />
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

  // ── Error state ────────────────────────────────────────────────────────────

  if (errorAI && Object.keys(userScores).length === 0) {
    return (
      <div className="flex min-h-screen" style={{ backgroundColor: 'var(--color-cream)' }}>
        <TopNav projectId={project.id} projectTitle={project.title} />
        <div className="flex-1 overflow-auto p-8 pt-14">
          <BackButton href={`/project/${project.id}/opportunities`} label={t.report_back} />
          <div
            className="rounded-2xl p-6 flex items-start gap-3"
            style={{ backgroundColor: '#FEF2F2', border: '0.5px solid #FECACA' }}
          >
            <AlertCircle size={18} style={{ color: '#DC2626', flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: '#DC2626', marginBottom: 4 }}>
                {t.report_failed}
              </p>
              <p style={{ fontSize: 12, color: '#EF4444', marginBottom: 12 }}>
                {t.report_failed_hint}
              </p>
              <button
                onClick={handleRegenerate}
                className="flex items-center gap-2 py-2 px-4 rounded-lg text-xs font-medium transition-colors"
                style={{ backgroundColor: 'var(--color-amber)', color: '#FFFFFF', border: 'none', cursor: 'pointer' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#A8612A')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-amber)')}
              >
                <RefreshCw size={13} />
                {t.report_retry}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const { potential: computedPotential, challenge: computedChallenge } = computeOverall(userScores)
  const hasScores = Object.keys(userScores).length === ALL_DIM_KEYS.length

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--color-cream)' }}>
      <TopNav projectId={project.id} projectTitle={project.title} />

      <motion.div
        className="flex-1 overflow-auto p-8 pt-14"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <BackButton href={`/project/${project.id}/opportunities`} label={t.report_back} />

        <motion.div className="max-w-3xl" variants={containerVariants} initial="hidden" animate="show">

          {/* Header */}
          <div className="flex items-start justify-between mb-6 gap-4">
            <div className="min-w-0">
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

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Live computed scores */}
              {computedPotential && (
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border ${POTENTIAL_BADGE[computedPotential]}`}
                >
                  {t.report_potential_label} {computedPotential.replace('_', ' ')}
                </span>
              )}
              {computedChallenge && (
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border ${CHALLENGE_BADGE[computedChallenge]}`}
                >
                  {t.report_challenge_label} {computedChallenge.replace('_', ' ')}
                </span>
              )}

              {/* Save button */}
              <button
                onClick={handleSave}
                disabled={saving || !hasScores}
                className="flex items-center gap-1.5 py-2 px-3.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: saved ? 'var(--color-sage)' : 'var(--color-amber)',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: saving || !hasScores ? 'default' : 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!saving && hasScores)
                    e.currentTarget.style.backgroundColor = saved ? '#2D7A57' : '#A8612A'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = saved
                    ? 'var(--color-sage)'
                    : 'var(--color-amber)'
                }}
              >
                {saving ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : saved ? (
                  <Check size={13} />
                ) : (
                  <Save size={13} />
                )}
                {saving ? t.report_saving : saved ? t.report_saved : t.report_save}
              </button>
            </div>
          </div>

          {/* Executive summary (if AI report available) */}
          {aiReport?.executive_summary && (
            <motion.div
              variants={itemVariants}
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
                }}
              >
                {t.report_ai_summary}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--color-ink)', lineHeight: '1.7' }}>
                {aiReport.executive_summary}
              </p>
            </motion.div>
          )}

          {/* AI error banner (non-blocking, when user already has scores) */}
          {errorAI && hasScores && (
            <div
              className="rounded-xl p-3 mb-5 flex items-center gap-2"
              style={{ backgroundColor: '#FEF2F2', border: '0.5px solid #FECACA' }}
            >
              <AlertCircle size={14} style={{ color: '#DC2626', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#DC2626' }}>
                {t.report_ai_unavailable}{' '}
                <button
                  onClick={handleRegenerate}
                  style={{ color: '#DC2626', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  {t.report_retry}
                </button>
              </span>
            </div>
          )}

          {/* ── Fix f: Aggregated dimension groups ─────────────────────────── */}
          {[
            { label: t.report_dim_potential, keys: POTENTIAL_DIM_KEYS, expanded: potentialExpanded, setExpanded: setPotentialExpanded, color: 'var(--color-amber)' },
            { label: t.report_dim_challenge, keys: CHALLENGE_DIM_KEYS, expanded: challengeExpanded, setExpanded: setChallengeExpanded, color: 'var(--color-warm-gray)' },
          ].map((group) => {
            const scores = group.keys.map((k) => userScores[k]).filter((v) => v != null)
            const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null
            return (
              <motion.div key={group.label} variants={itemVariants} className="rounded-2xl overflow-hidden mb-4"
                style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)' }}>
                <button onClick={() => group.setExpanded((v) => !v)} className="w-full text-left p-5"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h2 style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-ink)', margin: 0 }}>{group.label}</h2>
                      <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{t.report_aggregated_hint}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {avg != null && (
                        <span style={{ fontSize: 18, fontWeight: 600, color: group.color }}>
                          {avg.toFixed(1)}<span style={{ fontSize: 12, fontWeight: 400, color: 'var(--color-text-muted)' }}>/10</span>
                        </span>
                      )}
                      <ChevronDown size={16} style={{
                        color: 'var(--color-text-muted)',
                        transform: group.expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                      }} />
                    </div>
                  </div>
                  {avg != null && (
                    <div style={{ height: 4, borderRadius: 2, backgroundColor: 'var(--color-linen)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(avg / 10) * 100}%`, backgroundColor: group.color, borderRadius: 2, transition: 'width 0.4s ease' }} />
                    </div>
                  )}
                  <p style={{ fontSize: 11, color: group.color, marginTop: 6 }}>
                    {group.expanded ? t.report_hide_details : t.report_show_details}
                  </p>
                </button>
                {group.expanded && (
                  <div className="px-5 pb-5 space-y-3">
                    {group.keys.map((key) => {
                      const aiDim = aiReport ? (aiReport as unknown as Record<string, DimensionScore>)[key] : null
                      return (
                        <DimensionCard key={key} dimKey={key} label={DIM_LABEL[key]}
                          userScore={userScores[key] ?? 5} aiScore={aiDim?.score} analysis={aiDim?.analysis}
                          onScoreChange={(v) => setDimScore(key, v)} onUseAI={() => useAIScore(key)} />
                      )
                    })}
                  </div>
                )}
              </motion.div>
            )
          })}

          {/* Footer actions */}
          <div className="flex items-center justify-between pb-24">
            <Link href={`/project/${project.id}/opportunities`}
              className="py-2.5 px-4 text-sm font-medium transition-colors"
              style={{ border: '0.5px solid var(--color-border)', color: 'var(--color-ink)', borderRadius: 8, textDecoration: 'none' }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-amber)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}>
              {t.report_back}
            </Link>
            <div className="flex items-center gap-3">
              <button onClick={handleRegenerate} disabled={loadingAI || regenerating}
                className="flex items-center gap-1.5 transition-colors disabled:opacity-40"
                style={{ fontSize: 12, color: 'var(--color-text-faint)', background: 'none', border: 'none', cursor: 'pointer' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-faint)')}>
                <RefreshCw size={12} />
                {t.report_regen_ai}
              </button>
              <Link href={`/project/${project.id}/map`}
                className="flex items-center gap-2 py-2.5 px-4 text-sm font-medium transition-colors"
                style={{ backgroundColor: 'var(--color-amber)', color: '#FFFFFF', borderRadius: 8, textDecoration: 'none' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#A8612A')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-amber)')}>
                <Map size={15} />
                {t.report_view_map}
              </Link>
            </div>
          </div>

        </motion.div>
      </motion.div>

      {/* ── Fix g: Fixed prominent save bar ─────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        backgroundColor: 'rgba(250,247,242,0.95)', backdropFilter: 'blur(8px)',
        borderTop: '0.5px solid var(--color-border)',
        padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <div className="flex items-center gap-3">
          {computedPotential && (
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${POTENTIAL_BADGE[computedPotential]}`}>
              {t.report_potential_label} {computedPotential.replace('_', ' ')}
            </span>
          )}
          {computedChallenge && (
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${CHALLENGE_BADGE[computedChallenge]}`}>
              {t.report_challenge_label} {computedChallenge.replace('_', ' ')}
            </span>
          )}
          {!hasScores && (
            <span style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>Set all 6 scores to save</span>
          )}
        </div>
        <button onClick={handleSave} disabled={saving || !hasScores}
          className="flex items-center gap-2 py-3 px-6 text-sm font-semibold disabled:opacity-50 transition-colors"
          style={{
            backgroundColor: saved ? 'var(--color-sage)' : 'var(--color-amber)', color: '#FFFFFF',
            borderRadius: 10, border: 'none', cursor: saving || !hasScores ? 'default' : 'pointer',
            boxShadow: '0 4px 14px rgba(199,123,58,0.35)', minWidth: 140, justifyContent: 'center',
          }}
          onMouseEnter={(e) => { if (!saving && hasScores) e.currentTarget.style.backgroundColor = saved ? '#2D7A57' : '#A8612A' }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = saved ? 'var(--color-sage)' : 'var(--color-amber)' }}>
          {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <Check size={15} /> : <Save size={15} />}
          {saving ? t.report_saving : saved ? t.report_saved : t.report_save}
        </button>
      </div>
    </div>
  )
}
