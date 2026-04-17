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

  const evaluated = opportunities.filter(
    (o) => o.potential_score && o.challenge_score && o.report
  )

  function getQuadrantLabel(potential: string, challenge: string) {
    const highPotential = potential === 'high' || potential === 'super_high'
    const highChallenge = challenge === 'high' || challenge === 'super_high'
    if (highPotential && !highChallenge) return 'Gold Mine'
    if (highPotential && highChallenge) return 'Moon Shot'
    if (!highPotential && !highChallenge) return 'Quick Win'
    return 'Questionable'
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar projectId={project.id} projectTitle={project.title} />

      <div className="ml-60 flex-1 overflow-auto p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Attractiveness Map</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {evaluated.length} evaluated opportunit{evaluated.length === 1 ? 'y' : 'ies'}
            </p>
          </div>
          {evaluated.length >= 2 && (
            <Link
              href={`/project/${project.id}/strategy`}
              className="flex items-center gap-2 bg-[#0D6E6E] text-white py-2.5 px-4 rounded-lg text-sm font-semibold hover:bg-[#0a5555] transition-colors"
            >
              Continue to strategy
              <ChevronRight size={15} />
            </Link>
          )}
        </div>

        {evaluated.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm">No evaluated opportunities yet.</p>
            <Link
              href={`/project/${project.id}/evaluations`}
              className="text-xs text-[#0D6E6E] hover:underline mt-1 block"
            >
              Go evaluate your opportunities
            </Link>
          </div>
        ) : (
          <div className="flex gap-8 items-start">
            {/* Map */}
            <div className="flex-1">
              {/* Y-axis label */}
              <div className="flex items-stretch gap-3" style={{ height: 420 }}>
                <div className="flex flex-col items-center justify-center w-5">
                  <span
                    className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest whitespace-nowrap"
                    style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                  >
                    Challenge ↑
                  </span>
                </div>

                {/* Grid */}
                <div className="relative flex-1 rounded-xl overflow-hidden border border-gray-200" style={{ height: 420 }}>
                  {/* Quadrant backgrounds */}
                  <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                    <div className="bg-blue-50" /> {/* top-left: Quick Win */}
                    <div className="bg-[#0D6E6E]/5" /> {/* top-right: Gold Mine */}
                    <div className="bg-gray-50" /> {/* bottom-left: Questionable */}
                    <div className="bg-orange-50" /> {/* bottom-right: Moon Shot */}
                  </div>

                  {/* Dividers */}
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-200" />
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-200" />

                  {/* Quadrant labels */}
                  {[
                    { x: '25%', y: '12%', label: 'Quick Win', color: 'text-blue-600' },
                    { x: '75%', y: '12%', label: 'Gold Mine', color: 'text-[#0D6E6E]' },
                    { x: '25%', y: '62%', label: 'Questionable', color: 'text-gray-400' },
                    { x: '75%', y: '62%', label: 'Moon Shot', color: 'text-orange-500' },
                  ].map(({ x, y, label, color }) => (
                    <span
                      key={label}
                      className={`absolute text-[10px] font-bold uppercase tracking-wider ${color}`}
                      style={{ left: x, top: y, transform: 'translateX(-50%)' }}
                    >
                      {label}
                    </span>
                  ))}

                  {/* Dots */}
                  {evaluated.map((opp, idx) => {
                    const potScore = SCORE_TO_POSITION[opp.potential_score!] ?? 38
                    const chalScore = SCORE_TO_POSITION[opp.challenge_score!] ?? 38
                    const leftPct = Math.min(Math.max(potScore + seededJitter(opp.id, 'x') * 0.5, 5), 95)
                    // Y: high challenge = top (low top% in CSS means top visually) — but here challenge top means "difficult" is up
                    // Per Vela logic: Y axis = challenge going UP, so high challenge = TOP of grid = low top%
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
                        {/* Label */}
                        <span
                          className="absolute text-[10px] font-semibold text-gray-600 whitespace-nowrap"
                          style={{ left: '50%', top: idx % 2 === 0 ? '-18px' : '20px', transform: 'translateX(-50%)' }}
                        >
                          {opp.name.length > 22 ? opp.name.slice(0, 22) + '…' : opp.name}
                        </span>
                        {/* Tooltip */}
                        {isHovered && (
                          <div className="absolute z-20 bottom-8 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-48 pointer-events-none">
                            <p className="text-xs font-semibold text-gray-900 mb-1">{opp.name}</p>
                            <p className="text-[10px] text-gray-500">
                              Potential: <span className="font-semibold text-gray-700">{opp.potential_score?.replace('_', ' ')}</span>
                            </p>
                            <p className="text-[10px] text-gray-500">
                              Challenge: <span className="font-semibold text-gray-700">{opp.challenge_score?.replace('_', ' ')}</span>
                            </p>
                            {opp.report?.summary && (
                              <p className="text-[10px] text-gray-400 mt-1 leading-relaxed line-clamp-3">
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

              {/* X-axis label */}
              <p className="text-center text-[10px] font-semibold text-gray-400 uppercase tracking-widest mt-2">
                Potential →
              </p>

              {/* CTA */}
              <div className="mt-6 flex justify-end">
                <Link
                  href={`/project/${project.id}/strategy`}
                  className="flex items-center gap-2 bg-[#0D6E6E] text-white py-2.5 px-5 rounded-lg text-sm font-semibold hover:bg-[#0a5555] transition-colors"
                >
                  Continue to Strategic Prioritization →
                </Link>
              </div>
            </div>

            {/* Legend */}
            <div className="w-52 flex-shrink-0">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Legend
              </h3>
              <div className="space-y-2">
                {evaluated.map((opp, idx) => (
                  <div key={opp.id} className="flex items-start gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: MAP_DOT_PALETTE[idx % MAP_DOT_PALETTE.length] }}
                    />
                    <div>
                      <p className="text-xs font-semibold text-gray-700 leading-tight">{opp.name}</p>
                      <p className="text-[10px] text-gray-400">
                        {getQuadrantLabel(opp.potential_score!, opp.challenge_score!)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Not yet evaluated */}
              {opportunities.filter((o) => !o.potential_score).length > 0 && (
                <div className="mt-5 pt-4 border-t border-gray-100">
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-2">
                    Not yet evaluated
                  </p>
                  {opportunities
                    .filter((o) => !o.potential_score)
                    .map((o) => (
                      <div key={o.id} className="flex items-center gap-2 mb-1.5">
                        <div className="w-3 h-3 rounded-full bg-gray-200 flex-shrink-0" />
                        <p className="text-xs text-gray-400 truncate">{o.name}</p>
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
