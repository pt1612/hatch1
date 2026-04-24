'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import BackButton from '@/components/BackButton'
import { Loader2, ChevronRight, RefreshCw } from 'lucide-react'
import type { DigitalTwin, TwinMessage, TwinReport, Opportunity } from '@/lib/types'

const VERDICT_CONFIG = {
  strong_fit: {
    headline: 'Market viability confirmed with high resonance.',
    label: 'Strong Fit',
    tagline: 'Strong alignment between problem and proposed solution.',
    bg: 'bg-[#0D6E6E]',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  weak_fit: {
    headline: 'Partial resonance detected — refinement required.',
    label: 'Weak Fit',
    tagline: 'Some alignment exists but the fit needs significant improvement.',
    bg: 'bg-amber-600',
    badge: 'bg-amber-100 text-amber-700',
  },
  pivot_needed: {
    headline: 'Market mismatch identified — strategic pivot advised.',
    label: 'Pivot Needed',
    tagline: 'A fundamental rethink of the problem or solution is recommended.',
    bg: 'bg-red-600',
    badge: 'bg-red-100 text-red-700',
  },
}

function MetricCard({
  label,
  score,
  description,
}: {
  label: string
  score: number
  description: string
}) {
  const displayScore = (score / 10).toFixed(1)
  const color =
    score >= 70 ? 'text-emerald-600' : score >= 40 ? 'text-amber-600' : 'text-red-500'

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
        {label}
      </p>
      <p className={`text-4xl font-black mb-1 ${color}`}>{displayScore}</p>
      <p className="text-xs text-gray-400 mb-3">out of 10</p>
      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500'
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-3 leading-relaxed">{description}</p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-40 bg-gray-200 rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-36 bg-gray-200 rounded-2xl" />
        <div className="h-36 bg-gray-200 rounded-2xl" />
      </div>
      <div className="h-32 bg-gray-200 rounded-2xl" />
      <div className="h-32 bg-gray-200 rounded-2xl" />
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
      setError('No interview messages found. Please complete at least one interview first.')
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
          projectInfo: {
            name: opportunity.name,
            problem: opportunity.description,
            target: opportunity.customer_segment,
            solution: opportunity.application,
          },
          twins,
          messages,
        }),
      })

      if (!res.ok) throw new Error('Generation failed')
      const { report: generated } = await res.json()
      setReport(generated)

      // Save report to twin_sessions
      if (twinSessionId) {
        await supabase
          .from('twin_sessions')
          .update({ report: generated })
          .eq('id', twinSessionId)
      } else {
        await supabase.from('twin_sessions').insert({
          opportunity_id: opportunity.id,
          report: generated,
        })
      }

      // Update twin_interviews with extracted gains/pains/jobs per twin
      console.log('[ResultsClient] whereToPlay:', JSON.stringify(generated.whereToPlay ?? null))

      if (generated.whereToPlay && Array.isArray(generated.whereToPlay)) {
        for (const entry of generated.whereToPlay) {
          // Find the DB twin id for this twin
          const twinIdx = parseInt((entry.twinId as string).replace('twin', '')) - 1
          const { data: twinRow } = await supabase
            .from('twins')
            .select('id')
            .eq('opportunity_id', opportunity.id)
            .order('created_at', { ascending: true })
            .range(twinIdx, twinIdx)
            .maybeSingle()

          console.log(`[ResultsClient] entry ${entry.twinId} (idx ${twinIdx}):`, JSON.stringify({
            gains: entry.gains,
            pains: entry.pains,
            jobsToBeDone: entry.jobsToBeDone,
          }))
          console.log(`[ResultsClient] twinRow:`, twinRow)

          if (twinRow) {
            // Fallback to top-level aggregated values if per-twin fields are empty
            const entryGains = (entry.gains?.length > 0) ? entry.gains : (generated.gains ?? []).slice(0, 3)
            const entryPains = (entry.pains?.length > 0) ? entry.pains : (generated.pains ?? []).slice(0, 3)
            const entryJobs = (entry.jobsToBeDone?.length > 0) ? entry.jobsToBeDone : (generated.jobsToBeDone ?? []).slice(0, 3)

            const { data: updated, error: updateErr } = await supabase
              .from('twin_interviews')
              .update({
                segment_attractiveness: entry.segmentAttractiveness,
                ability_to_serve: entry.abilityToServe,
                gains: entryGains,
                pains: entryPains,
                jobs_to_be_done: entryJobs,
              })
              .eq('twin_id', twinRow.id)
              .select('id, gains, pains, jobs_to_be_done')

            console.log(`[ResultsClient] update result:`, JSON.stringify(updated), 'error:', updateErr)
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const verdict = report ? VERDICT_CONFIG[report.verdict] : null

  return (
    <div className="flex min-h-screen">
      <Sidebar
        projectId={project.id}
        projectTitle={project.title}
        primaryOpportunityId={opportunity.id}
        primaryOpportunityName={opportunity.name}
        hasTwinInterviews={messages.length > 0}
      />

      <div className="ml-60 flex-1 overflow-auto p-8 max-w-3xl">
        <BackButton
          href={`/project/${project.id}/opportunity/${opportunity.id}/twins/interview`}
          label="Back to interviews"
        />

        <div className="mb-6">
          <h1 className="text-lg font-semibold text-gray-900">Validation Results</h1>
          <p className="text-sm text-gray-400 mt-0.5">{opportunity.name}</p>
        </div>

        {generating && (
          <div className="mb-6">
            <LoadingSkeleton />
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-4">
              <Loader2 size={14} className="animate-spin" />
              Analyzing interview transcripts…
            </div>
          </div>
        )}

        {error && !generating && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-6">
            <p className="text-sm text-red-700 mb-3">{error}</p>
            <button
              onClick={generateReport}
              className="flex items-center gap-2 text-xs font-semibold text-red-600 hover:text-red-800"
            >
              <RefreshCw size={12} /> Try again
            </button>
          </div>
        )}

        {!report && !generating && !error && (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center mb-6">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Ready to generate results</h3>
            <p className="text-xs text-gray-400 mb-5 max-w-sm mx-auto leading-relaxed">
              AI will analyze your interview transcripts and produce a validation verdict, problem
              intensity score, and value resonance score.
            </p>
            <button
              onClick={generateReport}
              className="inline-flex items-center gap-2 bg-[#0D6E6E] text-white py-2.5 px-5 rounded-xl text-sm font-semibold hover:bg-[#0a5555] transition-colors"
            >
              Generate Results
              <ChevronRight size={15} />
            </button>
          </div>
        )}

        {report && verdict && (
          <div className="space-y-5">
            {/* Verdict card */}
            <div className={`${verdict.bg} text-white rounded-2xl p-6`}>
              <div className="flex items-start justify-between mb-3">
                <span
                  className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${verdict.badge}`}
                >
                  {verdict.label}
                </span>
                <button
                  onClick={generateReport}
                  disabled={generating}
                  className="flex items-center gap-1 text-xs text-white/60 hover:text-white transition-colors"
                >
                  <RefreshCw size={11} />
                  Regenerate
                </button>
              </div>
              <h2 className="text-xl font-black leading-tight mb-2">{verdict.headline}</h2>
              <p className="text-sm text-white/70 leading-relaxed">{report.summary}</p>
            </div>

            {/* Metric cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MetricCard
                label="Problem Intensity"
                score={report.problemIntensity}
                description="How intensely the target customers experience the problem based on interview signals."
              />
              <MetricCard
                label="Value Resonance"
                score={report.valueResonance}
                description="How well the proposed solution resonates with customers' expressed needs and WTP."
              />
            </div>

            {/* Recurring themes */}
            {report.recurringThemes?.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Recurring Themes
                </h3>
                <div className="flex flex-wrap gap-2">
                  {report.recurringThemes.map((theme, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-full border border-[#0D6E6E]/20 text-xs font-semibold text-[#0D6E6E] bg-[#0D6E6E]/5"
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Main objections */}
            {report.mainObjections?.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Main Objections
                </h3>
                <div className="flex flex-wrap gap-2">
                  {report.mainObjections.map((obj, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-full border border-amber-200 text-xs font-semibold text-amber-700 bg-amber-50"
                    >
                      {obj}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Next steps */}
            {report.nextSteps?.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Recommended Next Steps
                </h3>
                <ol className="space-y-2">
                  {report.nextSteps.map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-[#0D6E6E] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-sm text-gray-700 leading-relaxed">{step}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* CTA to VPC */}
            <Link
              href={`/project/${project.id}/opportunity/${opportunity.id}/vpc`}
              className="flex items-center justify-center gap-2 w-full bg-[#0D6E6E] text-white py-3 px-6 rounded-xl text-sm font-semibold hover:bg-[#0a5555] transition-colors"
            >
              View Value Proposition Canvas
              <ChevronRight size={15} />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
