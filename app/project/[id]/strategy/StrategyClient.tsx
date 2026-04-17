'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import { ChevronRight, Check, Loader2 } from 'lucide-react'
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

  const [primaryId, setPrimaryId] = useState<string | null>(
    existingStrategy?.primary_opportunity_id ?? null
  )
  const [classifications, setClassifications] = useState<Record<string, Classification>>(
    existingStrategy?.classifications ?? {}
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const primaryOpp = opportunities.find((o) => o.id === primaryId)
  const nonPrimary = opportunities.filter((o) => o.id !== primaryId)

  function handleToggle(
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
    const payload = {
      project_id: project.id,
      primary_opportunity_id: primaryId,
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

  const growthOpps = nonPrimary.filter((o) => classifications[o.id]?.category === 'growth')
  const backupOpps = nonPrimary.filter((o) => classifications[o.id]?.category === 'backup')
  const storageOpps = nonPrimary.filter(
    (o) => !classifications[o.id] || classifications[o.id]?.category === 'storage'
  )

  return (
    <div className="flex min-h-screen">
      <Sidebar
        projectId={project.id}
        projectTitle={project.title}
        primaryOpportunityId={existingStrategy?.primary_opportunity_id ?? undefined}
        primaryOpportunityName={
          existingStrategy?.primary_opportunity_id
            ? opportunities.find((o) => o.id === existingStrategy.primary_opportunity_id)?.name
            : undefined
        }
      />

      <div className="ml-60 flex-1 overflow-auto p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Strategic Prioritization</h1>
            <p className="text-xs text-gray-400 mt-0.5">Agile Focus Dartboard</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !primaryId}
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
            {/* Column 1: Primary */}
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Pursue Now
              </h2>
              <div className="mb-4">
                <label className="block text-xs text-gray-500 mb-1.5">
                  Select primary opportunity
                </label>
                <select
                  value={primaryId ?? ''}
                  onChange={(e) => setPrimaryId(e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700 focus:ring-2 focus:ring-[#0D6E6E] focus:border-transparent outline-none transition"
                >
                  <option value="">— Select —</option>
                  {opportunities.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>

              {primaryOpp && (
                <div className="bg-[#0D6E6E] text-white rounded-2xl p-5">
                  <p className="text-sm font-semibold mb-1">{primaryOpp.name}</p>
                  <p className="text-xs text-white/60 mb-3">
                    {primaryOpp.customer_segment} · {primaryOpp.application}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {primaryOpp.potential_score && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white">
                        Potential: {primaryOpp.potential_score.replace('_', ' ')}
                      </span>
                    )}
                    {primaryOpp.challenge_score && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white">
                        Challenge: {primaryOpp.challenge_score.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Column 2: Classify non-primary */}
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Keep Options Open
              </h2>
              {nonPrimary.length === 0 ? (
                <p className="text-xs text-gray-300 italic">No other opportunities.</p>
              ) : (
                <div className="space-y-3">
                  {nonPrimary.map((opp) => {
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
                            onClick={() => handleToggle(opp.id, 'product_fit', !cls.product_fit)}
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
                            onClick={() => handleToggle(opp.id, 'market_fit', !cls.market_fit)}
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

            {/* Column 3: Summary */}
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Strategy Summary
              </h2>

              <div className="space-y-4">
                {/* Pursue Now */}
                <div className="bg-white border border-gray-200 rounded-2xl p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Pursue Now
                  </p>
                  {primaryOpp ? (
                    <p className="text-xs font-semibold text-gray-800">{primaryOpp.name}</p>
                  ) : (
                    <p className="text-xs text-gray-300 italic">None selected</p>
                  )}
                </div>

                {/* Keep Options Open */}
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

              {/* Proceed to validation */}
              {saved && primaryId && (
                <Link
                  href={`/project/${project.id}/opportunity/${primaryId}/twins/setup`}
                  className="flex items-center justify-center gap-2 w-full mt-4 bg-[#0D6E6E] text-white py-2.5 px-4 rounded-xl text-sm font-semibold hover:bg-[#0a5555] transition-colors"
                >
                  Proceed to validation
                  <ChevronRight size={15} />
                </Link>
              )}
              {existingStrategy?.primary_opportunity_id && !saved && (
                <Link
                  href={`/project/${project.id}/opportunity/${existingStrategy.primary_opportunity_id}/twins/setup`}
                  className="flex items-center justify-center gap-2 w-full mt-4 border border-[#0D6E6E] text-[#0D6E6E] py-2.5 px-4 rounded-xl text-sm font-semibold hover:bg-[#0D6E6E]/5 transition-colors"
                >
                  Proceed to validation
                  <ChevronRight size={15} />
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
