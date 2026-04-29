'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import BackButton from '@/components/BackButton'
import { Plus, X, Loader2, Sparkles } from 'lucide-react'
import { TWIN_AVATAR_COLORS, TWIN_COLORS_HEX } from '@/lib/constants'
import { getTwinIndex, getInitials, getAffinityDisplay } from '@/lib/types'
import type { DigitalTwin, TwinInterview, Opportunity } from '@/lib/types'

// ─── Types ──────────────────────────────────────────────────────────────────────

type ValueMap = {
  productsAndServices: string[]
  painRelievers: string[]
  gainCreators: string[]
}

type FinalVPCItem = { text: string; twinIdx: number }

type FinalVPC = {
  productsAndServices: FinalVPCItem[]
  painRelievers: FinalVPCItem[]
  gainCreators: FinalVPCItem[]
  jobs: FinalVPCItem[]
  pains: FinalVPCItem[]
  gains: FinalVPCItem[]
}

type CustomerProfile = { jobs: string[]; pains: string[]; gains: string[] }

type Ability = { id: string; name: string; description: string }

type TwinInterviewWithId = TwinInterview & { twinSequentialId: string }

// ─── Pill colour classes ────────────────────────────────────────────────────────
const PRODUCT_CLASS  = 'bg-teal-50 text-teal-700 border border-teal-100'
const RELIEVER_CLASS = 'bg-rose-50 text-rose-700 border border-rose-100'
const CREATOR_CLASS  = 'bg-emerald-50 text-emerald-700 border border-emerald-100'
const JOB_CLASS      = 'bg-[#0D6E6E]/10 text-[#0D6E6E] border border-[#0D6E6E]/10'
const PAIN_CLASS     = 'bg-orange-50 text-orange-700 border border-orange-100'
const GAIN_CLASS     = 'bg-green-50 text-green-700 border border-green-100'

// ─── Normalise incoming vpc_value_map (old string[] or new FinalVPCItem[]) ──────
const EMPTY_FINAL: FinalVPC = {
  productsAndServices: [], painRelievers: [], gainCreators: [],
  jobs: [], pains: [], gains: [],
}

function normalizeFinalVPC(raw: unknown): FinalVPC {
  if (!raw || typeof raw !== 'object') return EMPTY_FINAL
  const r = raw as Record<string, unknown>

  function toItems(arr: unknown): FinalVPCItem[] {
    if (!Array.isArray(arr)) return []
    return arr.map((item) => {
      if (typeof item === 'string') return { text: item, twinIdx: 0 }
      if (item && typeof item === 'object' && 'text' in item) return item as FinalVPCItem
      return { text: String(item), twinIdx: 0 }
    })
  }

  return {
    productsAndServices: toItems(r.productsAndServices),
    painRelievers:       toItems(r.painRelievers),
    gainCreators:        toItems(r.gainCreators),
    jobs:                toItems(r.jobs),
    pains:               toItems(r.pains),
    gains:               toItems(r.gains),
  }
}

// ─── Pill with optional "add to Final VPC" button ───────────────────────────────
function TwinPill({
  text,
  pillClass,
  onAddToFinal,
  onRemove,
}: {
  text: string
  pillClass: string
  onAddToFinal?: () => void
  onRemove?: () => void
}) {
  return (
    <span
      className={`inline-flex items-start gap-1 text-xs font-medium px-2.5 py-1 rounded-lg whitespace-normal break-words max-w-full ${pillClass}`}
    >
      <span className="flex-1 min-w-0">{text}</span>
      {onAddToFinal && (
        <button
          onClick={onAddToFinal}
          className="opacity-40 hover:opacity-100 transition-opacity mt-0.5 flex-shrink-0"
          title="Add to Final VPC"
        >
          <Plus size={9} />
        </button>
      )}
      {onRemove && (
        <button
          onClick={onRemove}
          className="opacity-40 hover:opacity-100 transition-opacity mt-0.5 flex-shrink-0"
        >
          <X size={9} />
        </button>
      )}
    </span>
  )
}

// ─── Pill with twin colour dot (for Final VPC) ───────────────────────────────────
function FinalPill({
  item,
  pillClass,
  onRemove,
}: {
  item: FinalVPCItem
  pillClass: string
  onRemove: () => void
}) {
  const color =
    item.twinIdx >= 0
      ? TWIN_COLORS_HEX[item.twinIdx % TWIN_COLORS_HEX.length]
      : '#94a3b8'
  return (
    <span
      className={`inline-flex items-start gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg whitespace-normal break-words max-w-full ${pillClass}`}
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5"
        style={{ backgroundColor: color }}
      />
      <span className="flex-1 min-w-0">{item.text}</span>
      <button
        onClick={onRemove}
        className="opacity-40 hover:opacity-100 transition-opacity mt-0.5 flex-shrink-0"
      >
        <X size={9} />
      </button>
    </span>
  )
}

// ─── Editable sub-column ─────────────────────────────────────────────────────────
function VPCSubCol({
  title,
  items,
  pillClass,
  emptyText,
  onAdd,
  renderPill,
}: {
  title: string
  items: string[]
  pillClass: string
  emptyText: string
  onAdd: (text: string) => void
  renderPill: (text: string, index: number) => React.ReactNode
}) {
  const [adding, setAdding] = useState(false)
  const [val, setVal] = useState('')

  function submit() {
    const t = val.trim()
    if (t) onAdd(t)
    setVal('')
    setAdding(false)
  }

  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center gap-1 mb-1">
        <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">{title}</p>
        <button
          onClick={() => setAdding(true)}
          className="w-3 h-3 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors flex-shrink-0"
        >
          <Plus size={7} className="text-gray-500" />
        </button>
      </div>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-1">{items.map(renderPill)}</div>
      ) : (
        !adding && <p className="text-[10px] text-gray-300 italic">{emptyText}</p>
      )}
      {adding && (
        <div className="flex items-center gap-1 mt-1">
          <input
            autoFocus
            type="text"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
              if (e.key === 'Escape') { setAdding(false); setVal('') }
            }}
            placeholder="Add…"
            className="flex-1 text-[10px] px-2 py-1 border border-gray-200 rounded-lg bg-gray-50 outline-none focus:ring-1 focus:ring-[#0D6E6E] min-w-0"
          />
          <button
            onClick={submit}
            className="text-[10px] px-1.5 py-1 bg-[#0D6E6E] text-white rounded-lg flex-shrink-0"
          >
            Add
          </button>
          <button onClick={() => { setAdding(false); setVal('') }} className="flex-shrink-0">
            <X size={10} className="text-gray-400" />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Final VPC sub-column (FinalVPCItem[]) ────────────────────────────────────────
function FinalSubCol({
  title,
  items,
  pillClass,
  emptyText,
  onAdd,
  onRemove,
}: {
  title: string
  items: FinalVPCItem[]
  pillClass: string
  emptyText: string
  onAdd: (text: string) => void
  onRemove: (index: number) => void
}) {
  const [adding, setAdding] = useState(false)
  const [val, setVal] = useState('')

  function submit() {
    const t = val.trim()
    if (t) onAdd(t)
    setVal('')
    setAdding(false)
  }

  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center gap-1 mb-1">
        <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">{title}</p>
        <button
          onClick={() => setAdding(true)}
          className="w-3 h-3 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors flex-shrink-0"
        >
          <Plus size={7} className="text-gray-500" />
        </button>
      </div>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {items.map((item, i) => (
            <FinalPill key={i} item={item} pillClass={pillClass} onRemove={() => onRemove(i)} />
          ))}
        </div>
      ) : (
        !adding && <p className="text-[10px] text-gray-300 italic">{emptyText}</p>
      )}
      {adding && (
        <div className="flex items-center gap-1 mt-1">
          <input
            autoFocus
            type="text"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
              if (e.key === 'Escape') { setAdding(false); setVal('') }
            }}
            placeholder="Add…"
            className="flex-1 text-[10px] px-2 py-1 border border-gray-200 rounded-lg bg-gray-50 outline-none focus:ring-1 focus:ring-[#0D6E6E] min-w-0"
          />
          <button
            onClick={submit}
            className="text-[10px] px-1.5 py-1 bg-[#0D6E6E] text-white rounded-lg flex-shrink-0"
          >
            Add
          </button>
          <button onClick={() => { setAdding(false); setVal('') }} className="flex-shrink-0">
            <X size={10} className="text-gray-400" />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────────

export default function VPCClient({
  project,
  opportunity,
  twins,
  interviews,
  hasInterviews,
  abilities,
  sessionId,
  existingFinalVPC,
}: {
  project: { id: string; title: string }
  opportunity: Opportunity
  twins: DigitalTwin[]
  interviews: TwinInterviewWithId[]
  hasInterviews: boolean
  abilities: Ability[]
  sessionId: string | null
  existingFinalVPC: unknown
}) {
  const supabase = createClient()
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(sessionId)

  // ── Per-twin customer profiles (jobs / pains / gains) ───────────────────────
  const [profiles, setProfiles] = useState<Record<string, CustomerProfile>>(() => {
    const s: Record<string, CustomerProfile> = {}
    for (const iv of interviews) {
      s[iv.id] = { jobs: iv.jobs_to_be_done ?? [], pains: iv.pains ?? [], gains: iv.gains ?? [] }
    }
    return s
  })

  // ── Per-twin value maps (products / relievers / creators) ──────────────────
  const [twinVMs, setTwinVMs] = useState<Record<string, ValueMap | null>>(() => {
    const s: Record<string, ValueMap | null> = {}
    for (const iv of interviews) {
      // Validate shape: the DB default '{}' is truthy but has no arrays —
      // treat anything without a real productsAndServices array as null.
      const raw = iv.value_map as Record<string, unknown> | null | undefined
      s[iv.id] =
        raw && Array.isArray(raw.productsAndServices) && raw.productsAndServices.length > 0
          ? {
              productsAndServices: raw.productsAndServices as string[],
              painRelievers: Array.isArray(raw.painRelievers) ? (raw.painRelievers as string[]) : [],
              gainCreators:  Array.isArray(raw.gainCreators)  ? (raw.gainCreators  as string[]) : [],
            }
          : null
    }
    return s
  })
  const [generatingVM, setGeneratingVM] = useState<Record<string, boolean>>({})

  // ── Final VPC ───────────────────────────────────────────────────────────────
  const [finalVPC, setFinalVPC] = useState<FinalVPC>(() => normalizeFinalVPC(existingFinalVPC))

  // ── DB helpers ──────────────────────────────────────────────────────────────
  async function saveProfile(ivId: string, p: CustomerProfile) {
    await supabase
      .from('twin_interviews')
      .update({ jobs_to_be_done: p.jobs, pains: p.pains, gains: p.gains })
      .eq('id', ivId)
  }

  async function saveTwinVM(ivId: string, vm: ValueMap) {
    await supabase.from('twin_interviews').update({ value_map: vm }).eq('id', ivId)
  }

  async function saveFinalVPC(vpc: FinalVPC) {
    if (currentSessionId) {
      await supabase.from('twin_sessions').update({ vpc_value_map: vpc }).eq('id', currentSessionId)
    } else {
      const { data } = await supabase
        .from('twin_sessions')
        .insert({ opportunity_id: opportunity.id, vpc_value_map: vpc, suggested_segments: [], report: null })
        .select('id')
        .single()
      if (data?.id) setCurrentSessionId(data.id)
    }
  }

  // ── Customer profile mutations ──────────────────────────────────────────────
  function addProfileItem(ivId: string, col: keyof CustomerProfile, text: string) {
    setProfiles((prev) => {
      const cur = prev[ivId] ?? { jobs: [], pains: [], gains: [] }
      const updated = { ...cur, [col]: [...cur[col], text] }
      saveProfile(ivId, updated)
      return { ...prev, [ivId]: updated }
    })
  }

  function removeProfileItem(ivId: string, col: keyof CustomerProfile, idx: number) {
    setProfiles((prev) => {
      const cur = prev[ivId] ?? { jobs: [], pains: [], gains: [] }
      const updated = { ...cur, [col]: cur[col].filter((_, i) => i !== idx) }
      saveProfile(ivId, updated)
      return { ...prev, [ivId]: updated }
    })
  }

  // ── Value map mutations ─────────────────────────────────────────────────────
  function addVMItem(ivId: string, col: keyof ValueMap, text: string) {
    setTwinVMs((prev) => {
      const cur = prev[ivId] ?? { productsAndServices: [], painRelievers: [], gainCreators: [] }
      const updated = { ...cur, [col]: [...cur[col], text] }
      saveTwinVM(ivId, updated)
      return { ...prev, [ivId]: updated }
    })
  }

  function removeVMItem(ivId: string, col: keyof ValueMap, idx: number) {
    setTwinVMs((prev) => {
      const cur = prev[ivId] ?? { productsAndServices: [], painRelievers: [], gainCreators: [] }
      const updated = { ...cur, [col]: cur[col].filter((_, i) => i !== idx) }
      saveTwinVM(ivId, updated)
      return { ...prev, [ivId]: updated }
    })
  }

  // ── Final VPC mutations ─────────────────────────────────────────────────────
  function addToFinalVPC(col: keyof FinalVPC, text: string, twinIdx: number) {
    setFinalVPC((prev) => {
      const updated = { ...prev, [col]: [...prev[col], { text, twinIdx }] }
      saveFinalVPC(updated)
      return updated
    })
  }

  function removeFromFinalVPC(col: keyof FinalVPC, idx: number) {
    setFinalVPC((prev) => {
      const updated = { ...prev, [col]: prev[col].filter((_, i) => i !== idx) }
      saveFinalVPC(updated)
      return updated
    })
  }

  function addCustomToFinalVPC(col: keyof FinalVPC, text: string) {
    addToFinalVPC(col, text, -1)
  }

  // ── AI generate per-twin value map ─────────────────────────────────────────
  async function generateTwinVM(ivId: string) {
    setGeneratingVM((prev) => ({ ...prev, [ivId]: true }))
    try {
      const profile = profiles[ivId] ?? { jobs: [], pains: [], gains: [] }
      const res = await fetch('/api/generate-vpc-value-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityName: opportunity.name,
          opportunityDescription: opportunity.description,
          abilities,
          aggregatedPains: profile.pains,
          aggregatedGains: profile.gains,
          aggregatedJobs:  profile.jobs,
        }),
      })
      const { valueMap: generated } = await res.json()
      setTwinVMs((prev) => ({ ...prev, [ivId]: generated }))
      await saveTwinVM(ivId, generated)
    } catch {
      // silent — user can retry
    } finally {
      setGeneratingVM((prev) => ({ ...prev, [ivId]: false }))
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function getTwinIdx(twin: DigitalTwin) {
    return getTwinIndex(twin.id)
  }

  const hasFinalData = Object.values(finalVPC).some((arr) => arr.length > 0)

  return (
    <div className="flex min-h-screen">
      <Sidebar projectId={project.id} projectTitle={project.title} />

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
          <div className="space-y-6 max-w-5xl">

            {/* ── Section 1: Per-twin VPC cards ────────────────────────────── */}
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Per-Twin VPC
              </h2>
              <div className="space-y-4">
                {twins.map((twin) => {
                  const iv = interviews.find((i) => i.twinSequentialId === twin.id)
                  const ivId = iv?.id
                  const twinIdx = getTwinIdx(twin)
                  const profile = ivId ? (profiles[ivId] ?? { jobs: [], pains: [], gains: [] }) : null
                  const vm = ivId ? twinVMs[ivId] : null
                  const isGenerating = ivId ? !!generatingVM[ivId] : false
                  const affinity = getAffinityDisplay(twin.affinityLabel)
                  const avatarColor = TWIN_AVATAR_COLORS[twinIdx % TWIN_AVATAR_COLORS.length]
                  const twinColor = TWIN_COLORS_HEX[twinIdx % TWIN_COLORS_HEX.length]

                  return (
                    <div key={twin.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                      {/* Twin header */}
                      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100">
                        <div
                          className={`w-8 h-8 rounded-xl ${avatarColor} flex items-center justify-center text-sm font-bold flex-shrink-0`}
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
                        {/* Twin colour badge */}
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: twinColor }}
                          title={`Twin ${twinIdx + 1} colour`}
                        />
                      </div>

                      {!ivId ? (
                        <p className="text-xs text-gray-300 italic px-5 py-4">
                          No interview data — complete this twin&apos;s interview first.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 divide-x divide-gray-100">
                          {/* LEFT: Value Map ─────────────────────────────── */}
                          <div className="bg-teal-50/30 p-4">
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-[#0D6E6E]">
                                Value Map
                              </p>
                              <button
                                onClick={() => generateTwinVM(ivId)}
                                disabled={isGenerating}
                                className="flex items-center gap-1 bg-[#0D6E6E] text-white px-2.5 py-1 rounded-lg text-[10px] font-semibold hover:bg-[#0a5555] transition-colors disabled:opacity-60"
                              >
                                {isGenerating ? (
                                  <><Loader2 size={9} className="animate-spin" /> Generating…</>
                                ) : (
                                  <><Sparkles size={9} /> {vm ? 'Regenerate' : 'Generate ✨'}</>
                                )}
                              </button>
                            </div>

                            {isGenerating && !vm && (
                              <div className="flex items-center gap-2 py-4 justify-center">
                                <Loader2 size={13} className="animate-spin text-[#0D6E6E]" />
                                <span className="text-xs text-gray-400">Generating…</span>
                              </div>
                            )}

                            {!vm && !isGenerating && (
                              <p className="text-[10px] text-gray-300 italic">
                                Click &ldquo;Generate&rdquo; to create the value map from this twin&apos;s profile.
                              </p>
                            )}

                            {vm && (
                              <>
                                <VPCSubCol
                                  title="Products & Services"
                                  items={vm.productsAndServices}
                                  pillClass={PRODUCT_CLASS}
                                  emptyText="None yet"
                                  onAdd={(t) => addVMItem(ivId, 'productsAndServices', t)}
                                  renderPill={(text, i) => (
                                    <TwinPill
                                      key={i}
                                      text={text}
                                      pillClass={PRODUCT_CLASS}
                                      onAddToFinal={() => addToFinalVPC('productsAndServices', text, twinIdx)}
                                      onRemove={() => removeVMItem(ivId, 'productsAndServices', i)}
                                    />
                                  )}
                                />
                                <VPCSubCol
                                  title="Pain Relievers"
                                  items={vm.painRelievers}
                                  pillClass={RELIEVER_CLASS}
                                  emptyText="None yet"
                                  onAdd={(t) => addVMItem(ivId, 'painRelievers', t)}
                                  renderPill={(text, i) => (
                                    <TwinPill
                                      key={i}
                                      text={text}
                                      pillClass={RELIEVER_CLASS}
                                      onAddToFinal={() => addToFinalVPC('painRelievers', text, twinIdx)}
                                      onRemove={() => removeVMItem(ivId, 'painRelievers', i)}
                                    />
                                  )}
                                />
                                <VPCSubCol
                                  title="Gain Creators"
                                  items={vm.gainCreators}
                                  pillClass={CREATOR_CLASS}
                                  emptyText="None yet"
                                  onAdd={(t) => addVMItem(ivId, 'gainCreators', t)}
                                  renderPill={(text, i) => (
                                    <TwinPill
                                      key={i}
                                      text={text}
                                      pillClass={CREATOR_CLASS}
                                      onAddToFinal={() => addToFinalVPC('gainCreators', text, twinIdx)}
                                      onRemove={() => removeVMItem(ivId, 'gainCreators', i)}
                                    />
                                  )}
                                />
                              </>
                            )}
                          </div>

                          {/* RIGHT: Customer Profile ─────────────────────── */}
                          <div className="p-4">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">
                              Customer Profile
                            </p>
                            <VPCSubCol
                              title="Jobs to be Done"
                              items={profile?.jobs ?? []}
                              pillClass={JOB_CLASS}
                              emptyText="No jobs extracted"
                              onAdd={(t) => addProfileItem(ivId, 'jobs', t)}
                              renderPill={(text, i) => (
                                <TwinPill
                                  key={i}
                                  text={text}
                                  pillClass={JOB_CLASS}
                                  onAddToFinal={() => addToFinalVPC('jobs', text, twinIdx)}
                                  onRemove={() => removeProfileItem(ivId, 'jobs', i)}
                                />
                              )}
                            />
                            <VPCSubCol
                              title="Pains"
                              items={profile?.pains ?? []}
                              pillClass={PAIN_CLASS}
                              emptyText="No pains extracted"
                              onAdd={(t) => addProfileItem(ivId, 'pains', t)}
                              renderPill={(text, i) => (
                                <TwinPill
                                  key={i}
                                  text={text}
                                  pillClass={PAIN_CLASS}
                                  onAddToFinal={() => addToFinalVPC('pains', text, twinIdx)}
                                  onRemove={() => removeProfileItem(ivId, 'pains', i)}
                                />
                              )}
                            />
                            <VPCSubCol
                              title="Gains"
                              items={profile?.gains ?? []}
                              pillClass={GAIN_CLASS}
                              emptyText="No gains extracted"
                              onAdd={(t) => addProfileItem(ivId, 'gains', t)}
                              renderPill={(text, i) => (
                                <TwinPill
                                  key={i}
                                  text={text}
                                  pillClass={GAIN_CLASS}
                                  onAddToFinal={() => addToFinalVPC('gains', text, twinIdx)}
                                  onRemove={() => removeProfileItem(ivId, 'gains', i)}
                                />
                              )}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Section 2: Final VPC ─────────────────────────────────────── */}
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Your Final Value Proposition Canvas
              </h2>
              <p className="text-[10px] text-gray-400 mb-3">
                Click the <Plus size={8} className="inline" /> on any per-twin pill to curate it here.
              </p>

              {/* Legend */}
              {twins.length > 0 && (
                <div className="flex flex-wrap gap-3 mb-4">
                  {twins.map((twin, i) => (
                    <span key={twin.id} className="flex items-center gap-1.5 text-[10px] text-gray-500">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: TWIN_COLORS_HEX[i % TWIN_COLORS_HEX.length] }}
                      />
                      {twin.name}
                    </span>
                  ))}
                  <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
                    <span className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0" />
                    Custom
                  </span>
                </div>
              )}

              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                {!hasFinalData && (
                  <div className="px-5 py-4 text-xs text-gray-300 italic">
                    Canvas is empty — click <Plus size={9} className="inline" /> on any twin pill above to add items here, or use the + buttons below.
                  </div>
                )}
                <div className="grid grid-cols-2 divide-x divide-gray-100">
                  {/* LEFT: Value Map */}
                  <div className="bg-teal-50/20 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#0D6E6E] mb-3">
                      Value Map
                    </p>
                    <FinalSubCol
                      title="Products & Services"
                      items={finalVPC.productsAndServices}
                      pillClass={PRODUCT_CLASS}
                      emptyText="None added yet"
                      onAdd={(t) => addCustomToFinalVPC('productsAndServices', t)}
                      onRemove={(i) => removeFromFinalVPC('productsAndServices', i)}
                    />
                    <FinalSubCol
                      title="Pain Relievers"
                      items={finalVPC.painRelievers}
                      pillClass={RELIEVER_CLASS}
                      emptyText="None added yet"
                      onAdd={(t) => addCustomToFinalVPC('painRelievers', t)}
                      onRemove={(i) => removeFromFinalVPC('painRelievers', i)}
                    />
                    <FinalSubCol
                      title="Gain Creators"
                      items={finalVPC.gainCreators}
                      pillClass={CREATOR_CLASS}
                      emptyText="None added yet"
                      onAdd={(t) => addCustomToFinalVPC('gainCreators', t)}
                      onRemove={(i) => removeFromFinalVPC('gainCreators', i)}
                    />
                  </div>

                  {/* RIGHT: Customer Profile */}
                  <div className="p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">
                      Customer Profile
                    </p>
                    <FinalSubCol
                      title="Jobs to be Done"
                      items={finalVPC.jobs}
                      pillClass={JOB_CLASS}
                      emptyText="None added yet"
                      onAdd={(t) => addCustomToFinalVPC('jobs', t)}
                      onRemove={(i) => removeFromFinalVPC('jobs', i)}
                    />
                    <FinalSubCol
                      title="Pains"
                      items={finalVPC.pains}
                      pillClass={PAIN_CLASS}
                      emptyText="None added yet"
                      onAdd={(t) => addCustomToFinalVPC('pains', t)}
                      onRemove={(i) => removeFromFinalVPC('pains', i)}
                    />
                    <FinalSubCol
                      title="Gains"
                      items={finalVPC.gains}
                      pillClass={GAIN_CLASS}
                      emptyText="None added yet"
                      onAdd={(t) => addCustomToFinalVPC('gains', t)}
                      onRemove={(i) => removeFromFinalVPC('gains', i)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── CTA ──────────────────────────────────────────────────────── */}
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
