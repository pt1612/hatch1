'use client'

import { useState } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import { ChevronRight } from 'lucide-react'
import { MAP_DOT_PALETTE, SCORE_TO_POSITION } from '@/lib/constants'
import type { Opportunity } from '@/lib/types'

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
  opportunities,
}: {
  project: { id: string; title: string }
  opportunities: OppWithReport[]
}) {
  const [tooltip, setTooltip] = useState<string | null>(null)

  const evaluated = opportunities.filter((o) => o.potential_score && o.challenge_score && o.report)

  function getQuadrantLabel(potential: string, challenge: string) {
    const highPotential = potential === 'high' || potential === 'super_high'
    const highChallenge = challenge === 'high' || challenge === 'super_high'
    if (highPotential && !highChallenge) return 'Gold Mine'
    if (highPotential && highChallenge) return 'Moon Shot'
    if (!highPotential && !highChallenge) return 'Quick Win'
    return 'Questionable'
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--color-cream)' }}>
      <Sidebar projectId={project.id} projectTitle={project.title} />

      <div className="ml-60 flex-1 overflow-auto p-8">
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
              Attractiveness Map
            </h1>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
              {evaluated.length} evaluated opportunit{evaluated.length === 1 ? 'y' : 'ies'}
            </p>
          </div>
          {evaluated.length >= 2 && (
            <Link
              href={`/project/${project.id}/strategy`}
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
              Continue to strategy
              <ChevronRight size={15} />
            </Link>
          )}
        </div>

        {evaluated.length === 0 ? (
          <div className="text-center py-16">
            <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4">
              <rect x="15" y="15" width="70" height="70" rx="8" fill="var(--color-amber-bg)" />
              <line x1="50" y1="15" x2="50" y2="85" stroke="var(--color-linen)" strokeWidth="1.5" />
              <line x1="15" y1="50" x2="85" y2="50" stroke="var(--color-linen)" strokeWidth="1.5" />
              <circle cx="38" cy="38" r="5" fill="var(--color-amber-light)" opacity="0.5" />
            </svg>
            <p
              style={{
                fontFamily: "'Lora', Georgia, serif",
                fontStyle: 'italic',
                fontSize: 14,
                color: 'var(--color-text-muted)',
                marginBottom: 8,
              }}
            >
              No evaluated opportunities yet.
            </p>
            <Link
              href={`/project/${project.id}/evaluations`}
              style={{ fontSize: 12, color: 'var(--color-amber)' }}
            >
              Go evaluate your opportunities
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
                      color: 'var(--color-text-faint)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      whiteSpace: 'nowrap',
                      transform: 'rotate(-90deg)',
                      transformOrigin: 'center',
                    }}
                  >
                    Challenge ↑
                  </span>
                </div>

                <div
                  className="relative flex-1 rounded-xl overflow-hidden"
                  style={{ height: 420, border: '0.5px solid var(--color-border)' }}
                >
                  {/* Quadrant backgrounds */}
                  <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                    <div style={{ backgroundColor: 'rgba(180,168,136,0.06)' }} />
                    <div style={{ backgroundColor: 'rgba(76,175,125,0.06)' }} />
                    <div style={{ backgroundColor: 'var(--color-cream)' }} />
                    <div style={{ backgroundColor: 'rgba(199,123,58,0.06)' }} />
                  </div>

                  {/* Dividers */}
                  <div className="absolute left-1/2 top-0 bottom-0 w-px" style={{ backgroundColor: 'var(--color-border)' }} />
                  <div className="absolute top-1/2 left-0 right-0 h-px" style={{ backgroundColor: 'var(--color-border)' }} />

                  {/* Quadrant labels */}
                  {[
                    { x: '25%', y: '10%', label: 'Quick Win', color: 'var(--color-warm-gray)' },
                    { x: '75%', y: '10%', label: 'Gold Mine', color: 'var(--color-sage)' },
                    { x: '25%', y: '60%', label: 'Questionable', color: 'var(--color-text-faint)' },
                    { x: '75%', y: '60%', label: 'Moon Shot', color: 'var(--color-amber)' },
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
                        color,
                      }}
                    >
                      {label}
                    </span>
                  ))}

                  {/* Dots */}
                  {evaluated.map((opp, idx) => {
                    const potScore = SCORE_TO_POSITION[opp.potential_score!] ?? 38
                    const chalScore = SCORE_TO_POSITION[opp.challenge_score!] ?? 38
                    const leftPct = Math.min(Math.max(potScore + seededJitter(opp.id, 'x') * 0.5, 5), 95)
                    const topPct = Math.min(Math.max(100 - chalScore + seededJitter(opp.id, 'y') * 0.5, 5), 95)
                    const color = MAP_DOT_PALETTE[idx % MAP_DOT_PALETTE.length]
                    const isHovered = tooltip === opp.id

                    return (
                      <div
                        key={opp.id}
                        className="absolute"
                        style={{ left: `${leftPct}%`, top: `${topPct}%`, transform: 'translate(-50%, -50%)' }}
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
                            color: 'var(--color-ink)',
                            left: '50%',
                            top: idx % 2 === 0 ? '-18px' : '20px',
                            transform: 'translateX(-50%)',
                          }}
                        >
                          {opp.name.length > 22 ? opp.name.slice(0, 22) + '…' : opp.name}
                        </span>
                        {isHovered && (
                          <div
                            className="absolute z-20 bottom-8 left-1/2 -translate-x-1/2 p-3 w-48 pointer-events-none rounded-xl shadow-lg"
                            style={{
                              backgroundColor: '#FFFFFF',
                              border: '0.5px solid var(--color-border)',
                            }}
                          >
                            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-ink)', marginBottom: 4 }}>{opp.name}</p>
                            <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                              Potential: <span style={{ fontWeight: 500, color: 'var(--color-ink)' }}>{opp.potential_score?.replace('_', ' ')}</span>
                            </p>
                            <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                              Challenge: <span style={{ fontWeight: 500, color: 'var(--color-ink)' }}>{opp.challenge_score?.replace('_', ' ')}</span>
                            </p>
                            {opp.report?.summary && (
                              <p
                                className="line-clamp-3"
                                style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 4, lineHeight: '1.5' }}
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
                  color: 'var(--color-text-faint)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                Potential →
              </p>

              <div className="mt-6 flex justify-end">
                <Link
                  href={`/project/${project.id}/strategy`}
                  className="flex items-center gap-2 py-2.5 px-5 text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: 'var(--color-amber)',
                    color: '#FFFFFF',
                    borderRadius: 8,
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#A8612A')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-amber)')}
                >
                  Continue to Strategic Prioritization →
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
                  color: 'var(--color-text-muted)',
                }}
              >
                Legend
              </h3>
              <div className="space-y-2">
                {evaluated.map((opp, idx) => (
                  <div key={opp.id} className="flex items-start gap-2">
                    <div
                      className="flex-shrink-0 mt-0.5"
                      style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: MAP_DOT_PALETTE[idx % MAP_DOT_PALETTE.length] }}
                    />
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-ink)', lineHeight: '1.4' }}>{opp.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
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
                      color: 'var(--color-text-faint)',
                    }}
                  >
                    Not yet evaluated
                  </p>
                  {opportunities
                    .filter((o) => !o.potential_score)
                    .map((o) => (
                      <div key={o.id} className="flex items-center gap-2 mb-1.5">
                        <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--color-linen)', flexShrink: 0 }} />
                        <p className="truncate" style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>{o.name}</p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
