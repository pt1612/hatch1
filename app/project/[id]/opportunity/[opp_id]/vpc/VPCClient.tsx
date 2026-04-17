'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import BackButton from '@/components/BackButton'
import { Plus, X, Loader2, Sparkles } from 'lucide-react'
import { TWIN_AVATAR_COLORS } from '@/lib/constants'
import { getTwinIndex, getInitials, getAffinityDisplay } from '@/lib/types'
import type { DigitalTwin, TwinInterview, Opportunity } from '@/lib/types'

// ─── Pill colour classes ────────────────────────────────────────────────────────
const JOB_CLASS = 'bg-[#0D6E6E]/10 text-[#0D6E6E]'
const PAIN_CLASS = 'bg-orange-50 text-orange-700'
const GAIN_CLASS = 'bg-green-50 text-green-700'

// ─── Types ──────────────────────────────────────────────────────────────────────
type ValueMap = {
  productsAndServices: string[]
  painRelievers: string[]
  gainCreators: string[]
}

type TwinItemsState = Record<string, { jobs: string[]; pains: string[]; gains: string[] }>

type Ability = { id: string; name: string; description: string }

// ─── Helper: rank items by frequency across multiple lists ─────────────────────
function rankByFrequency(lists: string[][]): string[] {
  const counts: Record<string, number> = {}
  for (const list of lists) {
    for (const item of list ?? []) {
      const key = item.trim().toLowerCase()
      counts[key] = (counts[key] ?? 0) + 1
    }
  }
  const unique = [...new Set(lists.flat().map((s) => s.trim()).filter(Boolean))]
  return unique.sort((a, b) => {
    const diff = (counts[b.toLowerCase()] ?? 0) - (counts[a.toLowerCase()] ?? 0)
    return diff !== 0 ? diff : a.localeCompare(b)
  })
}

// ─── Editable column (light background) ────────────────────────────────────────
function EditableVPCColumn({
  title,
  items,
  pillClass,
  emptyText,
  onAdd,
  onRemove,
}: {
  title: string
  items: string[]
  pillClass: string
  emptyText: string
  onAdd: (text: string) => void
  onRemove: (index: number) => void
}) {
  const [adding, setAdding] = useState(false)
  const [inputVal, setInputVal] = useState('')

  function submit() {
    const t = inputVal.trim()
    if (t) onAdd(t)
    setInputVal('')
    setAdding(false)
  }

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5 mb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{title}</p>
        <button
          onClick={() => setAdding(true)}
          className="w-4 h-4 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors flex-shrink-0"
          title="Add item"
        >
          <Plus size={10} className="text-gray-500" />
        </button>
      </div>

      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {items.map((item, i) => (
            <span
              key={i}
              className={`inline-flex items-start gap-1 text-xs font-medium px-2.5 py-1 rounded-lg whitespace-normal break-words max-w-full ${pillClass}`}
            >
              <span className="flex-1 min-w-0">{item}</span>
              <button
                onClick={() => onRemove(i)}
                className="opacity-50 hover:opacity-100 transition-opacity mt-0.5 flex-shrink-0"
              >
                <X size={9} />
              </button>
            </span>
          ))}
        </div>
      )}

      {items.length === 0 && !adding && (
        <p className="text-xs text-gray-300 italic">{emptyText}</p>
      )}

      {adding && (
        <div className="flex items-center gap-1 mt-1">
          <input
            autoFocus
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
              if (e.key === 'Escape') {
                setAdding(false)
                setInputVal('')
              }
            }}
            placeholder="Add item…"
            className="flex-1 text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg bg-gray-50 outline-none focus:ring-1 focus:ring-[#0D6E6E] focus:border-[#0D6E6E] min-w-0"
          />
          <button
            onClick={submit}
            className="text-xs px-2.5 py-1.5 bg-[#0D6E6E] text-white rounded-lg hover:bg-[#0a5555] transition-colors flex-shrink-0"
          >
            Add
          </button>
          <button
            onClick={() => {
              setAdding(false)
              setInputVal('')
            }}
            className="text-xs px-1.5 py-1.5 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Editable column (dark background, for synthesis card) ─────────────────────
function EditableDarkColumn({
  title,
  items,
  pillClass,
  onAdd,
  onRemove,
}: {
  title: string
  items: string[]
  pillClass: string
  onAdd: (text: string) => void
  onRemove: (index: number) => void
}) {
  const [adding, setAdding] = useState(false)
  const [inputVal, setInputVal] = useState('')

  function submit() {
    const t = inputVal.trim()
    if (t) onAdd(t)
    setInputVal('')
    setAdding(false)
  }

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5 mb-2.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">{title}</p>
        <button
          onClick={() => setAdding(true)}
          className="w-4 h-4 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors flex-shrink-0"
          title="Add item"
        >
          <Plus size={10} className="text-white/60" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span
            key={i}
            className={`inline-flex items-start gap-1 text-xs font-medium px-2.5 py-1 rounded-lg whitespace-normal break-words max-w-full ${pillClass}`}
          >
            <span className="flex-1 min-w-0">{item}</span>
            <button
              onClick={() => onRemove(i)}
              className="opacity-50 hover:opacity-100 transition-opacity mt-0.5 flex-shrink-0"
            >
              <X size={9} />
            </button>
          </span>
        ))}
      </div>

      {adding && (
        <div className="flex items-center gap-1 mt-2">
          <input
            autoFocus
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
              if (e.key === 'Escape') {
                setAdding(false)
                setInputVal('')
              }
            }}
            placeholder="Add item…"
            className="flex-1 text-xs px-2.5 py-1.5 border border-white/20 rounded-lg bg-white/10 text-white placeholder-white/30 outline-none focus:ring-1 focus:ring-white/40 min-w-0"
          />
          <button
            onClick={submit}
            className="text-xs px-2.5 py-1.5 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors flex-shrink-0"
          >
            Add
          </button>
          <button
            onClick={() => {
              setAdding(false)
              setInputVal('')
            }}
            className="text-xs px-1.5 py-1.5 text-white/40 hover:text-white/70 transition-colors flex-shrink-0"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────────
type TwinInterviewWithId = TwinInterview & { twinSequentialId: string }

export default function VPCClient({
  project,
  opportunity,
  twins,
  interviews,
  hasInterviews,
  abilities,
  sessionId,
  existingValueMap,
}: {
  project: { id: string; title: string }
  opportunity: Opportunity
  twins: DigitalTwin[]
  interviews: TwinInterviewWithId[]
  hasInterviews: boolean
  abilities: Ability[]
  sessionId: string | null
  existingValueMap: ValueMap | null
}) {
  const supabase = createClient()

  // ── Per-twin editable state (keyed by interview DB id) ──────────────────────
  const [twinItems, setTwinItems] = useState<TwinItemsState>(() => {
    const state: TwinItemsState = {}
    for (const iv of interviews) {
      state[iv.id] = {
        jobs: iv.jobs_to_be_done ?? [],
        pains: iv.pains ?? [],
        gains: iv.gains ?? [],
      }
    }
    return state
  })

  // ── Value Map state ─────────────────────────────────────────────────────────
  const [valueMap, setValueMap] = useState<ValueMap | null>(existingValueMap)
  const [generatingValueMap, setGeneratingValueMap] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(sessionId)

  // ── Synthesis state (client-side only, initialized from aggregation) ────────
  const [synthJobs, setSynthJobs] = useState<string[]>(() =>
    rankByFrequency(interviews.map((iv) => iv.jobs_to_be_done ?? []))
  )
  const [synthPains, setSynthPains] = useState<string[]>(() =>
    rankByFrequency(interviews.map((iv) => iv.pains ?? []))
  )
  const [synthGains, setSynthGains] = useState<string[]>(() =>
    rankByFrequency(interviews.map((iv) => iv.gains ?? []))
  )

  // ── Save helpers ────────────────────────────────────────────────────────────
  async function saveTwinItems(
    interviewId: string,
    items: { jobs: string[]; pains: string[]; gains: string[] }
  ) {
    await supabase
      .from('twin_interviews')
      .update({ jobs_to_be_done: items.jobs, pains: items.pains, gains: items.gains })
      .eq('id', interviewId)
  }

  async function saveValueMapToDb(map: ValueMap) {
    if (currentSessionId) {
      await supabase
        .from('twin_sessions')
        .update({ vpc_value_map: map })
        .eq('id', currentSessionId)
    } else {
      const { data } = await supabase
        .from('twin_sessions')
        .insert({
          opportunity_id: opportunity.id,
          vpc_value_map: map,
          suggested_segments: [],
          report: null,
        })
        .select('id')
        .single()
      if (data?.id) setCurrentSessionId(data.id)
    }
  }

  // ── Twin item mutation ──────────────────────────────────────────────────────
  function addTwinItem(interviewId: string, col: 'jobs' | 'pains' | 'gains', text: string) {
    setTwinItems((prev) => {
      const current = prev[interviewId] ?? { jobs: [], pains: [], gains: [] }
      const updated = { ...current, [col]: [...current[col], text] }
      saveTwinItems(interviewId, updated)
      return { ...prev, [interviewId]: updated }
    })
  }

  function removeTwinItem(interviewId: string, col: 'jobs' | 'pains' | 'gains', index: number) {
    setTwinItems((prev) => {
      const current = prev[interviewId] ?? { jobs: [], pains: [], gains: [] }
      const updated = { ...current, [col]: current[col].filter((_, i) => i !== index) }
      saveTwinItems(interviewId, updated)
      return { ...prev, [interviewId]: updated }
    })
  }

  // ── Value Map mutation ──────────────────────────────────────────────────────
  function addValueMapItem(
    col: keyof ValueMap,
    text: string
  ) {
    setValueMap((prev) => {
      const base = prev ?? { productsAndServices: [], painRelievers: [], gainCreators: [] }
      const updated = { ...base, [col]: [...base[col], text] }
      saveValueMapToDb(updated)
      return updated
    })
  }

  function removeValueMapItem(col: keyof ValueMap, index: number) {
    setValueMap((prev) => {
      if (!prev) return prev
      const updated = { ...prev, [col]: prev[col].filter((_, i) => i !== index) }
      saveValueMapToDb(updated)
      return updated
    })
  }

  // ── AI generation ───────────────────────────────────────────────────────────
  async function generateValueMap() {
    setGeneratingValueMap(true)
    try {
      const allJobs = Object.values(twinItems).flatMap((t) => t.jobs)
      const allPains = Object.values(twinItems).flatMap((t) => t.pains)
      const allGains = Object.values(twinItems).flatMap((t) => t.gains)

      const res = await fetch('/api/generate-vpc-value-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityName: opportunity.name,
          opportunityDescription: opportunity.description,
          abilities,
          aggregatedPains: allPains,
          aggregatedGains: allGains,
          aggregatedJobs: allJobs,
        }),
      })
      const { valueMap: generated } = await res.json()
      setValueMap(generated)
      await saveValueMapToDb(generated)
    } catch {
      // silent fail — user can retry
    } finally {
      setGeneratingValueMap(false)
    }
  }

  // ── Synthesis mutation (client-side only) ───────────────────────────────────
  function addSynthItem(col: 'jobs' | 'pains' | 'gains', text: string) {
    if (col === 'jobs') setSynthJobs((prev) => [...prev, text])
    else if (col === 'pains') setSynthPains((prev) => [...prev, text])
    else setSynthGains((prev) => [...prev, text])
  }

  function removeSynthItem(col: 'jobs' | 'pains' | 'gains', index: number) {
    if (col === 'jobs') setSynthJobs((prev) => prev.filter((_, i) => i !== index))
    else if (col === 'pains') setSynthPains((prev) => prev.filter((_, i) => i !== index))
    else setSynthGains((prev) => prev.filter((_, i) => i !== index))
  }

  const hasSynthData = synthJobs.length > 0 || synthPains.length > 0 || synthGains.length > 0

  return (
    <div className="flex min-h-screen">
      <Sidebar
        projectId={project.id}
        projectTitle={project.title}
        primaryOpportunityId={opportunity.id}
        primaryOpportunityName={opportunity.name}
        hasTwinInterviews={true}
      />

      <div className="ml-60 flex-1 overflow-auto p-8">
        <BackButton
          href={`/project/${project.id}/opportunity/${opportunity.id}/twins/results`}
          label="Back to results"
        />

        <div className="mb-6">
          <h1 className="text-lg font-semibold text-gray-900">Value Proposition Canvas</h1>
          <p className="text-sm text-gray-400 mt-0.5">{opportunity.name}</p>
        </div>

        {!hasInterviews ? (
          /* ── Empty state ────────────────────────────────────────────────── */
          <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center max-w-lg">
            <div className="text-5xl mb-4">🗂️</div>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">No VPC data yet</h3>
            <p className="text-xs text-gray-400 mb-5 leading-relaxed">
              Complete at least one twin interview and generate results to start building your Value
              Proposition Canvas.
            </p>
            <Link
              href={`/project/${project.id}/opportunity/${opportunity.id}/twins/interview`}
              className="inline-flex items-center gap-2 bg-[#0D6E6E] text-white py-2.5 px-5 rounded-xl text-sm font-semibold hover:bg-[#0a5555] transition-colors"
            >
              Go to Twin Interviews
            </Link>
          </div>
        ) : (
          <div className="space-y-8 max-w-4xl">

            {/* ── Section 1: Per-Twin Breakdown ──────────────────────────── */}
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Per-Twin Breakdown
              </h2>
              <div className="space-y-4">
                {twins.map((twin) => {
                  const iv = interviews.find((i) => i.twinSequentialId === twin.id)
                  const interviewId = iv?.id
                  const items = interviewId
                    ? twinItems[interviewId] ?? { jobs: [], pains: [], gains: [] }
                    : { jobs: [], pains: [], gains: [] }

                  const affinity = getAffinityDisplay(twin.affinityLabel)
                  const avatarColor =
                    TWIN_AVATAR_COLORS[getTwinIndex(twin.id) % TWIN_AVATAR_COLORS.length]
                  const hasData =
                    items.jobs.length > 0 || items.pains.length > 0 || items.gains.length > 0

                  return (
                    <div key={twin.id} className="bg-white border border-gray-200 rounded-2xl p-5">
                      {/* Twin header */}
                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className={`w-9 h-9 rounded-xl ${avatarColor} flex items-center justify-center text-sm font-bold flex-shrink-0`}
                        >
                          {getInitials(twin.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-gray-900">{twin.name}</p>
                            <span className="text-xs text-gray-400">{twin.role}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#0D6E6E]/10 text-[#0D6E6E]">
                              {twin.segment}
                            </span>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${affinity.className}`}
                            >
                              {affinity.text}
                            </span>
                          </div>
                        </div>
                      </div>

                      {!interviewId ? (
                        <p className="text-xs text-gray-300 italic">
                          No interview data — complete this twin&apos;s interview first.
                        </p>
                      ) : !hasData ? (
                        <div>
                          <p className="text-xs text-gray-300 italic mb-3">
                            No VPC data — generate results after completing this twin&apos;s
                            interview.
                          </p>
                          <div className="flex flex-col sm:flex-row gap-4">
                            <EditableVPCColumn
                              title="Jobs to be Done"
                              items={[]}
                              pillClass={JOB_CLASS}
                              emptyText="No jobs extracted"
                              onAdd={(t) => addTwinItem(interviewId, 'jobs', t)}
                              onRemove={(i) => removeTwinItem(interviewId, 'jobs', i)}
                            />
                            <div className="hidden sm:block w-px bg-gray-100" />
                            <EditableVPCColumn
                              title="Pains"
                              items={[]}
                              pillClass={PAIN_CLASS}
                              emptyText="No pains extracted"
                              onAdd={(t) => addTwinItem(interviewId, 'pains', t)}
                              onRemove={(i) => removeTwinItem(interviewId, 'pains', i)}
                            />
                            <div className="hidden sm:block w-px bg-gray-100" />
                            <EditableVPCColumn
                              title="Gains"
                              items={[]}
                              pillClass={GAIN_CLASS}
                              emptyText="No gains extracted"
                              onAdd={(t) => addTwinItem(interviewId, 'gains', t)}
                              onRemove={(i) => removeTwinItem(interviewId, 'gains', i)}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row gap-4">
                          <EditableVPCColumn
                            title="Jobs to be Done"
                            items={items.jobs}
                            pillClass={JOB_CLASS}
                            emptyText="No jobs extracted"
                            onAdd={(t) => addTwinItem(interviewId, 'jobs', t)}
                            onRemove={(i) => removeTwinItem(interviewId, 'jobs', i)}
                          />
                          <div className="hidden sm:block w-px bg-gray-100" />
                          <EditableVPCColumn
                            title="Pains"
                            items={items.pains}
                            pillClass={PAIN_CLASS}
                            emptyText="No pains extracted"
                            onAdd={(t) => addTwinItem(interviewId, 'pains', t)}
                            onRemove={(i) => removeTwinItem(interviewId, 'pains', i)}
                          />
                          <div className="hidden sm:block w-px bg-gray-100" />
                          <EditableVPCColumn
                            title="Gains"
                            items={items.gains}
                            pillClass={GAIN_CLASS}
                            emptyText="No gains extracted"
                            onAdd={(t) => addTwinItem(interviewId, 'gains', t)}
                            onRemove={(i) => removeTwinItem(interviewId, 'gains', i)}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Section 2: Your Value Proposition (Value Map) ──────────── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Your Value Proposition
                </h2>
                <button
                  onClick={generateValueMap}
                  disabled={generatingValueMap}
                  className="flex items-center gap-2 bg-[#0D6E6E] text-white py-2 px-4 rounded-lg text-xs font-semibold hover:bg-[#0a5555] transition-colors disabled:opacity-60"
                >
                  {generatingValueMap ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} />
                      {valueMap ? 'Regenerate Value Map' : 'Generate Value Map ✨'}
                    </>
                  )}
                </button>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                {!valueMap && !generatingValueMap ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-400 mb-1">No value map yet</p>
                    <p className="text-xs text-gray-300">
                      Click &ldquo;Generate Value Map ✨&rdquo; to get AI suggestions based on your
                      twin interview data.
                    </p>
                  </div>
                ) : generatingValueMap && !valueMap ? (
                  <div className="flex items-center gap-3 py-6 justify-center">
                    <Loader2 size={16} className="animate-spin text-[#0D6E6E]" />
                    <p className="text-sm text-gray-500">Generating your value map…</p>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-6">
                    <EditableVPCColumn
                      title="Products & Services"
                      items={valueMap?.productsAndServices ?? []}
                      pillClass={JOB_CLASS}
                      emptyText="No products or services yet"
                      onAdd={(t) => addValueMapItem('productsAndServices', t)}
                      onRemove={(i) => removeValueMapItem('productsAndServices', i)}
                    />
                    <div className="hidden sm:block w-px bg-gray-100" />
                    <EditableVPCColumn
                      title="Pain Relievers"
                      items={valueMap?.painRelievers ?? []}
                      pillClass={PAIN_CLASS}
                      emptyText="No pain relievers yet"
                      onAdd={(t) => addValueMapItem('painRelievers', t)}
                      onRemove={(i) => removeValueMapItem('painRelievers', i)}
                    />
                    <div className="hidden sm:block w-px bg-gray-100" />
                    <EditableVPCColumn
                      title="Gain Creators"
                      items={valueMap?.gainCreators ?? []}
                      pillClass={GAIN_CLASS}
                      emptyText="No gain creators yet"
                      onAdd={(t) => addValueMapItem('gainCreators', t)}
                      onRemove={(i) => removeValueMapItem('gainCreators', i)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ── Section 3: Cross-Segment Synthesis (editable, client-only) */}
            {hasSynthData && (
              <div>
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Cross-Segment Synthesis
                </h2>
                <div className="bg-gray-900 text-white rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/10 text-white/70">
                      Cross-segment synthesis
                    </span>
                    <span className="text-[10px] text-white/40">
                      Ranked by frequency across {twins.length} twin{twins.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-6">
                    <EditableDarkColumn
                      title="Jobs to be Done"
                      items={synthJobs}
                      pillClass="bg-[#0D6E6E]/30 text-[#4ECDC4] border border-[#0D6E6E]/30 text-xs font-medium px-2.5 py-1 rounded-lg"
                      onAdd={(t) => addSynthItem('jobs', t)}
                      onRemove={(i) => removeSynthItem('jobs', i)}
                    />
                    <div className="hidden sm:block w-px bg-white/10" />
                    <EditableDarkColumn
                      title="Pains"
                      items={synthPains}
                      pillClass="bg-red-900/30 text-red-300 border border-red-800/30 text-xs font-medium px-2.5 py-1 rounded-lg"
                      onAdd={(t) => addSynthItem('pains', t)}
                      onRemove={(i) => removeSynthItem('pains', i)}
                    />
                    <div className="hidden sm:block w-px bg-white/10" />
                    <EditableDarkColumn
                      title="Gains"
                      items={synthGains}
                      pillClass="bg-emerald-900/30 text-emerald-300 border border-emerald-800/30 text-xs font-medium px-2.5 py-1 rounded-lg"
                      onAdd={(t) => addSynthItem('gains', t)}
                      onRemove={(i) => removeSynthItem('gains', i)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── CTA: Continue to Business Model Canvas ─────────────────── */}
            <div className="flex justify-end pt-2">
              <Link
                href={`/project/${project.id}/opportunity/${opportunity.id}/bmc`}
                className="flex items-center gap-2 bg-[#0D6E6E] text-white py-2.5 px-5 rounded-lg text-sm font-semibold hover:bg-[#0a5555] transition-colors"
              >
                Continue to Business Model Canvas →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
