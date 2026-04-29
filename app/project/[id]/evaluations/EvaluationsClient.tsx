'use client'

import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import { CheckCircle2, ChevronRight, ChevronDown } from 'lucide-react'
import { useState } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────────

type OppWithStatus = {
  id: string
  name: string
  customer_segment: string
  application: string
  isEvaluated: boolean
  hasTwins: boolean
  hasInterviews: boolean
  hasResults: boolean
  hasVPC: boolean
  hasBMC: boolean
}

const STEPS: { label: string; short: string }[] = [
  { label: 'Evaluation',      short: 'Eval' },
  { label: 'Twin Setup',      short: 'Twins' },
  { label: 'Interviews',      short: 'Intrvw' },
  { label: 'Results',         short: 'Results' },
  { label: 'VPC Canvas',      short: 'VPC' },
  { label: 'Business Model',  short: 'BMC' },
]

function getStepDone(opp: OppWithStatus): boolean[] {
  return [
    opp.isEvaluated,
    opp.hasTwins,
    opp.hasInterviews,
    opp.hasResults,
    opp.hasVPC,
    opp.hasBMC,
  ]
}

function getStepHref(opp: OppWithStatus, projectId: string, step: number): string {
  const base = `/project/${projectId}/opportunity/${opp.id}`
  switch (step) {
    case 0: return opp.isEvaluated ? `${base}/report` : `${base}/context`
    case 1: return `${base}/twins/setup`
    case 2: return `${base}/twins/interview`
    case 3: return `${base}/twins/results`
    case 4: return `${base}/vpc`
    case 5: return `${base}/bmc`
    default: return base
  }
}

function getActiveStepHref(opp: OppWithStatus, projectId: string): { href: string; label: string } {
  if (!opp.isEvaluated)  return { href: getStepHref(opp, projectId, 0), label: 'Start Evaluation' }
  if (!opp.hasTwins)     return { href: getStepHref(opp, projectId, 1), label: 'Set Up Twins' }
  if (!opp.hasInterviews)return { href: getStepHref(opp, projectId, 2), label: 'Run Interviews' }
  if (!opp.hasResults)   return { href: getStepHref(opp, projectId, 3), label: 'Generate Results' }
  if (!opp.hasVPC)       return { href: getStepHref(opp, projectId, 4), label: 'Build VPC Canvas' }
  if (!opp.hasBMC)       return { href: getStepHref(opp, projectId, 5), label: 'Build Business Model' }
  return { href: getStepHref(opp, projectId, 5), label: 'View Business Model' }
}

// ─── Step indicator ─────────────────────────────────────────────────────────────

function StepPipeline({ opp, projectId }: { opp: OppWithStatus; projectId: string }) {
  const done = getStepDone(opp)
  // first undone step that is accessible
  const activeIdx = done.findIndex((d) => !d)

  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, i) => {
        const isDone   = done[i]
        const isActive = i === activeIdx
        const isLocked = !isDone && i > activeIdx && activeIdx >= 0
        const href     = (!isLocked || isDone) ? getStepHref(opp, projectId, i) : undefined

        const circleEl = (
          <div className="flex flex-col items-center gap-0.5">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                isDone
                  ? 'bg-[#0D6E6E] text-white'
                  : isActive
                  ? 'bg-white border-2 border-[#0D6E6E] text-[#0D6E6E]'
                  : 'bg-white border-2 border-gray-200 text-gray-300'
              }`}
            >
              {isDone ? (
                <CheckCircle2 size={12} className="fill-current" />
              ) : (
                <span className="text-[9px] font-bold">{i + 1}</span>
              )}
            </div>
            <span
              className={`text-[9px] font-medium whitespace-nowrap ${
                isDone ? 'text-[#0D6E6E]' : isActive ? 'text-gray-700' : 'text-gray-300'
              }`}
            >
              {step.short}
            </span>
          </div>
        )

        return (
          <div key={i} className="flex items-center">
            {href ? (
              <Link href={href} className="hover:opacity-80 transition-opacity">
                {circleEl}
              </Link>
            ) : (
              <div>{circleEl}</div>
            )}
            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div
                className={`h-0.5 w-5 mb-3 flex-shrink-0 ${
                  done[i] && (done[i + 1] || i + 1 === activeIdx) ? 'bg-[#0D6E6E]' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────────

export default function EvaluationsClient({
  project,
  opportunities,
}: {
  project: { id: string; title: string }
  opportunities: OppWithStatus[]
}) {
  const totalSteps = opportunities.length * STEPS.length
  const completedSteps = opportunities.reduce(
    (acc, opp) => acc + getStepDone(opp).filter(Boolean).length,
    0
  )
  const progressPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0

  const [collapsedApps, setCollapsedApps] = useState<Set<string>>(new Set())

  const grouped = opportunities.reduce<{ app: string; opps: OppWithStatus[] }[]>((acc, opp) => {
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

  return (
    <div className="flex min-h-screen">
      <Sidebar projectId={project.id} projectTitle={project.title} />

      <div className="ml-60 flex-1 overflow-auto p-8">
        <div className="max-w-3xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-semibold text-gray-900">Evaluation & Validation</h1>
            <span className="text-sm font-semibold text-[#0D6E6E]">
              {progressPct}% complete
            </span>
          </div>
          <p className="text-xs text-gray-400 mb-5">
            Move each opportunity through all 6 stages — from evaluation to business model canvas.
          </p>

          {/* Overall progress */}
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-7">
            <div
              className="h-full bg-[#0D6E6E] rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Opportunities */}
          {opportunities.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-sm">No opportunities found.</p>
              <Link
                href={`/project/${project.id}/abilities`}
                className="text-xs text-[#0D6E6E] hover:underline mt-1 block"
              >
                Go to abilities chat to generate opportunities
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {grouped.map(({ app, opps }) => {
                const isCollapsed = collapsedApps.has(app)
                const groupDoneSteps = opps.reduce(
                  (acc, o) => acc + getStepDone(o).filter(Boolean).length,
                  0
                )
                const groupTotalSteps = opps.length * STEPS.length
                return (
                  <div key={app} className="border border-gray-200 rounded-2xl overflow-hidden">
                    {/* App group header */}
                    <button
                      onClick={() => toggleApp(app)}
                      className="w-full flex items-center justify-between px-5 py-3.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-sm font-semibold text-gray-800 truncate">{app}</span>
                        <span className="text-[10px] font-semibold text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded-full flex-shrink-0">
                          {groupDoneSteps}/{groupTotalSteps} steps
                        </span>
                      </div>
                      <ChevronDown
                        size={14}
                        className={`text-gray-400 flex-shrink-0 ml-2 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                      />
                    </button>

                    {!isCollapsed && (
                      <div className="divide-y divide-gray-100">
                        {opps.map((opp) => {
                          const { href, label } = getActiveStepHref(opp, project.id)
                          const allDone = getStepDone(opp).every(Boolean)
                          return (
                            <div key={opp.id} className="bg-white px-5 py-4">
                              {/* Opp name + segment */}
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="min-w-0">
                                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
                                    {opp.customer_segment}
                                  </p>
                                  <p className="text-sm font-semibold text-gray-900 leading-snug">
                                    {opp.name}
                                  </p>
                                </div>
                                {allDone ? (
                                  <span className="flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#0D6E6E]/10 text-[#0D6E6E] mt-0.5">
                                    Complete ✓
                                  </span>
                                ) : (
                                  <Link
                                    href={href}
                                    className="flex-shrink-0 flex items-center gap-1 bg-[#0D6E6E] text-white py-1.5 px-3 rounded-lg text-xs font-semibold hover:bg-[#0a5555] transition-colors mt-0.5"
                                  >
                                    {label}
                                    <ChevronRight size={11} />
                                  </Link>
                                )}
                              </div>

                              {/* 6-step pipeline */}
                              <StepPipeline opp={opp} projectId={project.id} />
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

          {/* CTA when all done */}
          {opportunities.length > 0 && opportunities.every((o) => getStepDone(o).every(Boolean)) && (
            <div className="mt-6">
              <Link
                href={`/project/${project.id}/map`}
                className="flex items-center justify-center gap-2 w-full bg-[#0D6E6E] text-white py-3 px-4 rounded-xl text-sm font-semibold hover:bg-[#0a5555] transition-colors"
              >
                View attractiveness map
                <ChevronRight size={16} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
