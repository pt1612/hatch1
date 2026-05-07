'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import BackButton from '@/components/BackButton'
import {
  Plus, X, Loader2, Sparkles, Download,
  Handshake, Zap, Package, Gift, Heart, Users, Truck, Tag, DollarSign,
} from 'lucide-react'
import { TWIN_COLORS_HEX } from '@/lib/constants'
import type { Opportunity } from '@/lib/types'

// ─── Types ──────────────────────────────────────────────────────────────────────

type BlockKey =
  | 'value_propositions'
  | 'customer_segments'
  | 'customer_relationships'
  | 'channels'
  | 'key_activities'
  | 'key_resources'
  | 'key_partners'
  | 'revenue_streams'
  | 'cost_structure'

type BMCData = Record<BlockKey, string[]>

type FinalVPCItem = { text: string; twinIdx: number }
type FinalVPC = {
  productsAndServices?: (string | FinalVPCItem)[]
  painRelievers?:       (string | FinalVPCItem)[]
  gainCreators?:        (string | FinalVPCItem)[]
  jobs?:                (string | FinalVPCItem)[]
  pains?:               (string | FinalVPCItem)[]
  gains?:               (string | FinalVPCItem)[]
}

type AggAttribution = Partial<Record<BlockKey, Record<string, number[]>>>

type Ability = { id: string; name: string; description: string }


type TwinInterviewData = {
  id: string | null
  twinDbId: string
  twinName: string
  twinSegment: string
  twinIdx: number
  valueMap: Record<string, unknown> | null
  bmcData: Record<string, unknown> | null
}

type BMCRow = BMCData & { id: string; agg_attribution?: AggAttribution }

// ─── Block static config ────────────────────────────────────────────────────────

const BLOCK_CONFIG: Record<
  BlockKey,
  { title: string; subtitle: string; icon: React.ReactNode; pillClass: string }
> = {
  value_propositions: {
    title: 'Value Propositions',
    subtitle: 'What value do we deliver to the customer?',
    icon: <Gift size={13} />,
    pillClass: 'bg-[rgba(199,123,58,0.10)] text-[#7A4A20] border border-[rgba(199,123,58,0.2)]',
  },
  customer_segments: {
    title: 'Customer Segments',
    subtitle: 'For whom are we creating value?',
    icon: <Users size={13} />,
    pillClass: 'bg-[rgba(199,123,58,0.10)] text-[#7A4A20] border border-[rgba(199,123,58,0.2)]',
  },
  customer_relationships: {
    title: 'Customer Relationships',
    subtitle: 'What relationship does each segment expect?',
    icon: <Heart size={13} />,
    pillClass: 'bg-[#E8E5DC] text-[#1A1A18] border border-[#E5E3DC]',
  },
  channels: {
    title: 'Channels',
    subtitle: 'How do we reach our customer segments?',
    icon: <Truck size={13} />,
    pillClass: 'bg-[#E8E5DC] text-[#1A1A18] border border-[#E5E3DC]',
  },
  key_activities: {
    title: 'Key Activities',
    subtitle: 'What key activities does our value proposition require?',
    icon: <Zap size={13} />,
    pillClass: 'bg-[rgba(180,168,136,0.15)] text-[#1A1A18] border border-[rgba(180,168,136,0.25)]',
  },
  key_resources: {
    title: 'Key Resources',
    subtitle: 'What key resources does our value proposition require?',
    icon: <Package size={13} />,
    pillClass: 'bg-[rgba(180,168,136,0.15)] text-[#1A1A18] border border-[rgba(180,168,136,0.25)]',
  },
  key_partners: {
    title: 'Key Partners',
    subtitle: 'Who are our key partners and suppliers?',
    icon: <Handshake size={13} />,
    pillClass: 'bg-[rgba(180,168,136,0.15)] text-[#1A1A18] border border-[rgba(180,168,136,0.25)]',
  },
  revenue_streams: {
    title: 'Revenue Streams',
    subtitle: 'For what value are customers willing to pay?',
    icon: <DollarSign size={13} />,
    pillClass: 'bg-[rgba(76,175,125,0.10)] text-[#2D7A57] border border-[rgba(76,175,125,0.2)]',
  },
  cost_structure: {
    title: 'Cost Structure',
    subtitle: 'What are the most important costs in our model?',
    icon: <Tag size={13} />,
    pillClass: 'bg-[#E8E5DC] text-[#888880] border border-[#E5E3DC]',
  },
}

const GENERATION_ORDER: BlockKey[] = [
  'customer_relationships',
  'channels',
  'key_activities',
  'key_resources',
  'key_partners',
  'revenue_streams',
  'cost_structure',
]

const PRE_FILLED = new Set<BlockKey>(['value_propositions', 'customer_segments'])

const GRID_PLACEMENT: Record<BlockKey, React.CSSProperties> = {
  key_partners:           { gridRow: '1 / 3', gridColumn: '1 / 2' },
  key_activities:         { gridRow: '1 / 2', gridColumn: '2 / 3' },
  value_propositions:     { gridRow: '1 / 3', gridColumn: '3 / 4' },
  customer_relationships: { gridRow: '1 / 2', gridColumn: '4 / 5' },
  customer_segments:      { gridRow: '1 / 3', gridColumn: '5 / 6' },
  key_resources:          { gridRow: '2 / 3', gridColumn: '2 / 3' },
  channels:               { gridRow: '2 / 3', gridColumn: '4 / 5' },
  cost_structure:         { gridRow: '3 / 4', gridColumn: '1 / 3' },
  revenue_streams:        { gridRow: '3 / 4', gridColumn: '3 / 6' },
}

const GRID_BORDERS: Record<BlockKey, string> = {
  key_partners:           'border-r border-b border-[var(--color-border)]',
  key_activities:         'border-r border-b border-[var(--color-border)]',
  value_propositions:     'border-r border-b border-[var(--color-border)]',
  customer_relationships: 'border-r border-b border-[var(--color-border)]',
  customer_segments:      'border-b border-[var(--color-border)]',
  key_resources:          'border-r border-b border-[var(--color-border)]',
  channels:               'border-r border-b border-[var(--color-border)]',
  cost_structure:         'border-r border-[var(--color-border)]',
  revenue_streams:        '',
}

const MOBILE_ORDER: BlockKey[] = [
  'value_propositions',
  'customer_segments',
  'customer_relationships',
  'channels',
  'key_activities',
  'key_resources',
  'key_partners',
  'revenue_streams',
  'cost_structure',
]

// ─── Helpers ────────────────────────────────────────────────────────────────────

function toText(item: string | FinalVPCItem): string {
  return typeof item === 'string' ? item : item.text
}

function extractTexts(arr: (string | FinalVPCItem)[] | undefined): string[] {
  return (arr ?? []).map(toText).filter(Boolean)
}

/** Derive value propositions exclusively from the aggregate VPC (left-side items) */
function deriveValuePropositions(vpcValueMap: FinalVPC | null): string[] {
  if (!vpcValueMap) return []
  return [
    ...new Set([
      ...extractTexts(vpcValueMap.productsAndServices).slice(0, 2),
      ...extractTexts(vpcValueMap.painRelievers).slice(0, 1),
      ...extractTexts(vpcValueMap.gainCreators).slice(0, 1),
    ]),
  ]
}

/** Extract FinalVPCItem array from a FinalVPC section for AI attribution context */
function extractVPCSection(arr: (string | FinalVPCItem)[] | undefined): { text: string; twinIdx: number }[] {
  return (arr ?? []).map((item) =>
    typeof item === 'string' ? { text: item, twinIdx: -1 } : item
  )
}

/** Init aggregated BMC data from existing row or fresh */
function initAggData(
  existingBMC: BMCRow | null,
  vpcValueMap: FinalVPC | null,
  twinSegments: string[]
): BMCData {
  const vp = deriveValuePropositions(vpcValueMap)
  const cs = twinSegments
  if (existingBMC) {
    return {
      value_propositions:     (existingBMC.value_propositions?.length ?? 0) > 0 ? existingBMC.value_propositions : vp,
      customer_segments:      (existingBMC.customer_segments?.length ?? 0) > 0  ? existingBMC.customer_segments  : cs,
      customer_relationships: existingBMC.customer_relationships ?? [],
      channels:               existingBMC.channels ?? [],
      key_activities:         existingBMC.key_activities ?? [],
      key_resources:          existingBMC.key_resources ?? [],
      key_partners:           existingBMC.key_partners ?? [],
      revenue_streams:        existingBMC.revenue_streams ?? [],
      cost_structure:         existingBMC.cost_structure ?? [],
    }
  }
  return {
    value_propositions: vp, customer_segments: cs,
    customer_relationships: [], channels: [], key_activities: [],
    key_resources: [], key_partners: [], revenue_streams: [], cost_structure: [],
  }
}

/** Init per-twin BMC data from saved bmc_data or prefill from value_map + segment */
function initTwinBmcData(iv: TwinInterviewData): BMCData {
  // bmc_data DB default is '{}' — treat empty objects the same as null
  const rawBmc = iv.bmcData as Partial<BMCData> | null | undefined
  const hasSavedData =
    rawBmc &&
    Object.keys(rawBmc).length > 0 &&
    Object.values(rawBmc).some((v) => Array.isArray(v) && v.length > 0)

  if (hasSavedData && rawBmc) {
    return {
      value_propositions:     rawBmc.value_propositions     ?? prefillTwinVP(iv),
      customer_segments:      rawBmc.customer_segments      ?? (iv.twinSegment ? [iv.twinSegment] : []),
      customer_relationships: rawBmc.customer_relationships ?? [],
      channels:               rawBmc.channels               ?? [],
      key_activities:         rawBmc.key_activities         ?? [],
      key_resources:          rawBmc.key_resources          ?? [],
      key_partners:           rawBmc.key_partners           ?? [],
      revenue_streams:        rawBmc.revenue_streams        ?? [],
      cost_structure:         rawBmc.cost_structure         ?? [],
    }
  }
  return {
    value_propositions:     prefillTwinVP(iv),
    customer_segments:      iv.twinSegment ? [iv.twinSegment] : [],
    customer_relationships: [], channels: [], key_activities: [],
    key_resources: [], key_partners: [], revenue_streams: [], cost_structure: [],
  }
}

function prefillTwinVP(iv: TwinInterviewData): string[] {
  if (!iv.valueMap) return []
  const vm = iv.valueMap as { productsAndServices?: unknown; painRelievers?: unknown; gainCreators?: unknown }
  return [
    ...(Array.isArray(vm.productsAndServices) ? vm.productsAndServices as string[] : []),
    ...(Array.isArray(vm.painRelievers)        ? vm.painRelievers        as string[] : []),
    ...(Array.isArray(vm.gainCreators)         ? vm.gainCreators         as string[] : []),
  ].filter(Boolean)
}

// ─── BMCBlock ───────────────────────────────────────────────────────────────────

function BMCBlock({
  blockKey,
  items,
  isUnlocked,
  isGenerating,
  onGenerate,
  onAdd,
  onRemove,
  style,
  borderClass = '',
  getTwinDots,
}: {
  blockKey: BlockKey
  items: string[]
  isUnlocked: boolean
  isGenerating: boolean
  onGenerate: () => void
  onAdd: (text: string) => void
  onRemove: (index: number) => void
  style?: React.CSSProperties
  borderClass?: string
  getTwinDots?: (text: string) => string[]
}) {
  const [adding, setAdding] = useState(false)
  const [inputVal, setInputVal] = useState('')

  const config = BLOCK_CONFIG[blockKey]
  const isPreFilled = PRE_FILLED.has(blockKey)
  const hasItems = items.length > 0

  function submit() {
    const t = inputVal.trim()
    if (!t) return
    onAdd(t)
    setInputVal('')
    setAdding(false)
  }

  return (
    <div className={`flex flex-col overflow-hidden ${borderClass}`} style={{ backgroundColor: '#FFFFFF', ...style }}>
      {/* Header */}
      <div className="flex items-center gap-1.5 px-3 py-2.5 flex-shrink-0" style={{ borderBottom: '0.5px solid var(--color-border)' }}>
        <span style={{ color: 'var(--color-amber)' }} className="flex-shrink-0">{config.icon}</span>
        <span className="text-[11px] font-semibold leading-tight flex-1" style={{ color: 'var(--color-ink)' }}>{config.title}</span>
        <button
          onClick={() => setAdding((v) => !v)}
          className="w-5 h-5 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
          style={{ backgroundColor: 'var(--color-linen)' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-border)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-linen)')}
          title="Add item"
        >
          <Plus size={9} style={{ color: 'var(--color-text-muted)' }} />
        </button>
      </div>

      <p className="text-[9px] italic px-3 pt-1.5 pb-1 leading-tight flex-shrink-0" style={{ color: 'var(--color-text-faint)' }}>
        {config.subtitle}
      </p>

      <div className="flex-1 overflow-y-auto px-3 pb-2.5 min-h-0 scrollbar-thin">
        {isPreFilled && !hasItems && (
          <p className="text-[9px] italic mt-1" style={{ color: 'var(--color-text-faint)' }}>
            Complete the VPC Canvas first to pre-fill this section.
          </p>
        )}

        {!isPreFilled && !hasItems && (
          <div className="mt-1.5">
            {isGenerating ? (
              <div className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                <Loader2 size={11} className="animate-spin" style={{ color: 'var(--color-amber)' }} />
                Generating…
              </div>
            ) : (
              <>
                <button
                  onClick={onGenerate}
                  disabled={!isUnlocked}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ backgroundColor: 'var(--color-amber)', color: '#FFFFFF' }}
                  onMouseEnter={(e) => isUnlocked && (e.currentTarget.style.backgroundColor = '#A8612A')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-amber)')}
                >
                  <Sparkles size={9} />
                  Generate ✨
                </button>
                {!isUnlocked && (
                  <p className="text-[9px] italic mt-1.5" style={{ color: 'var(--color-text-faint)' }}>Complete the previous block first.</p>
                )}
              </>
            )}
          </div>
        )}

        {hasItems && (
          <>
            <div className="flex flex-wrap gap-1 mt-1">
              {items.map((item, i) => {
                const dots = getTwinDots?.(item) ?? []
                return (
                  <span
                    key={i}
                    title={item}
                    className={`inline-flex items-start gap-1 text-[10px] font-medium px-2 py-0.5 rounded-lg whitespace-normal break-words max-w-full ${config.pillClass}`}
                  >
                    {dots.map((color, di) => (
                      <span
                        key={di}
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: color }}
                        title={`Twin ${di + 1}`}
                      />
                    ))}
                    <span className="flex-1 min-w-0">{item}</span>
                    <button
                      onClick={() => onRemove(i)}
                      className="opacity-40 hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5"
                    >
                      <X size={8} />
                    </button>
                  </span>
                )
              })}
            </div>
            {!isPreFilled && (
              <button
                onClick={onGenerate}
                disabled={isGenerating}
                className="flex items-center gap-1 text-[9px] transition-colors mt-2"
                style={{ color: 'var(--color-text-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-ink)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
              >
                {isGenerating ? <Loader2 size={9} className="animate-spin" /> : <Sparkles size={9} />}
                Regenerate
              </button>
            )}
          </>
        )}

        {adding && (
          <div className="flex items-center gap-1 mt-2">
            <input
              autoFocus
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit()
                if (e.key === 'Escape') { setAdding(false); setInputVal('') }
              }}
              placeholder="Add item…"
              className="flex-1 text-[10px] px-2 py-1 rounded-lg outline-none min-w-0"
              style={{ border: '0.5px solid var(--color-border)', backgroundColor: 'var(--color-linen)' }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--color-amber)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
            />
            <button
              onClick={submit}
              className="text-[10px] px-2 py-1 rounded-lg transition-colors flex-shrink-0"
              style={{ backgroundColor: 'var(--color-amber)', color: '#FFFFFF' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#A8612A')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-amber)')}
            >
              Add
            </button>
            <button onClick={() => { setAdding(false); setInputVal('') }} className="flex-shrink-0">
              <X size={10} style={{ color: 'var(--color-text-faint)' }} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── BMC Grid ───────────────────────────────────────────────────────────────────

function BMCGrid({
  data,
  isUnlocked,
  generating,
  onGenerate,
  onAdd,
  onRemove,
  getTwinDots,
}: {
  data: BMCData
  isUnlocked: (block: BlockKey) => boolean
  generating: Partial<Record<BlockKey, boolean>>
  onGenerate: (block: BlockKey) => void
  onAdd: (block: BlockKey, text: string) => void
  onRemove: (block: BlockKey, index: number) => void
  getTwinDots?: (block: BlockKey, text: string) => string[]
}) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:block">
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            border: '0.5px solid var(--color-border)',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1.3fr 1fr 1fr',
            gridTemplateRows: 'minmax(200px, 1fr) minmax(170px, 1fr) minmax(140px, auto)',
          }}
        >
          {(Object.keys(GRID_PLACEMENT) as BlockKey[]).map((key) => (
            <BMCBlock
              key={key}
              blockKey={key}
              items={data[key]}
              isUnlocked={isUnlocked(key)}
              isGenerating={!!generating[key]}
              onGenerate={() => onGenerate(key)}
              onAdd={(t) => onAdd(key, t)}
              onRemove={(i) => onRemove(key, i)}
              style={GRID_PLACEMENT[key]}
              borderClass={GRID_BORDERS[key]}
              getTwinDots={getTwinDots ? (text) => getTwinDots(key, text) : undefined}
            />
          ))}
        </div>
      </div>
      {/* Mobile */}
      <div className="lg:hidden space-y-3">
        {MOBILE_ORDER.map((key) => (
          <div key={key} className="rounded-2xl overflow-hidden" style={{ border: '0.5px solid var(--color-border)', backgroundColor: '#FFFFFF', minHeight: '140px' }}>
            <BMCBlock
              blockKey={key}
              items={data[key]}
              isUnlocked={isUnlocked(key)}
              isGenerating={!!generating[key]}
              onGenerate={() => onGenerate(key)}
              onAdd={(t) => onAdd(key, t)}
              onRemove={(i) => onRemove(key, i)}
              getTwinDots={getTwinDots ? (text) => getTwinDots(key, text) : undefined}
            />
          </div>
        ))}
      </div>
    </>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────────

export default function BMCClient({
  project,
  opportunity,
  abilities,
  twinInterviews,
  vpcValueMap,
  twinSegments,
  existingBMC,
}: {
  project: { id: string; title: string }
  opportunity: Pick<Opportunity, 'id' | 'name' | 'description' | 'customer_segment'>
  abilities: Ability[]
  twinInterviews: TwinInterviewData[]
  vpcValueMap: unknown
  twinSegments: string[]
  existingBMC: BMCRow | null
}) {
  const supabase = createClient()
  const finalVPC = (vpcValueMap as FinalVPC | null) ?? null

  // tabIndex: 0..n-1 = per-twin, n = aggregated
  const [activeTab, setActiveTab] = useState<number>(twinInterviews.length) // default: Aggregated

  // ── Per-twin BMC state (array indexed by twinInterviews order) ─────────────
  const [perTwinBmc, setPerTwinBmc] = useState<BMCData[]>(() =>
    twinInterviews.map((iv) => initTwinBmcData(iv))
  )
  const [twinGenerating, setTwinGenerating] = useState<Partial<Record<string, boolean>>[]>(
    () => twinInterviews.map(() => ({}))
  )

  // ── Aggregated BMC state ───────────────────────────────────────────────────
  const [aggData, setAggData] = useState<BMCData>(() =>
    initAggData(existingBMC, finalVPC, twinSegments)
  )
  const [bmcId, setBmcId] = useState<string | null>(existingBMC?.id ?? null)
  const [aggGenerating, setAggGenerating] = useState<Partial<Record<BlockKey, boolean>>>({})
  const [aggAttribution, setAggAttribution] = useState<AggAttribution>(() =>
    (existingBMC?.agg_attribution as AggAttribution | null | undefined) ?? {}
  )
  const [exporting, setExporting] = useState(false)

  // ── Unlock logic ─────────────────────────────────────────────────────────────
  function isUnlocked(data: BMCData, block: BlockKey): boolean {
    const idx = GENERATION_ORDER.indexOf(block)
    if (idx <= 0) return true
    return (data[GENERATION_ORDER[idx - 1]]?.length ?? 0) > 0
  }

  // ── Twin-dot lookup (aggregated tab) — reads stored AI attribution ─────────
  function getTwinDotsForItem(block: BlockKey, text: string): string[] {
    const blockAttr = aggAttribution[block]
    return (blockAttr?.[text] ?? []).map((idx) => TWIN_COLORS_HEX[idx % TWIN_COLORS_HEX.length])
  }

  // ── DB save: aggregated ───────────────────────────────────────────────────────
  async function saveAgg(newData: BMCData, newAttribution?: AggAttribution) {
    try {
      const extra = newAttribution !== undefined ? { agg_attribution: newAttribution } : {}
      if (bmcId) {
        await supabase
          .from('business_model_canvases')
          .update({ ...newData, ...extra, updated_at: new Date().toISOString() })
          .eq('id', bmcId)
      } else {
        const { data: row } = await supabase
          .from('business_model_canvases')
          .insert({ opportunity_id: opportunity.id, ...newData, ...extra })
          .select('id')
          .single()
        if (row?.id) setBmcId(row.id)
      }
    } catch { /* silent */ }
  }

  // ── DB save: per-twin ────────────────────────────────────────────────────────
  async function saveTwinBmc(twinTabIdx: number, newData: BMCData) {
    const iv = twinInterviews[twinTabIdx]
    if (!iv?.id) return
    try {
      await supabase.from('twin_interviews').update({ bmc_data: newData }).eq('id', iv.id)
    } catch { /* silent */ }
  }

  // ── Mutations: aggregated ────────────────────────────────────────────────────
  function addAggItem(block: BlockKey, text: string) {
    setAggData((prev) => {
      const updated = { ...prev, [block]: [...prev[block], text] }
      saveAgg(updated)
      return updated
    })
  }
  function removeAggItem(block: BlockKey, index: number) {
    setAggData((prev) => {
      const updated = { ...prev, [block]: prev[block].filter((_, i) => i !== index) }
      saveAgg(updated)
      return updated
    })
  }

  // ── Mutations: per-twin ──────────────────────────────────────────────────────
  function addTwinItem(tabIdx: number, block: BlockKey, text: string) {
    setPerTwinBmc((prev) => {
      const updated = prev.map((d, i) => {
        if (i !== tabIdx) return d
        const next = { ...d, [block]: [...d[block], text] }
        saveTwinBmc(tabIdx, next)
        return next
      })
      return updated
    })
  }
  function removeTwinItem(tabIdx: number, block: BlockKey, index: number) {
    setPerTwinBmc((prev) => {
      const updated = prev.map((d, i) => {
        if (i !== tabIdx) return d
        const next = { ...d, [block]: d[block].filter((_, j) => j !== index) }
        saveTwinBmc(tabIdx, next)
        return next
      })
      return updated
    })
  }

  // ── AI generation ─────────────────────────────────────────────────────────────
  async function generateBlockForTab(tabIdx: number, block: BlockKey, data: BMCData) {
    const isAgg = tabIdx === twinInterviews.length
    const iv = !isAgg ? twinInterviews[tabIdx] : null

    if (isAgg) setAggGenerating((prev) => ({ ...prev, [block]: true }))
    else {
      setTwinGenerating((prev) => {
        const updated = [...prev]
        updated[tabIdx] = { ...updated[tabIdx], [block]: true }
        return updated
      })
    }

    try {
      // Build VPC attribution context for aggregate generation
      const vpcWithAttribution = isAgg && finalVPC
        ? {
            productsAndServices: extractVPCSection(finalVPC.productsAndServices),
            painRelievers:       extractVPCSection(finalVPC.painRelievers),
            gainCreators:        extractVPCSection(finalVPC.gainCreators),
            jobs:                extractVPCSection(finalVPC.jobs),
            pains:               extractVPCSection(finalVPC.pains),
            gains:               extractVPCSection(finalVPC.gains),
          }
        : undefined

      const res = await fetch('/api/generate-bmc-block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          block,
          opportunityName: opportunity.name,
          opportunityDescription: opportunity.description,
          abilities,
          ...(iv ? { twinSegment: iv.twinSegment } : {}),
          ...(isAgg ? { isAggregate: true, vpcWithAttribution } : {}),
          existingBlocks: {
            value_propositions:     data.value_propositions,
            customer_segments:      data.customer_segments,
            customer_relationships: data.customer_relationships,
            channels:               data.channels,
            key_activities:         data.key_activities,
            key_resources:          data.key_resources,
            key_partners:           data.key_partners,
            revenue_streams:        data.revenue_streams,
          },
        }),
      })
      const json = await res.json()
      const items: string[] = json.items

      if (isAgg) {
        // Build attribution map for this block
        const blockAttr: Record<string, number[]> = {}
        for (const a of (json.attribution ?? []) as { text: string; source_twins: number[] }[]) {
          blockAttr[a.text] = a.source_twins
        }
        setAggAttribution((prev) => ({ ...prev, [block]: blockAttr }))
        setAggData((prev) => {
          const updated = { ...prev, [block]: items }
          saveAgg(updated, { ...aggAttribution, [block]: blockAttr })
          return updated
        })
      } else {
        setPerTwinBmc((prev) => {
          const updated = prev.map((d, i) => {
            if (i !== tabIdx) return d
            const next = { ...d, [block]: items }
            saveTwinBmc(tabIdx, next)
            return next
          })
          return updated
        })
      }
    } catch { /* silent */ } finally {
      if (isAgg) setAggGenerating((prev) => ({ ...prev, [block]: false }))
      else {
        setTwinGenerating((prev) => {
          const updated = [...prev]
          updated[tabIdx] = { ...updated[tabIdx], [block]: false }
          return updated
        })
      }
    }
  }

  // ── PDF export ────────────────────────────────────────────────────────────────
  async function downloadPDF() {
    const data = activeTab === twinInterviews.length ? aggData : perTwinBmc[activeTab]
    setExporting(true)
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const W = 297, H = 210, MX = 8
      const CW = (W - 2 * MX) / 5
      const GX = MX, GY = 22
      const R1H = 58, R2H = 52, R3H = 48
      const TEAL: [number, number, number] = [199, 123, 58]
      const BORDER: [number, number, number] = [210, 210, 210]

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(...TEAL)
      doc.text('Business Model Canvas', MX, 12)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(90, 90, 90)
      const tabLabel = activeTab < twinInterviews.length
        ? ` — ${twinInterviews[activeTab].twinName}`
        : ' — Aggregated'
      doc.text(`${opportunity.name}${tabLabel}`, MX + 58, 12)

      function drawBlock(x: number, y: number, w: number, h: number, title: string, items: string[]) {
        doc.setFillColor(255, 255, 255)
        doc.rect(x, y, w, h, 'F')
        doc.setFillColor(...TEAL)
        doc.rect(x, y, w, 7, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(6.5)
        doc.setTextColor(255, 255, 255)
        doc.text(title.toUpperCase(), x + 2.5, y + 4.8)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6.2)
        doc.setTextColor(50, 50, 50)
        let iy = y + 11.5
        const maxY = y + h - 3
        for (const item of items) {
          if (iy >= maxY) break
          const lines: string[] = doc.splitTextToSize(`• ${item}`, w - 5)
          for (const line of lines) {
            if (iy >= maxY) break
            doc.text(line, x + 2.5, iy)
            iy += 3.6
          }
          iy += 0.6
        }
        doc.setDrawColor(...BORDER)
        doc.setLineWidth(0.3)
        doc.rect(x, y, w, h)
      }

      const xs = [GX, GX + CW, GX + CW * 2, GX + CW * 3, GX + CW * 4]
      const y1 = GY, y2 = GY + R1H, y3 = GY + R1H + R2H

      drawBlock(xs[0], y1, CW,     R1H + R2H, 'Key Partners',           data.key_partners)
      drawBlock(xs[1], y1, CW,     R1H,       'Key Activities',         data.key_activities)
      drawBlock(xs[2], y1, CW,     R1H + R2H, 'Value Propositions',     data.value_propositions)
      drawBlock(xs[3], y1, CW,     R1H,       'Customer Relationships', data.customer_relationships)
      drawBlock(xs[4], y1, CW,     R1H + R2H, 'Customer Segments',      data.customer_segments)
      drawBlock(xs[1], y2, CW,     R2H,       'Key Resources',          data.key_resources)
      drawBlock(xs[3], y2, CW,     R2H,       'Channels',               data.channels)
      drawBlock(xs[0], y3, CW * 2, R3H,       'Cost Structure',         data.cost_structure)
      drawBlock(xs[2], y3, CW * 3, R3H,       'Revenue Streams',        data.revenue_streams)

      doc.setDrawColor(...BORDER)
      doc.setLineWidth(0.6)
      doc.rect(GX, GY, W - 2 * MX, R1H + R2H + R3H)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(180, 180, 180)
      doc.text(`${project.title} · ${new Date().toLocaleDateString()}`, MX, H - 5)

      doc.save(`bmc-${opportunity.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`)
    } finally {
      setExporting(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  const isAggTab = activeTab === twinInterviews.length

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--color-cream)' }}>
      <Sidebar projectId={project.id} projectTitle={project.title} />

      <div className="ml-60 flex-1 overflow-auto p-6">
        <BackButton
          href={`/project/${project.id}/opportunity/${opportunity.id}/vpc`}
          label="Back to VPC Canvas"
        />

        {/* Page header */}
        <div className="flex items-center justify-between mb-4 mt-1">
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
              Business Model Canvas
            </h1>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>{opportunity.name}</p>
          </div>
          <button
            onClick={downloadPDF}
            disabled={exporting}
            className="flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
            style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)', color: 'var(--color-ink)' }}
            onMouseEnter={(e) => !exporting && (e.currentTarget.style.backgroundColor = 'var(--color-linen)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Download PDF
          </button>
        </div>

        {/* Tab bar */}
        {twinInterviews.length > 0 && (
          <div className="flex items-center gap-1 mb-4 rounded-xl p-1 w-fit" style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)' }}>
            {twinInterviews.map((iv, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  backgroundColor: activeTab === i ? 'var(--color-amber)' : 'transparent',
                  color: activeTab === i ? '#FFFFFF' : 'var(--color-text-muted)',
                }}
                onMouseEnter={(e) => activeTab !== i && (e.currentTarget.style.backgroundColor = 'var(--color-linen)')}
                onMouseLeave={(e) => activeTab !== i && (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: TWIN_COLORS_HEX[i % TWIN_COLORS_HEX.length] }}
                />
                {iv.twinName}
              </button>
            ))}
            <button
              onClick={() => setActiveTab(twinInterviews.length)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                backgroundColor: isAggTab ? 'var(--color-amber)' : 'transparent',
                color: isAggTab ? '#FFFFFF' : 'var(--color-text-muted)',
              }}
              onMouseEnter={(e) => !isAggTab && (e.currentTarget.style.backgroundColor = 'var(--color-linen)')}
              onMouseLeave={(e) => !isAggTab && (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              Aggregated
            </button>
          </div>
        )}

        {/* Legend (aggregated tab only, when twins exist) */}
        {isAggTab && twinInterviews.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 mb-4" style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
            <span style={{ fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-faint)' }}>Dots:</span>
            {twinInterviews.map((iv, i) => (
              <span key={i} className="flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: TWIN_COLORS_HEX[i % TWIN_COLORS_HEX.length] }}
                />
                {iv.twinName}
              </span>
            ))}
            <span style={{ fontStyle: 'italic', color: 'var(--color-text-faint)' }}>Dots show which twins&apos; VPC elements inspired each item.</span>
          </div>
        )}

        {/* Canvas */}
        {isAggTab ? (
          <BMCGrid
            data={aggData}
            isUnlocked={(block) => isUnlocked(aggData, block)}
            generating={aggGenerating}
            onGenerate={(block) => generateBlockForTab(twinInterviews.length, block, aggData)}
            onAdd={(block, text) => addAggItem(block, text)}
            onRemove={(block, i) => removeAggItem(block, i)}
            getTwinDots={twinInterviews.length > 0 ? getTwinDotsForItem : undefined}
          />
        ) : (
          <BMCGrid
            data={perTwinBmc[activeTab] ?? initTwinBmcData(twinInterviews[activeTab])}
            isUnlocked={(block) => isUnlocked(perTwinBmc[activeTab] ?? initTwinBmcData(twinInterviews[activeTab]), block)}
            generating={twinGenerating[activeTab] ?? {}}
            onGenerate={(block) =>
              generateBlockForTab(activeTab, block, perTwinBmc[activeTab] ?? initTwinBmcData(twinInterviews[activeTab]))
            }
            onAdd={(block, text) => addTwinItem(activeTab, block, text)}
            onRemove={(block, i) => removeTwinItem(activeTab, block, i)}
            getTwinDots={(_block, _text) => [TWIN_COLORS_HEX[activeTab % TWIN_COLORS_HEX.length]]}
          />
        )}

        <p className="mt-4 text-center" style={{ fontSize: 10, color: 'var(--color-text-faint)' }}>
          Generate blocks in order — each one unlocks the next.
        </p>
      </div>
    </div>
  )
}
