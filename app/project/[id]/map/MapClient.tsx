'use client'

import { useState } from 'react'
import Link from 'next/link'
import TopNav from '@/components/TopNav'
import BackButton from '@/components/BackButton'
import { ChevronRight } from 'lucide-react'
import { MAP_DOT_PALETTE, SCORE_TO_POSITION } from '@/lib/constants'
import type { Opportunity } from '@/lib/types'
import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n/context'

const JITTER_PX = 20

function seededJitter(id: string, axis: 'x' | 'y'): number {
  let hash = 0
  const seed = id + axis
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) & 0xffffffff
  }
  return ((hash % (JITTER_PX * 2)) - JITTER_PX)
}

type OppWithReport = Opportunity & { report: { overall_potential?: string; overall_challenge?: string; summary?: string } | null }

export default function MapClient({
  project,
  opportunities }: {
  project: { id: string; title: string }
  opportunities: OppWithReport[]
}) {
  const [tooltip, setTooltip] = useState<string | null>(null)
  const { t } = useI18n()

  const evaluated = opportunities.filter((o) => o.potential_score && o.challenge_score && o.report)

  function getQuadrantLabel(potential: string, challenge: string) {
    const highPotential = potential === 'high' || potential === 'super_high'
    const highChallenge = challenge === 'high' || challenge === 'super_high'
    if (highPotential && !highChallenge) return 'Gold mine'
    if (highPotential && highChallenge) return 'Moonshot'
    if (!highPotential && !highChallenge) return 'Quick win'
    return 'Questionable'
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <TopNav projectId={project.id} projectTitle={project.title} />

      <motion.div className="flex-1 overflow-auto p-8 pt-14" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
        <BackButton href={`/project/${project.id}/evaluations`} label={t.map_back} />
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1
              style={{
                fontWeight: 400,
                fontSize: 34,
                letterSpacing: '-0.03em',
                color: 'var(--color-foreground)' }}
            >
              Attractiveness Map
            </h1>
            <p style={{ fontSize: 12, color: 'var(--color-foreground-muted)', marginTop: 2 }}>
              {`${evaluated.length} ${t.map_evaluated}${evaluated.length === 1 ? t.map_evaluated_singular : t.map_evaluated_plural}`}
            </p>
          </div>
          {evaluated.length >= 2 && (
            <Link
              href={`/project/${project.id}/strategy`}
              className="flex items-center gap-2 py-2.5 px-4 text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: 'var(--color-primary-foreground)',
                borderRadius: 8,
                textDecoration: 'none' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
            >
              {t.map_continue}
              <ChevronRight size={15} />
            </Link>
          )}
        </div>

        {evaluated.length === 0 ? (
          <div className="text-center py-16">
            <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4">
              <rect x="15" y="15" width="70" height="70" rx="8" fill="color-mix(in srgb, var(--color-primary) 10%, transparent)" />
              <line x1="50" y1="15" x2="50" y2="85" stroke="var(--color-muted)" strokeWidth="1.5" />
              <line x1="15" y1="50" x2="85" y2="50" stroke="var(--color-muted)" strokeWidth="1.5" />
              <circle cx="38" cy="38" r="5" fill="var(--color-accent)" opacity="0.5" />
            </svg>
            <p
              style={{
                fontStyle: 'italic',
                fontSize: 14,
                color: 'var(--color-foreground-muted)',
                marginBottom: 8 }}
            >
              {t.map_empty}
            </p>
            <Link
              href={`/project/${project.id}/evaluations`}
              style={{ fontSize: 12, color: 'var(--color-primary)' }}
            >
              {t.map_go_evaluate}
            </Link>
          </div>
        ) : (
          <div className="flex gap-8 items-start">
            {/* Map */}
            <div className="flex-1">
              <div className="flex items-stretch gap-3" style={{ height: 420 }}>
                <div className="flex flex-col items-center justify-center w-5">
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      color: 'var(--color-foreground-faint)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      whiteSpace: 'nowrap',
                      transform: 'rotate(-90deg)',
                      transformOrigin: 'center' }}
                  >
                    Challenge ↑
                  </span>
                </div>

                {/* Map outer — no overflow-hidden so tooltips can spill out */}
                <div
                  className="relative flex-1"
                  style={{ height: 420, border: '0.5px solid var(--color-border)', borderRadius: 12 }}
                >
                  {/* Background layer — clipped to rounded corners */}
                  <div className="absolute inset-0 rounded-xl overflow-hidden">
                    {/* Quadrant backgrounds */}
                    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                      <div style={{ backgroundColor: 'rgba(180,168,136,0.06)' }} />
                      <div style={{ backgroundColor: 'rgba(19,163,137,0.06)' }} />
                      <div style={{ backgroundColor: 'var(--color-background)' }} />
                      <div style={{ backgroundColor: 'rgba(19,163,137,0.06)' }} />
                    </div>

                    {/* Dividers */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-px" style={{ backgroundColor: 'var(--color-border)' }} />
                    <div className="absolute top-1/2 left-0 right-0 h-px" style={{ backgroundColor: 'var(--color-border)' }} />

                    {/* Quadrant labels */}
                    {[
                      { x: '25%', y: '10%', label: 'Questionable', color: 'var(--color-foreground-faint)' },
                      { x: '75%', y: '10%', label: 'Moonshot',     color: 'var(--color-primary)' },
                      { x: '25%', y: '60%', label: 'Quick win',    color: 'var(--color-warm)' },
                      { x: '75%', y: '60%', label: 'Gold mine',    color: 'var(--color-primary)' },
                    ].map(({ x, y, label, color }) => (
                      <span
                        key={label}
                        className="absolute"
                        style={{
                          left: x,
                          top: y,
                          transform: 'translateX(-50%)',
                          fontSize: 10,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          color }}
                      >
                        {label}
                      </span>
                    ))}
                  </div>

                  {/* Dots layer — z-10, overflows for tooltips */}
                  {evaluated.map((opp, idx) => {
                    const potScore = SCORE_TO_POSITION[opp.potential_score!] ?? 38
                    const chalScore = SCORE_TO_POSITION[opp.challenge_score!] ?? 38
                    const leftPct = Math.min(Math.max(potScore + seededJitter(opp.id, 'x') * 0.5, 7), 93)
                    const topPct = Math.min(Math.max(100 - chalScore + seededJitter(opp.id, 'y') * 0.5, 7), 93)
                    const color = MAP_DOT_PALETTE[idx % MAP_DOT_PALETTE.length]
                    const isHovered = tooltip === opp.id

                    const tipLeft = leftPct > 65
                    const tipBelow = topPct < 30
                    const labelTop = topPct < 12 ? '20px' : idx % 2 === 0 ? '-18px' : '20px'
                    const labelAlign = leftPct < 15 ? 'left' : leftPct > 85 ? 'right' : 'center'

                    return (
                      <div
                        key={opp.id}
                        className="absolute"
                        style={{ left: `${leftPct}%`, top: `${topPct}%`, transform: 'translate(-50%, -50%)', zIndex: 10 }}
                        onMouseEnter={() => setTooltip(opp.id)}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        <div
                          className="w-5 h-5 rounded-full border-2 border-white shadow-sm cursor-pointer transition-transform hover:scale-125"
                          style={{ backgroundColor: color }}
                        />
                        <span
                          className="absolute whitespace-nowrap"
                          style={{
                            fontSize: 10,
                            fontWeight: 500,
                            color: 'var(--color-foreground)',
                            top: labelTop,
                            ...(labelAlign === 'center'
                              ? { left: '50%', transform: 'translateX(-50%)' }
                              : labelAlign === 'left'
                              ? { left: 0 }
                              : { right: 0 }) }}
                        >
                          {opp.name.length > 22 ? opp.name.slice(0, 22) + '…' : opp.name}
                        </span>
                        {isHovered && (
                          <div
                            className="absolute z-20 p-3 w-48 pointer-events-none rounded-xl shadow-lg"
                            style={{
                              backgroundColor: '#FFFFFF',
                              border: '0.5px solid var(--color-border)',
                              ...(tipLeft
                                ? { right: '100%', marginRight: 8, left: 'auto', transform: 'none' }
                                : { left: '50%', transform: 'translateX(-50%)' }),
                              ...(tipBelow
                                ? { top: '100%', marginTop: 8, bottom: 'auto' }
                                : { bottom: '100%', marginBottom: 8, top: 'auto' }) }}
                          >
                            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-foreground)', marginBottom: 4 }}>{opp.name}</p>
                            <p style={{ fontSize: 11, color: 'var(--color-foreground-muted)' }}>
                              {t.map_tooltip_potential} <span style={{ fontWeight: 500, color: 'var(--color-foreground)' }}>{opp.potential_score?.replace('_', ' ')}</span>
                            </p>
                            <p style={{ fontSize: 11, color: 'var(--color-foreground-muted)' }}>
                              {t.map_tooltip_challenge} <span style={{ fontWeight: 500, color: 'var(--color-foreground)' }}>{opp.challenge_score?.replace('_', ' ')}</span>
                            </p>
                            {opp.report?.summary && (
                              <p
                                className="line-clamp-3"
                                style={{ fontSize: 11, color: 'var(--color-foreground-faint)', marginTop: 4, lineHeight: '1.5' }}
                              >
                                {opp.report.summary}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <p
                className="text-center mt-2"
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  color: 'var(--color-foreground-faint)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em' }}
              >
                Potential →
              </p>

              <div className="mt-6 flex justify-end">
                <Link
                  href={`/project/${project.id}/strategy`}
                  className="flex items-center gap-2 py-2.5 px-5 text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    color: 'var(--color-primary-foreground)',
                    borderRadius: 8,
                    textDecoration: 'none' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
                >
                  {t.map_go_strategy}
                </Link>
              </div>
            </div>

            {/* Legend */}
            <div className="w-52 flex-shrink-0">
              <h3
                className="mb-3"
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--color-foreground-muted)' }}
              >
                {t.map_legend}
              </h3>
              <div className="space-y-2">
                {evaluated.map((opp, idx) => (
                  <div key={opp.id} className="flex items-start gap-2">
                    <div
                      className="flex-shrink-0 mt-0.5"
                      style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: MAP_DOT_PALETTE[idx % MAP_DOT_PALETTE.length] }}
                    />
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-foreground)', lineHeight: '1.4' }}>{opp.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--color-foreground-muted)' }}>
                        {getQuadrantLabel(opp.potential_score!, opp.challenge_score!)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {opportunities.filter((o) => !o.potential_score).length > 0 && (
                <div className="mt-5 pt-4" style={{ borderTop: '0.5px solid var(--color-border)' }}>
                  <p
                    className="mb-2"
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: 'var(--color-foreground-faint)' }}
                  >
                    {t.map_not_evaluated}
                  </p>
                  {opportunities
                    .filter((o) => !o.potential_score)
                    .map((o) => (
                      <div key={o.id} className="flex items-center gap-2 mb-1.5">
                        <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--color-muted)', flexShrink: 0 }} />
                        <p className="truncate" style={{ fontSize: 12, color: 'var(--color-foreground-faint)' }}>{o.name}</p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
