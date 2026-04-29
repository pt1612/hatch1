'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import { ChevronRight, Check, Loader2, Plus, X } from 'lucide-react'
import { POTENTIAL_BADGE, CHALLENGE_BADGE } from '@/lib/constants'
import { computeCategory } from '@/lib/types'
import type { Opportunity, Strategy, Classification } from '@/lib/types'

export default function StrategyClient({
  project,
  opportunities,
  existingStrategy,
}: {
  project: { id: string; title: string }
  opportunities: Opportunity[]
  existingStrategy: Strategy | null
}) {
  const router = useRouter()
  const supabase = createClient()

  const [pursueNowIds, setPursueNowIds] = useState<string[]>(
    existingStrategy?.pursue_now_opportunity_ids ?? []
  )
  const [classifications, setClassifications] = useState<Record<string, Classification>>(
    existingStrategy?.classifications ?? {}
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const evaluatedOpps = opportunities.filter((o) => !!o.potential_score)
  const pursueNowOpps = opportunities.filter((o) => pursueNowIds.includes(o.id))
  // non-pursue-now opps available to classify
  const otherOpps = opportunities.filter((o) => !pursueNowIds.includes(o.id))

  function togglePursueNow(oppId: string) {
    setPursueNowIds((prev) =>
      prev.includes(oppId) ? prev.filter((id) => id !== oppId) : [...prev, oppId]
    )
  }

  function handleToggleClassification(
    oppId: string,
    field: 'product_fit' | 'market_fit',
    value: boolean
  ) {
    setClassifications((prev) => {
      const current = prev[oppId] ?? { product_fit: false, market_fit: false, category: 'storage' }
      const updated = { ...current, [field]: value }
      updated.category = computeCategory(updated.product_fit, updated.market_fit)
      return { ...prev, [oppId]: updated }
    })
  }

  async function handleSave() {
    setSaving(true)
    const firstPursueNowId = pursueNowIds[0] ?? null
    const payload = {
      project_id: project.id,
      primary_opportunity_id: firstPursueNowId,
      pursue_now_opportunity_ids: pursueNowIds,
      classifications,
    }
    if (existingStrategy) {
      await supabase.from('strategies').update(payload).eq('id', existingStrategy.id)
    } else {
      await supabase.from('strategies').insert(payload)
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
  }

  const growthOpps = otherOpps.filter((o) => classifications[o.id]?.category === 'growth')
  const backupOpps = otherOpps.filter((o) => classifications[o.id]?.category === 'backup')
  const storageOpps = otherOpps.filter(
    (o) => !classifications[o.id] || classifications[o.id]?.category === 'storage'
  )

  return (
    <div className="flex min-h-screen">
      <Sidebar projectId={project.id} projectTitle={project.title} />

      <div className="ml-60 flex-1 overflow-auto p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Strategic Prioritization</h1>
            <p className="text-xs text-gray-400 mt-0.5">Agile Focus Dartboard</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-[#0D6E6E] text-white py-2.5 px-4 rounded-lg text-sm font-semibold hover:bg-[#0a5555] transition-colors disabled:opacity-60"
          >
            {saving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : saved ? (
              <>
                <Check size={15} />
                Saved
              </>
            ) : (
              'Save strategy'
            )}
          </button>
        </div>

        {opportunities.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm">No opportunities yet.</p>
            <Link
              href={`/project/${project.id}/opportunities`}
              className="text-xs text-[#0D6E6E] hover:underline mt-1 block"
            >
              Add opportunities first
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Column 1: Pursue Now ── */}
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Pursue Now
              </h2>

              {/* Active pursue-now cards */}
              {pursueNowOpps.length > 0 && (
                <div className="space-y-3 mb-4">
                  {pursueNowOpps.map((opp) => (
                    <div key={opp.id} className="bg-[#0D6E6E] text-white rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-semibold leading-snug">{opp.name}</p>
                        <button
                          onClick={() => togglePursueNow(opp.id)}
                          className="flex-shrink-0 w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                          title="Remove from Pursue Now"
                        >
                          <X size={11} className="text-white" />
                        </button>
                      </div>
                      <p className="text-[11px] text-white/60 mb-3">
                        {opp.customer_segment} · {opp.application}
                      </p>
                      {(opp.potential_score || opp.challenge_score) && (
                        <div className="flex gap-1.5 flex-wrap mb-3">
                          {opp.potential_score && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white">
                              Potential: {opp.potential_score.replace('_', ' ')}
                            </span>
                          )}
                          {opp.challenge_score && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white">
                              Challenge: {opp.challenge_score.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      )}
                      <Link
                        href={`/project/${project.id}/opportunity/${opp.id}/twins/setup`}
                        className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors w-fit"
                      >
                        Enter Twin phase
                        <ChevronRight size={12} />
                      </Link>
                    </div>
                  ))}
                </div>
              )}

              {/* Evaluated opportunities to add */}
              {evaluatedOpps.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    {pursueNowOpps.length === 0 ? 'Select opportunities to pursue' : 'Add more'}
                  </p>
                  <div className="space-y-2">
                    {evaluatedOpps
                      .filter((o) => !pursueNowIds.includes(o.id))
                      .map((opp) => (
                        <button
                          key={opp.id}
                          onClick={() => togglePursueNow(opp.id)}
                          className="w-full text-left bg-white border border-gray-200 rounded-xl p-3 hover:border-[#0D6E6E] hover:bg-[#0D6E6E]/5 transition-colors group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-800 truncate">{opp.name}</p>
                              <p className="text-[10px] text-gray-400 truncate">
                                {opp.customer_segment} · {opp.application}
                              </p>
                            </div>
                            <Plus
                              size={14}
                              className="flex-shrink-0 ml-2 text-gray-300 group-hover:text-[#0D6E6E] transition-colors"
                            />
                          </div>
                        </button>
                      ))}
                  </div>
                  {evaluatedOpps.filter((o) => !pursueNowIds.includes(o.id)).length === 0 && (
                    <p className="text-xs text-gray-300 italic">All evaluated opportunities are in Pursue Now.</p>
                  )}
                </div>
              )}

              {evaluatedOpps.length === 0 && (
                <p className="text-xs text-gray-300 italic">
                  Evaluate opportunities first to select them here.
                </p>
              )}
            </div>

            {/* ── Column 2: Keep Options Open ── */}
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Keep Options Open
              </h2>
              {otherOpps.length === 0 ? (
                <p className="text-xs text-gray-300 italic">No other opportunities.</p>
              ) : (
                <div className="space-y-3">
                  {otherOpps.map((opp) => {
                    const cls = classifications[opp.id] ?? {
                      product_fit: false,
                      market_fit: false,
                      category: 'storage',
                    }
                    const catColor =
                      cls.category === 'growth'
                        ? 'bg-blue-100 text-blue-700'
                        : cls.category === 'backup'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-gray-100 text-gray-500'
                    const isEvaluated = !!opp.potential_score

                    return (
                      <div key={opp.id} className="bg-white border border-gray-200 rounded-2xl p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate">{opp.name}</p>
                            <p className="text-[10px] text-gray-400">{opp.customer_segment}</p>
                          </div>
                          <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                            {!isEvaluated && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">
                                Not evaluated
                              </span>
                            )}
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${catColor}`}>
                              {cls.category}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span>Product fit</span>
                          <button
                            onClick={() => handleToggleClassification(opp.id, 'product_fit', !cls.product_fit)}
                            className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${
                              cls.product_fit ? 'bg-[#0D6E6E]' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 left-0 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                cls.product_fit ? 'translate-x-4' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Market fit</span>
                          <button
                            onClick={() => handleToggleClassification(opp.id, 'market_fit', !cls.market_fit)}
                            className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${
                              cls.market_fit ? 'bg-[#0D6E6E]' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 left-0 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                cls.market_fit ? 'translate-x-4' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* ── Column 3: Strategy Summary ── */}
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Strategy Summary
              </h2>

              <div className="space-y-4">
                {/* Pursue Now summary */}
                <div className="bg-white border border-gray-200 rounded-2xl p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Pursue Now ({pursueNowOpps.length})
                  </p>
                  {pursueNowOpps.length === 0 ? (
                    <p className="text-xs text-gray-300 italic">None selected</p>
                  ) : (
                    <div className="space-y-1">
                      {pursueNowOpps.map((o) => (
                        <p key={o.id} className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                          <span className="inline-block w-2 h-2 rounded-full bg-[#0D6E6E] flex-shrink-0" />
                          {o.name}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Keep Options Open summary */}
                <div className="bg-white border border-gray-200 rounded-2xl p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Keep Options Open
                  </p>
                  {growthOpps.length === 0 && backupOpps.length === 0 ? (
                    <p className="text-xs text-gray-300 italic">None yet</p>
                  ) : (
                    <div className="space-y-1">
                      {growthOpps.map((o) => (
                        <p key={o.id} className="text-xs text-gray-700">
                          <span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-1.5" />
                          {o.name}
                        </p>
                      ))}
                      {backupOpps.map((o) => (
                        <p key={o.id} className="text-xs text-gray-700">
                          <span className="inline-block w-2 h-2 rounded-full bg-orange-400 mr-1.5" />
                          {o.name}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Place in Storage */}
                <div className="bg-white border border-gray-200 rounded-2xl p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Place in Storage
                  </p>
                  {storageOpps.length === 0 ? (
                    <p className="text-xs text-gray-300 italic">None</p>
                  ) : (
                    <div className="space-y-1">
                      {storageOpps.map((o) => (
                        <div key={o.id} className="flex items-center gap-1.5">
                          <span className="inline-block w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
                          <p className="text-xs text-gray-500 flex-1 truncate">{o.name}</p>
                          {!o.potential_score && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 flex-shrink-0">
                              Not evaluated
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
