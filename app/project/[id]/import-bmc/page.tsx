'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import TopNav from '@/components/TopNav'
import { Loader2, ArrowRight, Plus, X } from 'lucide-react'
import { motion } from 'framer-motion'

type BlockKey =
  | 'key_partners'
  | 'key_activities'
  | 'key_resources'
  | 'value_propositions'
  | 'customer_relationships'
  | 'channels'
  | 'customer_segments'
  | 'cost_structure'
  | 'revenue_streams'

type BMCBlockDef = {
  key: BlockKey
  label: string
  pillClass: string
}

const BMC_BLOCKS: BMCBlockDef[] = [
  {
    key: 'key_partners',
    label: 'Key Partners',
    pillClass: 'bg-[rgba(180,168,136,0.15)] text-[#1A1A18] border border-[rgba(180,168,136,0.25)]',
  },
  {
    key: 'key_activities',
    label: 'Key Activities',
    pillClass: 'bg-[rgba(180,168,136,0.15)] text-[#1A1A18] border border-[rgba(180,168,136,0.25)]',
  },
  {
    key: 'key_resources',
    label: 'Key Resources',
    pillClass: 'bg-[rgba(180,168,136,0.15)] text-[#1A1A18] border border-[rgba(180,168,136,0.25)]',
  },
  {
    key: 'value_propositions',
    label: 'Value Propositions',
    pillClass: 'bg-[rgba(199,123,58,0.10)] text-[#7A4A20] border border-[rgba(199,123,58,0.2)]',
  },
  {
    key: 'customer_relationships',
    label: 'Customer Relationships',
    pillClass: 'bg-[#E8E5DC] text-[#1A1A18] border border-[#E5E3DC]',
  },
  {
    key: 'channels',
    label: 'Channels',
    pillClass: 'bg-[#E8E5DC] text-[#1A1A18] border border-[#E5E3DC]',
  },
  {
    key: 'customer_segments',
    label: 'Customer Segments',
    pillClass: 'bg-[rgba(199,123,58,0.10)] text-[#7A4A20] border border-[rgba(199,123,58,0.2)]',
  },
  {
    key: 'cost_structure',
    label: 'Cost Structure',
    pillClass: 'bg-[#E8E5DC] text-[#888880] border border-[#E5E3DC]',
  },
  {
    key: 'revenue_streams',
    label: 'Revenue Streams',
    pillClass: 'bg-[rgba(76,175,125,0.10)] text-[#2D7A57] border border-[rgba(76,175,125,0.2)]',
  },
]

// ─── BubbleBlock component ────────────────────────────────────────────────────

function BubbleBlock({
  label,
  items,
  pillClass,
  onAdd,
  onRemove,
}: {
  label: string
  items: string[]
  pillClass: string
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
    <div>
      {/* Label row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--color-ink)',
          }}
        >
          {label}
        </span>
        <button
          onClick={() => setAdding(true)}
          style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            backgroundColor: 'var(--color-linen)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-border)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-linen)')}
          title="Aggiungi elemento"
        >
          <Plus size={10} style={{ color: 'var(--color-text-muted)' }} />
        </button>
      </div>

      {/* Bubbles */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, minHeight: 24, marginBottom: 8 }}>
        {items.map((item, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15 }}
            layout
            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-lg ${pillClass}`}
          >
            <span>{item}</span>
            <button
              onClick={() => onRemove(i)}
              style={{
                opacity: 0.5,
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                padding: 0,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.5')}
            >
              <X size={9} />
            </button>
          </motion.span>
        ))}

        {items.length === 0 && !adding && (
          <span style={{ fontSize: 10, fontStyle: 'italic', color: 'var(--color-text-faint)' }}>
            Vuoto — clicca + per aggiungere
          </span>
        )}
      </div>

      {/* Inline input */}
      {adding && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <input
            autoFocus
            type="text"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
              if (e.key === 'Escape') {
                setAdding(false)
                setVal('')
              }
            }}
            placeholder="Aggiungi…"
            style={{
              flex: 1,
              fontSize: 11,
              padding: '4px 8px',
              borderRadius: 6,
              border: '0.5px solid var(--color-amber)',
              backgroundColor: '#FFFFFF',
              outline: 'none',
              color: 'var(--color-ink)',
            }}
          />
          <button
            onClick={submit}
            style={{
              fontSize: 10,
              padding: '4px 8px',
              borderRadius: 6,
              backgroundColor: 'var(--color-amber)',
              color: '#FFFFFF',
              border: 'none',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Add
          </button>
          <button
            onClick={() => {
              setAdding(false)
              setVal('')
            }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
          >
            <X size={11} style={{ color: 'var(--color-text-faint)' }} />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ImportBMCPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const supabase = createClient()
  const [projectId, setProjectId] = useState<string | null>(null)
  const [opportunityName, setOpportunityName] = useState('')
  const [blocks, setBlocks] = useState<Record<BlockKey, string[]>>(
    Object.fromEntries(BMC_BLOCKS.map((b) => [b.key, []])) as unknown as Record<BlockKey, string[]>
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    params.then(({ id }) => setProjectId(id))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function addItem(key: BlockKey, text: string) {
    setBlocks((prev) => ({ ...prev, [key]: [...prev[key], text] }))
  }

  function removeItem(key: BlockKey, index: number) {
    setBlocks((prev) => ({ ...prev, [key]: prev[key].filter((_, i) => i !== index) }))
  }

  function hasAnyData(): boolean {
    return Object.values(blocks).some((arr) => arr.length > 0)
  }

  async function handleImport() {
    if (!projectId || !hasAnyData()) return
    setSaving(true)
    try {
      const { data: opp, error: oppErr } = await supabase
        .from('opportunities')
        .insert({
          project_id: projectId,
          name: opportunityName.trim() || 'BMC importato',
          application: '',
          customer_segment: '',
          description: '',
          phase: 'abilities',
        })
        .select()
        .single()

      if (oppErr || !opp) {
        setSaving(false)
        return
      }

      const bmcData = Object.fromEntries(BMC_BLOCKS.map((b) => [b.key, blocks[b.key]]))

      await supabase.from('business_model_canvases').upsert(
        { opportunity_id: opp.id, ...bmcData },
        { onConflict: 'opportunity_id' }
      )

      router.push(`/project/${projectId}/opportunity/${opp.id}/bmc`)
    } catch (err) {
      console.error('[ImportBMC] save error:', err)
      setSaving(false)
    }
  }

  if (!projectId) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ backgroundColor: 'var(--color-cream)' }}
      >
        <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-amber)' }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-cream)' }}>
      <TopNav projectId={projectId} />

      <motion.div className="pt-14 px-6 pb-16 max-w-5xl mx-auto" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
        <button
          onClick={() => router.push(`/project/${projectId}/start-bmc`)}
          style={{
            fontSize: 12,
            color: 'var(--color-text-muted)',
            marginBottom: 24,
            marginTop: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          ← Indietro
        </button>

        <h1
          style={{
            fontFamily: "'Lora', Georgia, serif",
            fontWeight: 400,
            fontSize: 34,
            letterSpacing: '-0.03em',
            color: 'var(--color-ink)',
            marginBottom: 6,
          }}
        >
          Importa il tuo BMC
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 28 }}>
          Aggiungi gli elementi del tuo Business Model Canvas come bolle.
        </p>

        {/* Opportunity name */}
        <div style={{ marginBottom: 28, maxWidth: 420 }}>
          <label
            style={{
              display: 'block',
              fontSize: 10,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--color-text-muted)',
              marginBottom: 6,
            }}
          >
            Nome dell&apos;opportunità
          </label>
          <input
            value={opportunityName}
            onChange={(e) => setOpportunityName(e.target.value)}
            placeholder="es. Piattaforma SaaS B2B"
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: 14,
              backgroundColor: '#FFFFFF',
              border: '0.5px solid var(--color-border)',
              borderRadius: 8,
              color: 'var(--color-ink)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--color-amber)'
              e.target.style.boxShadow = '0 0 0 3px rgba(199,123,58,0.12)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--color-border)'
              e.target.style.boxShadow = 'none'
            }}
          />
        </div>

        {/* BMC blocks — 3-column grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
            marginBottom: 28,
          }}
        >
          {BMC_BLOCKS.map((block) => (
            <div
              key={block.key}
              style={{
                backgroundColor: '#FFFFFF',
                border: '0.5px solid var(--color-border)',
                borderRadius: 10,
                padding: 14,
              }}
            >
              <BubbleBlock
                label={block.label}
                items={blocks[block.key]}
                pillClass={block.pillClass}
                onAdd={(text) => addItem(block.key, text)}
                onRemove={(i) => removeItem(block.key, i)}
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleImport}
          disabled={!hasAnyData() || saving}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 24px',
            fontSize: 14,
            fontWeight: 500,
            backgroundColor:
              hasAnyData() && !saving ? 'var(--color-amber)' : 'var(--color-linen)',
            color: hasAnyData() && !saving ? '#FFFFFF' : 'var(--color-text-muted)',
            border: 'none',
            borderRadius: 10,
            cursor: hasAnyData() && !saving ? 'pointer' : 'default',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (hasAnyData() && !saving) {
              ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = '#A8612A'
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(199,123,58,0.25)'
            }
          }}
          onMouseLeave={(e) => {
            if (hasAnyData() && !saving) {
              ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-amber)'
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'
            }
          }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
          Importa BMC
        </button>
      </motion.div>
    </div>
  )
}
