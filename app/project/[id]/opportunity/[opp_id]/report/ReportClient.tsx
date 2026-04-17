'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
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
    if (!existingReport) {
      generateReport()
    }
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

      // Persist to Supabase
      if (evaluationId) {
        await supabase
          .from('evaluations')
          .update({ report: generatedReport, messages: [], dimension_scores: {} })
          .eq('id', evaluationId)
      } else {
        const { data } = await supabase
          .from('evaluations')
          .insert({ opportunity_id: opportunity.id, report: generatedReport, messages: [], dimension_scores: {} })
          .select()
          .single()
        if (data) setEvaluationId(data.id)
      }

      // Update opportunity scores
      await supabase
        .from('opportunities')
        .update({
          potential_score: generatedReport.overall_potential,
          challenge_score: generatedReport.overall_challenge,
          phase: 'evaluated',
        })
        .eq('id', opportunity.id)

      // Clear context cache
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

  // Loading state
  if (loading || regenerating) {
    return (
      <div className="flex min-h-screen">
        <Sidebar projectId={project.id} projectTitle={project.title} />
        <div className="ml-60 flex-1 overflow-auto p-8">
          <BackButton href={`/project/${project.id}/opportunities`} label="Back to opportunities" />
          <h1 className="text-lg font-semibold text-gray-900 mb-6">{opportunity.name}</h1>
          <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-4 flex items-center gap-3">
            <Loader2 size={18} className="animate-spin text-[#0D6E6E]" />
            <p className="text-sm text-gray-500">Generating your 6-dimension evaluation…</p>
          </div>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 mb-3 animate-pulse">
              <div className="flex items-center justify-between mb-3">
                <div className="h-4 bg-gray-100 rounded w-40" />
                <div className="h-5 bg-gray-100 rounded-full w-16" />
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full w-full mb-3" />
              <div className="space-y-1.5">
                <div className="h-3 bg-gray-100 rounded w-full" />
                <div className="h-3 bg-gray-100 rounded w-4/5" />
                <div className="h-3 bg-gray-100 rounded w-3/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-screen">
        <Sidebar projectId={project.id} projectTitle={project.title} />
        <div className="ml-60 flex-1 overflow-auto p-8">
          <BackButton href={`/project/${project.id}/opportunities`} label="Back to opportunities" />
          <div className="bg-red-50 border border-red-100 rounded-2xl p-6 flex items-start gap-3">
            <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700 mb-1">Report generation failed</p>
              <p className="text-xs text-red-500 mb-3">
                Something went wrong while generating the evaluation. Please try again.
              </p>
              <button
                onClick={handleRegenerate}
                className="flex items-center gap-2 bg-[#0D6E6E] text-white py-2 px-4 rounded-lg text-xs font-semibold hover:bg-[#0a5555] transition-colors"
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
    <div className="flex min-h-screen">
      <Sidebar projectId={project.id} projectTitle={project.title} />

      <div className="ml-60 flex-1 overflow-auto p-8">
        <BackButton href={`/project/${project.id}/opportunities`} label="Back to opportunities" />

        <div className="max-w-3xl">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{opportunity.name}</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {opportunity.customer_segment} · {opportunity.application}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${POTENTIAL_BADGE[report.overall_potential]}`}>
                Potential: {report.overall_potential.replace('_', ' ')}
              </span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${CHALLENGE_BADGE[report.overall_challenge]}`}>
                Challenge: {report.overall_challenge.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Executive summary */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Executive Summary
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed">{report.executive_summary || (report as unknown as { summary: string }).summary}</p>
          </div>

          {/* Potential dimensions */}
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Potential Dimensions
          </h2>
          <div className="space-y-3 mb-6">
            {POTENTIAL_DIMS.map(({ key, label }) => {
              const dim = report[key as keyof InterviewReport] as DimensionScore | undefined
              if (!dim) return null
              return (
                <div key={key} className="bg-white border border-gray-200 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-800">{label}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-mono">{dim.score}/10</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${POTENTIAL_BADGE[dim.label]}`}>
                        {dim.label.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full bg-[#0D6E6E] rounded-full"
                      style={{ width: `${dim.score * 10}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{dim.analysis}</p>
                </div>
              )
            })}
          </div>

          {/* Challenge dimensions */}
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Challenge Dimensions
          </h2>
          <div className="space-y-3 mb-8">
            {CHALLENGE_DIMS.map(({ key, label }) => {
              const dim = report[key as keyof InterviewReport] as DimensionScore | undefined
              if (!dim) return null
              const displayScore = 10 - dim.score
              return (
                <div key={key} className="bg-white border border-gray-200 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-800">{label}</h3>
                      <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">low = good</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-mono">{displayScore}/10</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${CHALLENGE_BADGE[dim.label]}`}>
                        {dim.label.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full bg-orange-400 rounded-full"
                      style={{ width: `${displayScore * 10}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{dim.analysis}</p>
                </div>
              )
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Link
              href={`/project/${project.id}/opportunities`}
              className="border border-gray-200 text-gray-700 py-2.5 px-4 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              ← Back to opportunities
            </Link>
            <Link
              href={`/project/${project.id}/map`}
              className="flex items-center gap-2 bg-[#0D6E6E] text-white py-2.5 px-4 rounded-lg text-sm font-semibold hover:bg-[#0a5555] transition-colors"
            >
              <Map size={15} />
              View map
            </Link>
          </div>

          {/* Regenerate */}
          <button
            onClick={handleRegenerate}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors mt-5"
          >
            <RefreshCw size={12} />
            Regenerate evaluation
          </button>
        </div>
      </div>
    </div>
  )
}
