'use client'

import Link from 'next/link'
import TopNav from '@/components/TopNav'
import { CheckCircle2, ChevronRight, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useI18n, type Translations } from '@/lib/i18n/context'

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

const STEPS = [0, 1, 2, 3, 4, 5]

function getStepDone(opp: OppWithStatus): boolean[] {
  return [opp.isEvaluated, opp.hasTwins, opp.hasInterviews, opp.hasResults, opp.hasVPC, opp.hasBMC]
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

function getActiveStepHref(opp: OppWithStatus, projectId: string, t: Translations): { href: string; label: string } {
  if (!opp.isEvaluated)   return { href: getStepHref(opp, projectId, 0), label: t.eval_start }
  if (!opp.hasTwins)      return { href: getStepHref(opp, projectId, 1), label: t.eval_configure_twin }
  if (!opp.hasInterviews) return { href: getStepHref(opp, projectId, 2), label: t.eval_start_interviews }
  if (!opp.hasResults)    return { href: getStepHref(opp, projectId, 3), label: t.eval_generate_results }
  if (!opp.hasVPC)        return { href: getStepHref(opp, projectId, 4), label: t.eval_build_vpc }
  if (!opp.hasBMC)        return { href: getStepHref(opp, projectId, 5), label: t.eval_build_bmc }
  return { href: getStepHref(opp, projectId, 5), label: t.eval_view_bmc }
}

function StepPipeline({ opp, projectId }: { opp: OppWithStatus; projectId: string }) {
  const { t } = useI18n()
  const done = getStepDone(opp)
  const activeIdx = done.findIndex((d) => !d)
  const stepShorts = [t.eval_step_eval_short, 'Twin', 'Intrvw', t.eval_step_results_short, 'VPC', 'BMC']

  return (
    <div className="flex items-center gap-0">
      {STEPS.map((_, i) => {
        const isDone   = done[i]
        const isActive = i === activeIdx
        const isLocked = !isDone && i > activeIdx && activeIdx >= 0
        const href     = (!isLocked || isDone) ? getStepHref(opp, projectId, i) : undefined

        const circleEl = (
          <div className="flex flex-col items-center gap-0.5">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
              style={{
                backgroundColor: isDone ? 'var(--color-amber)' : '#FFFFFF',
                border: `2px solid ${isDone ? 'var(--color-amber)' : isActive ? 'var(--color-amber)' : 'var(--color-linen)'}`,
                color: isDone ? '#FFFFFF' : isActive ? 'var(--color-amber)' : 'var(--color-text-faint)',
              }}
            >
              {isDone ? (
                <CheckCircle2 size={12} className="fill-current" />
              ) : (
                <span style={{ fontSize: 9, fontWeight: 600 }}>{i + 1}</span>
              )}
            </div>
            <span
              style={{
                fontSize: 9,
                fontWeight: 500,
                whiteSpace: 'nowrap',
                color: isDone ? 'var(--color-amber)' : isActive ? 'var(--color-ink)' : 'var(--color-text-faint)',
              }}
            >
              {stepShorts[i]}
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
            {i < STEPS.length - 1 && (
              <div
                className="h-0.5 w-5 mb-3 flex-shrink-0"
                style={{
                  backgroundColor: done[i] && (done[i + 1] || i + 1 === activeIdx)
                    ? 'var(--color-amber)'
                    : 'var(--color-linen)',
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

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

  const { t } = useI18n()
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
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--color-cream)' }}>
      <TopNav projectId={project.id} projectTitle={project.title} progressPct={progressPct} />

      <motion.div
        className="flex-1 overflow-auto p-8 pt-14"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <div className="max-w-3xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <h1
              style={{
                fontFamily: "'Lora', Georgia, serif",
                fontWeight: 400,
                fontSize: 34,
                letterSpacing: '-0.03em',
                color: 'var(--color-ink)',
              }}
            >
              {t.eval_title}
            </h1>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-amber)' }}>
              {progressPct}{t.eval_completed}
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 20 }}>
            {t.eval_subtitle}
          </p>

          {/* Overall progress */}
          <div
            className="rounded-full overflow-hidden mb-7"
            style={{ height: 4, backgroundColor: 'var(--color-linen)' }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progressPct}%`, backgroundColor: 'var(--color-amber)', boxShadow: '0 0 8px rgba(199,123,58,0.4)' }}
            />
          </div>

          {/* Opportunities */}
          {opportunities.length === 0 ? (
            <div className="text-center py-16">
              <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4">
                <path d="M50 15 C24 15 10 32 10 52 C10 74 25 88 50 88 C75 88 90 74 90 52 C90 32 76 15 50 15 Z" fill="var(--color-amber-bg)" />
                <circle cx="50" cy="50" r="14" fill="var(--color-linen)" />
              </svg>
              <p style={{ fontSize: 13, fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
                {t.eval_no_opps}
              </p>
              <Link
                href={`/project/${project.id}/abilities`}
                style={{ fontSize: 12, color: 'var(--color-amber)', marginTop: 4, display: 'block' }}
              >
                {t.eval_go_abilities}
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {grouped.map(({ app, opps }) => {
                const isCollapsed = collapsedApps.has(app)
                const groupDoneSteps = opps.reduce((acc, o) => acc + getStepDone(o).filter(Boolean).length, 0)
                const groupTotalSteps = opps.length * STEPS.length
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
                          {groupDoneSteps}/{groupTotalSteps} {t.eval_steps}
                        </span>
                      </div>
                      <ChevronDown
                        size={14}
                        style={{
                          color: 'var(--color-text-faint)',
                          flexShrink: 0,
                          marginLeft: 8,
                          transform: isCollapsed ? 'rotate(-90deg)' : 'none',
                          transition: 'transform 0.15s',
                        }}
                      />
                    </button>

                    {!isCollapsed && (
                      <div style={{ borderTop: '0.5px solid var(--color-border)' }}>
                        {opps.map((opp, idx) => {
                          const { href, label } = getActiveStepHref(opp, project.id, t)
                          const allDone = getStepDone(opp).every(Boolean)
                          return (
                            <div
                              key={opp.id}
                              className="px-5 py-4"
                              style={{
                                backgroundColor: '#FFFFFF',
                                borderTop: idx > 0 ? '0.5px solid var(--color-border)' : undefined,
                              }}
                            >
                              <div className="flex items-start justify-between gap-3 mb-3">
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
                                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-ink)' }}>
                                    {opp.name}
                                  </p>
                                </div>
                                {allDone ? (
                                  <span
                                    className="flex-shrink-0 px-2.5 py-1 rounded-full"
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 600,
                                      backgroundColor: 'var(--color-sage-bg)',
                                      color: '#2D7A57',
                                      marginTop: 2,
                                    }}
                                  >
                                    {t.eval_done}
                                  </span>
                                ) : (
                                  <Link
                                    href={href}
                                    className="flex-shrink-0 flex items-center gap-1 py-1.5 px-3 rounded-lg text-xs font-medium"
                                    style={{
                                      backgroundColor: 'var(--color-amber)',
                                      color: '#FFFFFF',
                                      marginTop: 2,
                                      textDecoration: 'none',
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
                                    {label}
                                    <ChevronRight size={11} />
                                  </Link>
                                )}
                              </div>
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

          {opportunities.length > 0 && opportunities.every((o) => getStepDone(o).every(Boolean)) && (
            <div className="mt-6">
              <Link
                href={`/project/${project.id}/map`}
                className="flex items-center justify-center gap-2 w-full py-3 px-4 text-sm font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--color-amber)',
                  color: '#FFFFFF',
                  borderRadius: 10,
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#A8612A')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-amber)')}
              >
                {t.eval_go_map}
                <ChevronRight size={16} />
              </Link>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
