'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import TopNav from '@/components/TopNav'
import BackButton from '@/components/BackButton'
import { Plus, X, Loader2, Sparkles, Download } from 'lucide-react'
import { TWIN_AVATAR_COLORS, TWIN_COLORS_HEX } from '@/lib/constants'
import { getTwinIndex, getInitials, getAffinityDisplay } from '@/lib/types'
import type { DigitalTwin, TwinInterview, Opportunity } from '@/lib/types'
import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n/context'

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
const PRODUCT_CLASS  = 'bg-[rgba(19,163,137,0.10)] text-[#7A4A20] border border-[rgba(19,163,137,0.2)]'
const RELIEVER_CLASS = 'bg-[var(--color-border)] text-[var(--color-foreground)] border border-[var(--color-border)]'
const CREATOR_CLASS  = 'bg-[rgba(19,163,137,0.10)] text-[var(--color-primary)] border border-[rgba(19,163,137,0.2)]'
const JOB_CLASS      = 'bg-[rgba(19,163,137,0.10)] text-[var(--color-primary)] border border-[rgba(19,163,137,0.15)]'
const PAIN_CLASS     = 'bg-[rgba(111,226,214,0.15)] text-[#7A3D10] border border-[rgba(111,226,214,0.25)]'
const GAIN_CLASS     = 'bg-[rgba(19,163,137,0.10)] text-[var(--color-primary)] border border-[rgba(19,163,137,0.2)]'

// ─── Normalise incoming vpc_value_map (old string[] or new FinalVPCItem[]) ──────
const EMPTY_FINAL: FinalVPC = {
  productsAndServices: [], painRelievers: [], gainCreators: [],
  jobs: [], pains: [], gains: [] }

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
    gains:               toItems(r.gains) }
}

// ─── Pill with optional "add to Final VPC" button ───────────────────────────────
function TwinPill({
  text,
  pillClass,
  dotColor,
  onAddToFinal,
  onRemove }: {
  text: string
  pillClass: string
  dotColor?: string
  onAddToFinal?: () => void
  onRemove?: () => void
}) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15 }}
      layout
      className={`inline-flex items-start gap-1 text-xs font-medium px-2.5 py-1 rounded-lg whitespace-normal break-words max-w-full ${pillClass}`}
    >
      {dotColor && (
        <span
          className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5"
          style={{ backgroundColor: dotColor }}
        />
      )}
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
    </motion.span>
  )
}

// ─── Pill with twin colour dot (for Final VPC) ───────────────────────────────────
function FinalPill({
  item,
  pillClass,
  onRemove }: {
  item: FinalVPCItem
  pillClass: string
  onRemove: () => void
}) {
  const color =
    item.twinIdx >= 0
      ? TWIN_COLORS_HEX[item.twinIdx % TWIN_COLORS_HEX.length]
      : '#94a3b8'
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15 }}
      layout
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
    </motion.span>
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
  onAddAll }: {
  title: string
  items: string[]
  pillClass: string
  emptyText: string
  onAdd: (text: string) => void
  renderPill: (text: string, index: number) => React.ReactNode
  onAddAll?: () => void
}) {
  const { t } = useI18n()
  const [adding, setAdding] = useState(false)
  const [val, setVal] = useState('')
  const [addedAll, setAddedAll] = useState(false)

  function submit() {
    const trimmed = val.trim()
    if (trimmed) onAdd(trimmed)
    setVal('')
    setAdding(false)
  }

  function handleAddAll() {
    if (!onAddAll) return
    onAddAll()
    setAddedAll(true)
    setTimeout(() => setAddedAll(false), 2000)
  }

  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center gap-1 mb-1">
        <p style={{ fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-foreground-muted)' }}>{title}</p>
        <button
          onClick={() => setAdding(true)}
          className="w-3 h-3 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
          style={{ backgroundColor: 'var(--color-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-border)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-muted)')}
        >
          <Plus size={7} style={{ color: 'var(--color-foreground-muted)' }} />
        </button>
        {onAddAll && items.length > 0 && (
          <button
            onClick={handleAddAll}
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full transition-colors flex-shrink-0"
            style={{
              fontSize: 8,
              fontWeight: 500,
              backgroundColor: addedAll ? 'rgba(19,163,137,0.15)' : 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
              color: addedAll ? 'var(--color-primary)' : 'var(--color-primary)',
              border: addedAll ? '0.5px solid rgba(19,163,137,0.3)' : '0.5px solid rgba(19,163,137,0.2)' }}
          >
            {addedAll ? t.vpc_added_all : t.vpc_add_all}
          </button>
        )}
      </div>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-1">{items.map(renderPill)}</div>
      ) : (
        !adding && <p style={{ fontSize: 10, fontStyle: 'italic', color: 'var(--color-foreground-faint)' }}>{emptyText}</p>
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
            placeholder={t.vpc_add_item}
            className="flex-1 text-[10px] px-2 py-1 rounded-lg outline-none min-w-0"
            style={{ border: '0.5px solid var(--color-border)', backgroundColor: 'var(--color-muted)' }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--color-primary)'
              e.target.style.boxShadow = '0 0 0 3px rgba(19,163,137,0.12)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--color-border)'
              e.target.style.boxShadow = 'none'
            }}
          />
          <button
            onClick={submit}
            className="text-[10px] px-1.5 py-1 rounded-lg flex-shrink-0"
            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
          >
            {t.vpc_add_btn}
          </button>
          <button onClick={() => { setAdding(false); setVal('') }} className="flex-shrink-0">
            <X size={10} style={{ color: 'var(--color-foreground-faint)' }} />
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
  onRemove }: {
  title: string
  items: FinalVPCItem[]
  pillClass: string
  emptyText: string
  onAdd: (text: string) => void
  onRemove: (index: number) => void
}) {
  const { t } = useI18n()
  const [adding, setAdding] = useState(false)
  const [val, setVal] = useState('')

  function submit() {
    const trimmed = val.trim()
    if (trimmed) onAdd(trimmed)
    setVal('')
    setAdding(false)
  }

  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center gap-1 mb-1">
        <p style={{ fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-foreground-muted)' }}>{title}</p>
        <button
          onClick={() => setAdding(true)}
          className="w-3 h-3 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
          style={{ backgroundColor: 'var(--color-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-border)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-muted)')}
        >
          <Plus size={7} style={{ color: 'var(--color-foreground-muted)' }} />
        </button>
      </div>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {items.map((item, i) => (
            <FinalPill key={i} item={item} pillClass={pillClass} onRemove={() => onRemove(i)} />
          ))}
        </div>
      ) : (
        !adding && <p style={{ fontSize: 10, fontStyle: 'italic', color: 'var(--color-foreground-faint)' }}>{emptyText}</p>
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
            placeholder={t.vpc_add_item}
            className="flex-1 text-[10px] px-2 py-1 rounded-lg outline-none min-w-0"
            style={{ border: '0.5px solid var(--color-border)', backgroundColor: 'var(--color-muted)' }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--color-primary)'
              e.target.style.boxShadow = '0 0 0 3px rgba(19,163,137,0.12)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--color-border)'
              e.target.style.boxShadow = 'none'
            }}
          />
          <button
            onClick={submit}
            className="text-[10px] px-1.5 py-1 rounded-lg flex-shrink-0"
            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
          >
            {t.vpc_add_btn}
          </button>
          <button onClick={() => { setAdding(false); setVal('') }} className="flex-shrink-0">
            <X size={10} style={{ color: 'var(--color-foreground-faint)' }} />
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
  vpcRecordId: _vpcRecordId }: {
  project: { id: string; title: string }
  opportunity: Opportunity
  twins: DigitalTwin[]
  interviews: TwinInterviewWithId[]
  hasInterviews: boolean
  abilities: Ability[]
  sessionId: string | null
  existingFinalVPC: unknown
  vpcRecordId?: string | null
}) {
  const supabase = createClient()
  const { t, lang } = useI18n()
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
              gainCreators:  Array.isArray(raw.gainCreators)  ? (raw.gainCreators  as string[]) : [] }
          : null
    }
    return s
  })
  const [generatingVM, setGeneratingVM] = useState<Record<string, boolean>>({})
  const [vmError, setVmError] = useState<Record<string, boolean>>({})

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
    return supabase.from('twin_interviews').update({ value_map: vm }).eq('id', ivId)
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

  // ── Batch-add an entire VM section to final VPC (no duplicates) ─────────────
  function addSectionToFinalVPC(col: keyof FinalVPC, items: string[], twinIdx: number) {
    setFinalVPC((prev) => {
      const existingTexts = new Set(prev[col].map((item) => item.text))
      const newItems = items
        .filter((text) => !existingTexts.has(text))
        .map((text) => ({ text, twinIdx }))
      if (newItems.length === 0) return prev
      const updated = { ...prev, [col]: [...prev[col], ...newItems] }
      saveFinalVPC(updated)
      return updated
    })
  }

  // ── AI generate per-twin value map (with 1 automatic retry) ───────────────
  async function generateTwinVM(ivId: string, twin: DigitalTwin) {
    setGeneratingVM((prev) => ({ ...prev, [ivId]: true }))
    setVmError((prev) => ({ ...prev, [ivId]: false }))

    let lastError: unknown = null

    for (let attempt = 0; attempt <= 1; attempt++) {
      try {
        if (attempt > 0) console.log('[VPC generate] retrying (attempt 2)…')

        // Step 1: build prompt payload
        const profile = profiles[ivId] ?? { jobs: [], pains: [], gains: [] }
        const payload = {
          opportunityName: opportunity.name,
          opportunityDescription: opportunity.description,
          abilities,
          aggregatedPains: profile.pains,
          aggregatedGains: profile.gains,
          aggregatedJobs:  profile.jobs,
          twinProfile: { name: twin.name, role: twin.role, segment: twin.segment },
          existingVPCItems: {
            productsAndServices: finalVPC.productsAndServices.map((i) => i.text),
            painRelievers: finalVPC.painRelievers.map((i) => i.text),
            gainCreators: finalVPC.gainCreators.map((i) => i.text) } }
        console.log('[VPC generate] step 1 – prompt payload built for twin:', twin.name, {
          hasOpportunity: !!payload.opportunityName,
          painsCount: payload.aggregatedPains.length,
          gainsCount: payload.aggregatedGains.length,
          jobsCount: payload.aggregatedJobs.length })

        // Step 2: API call
        console.log('[VPC generate] step 2 – calling /api/generate-vpc-value-map')
        const res = await fetch('/api/generate-vpc-value-map', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload) })
        console.log('[VPC generate] step 3 – response received, status:', res.status)

        // Step 3: parse response
        const json = await res.json()
        console.log('[VPC generate] step 4 – response parsed:', json)
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)

        const { valueMap: generated } = json
        if (!generated || !Array.isArray(generated.productsAndServices)) {
          throw new Error('Invalid response shape: ' + JSON.stringify(generated))
        }

        // Step 4: Supabase save
        console.log('[VPC generate] step 5 – saving to Supabase, ivId:', ivId)
        const { error: saveErr } = await supabase
          .from('twin_interviews')
          .update({ value_map: generated })
          .eq('id', ivId)
        console.log('[VPC generate] step 6 – save result:', saveErr ? `error: ${saveErr.message}` : 'ok')
        if (saveErr) console.error('[VPC generate] Supabase save error:', saveErr)

        setTwinVMs((prev) => ({ ...prev, [ivId]: generated }))
        setGeneratingVM((prev) => ({ ...prev, [ivId]: false }))
        return // success — exit retry loop
      } catch (err) {
        lastError = err
        console.error(`[VPC generate] attempt ${attempt + 1} failed:`, err)
      }
    }

    // Both attempts failed
    console.error('[VPC generate] all attempts failed. Last error:', lastError)
    setVmError((prev) => ({ ...prev, [ivId]: true }))
    setGeneratingVM((prev) => ({ ...prev, [ivId]: false }))
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function getTwinIdx(twin: DigitalTwin) {
    return getTwinIndex(twin.id)
  }

  const hasFinalData = Object.values(finalVPC).some((arr) => arr.length > 0)

  // ── Download final VPC as .txt ─────────────────────────────────────────────
  function downloadVPC() {
    const today = new Date().toLocaleDateString(lang === 'it' ? 'it-IT' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const list = (items: FinalVPCItem[]) =>
      items.length > 0 ? items.map((i) => `- ${i.text}`).join('\n') : `- (${t.vpc_none_yet})`

    const content = [
      'HATCH — Value Proposition Canvas',
      `Project: ${project.title}`,
      `Date: ${today}`,
      '',
      '── VALUE MAP (left side) ──',
      '',
      'Products & Services:',
      list(finalVPC.productsAndServices),
      '',
      'Gain Creators:',
      list(finalVPC.gainCreators),
      '',
      'Pain Relievers:',
      list(finalVPC.painRelievers),
      '',
      '── CUSTOMER PROFILE (right side) ──',
      '',
      'Customer Jobs:',
      list(finalVPC.jobs),
      '',
      'Gains:',
      list(finalVPC.gains),
      '',
      'Pains:',
      list(finalVPC.pains),
    ].join('\n')

    const blob = new Blob([content], { type: 'text/plain; charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vpc-${project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <TopNav projectId={project.id} projectTitle={project.title} />

      <motion.div className="flex-1 overflow-auto p-8 pt-14" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
        <BackButton
          href={`/project/${project.id}/opportunity/${opportunity.id}/twins/results`}
          label={t.vpc_back}
        />

        <div className="mb-6">
          <h1
            style={{
              fontWeight: 400,
              fontSize: 34,
              letterSpacing: '-0.03em',
              color: 'var(--color-foreground)' }}
          >
            Value Proposition Canvas
          </h1>
          <p style={{ fontSize: 13, color: 'var(--color-foreground-muted)', marginTop: 2 }}>{opportunity.name}</p>
        </div>

        {!hasInterviews ? (
          <div
            className="rounded-2xl p-10 text-center max-w-lg"
            style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)' }}
          >
            <svg width="64" height="64" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4">
              <rect x="20" y="25" width="60" height="50" rx="8" fill="color-mix(in srgb, var(--color-primary) 10%, transparent)" />
              <rect x="30" y="35" width="40" height="5" rx="2" fill="var(--color-muted)" />
              <rect x="30" y="45" width="30" height="5" rx="2" fill="var(--color-muted)" />
              <rect x="30" y="55" width="35" height="5" rx="2" fill="var(--color-muted)" />
            </svg>
            <h3 style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-foreground)', marginBottom: 8 }}>{t.vpc_no_data_title}</h3>
            <p style={{ fontSize: 12, color: 'var(--color-foreground-muted)', marginBottom: 20, lineHeight: '1.6' }}>
              {t.vpc_no_data_desc}
            </p>
            <Link
              href={`/project/${project.id}/opportunity/${opportunity.id}/twins/interview`}
              className="inline-flex items-center gap-2 py-2.5 px-5 text-sm font-medium transition-colors"
              style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)', borderRadius: 10, textDecoration: 'none' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
            >
              {t.vpc_go_interviews}
            </Link>
          </div>
        ) : (
          <div className="space-y-6 max-w-5xl">

            {/* ── Section 1: Per-twin VPC cards ────────────────────────────── */}
            <div>
              <h2 style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-foreground-muted)', marginBottom: 12, fontFamily: 'inherit' }}>
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
                    <div key={twin.id} className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)' }}>
                      {/* Twin header */}
                      <div className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: '0.5px solid var(--color-border)' }}>
                        <div
                          className={`w-8 h-8 rounded-xl ${avatarColor} flex items-center justify-center text-sm font-bold flex-shrink-0`}
                        >
                          {getInitials(twin.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-foreground)' }}>{twin.name}</p>
                            <span style={{ fontSize: 12, color: 'var(--color-foreground-muted)' }}>{twin.role}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[10px] font-medium uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)', color: 'var(--color-primary)' }}>
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
                        <p style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--color-foreground-faint)', padding: '16px 20px' }}>
                          No interview data — complete this twin&apos;s interview first.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2" style={{ borderTop: '0.5px solid var(--color-border)' }}>
                          {/* LEFT: Value Map ─────────────────────────────── */}
                          <div className="p-4" style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)', borderRight: '0.5px solid var(--color-border)' }}>
                            <div className="flex items-center justify-between mb-3">
                              <p style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-primary)' }}>
                                Value Map
                              </p>
                              <button
                                onClick={() => generateTwinVM(ivId, twin)}
                                disabled={isGenerating}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors disabled:opacity-60"
                                style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
                                onMouseEnter={(e) => !isGenerating && (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
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
                                <Loader2 size={13} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
                                <span style={{ fontSize: 12, color: 'var(--color-foreground-muted)' }}>Generating…</span>
                              </div>
                            )}

                            {!vm && !isGenerating && (
                              <p style={{ fontSize: 10, fontStyle: 'italic', color: 'var(--color-foreground-faint)' }}>
                                Click &ldquo;Generate&rdquo; to create the value map from this twin&apos;s profile.
                              </p>
                            )}

                            {vmError[ivId] && (
                              <div style={{ marginTop: 6, padding: '8px 12px', borderRadius: 8, backgroundColor: '#FEF2F2', border: '0.5px solid #FECACA' }}>
                                <p style={{ fontSize: 11, color: '#DC2626', fontWeight: 500 }}>
                                  Generation failed after 2 attempts.
                                </p>
                                <p style={{ fontSize: 10, color: '#DC2626', marginTop: 2, opacity: 0.8 }}>
                                  Check that the opportunity has a description and retry. Details in browser console.
                                </p>
                              </div>
                            )}

                            {vm && (
                              <>
                                <VPCSubCol
                                  title="Products & Services"
                                  items={vm.productsAndServices}
                                  pillClass={PRODUCT_CLASS}
                                  emptyText={t.vpc_none_yet}
                                  onAdd={(text) => addVMItem(ivId, 'productsAndServices', text)}
                                  onAddAll={() => addSectionToFinalVPC('productsAndServices', vm.productsAndServices, twinIdx)}
                                  renderPill={(text, i) => (
                                    <TwinPill
                                      key={i}
                                      text={text}
                                      pillClass={PRODUCT_CLASS}
                                      dotColor={twinColor}
                                      onAddToFinal={() => addToFinalVPC('productsAndServices', text, twinIdx)}
                                      onRemove={() => removeVMItem(ivId, 'productsAndServices', i)}
                                    />
                                  )}
                                />
                                <VPCSubCol
                                  title="Pain Relievers"
                                  items={vm.painRelievers}
                                  pillClass={RELIEVER_CLASS}
                                  emptyText={t.vpc_none_yet}
                                  onAdd={(text) => addVMItem(ivId, 'painRelievers', text)}
                                  onAddAll={() => addSectionToFinalVPC('painRelievers', vm.painRelievers, twinIdx)}
                                  renderPill={(text, i) => (
                                    <TwinPill
                                      key={i}
                                      text={text}
                                      pillClass={RELIEVER_CLASS}
                                      dotColor={twinColor}
                                      onAddToFinal={() => addToFinalVPC('painRelievers', text, twinIdx)}
                                      onRemove={() => removeVMItem(ivId, 'painRelievers', i)}
                                    />
                                  )}
                                />
                                <VPCSubCol
                                  title="Gain Creators"
                                  items={vm.gainCreators}
                                  pillClass={CREATOR_CLASS}
                                  emptyText={t.vpc_none_yet}
                                  onAdd={(text) => addVMItem(ivId, 'gainCreators', text)}
                                  onAddAll={() => addSectionToFinalVPC('gainCreators', vm.gainCreators, twinIdx)}
                                  renderPill={(text, i) => (
                                    <TwinPill
                                      key={i}
                                      text={text}
                                      pillClass={CREATOR_CLASS}
                                      dotColor={twinColor}
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
                            <p style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-foreground-muted)', marginBottom: 12 }}>
                              Customer Profile
                            </p>
                            <VPCSubCol
                              title="Jobs to be Done"
                              items={profile?.jobs ?? []}
                              pillClass={JOB_CLASS}
                              emptyText={t.vpc_no_jobs}
                              onAdd={(text) => addProfileItem(ivId, 'jobs', text)}
                              onAddAll={() => addSectionToFinalVPC('jobs', profile?.jobs ?? [], twinIdx)}
                              renderPill={(text, i) => (
                                <TwinPill
                                  key={i}
                                  text={text}
                                  pillClass={JOB_CLASS}
                                  dotColor={twinColor}
                                  onAddToFinal={() => addToFinalVPC('jobs', text, twinIdx)}
                                  onRemove={() => removeProfileItem(ivId, 'jobs', i)}
                                />
                              )}
                            />
                            <VPCSubCol
                              title="Pains"
                              items={profile?.pains ?? []}
                              pillClass={PAIN_CLASS}
                              emptyText={t.vpc_no_pains}
                              onAdd={(text) => addProfileItem(ivId, 'pains', text)}
                              onAddAll={() => addSectionToFinalVPC('pains', profile?.pains ?? [], twinIdx)}
                              renderPill={(text, i) => (
                                <TwinPill
                                  key={i}
                                  text={text}
                                  pillClass={PAIN_CLASS}
                                  dotColor={twinColor}
                                  onAddToFinal={() => addToFinalVPC('pains', text, twinIdx)}
                                  onRemove={() => removeProfileItem(ivId, 'pains', i)}
                                />
                              )}
                            />
                            <VPCSubCol
                              title="Gains"
                              items={profile?.gains ?? []}
                              pillClass={GAIN_CLASS}
                              emptyText={t.vpc_no_gains}
                              onAdd={(text) => addProfileItem(ivId, 'gains', text)}
                              onAddAll={() => addSectionToFinalVPC('gains', profile?.gains ?? [], twinIdx)}
                              renderPill={(text, i) => (
                                <TwinPill
                                  key={i}
                                  text={text}
                                  pillClass={GAIN_CLASS}
                                  dotColor={twinColor}
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
              <div className="flex items-center justify-between mb-1">
                <h2 style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-foreground-muted)', fontFamily: 'inherit' }}>
                  {t.vpc_your_final}
                </h2>
                {hasFinalData && (
                  <button
                    onClick={downloadVPC}
                    className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '0.5px solid var(--color-border)',
                      color: 'var(--color-foreground)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-muted)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                  >
                    <Download size={11} />
                    {t.vpc_download}
                  </button>
                )}
              </div>
              <p style={{ fontSize: 10, color: 'var(--color-foreground-faint)', marginBottom: 12 }}>
                Click the <Plus size={8} className="inline" /> on any per-twin pill to curate it here.
              </p>

              {/* Legend */}
              {twins.length > 0 && (
                <div className="flex flex-wrap gap-3 mb-4">
                  {twins.map((twin, i) => (
                    <span key={twin.id} className="flex items-center gap-1.5" style={{ fontSize: 10, color: 'var(--color-foreground-muted)' }}>
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: TWIN_COLORS_HEX[i % TWIN_COLORS_HEX.length] }}
                      />
                      {twin.name}
                    </span>
                  ))}
                  <span className="flex items-center gap-1.5" style={{ fontSize: 10, color: 'var(--color-foreground-faint)' }}>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--color-warm)' }} />
                    {t.vpc_legend_custom}
                  </span>
                </div>
              )}

              <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)' }}>
                {!hasFinalData && (
                  <div className="px-5 py-4" style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--color-foreground-faint)' }}>
                    {t.vpc_empty_canvas}
                  </div>
                )}
                <div className="grid grid-cols-2" style={{ borderTop: hasFinalData ? undefined : '0.5px solid var(--color-border)' }}>
                  {/* LEFT: Value Map */}
                  <div className="p-4" style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)', borderRight: '0.5px solid var(--color-border)' }}>
                    <p style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-primary)', marginBottom: 12 }}>
                      Value Map
                    </p>
                    <FinalSubCol
                      title="Products & Services"
                      items={finalVPC.productsAndServices}
                      pillClass={PRODUCT_CLASS}
                      emptyText={t.vpc_none_added}
                      onAdd={(text) => addCustomToFinalVPC('productsAndServices', text)}
                      onRemove={(i) => removeFromFinalVPC('productsAndServices', i)}
                    />
                    <FinalSubCol
                      title="Pain Relievers"
                      items={finalVPC.painRelievers}
                      pillClass={RELIEVER_CLASS}
                      emptyText={t.vpc_none_added}
                      onAdd={(text) => addCustomToFinalVPC('painRelievers', text)}
                      onRemove={(i) => removeFromFinalVPC('painRelievers', i)}
                    />
                    <FinalSubCol
                      title="Gain Creators"
                      items={finalVPC.gainCreators}
                      pillClass={CREATOR_CLASS}
                      emptyText={t.vpc_none_added}
                      onAdd={(text) => addCustomToFinalVPC('gainCreators', text)}
                      onRemove={(i) => removeFromFinalVPC('gainCreators', i)}
                    />
                  </div>

                  {/* RIGHT: Customer Profile */}
                  <div className="p-4">
                    <p style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-foreground-muted)', marginBottom: 12 }}>
                      Customer Profile
                    </p>
                    <FinalSubCol
                      title="Jobs to be Done"
                      items={finalVPC.jobs}
                      pillClass={JOB_CLASS}
                      emptyText={t.vpc_none_added}
                      onAdd={(text) => addCustomToFinalVPC('jobs', text)}
                      onRemove={(i) => removeFromFinalVPC('jobs', i)}
                    />
                    <FinalSubCol
                      title="Pains"
                      items={finalVPC.pains}
                      pillClass={PAIN_CLASS}
                      emptyText={t.vpc_none_added}
                      onAdd={(text) => addCustomToFinalVPC('pains', text)}
                      onRemove={(i) => removeFromFinalVPC('pains', i)}
                    />
                    <FinalSubCol
                      title="Gains"
                      items={finalVPC.gains}
                      pillClass={GAIN_CLASS}
                      emptyText={t.vpc_none_added}
                      onAdd={(text) => addCustomToFinalVPC('gains', text)}
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
                className="flex items-center gap-2 py-2.5 px-5 text-sm font-medium transition-colors"
                style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)', borderRadius: 10, textDecoration: 'none' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
              >
                {t.vpc_continue_bmc}
              </Link>
            </div>

          </div>
        )}
      </motion.div>
    </div>
  )
}
