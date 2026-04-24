'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import { Plus, CheckCircle2, Clock, ChevronRight, ChevronDown, Loader2, X } from 'lucide-react'
import type { Opportunity } from '@/lib/types'

export default function OpportunitiesClient({
  project,
  opportunities,
  evaluations,
}: {
  project: { id: string; title: string }
  opportunities: Opportunity[]
  evaluations: { id: string; opportunity_id: string; report: unknown }[]
}) {
  const router = useRouter()
  const supabase = createClient()

  const [showAddForm, setShowAddForm] = useState(false)
  const [newOpp, setNewOpp] = useState({
    name: '',
    application: '',
    customer_segment: '',
    description: '',
  })
  const [adding, setAdding] = useState(false)
  const [collapsedApps, setCollapsedApps] = useState<Set<string>>(new Set())

  const evalMap = evaluations.reduce<Record<string, { id: string; report: unknown }>>(
    (acc, e) => {
      acc[e.opportunity_id] = e
      return acc
    },
    {}
  )
  const evaluatedCount = evaluations.filter((e) => e.report !== null).length

  // Group opportunities by application, preserving insertion order
  const grouped = opportunities.reduce<{ app: string; opps: Opportunity[] }[]>((acc, opp) => {
    const appName = opp.application?.trim() || 'Other'
    const existing = acc.find((g) => g.app === appName)
    if (existing) {
      existing.opps.push(opp)
    } else {
      acc.push({ app: appName, opps: [opp] })
    }
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

  async function handleAddOpportunity() {
    if (!newOpp.name.trim()) return
    setAdding(true)
    await supabase.from('opportunities').insert({
      project_id: project.id,
      name: newOpp.name,
      application: newOpp.application,
      customer_segment: newOpp.customer_segment,
      description: newOpp.description,
      phase: 'abilities',
    })
    setNewOpp({ name: '', application: '', customer_segment: '', description: '' })
    setShowAddForm(false)
    setAdding(false)
    router.refresh()
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar projectId={project.id} projectTitle={project.title} />

      <div className="ml-60 flex-1 flex overflow-hidden min-h-screen">
        {/* Main list */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Opportunities</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {opportunities.length} identified · {evaluatedCount} evaluated
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/project/${project.id}/abilities`}
                className="border border-gray-200 text-gray-700 py-2 px-3 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors"
              >
                ← Back to chat
              </Link>
              <button
                onClick={() => setShowAddForm((v) => !v)}
                className="flex items-center gap-1.5 bg-[#0D6E6E] text-white py-2 px-3 rounded-lg text-xs font-semibold hover:bg-[#0a5555] transition-colors"
              >
                <Plus size={14} />
                Add manually
              </button>
            </div>
          </div>

          {/* Progress bar */}
          {opportunities.length > 0 && (
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-6">
              <div
                className="h-full bg-[#0D6E6E] rounded-full transition-all"
                style={{
                  width: `${(evaluatedCount / opportunities.length) * 100}%`,
                }}
              />
            </div>
          )}

          {/* Manual add form */}
          {showAddForm && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-800">Add opportunity manually</h3>
                <button onClick={() => setShowAddForm(false)}>
                  <X size={16} className="text-gray-400 hover:text-gray-600" />
                </button>
              </div>
              <div className="space-y-3">
                {[
                  { key: 'name', label: 'Name', placeholder: 'e.g. Real-time IoT Monitoring' },
                  { key: 'application', label: 'Application', placeholder: 'Specific use case' },
                  { key: 'customer_segment', label: 'Customer Segment', placeholder: 'Who benefits most' },
                  { key: 'description', label: 'Description', placeholder: '1-2 sentences' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                      {label}
                    </label>
                    <input
                      value={newOpp[key as keyof typeof newOpp]}
                      onChange={(e) => setNewOpp((prev) => ({ ...prev, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-[#0D6E6E] focus:border-transparent text-sm outline-none transition"
                    />
                  </div>
                ))}
                <button
                  onClick={handleAddOpportunity}
                  disabled={adding || !newOpp.name.trim()}
                  className="flex items-center gap-2 bg-[#0D6E6E] text-white py-2 px-4 rounded-lg text-xs font-semibold hover:bg-[#0a5555] transition-colors disabled:opacity-60"
                >
                  {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Add opportunity
                </button>
              </div>
            </div>
          )}

          {/* Opportunity cards grouped by application */}
          {opportunities.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-sm">No opportunities yet.</p>
              <p className="text-xs mt-1">Go back to the abilities chat or add one manually.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {grouped.map(({ app, opps }) => {
                const isCollapsed = collapsedApps.has(app)
                const evaluatedInGroup = opps.filter((o) => !!evalMap[o.id]?.report).length
                return (
                  <div key={app} className="border border-gray-200 rounded-2xl overflow-hidden">
                    {/* Application group header */}
                    <button
                      onClick={() => toggleApp(app)}
                      className="w-full flex items-center justify-between px-5 py-3.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-sm font-semibold text-gray-800 truncate">{app}</span>
                        <span className="text-[10px] font-semibold text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded-full flex-shrink-0">
                          {evaluatedInGroup}/{opps.length} evaluated
                        </span>
                      </div>
                      <ChevronDown
                        size={14}
                        className={`text-gray-400 flex-shrink-0 ml-2 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                      />
                    </button>

                    {/* Segment opportunity rows */}
                    {!isCollapsed && (
                      <div className="divide-y divide-gray-100">
                        {opps.map((opp) => {
                          const evaluation = evalMap[opp.id]
                          const isEvaluated = !!evaluation?.report
                          return (
                            <div
                              key={opp.id}
                              className="bg-white px-5 py-4 flex items-start gap-4"
                            >
                              <div className="flex-shrink-0 mt-0.5">
                                {isEvaluated ? (
                                  <CheckCircle2 size={16} className="text-[#0D6E6E]" />
                                ) : (
                                  <Clock size={16} className="text-gray-300" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                                      {opp.customer_segment}
                                    </p>
                                    <h3 className="text-sm font-semibold text-gray-900">{opp.name}</h3>
                                  </div>
                                  <span
                                    className={`flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
                                      isEvaluated
                                        ? 'bg-[#0D6E6E]/10 text-[#0D6E6E]'
                                        : 'bg-gray-100 text-gray-400'
                                    }`}
                                  >
                                    {isEvaluated ? 'Evaluated' : 'Pending'}
                                  </span>
                                </div>
                                {opp.description && (
                                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{opp.description}</p>
                                )}
                              </div>
                              <div className="flex-shrink-0">
                                {isEvaluated ? (
                                  <Link
                                    href={`/project/${project.id}/opportunity/${opp.id}/report`}
                                    className="flex items-center gap-1 text-xs font-semibold text-[#0D6E6E] hover:underline"
                                  >
                                    View report
                                    <ChevronRight size={12} />
                                  </Link>
                                ) : (
                                  <Link
                                    href={`/project/${project.id}/opportunity/${opp.id}/context`}
                                    className="flex items-center gap-1 bg-[#0D6E6E] text-white py-1.5 px-3 rounded-lg text-xs font-semibold hover:bg-[#0a5555] transition-colors"
                                  >
                                    Evaluate
                                    <ChevronRight size={12} />
                                  </Link>
                                )}
                              </div>
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
        </div>

        {/* Right sidebar — progress */}
        <div className="w-72 border-l border-gray-200 bg-white p-5 overflow-auto flex-shrink-0">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
            Evaluation progress
          </h2>
          {opportunities.length === 0 ? (
            <p className="text-xs text-gray-300 italic">No opportunities yet.</p>
          ) : (
            <div className="space-y-2">
              {opportunities.map((opp) => {
                const isEvaluated = !!evalMap[opp.id]?.report
                return (
                  <div key={opp.id} className="flex items-center gap-2">
                    {isEvaluated ? (
                      <CheckCircle2 size={14} className="text-[#0D6E6E] flex-shrink-0" />
                    ) : (
                      <Clock size={14} className="text-gray-300 flex-shrink-0" />
                    )}
                    <span className="text-xs text-gray-600 truncate">{opp.name}</span>
                  </div>
                )
              })}
            </div>
          )}

          {opportunities.length > 0 && evaluatedCount === opportunities.length && (
            <Link
              href={`/project/${project.id}/map`}
              className="flex items-center justify-center gap-2 w-full mt-5 bg-[#0D6E6E] text-white py-2.5 px-4 rounded-lg text-xs font-semibold hover:bg-[#0a5555] transition-colors"
            >
              View map
              <ChevronRight size={14} />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
