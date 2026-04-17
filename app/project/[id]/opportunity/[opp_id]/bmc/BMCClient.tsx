'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import BackButton from '@/components/BackButton'
import {
  Plus, X, Loader2, Sparkles, Download,
  Handshake, Zap, Package, Gift, Heart, Users, Truck, Tag, DollarSign,
} from 'lucide-react'
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

type VPCValueMap = {
  productsAndServices: string[]
  painRelievers: string[]
  gainCreators: string[]
} | null

type Ability = { id: string; name: string; description: string }

type BMCRow = BMCData & { id: string }

// ─── Block static configuration ─────────────────────────────────────────────────

const BLOCK_CONFIG: Record<
  BlockKey,
  { title: string; subtitle: string; icon: React.ReactNode; pillClass: string }
> = {
  value_propositions: {
    title: 'Value Propositions',
    subtitle: 'What value do we deliver to the customer?',
    icon: <Gift size={13} />,
    pillClass: 'bg-[#0D6E6E]/10 text-[#0D6E6E]',
  },
  customer_segments: {
    title: 'Customer Segments',
    subtitle: 'For whom are we creating value?',
    icon: <Users size={13} />,
    pillClass: 'bg-[#0D6E6E]/10 text-[#0D6E6E]',
  },
  customer_relationships: {
    title: 'Customer Relationships',
    subtitle: 'What relationship does each segment expect?',
    icon: <Heart size={13} />,
    pillClass: 'bg-blue-50 text-blue-700',
  },
  channels: {
    title: 'Channels',
    subtitle: 'How do we reach our customer segments?',
    icon: <Truck size={13} />,
    pillClass: 'bg-blue-50 text-blue-700',
  },
  key_activities: {
    title: 'Key Activities',
    subtitle: 'What key activities does our value proposition require?',
    icon: <Zap size={13} />,
    pillClass: 'bg-purple-50 text-purple-700',
  },
  key_resources: {
    title: 'Key Resources',
    subtitle: 'What key resources does our value proposition require?',
    icon: <Package size={13} />,
    pillClass: 'bg-purple-50 text-purple-700',
  },
  key_partners: {
    title: 'Key Partners',
    subtitle: 'Who are our key partners and suppliers?',
    icon: <Handshake size={13} />,
    pillClass: 'bg-purple-50 text-purple-700',
  },
  revenue_streams: {
    title: 'Revenue Streams',
    subtitle: 'For what value are customers willing to pay?',
    icon: <DollarSign size={13} />,
    pillClass: 'bg-green-50 text-green-700',
  },
  cost_structure: {
    title: 'Cost Structure',
    subtitle: 'What are the most important costs in our model?',
    icon: <Tag size={13} />,
    pillClass: 'bg-orange-50 text-orange-700',
  },
}

// Sequential generation order (each unlocks after prev is generated)
const GENERATION_ORDER: BlockKey[] = [
  'customer_relationships',
  'channels',
  'key_activities',
  'key_resources',
  'key_partners',
  'revenue_streams',
  'cost_structure',
]

// Pre-filled from external data — no generate button
const PRE_FILLED = new Set<BlockKey>(['value_propositions', 'customer_segments'])

// Desktop grid placement
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

// Internal border classes for the grid (no outer borders — the container handles those)
const GRID_BORDERS: Record<BlockKey, string> = {
  key_partners:           'border-r border-b border-gray-200',
  key_activities:         'border-r border-b border-gray-200',
  value_propositions:     'border-r border-b border-gray-200',
  customer_relationships: 'border-r border-b border-gray-200',
  customer_segments:      'border-b border-gray-200',
  key_resources:          'border-r border-b border-gray-200',
  channels:               'border-r border-b border-gray-200',
  cost_structure:         'border-r border-gray-200',
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

// ─── BMCBlock component ─────────────────────────────────────────────────────────

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
    <div
      className={`flex flex-col overflow-hidden bg-white ${borderClass}`}
      style={style}
    >
      {/* Header */}
      <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-gray-100 flex-shrink-0 bg-white">
        <span className="text-[#0D6E6E] flex-shrink-0">{config.icon}</span>
        <span className="text-[11px] font-bold text-gray-800 leading-tight flex-1">
          {config.title}
        </span>
        <button
          onClick={() => setAdding((v) => !v)}
          className="w-5 h-5 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors flex-shrink-0"
          title="Add item"
        >
          <Plus size={9} className="text-gray-500" />
        </button>
      </div>

      {/* Guiding question */}
      <p className="text-[9px] text-gray-400 italic px-3 pt-1.5 pb-1 leading-tight flex-shrink-0">
        {config.subtitle}
      </p>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-3 pb-2.5 min-h-0 scrollbar-thin">
        {/* Pre-filled empty note */}
        {isPreFilled && !hasItems && (
          <p className="text-[9px] text-gray-300 italic mt-1">
            Complete the VPC Canvas first to pre-fill this section.
          </p>
        )}

        {/* Generate / locked state for generated blocks */}
        {!isPreFilled && !hasItems && (
          <div className="mt-1.5">
            {isGenerating ? (
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                <Loader2 size={11} className="animate-spin text-[#0D6E6E]" />
                Generating…
              </div>
            ) : (
              <>
                <button
                  onClick={onGenerate}
                  disabled={!isUnlocked}
                  className="flex items-center gap-1.5 bg-[#0D6E6E] text-white px-2.5 py-1.5 rounded-lg text-[10px] font-semibold hover:bg-[#0a5555] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Sparkles size={9} />
                  Generate ✨
                </button>
                {!isUnlocked && (
                  <p className="text-[9px] text-gray-300 italic mt-1.5">
                    Complete the previous block first.
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* Items */}
        {hasItems && (
          <>
            <div className="flex flex-wrap gap-1 mt-1">
              {items.map((item, i) => (
                <span
                  key={i}
                  title={item}
                  className={`inline-flex items-start gap-1 text-[10px] font-medium px-2 py-0.5 rounded-lg whitespace-normal break-words max-w-full ${config.pillClass}`}
                >
                  <span className="flex-1 min-w-0">{item}</span>
                  <button
                    onClick={() => onRemove(i)}
                    className="opacity-40 hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5"
                  >
                    <X size={8} />
                  </button>
                </span>
              ))}
            </div>
            {!isPreFilled && (
              <button
                onClick={onGenerate}
                disabled={isGenerating}
                className="flex items-center gap-1 text-[9px] text-gray-400 hover:text-gray-600 transition-colors mt-2"
              >
                {isGenerating ? (
                  <Loader2 size={9} className="animate-spin" />
                ) : (
                  <Sparkles size={9} />
                )}
                Regenerate
              </button>
            )}
          </>
        )}

        {/* Add input */}
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
              className="flex-1 text-[10px] px-2 py-1 border border-gray-200 rounded-lg bg-gray-50 outline-none focus:ring-1 focus:ring-[#0D6E6E] focus:border-[#0D6E6E] min-w-0"
            />
            <button
              onClick={submit}
              className="text-[10px] px-2 py-1 bg-[#0D6E6E] text-white rounded-lg hover:bg-[#0a5555] transition-colors flex-shrink-0"
            >
              Add
            </button>
            <button
              onClick={() => {
                setAdding(false)
                setInputVal('')
              }}
              className="flex-shrink-0"
            >
              <X size={10} className="text-gray-400 hover:text-gray-600" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main client component ───────────────────────────────────────────────────────

function deriveValuePropositions(vpcValueMap: VPCValueMap): string[] {
  if (!vpcValueMap) return []
  return [
    ...new Set([
      ...(vpcValueMap.productsAndServices ?? []),
      ...(vpcValueMap.painRelievers ?? []),
      ...(vpcValueMap.gainCreators ?? []),
    ]),
  ]
}

function initData(
  existingBMC: BMCRow | null,
  vpcValueMap: VPCValueMap,
  twinSegments: string[]
): BMCData {
  const derivedVP = deriveValuePropositions(vpcValueMap)
  const derivedCS = twinSegments

  if (existingBMC) {
    return {
      value_propositions:     existingBMC.value_propositions?.length   ? existingBMC.value_propositions   : derivedVP,
      customer_segments:      existingBMC.customer_segments?.length    ? existingBMC.customer_segments    : derivedCS,
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
    value_propositions:     derivedVP,
    customer_segments:      derivedCS,
    customer_relationships: [],
    channels:               [],
    key_activities:         [],
    key_resources:          [],
    key_partners:           [],
    revenue_streams:        [],
    cost_structure:         [],
  }
}

export default function BMCClient({
  project,
  opportunity,
  abilities,
  vpcValueMap,
  twinSegments,
  existingBMC,
}: {
  project: { id: string; title: string }
  opportunity: Pick<Opportunity, 'id' | 'name' | 'description' | 'customer_segment'>
  abilities: Ability[]
  vpcValueMap: VPCValueMap
  twinSegments: string[]
  existingBMC: BMCRow | null
}) {
  const supabase = createClient()

  const [data, setData] = useState<BMCData>(() =>
    initData(existingBMC, vpcValueMap, twinSegments)
  )
  const [bmcId, setBmcId] = useState<string | null>(existingBMC?.id ?? null)
  const [generating, setGenerating] = useState<Partial<Record<BlockKey, boolean>>>({})
  const [exporting, setExporting] = useState(false)

  // ── Unlock logic ──────────────────────────────────────────────────────────────
  function isUnlocked(block: BlockKey): boolean {
    const idx = GENERATION_ORDER.indexOf(block)
    if (idx < 0) return true
    if (idx === 0) return true
    return (data[GENERATION_ORDER[idx - 1]]?.length ?? 0) > 0
  }

  // ── DB save (upsert) ──────────────────────────────────────────────────────────
  async function save(newData: BMCData) {
    try {
      if (bmcId) {
        await supabase
          .from('business_model_canvases')
          .update({ ...newData, updated_at: new Date().toISOString() })
          .eq('id', bmcId)
      } else {
        const { data: row } = await supabase
          .from('business_model_canvases')
          .insert({ opportunity_id: opportunity.id, ...newData })
          .select('id')
          .single()
        if (row?.id) setBmcId(row.id)
      }
    } catch {
      // silent — table may not exist yet
    }
  }

  // ── Mutations ─────────────────────────────────────────────────────────────────
  function addItem(block: BlockKey, text: string) {
    setData((prev) => {
      const updated = { ...prev, [block]: [...prev[block], text] }
      save(updated)
      return updated
    })
  }

  function removeItem(block: BlockKey, index: number) {
    setData((prev) => {
      const updated = { ...prev, [block]: prev[block].filter((_, i) => i !== index) }
      save(updated)
      return updated
    })
  }

  // ── AI generation ─────────────────────────────────────────────────────────────
  async function generateBlock(block: BlockKey) {
    setGenerating((prev) => ({ ...prev, [block]: true }))
    try {
      const res = await fetch('/api/generate-bmc-block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          block,
          opportunityName: opportunity.name,
          opportunityDescription: opportunity.description,
          abilities,
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
      const { items } = await res.json()
      setData((prev) => {
        const updated = { ...prev, [block]: items }
        save(updated)
        return updated
      })
    } catch {
      // silent fail
    } finally {
      setGenerating((prev) => ({ ...prev, [block]: false }))
    }
  }

  // ── PDF export ────────────────────────────────────────────────────────────────
  async function downloadPDF() {
    setExporting(true)
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

      const W = 297
      const H = 210
      const MX = 8
      const CW = (W - 2 * MX) / 5 // column width
      const GX = MX
      const GY = 22
      const R1H = 58  // row 1 height
      const R2H = 52  // row 2 height
      const R3H = 48  // row 3 height
      const TEAL: [number, number, number] = [13, 110, 110]
      const BORDER: [number, number, number] = [210, 210, 210]

      // Title
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(...TEAL)
      doc.text('Business Model Canvas', MX, 12)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(90, 90, 90)
      doc.text(`— ${opportunity.name}`, MX + 58, 12)

      function drawBlock(
        x: number,
        y: number,
        w: number,
        h: number,
        title: string,
        items: string[]
      ) {
        // White fill
        doc.setFillColor(255, 255, 255)
        doc.rect(x, y, w, h, 'F')

        // Header strip
        doc.setFillColor(...TEAL)
        doc.rect(x, y, w, 7, 'F')

        // Title
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(6.5)
        doc.setTextColor(255, 255, 255)
        doc.text(title.toUpperCase(), x + 2.5, y + 4.8)

        // Items
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

        // Border
        doc.setDrawColor(...BORDER)
        doc.setLineWidth(0.3)
        doc.rect(x, y, w, h)
      }

      const xs = [GX, GX + CW, GX + CW * 2, GX + CW * 3, GX + CW * 4]
      const y1 = GY
      const y2 = GY + R1H
      const y3 = GY + R1H + R2H

      drawBlock(xs[0], y1, CW,      R1H + R2H, 'Key Partners',           data.key_partners)
      drawBlock(xs[1], y1, CW,      R1H,       'Key Activities',         data.key_activities)
      drawBlock(xs[2], y1, CW,      R1H + R2H, 'Value Propositions',     data.value_propositions)
      drawBlock(xs[3], y1, CW,      R1H,       'Customer Relationships', data.customer_relationships)
      drawBlock(xs[4], y1, CW,      R1H + R2H, 'Customer Segments',      data.customer_segments)
      drawBlock(xs[1], y2, CW,      R2H,       'Key Resources',          data.key_resources)
      drawBlock(xs[3], y2, CW,      R2H,       'Channels',               data.channels)
      drawBlock(xs[0], y3, CW * 2,  R3H,       'Cost Structure',         data.cost_structure)
      drawBlock(xs[2], y3, CW * 3,  R3H,       'Revenue Streams',        data.revenue_streams)

      // Outer border
      doc.setDrawColor(...BORDER)
      doc.setLineWidth(0.6)
      doc.rect(GX, GY, W - 2 * MX, R1H + R2H + R3H)

      // Footer
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(180, 180, 180)
      doc.text(
        `${project.title} · ${new Date().toLocaleDateString()}`,
        MX,
        H - 5
      )

      doc.save(`bmc-${opportunity.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`)
    } finally {
      setExporting(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen bg-[#F4F5F0]">
      <Sidebar
        projectId={project.id}
        projectTitle={project.title}
        primaryOpportunityId={opportunity.id}
        primaryOpportunityName={opportunity.name}
        hasTwinInterviews={true}
      />

      <div className="ml-60 flex-1 overflow-auto p-6">
        <BackButton
          href={`/project/${project.id}/opportunity/${opportunity.id}/vpc`}
          label="Back to VPC Canvas"
        />

        {/* Page header */}
        <div className="flex items-center justify-between mb-5 mt-1">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Business Model Canvas</h1>
            <p className="text-sm text-gray-400 mt-0.5">{opportunity.name}</p>
          </div>
          <button
            onClick={downloadPDF}
            disabled={exporting}
            className="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 py-2 px-4 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            {exporting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Download size={14} />
            )}
            Download PDF
          </button>
        </div>

        {/* ── Desktop grid ─────────────────────────────────────────────────── */}
        <div className="hidden lg:block">
          <div
            className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm"
            style={{
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
                onGenerate={() => generateBlock(key)}
                onAdd={(t) => addItem(key, t)}
                onRemove={(i) => removeItem(key, i)}
                style={GRID_PLACEMENT[key]}
                borderClass={GRID_BORDERS[key]}
              />
            ))}
          </div>
        </div>

        {/* ── Mobile stacked ───────────────────────────────────────────────── */}
        <div className="lg:hidden space-y-3">
          {MOBILE_ORDER.map((key) => (
            <div
              key={key}
              className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white"
              style={{ minHeight: '140px' }}
            >
              <BMCBlock
                blockKey={key}
                items={data[key]}
                isUnlocked={isUnlocked(key)}
                isGenerating={!!generating[key]}
                onGenerate={() => generateBlock(key)}
                onAdd={(t) => addItem(key, t)}
                onRemove={(i) => removeItem(key, i)}
              />
            </div>
          ))}
        </div>

        {/* Generation progress hint */}
        <p className="text-[10px] text-gray-400 mt-4 text-center">
          Generate blocks in order — each one unlocks the next.
        </p>
      </div>
    </div>
  )
}
