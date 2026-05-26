'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import TopNav from '@/components/TopNav'
import { Loader2, Sparkles, ArrowRight, Plus, X } from 'lucide-react'
import { motion } from 'framer-motion'

// ─── Types ──────────────────────────────────────────────────────────────────────

type VPCBlock = {
  key: string
  label: string
  side: 'left' | 'right'
  pillClass: string
}

const VPC_BLOCKS: VPCBlock[] = [
  {
    key: 'productsAndServices',
    label: 'Products & Services',
    side: 'left',
    pillClass: 'bg-[rgba(19,163,137,0.10)] text-[#7A4A20] border border-[rgba(19,163,137,0.2)]' },
  {
    key: 'gainCreators',
    label: 'Gain Creators',
    side: 'left',
    pillClass: 'bg-[rgba(19,163,137,0.10)] text-[var(--color-primary)] border border-[rgba(19,163,137,0.2)]' },
  {
    key: 'painRelievers',
    label: 'Pain Relievers',
    side: 'left',
    pillClass: 'bg-[var(--color-border)] text-[var(--color-foreground)] border border-[var(--color-border)]' },
  {
    key: 'jobs',
    label: 'Customer Jobs',
    side: 'right',
    pillClass: 'bg-[rgba(19,163,137,0.10)] text-[var(--color-primary)] border border-[rgba(19,163,137,0.15)]' },
  {
    key: 'gains',
    label: 'Gains',
    side: 'right',
    pillClass: 'bg-[rgba(19,163,137,0.10)] text-[var(--color-primary)] border border-[rgba(19,163,137,0.2)]' },
  {
    key: 'pains',
    label: 'Pains',
    side: 'right',
    pillClass: 'bg-[rgba(111,226,214,0.15)] text-[#7A3D10] border border-[rgba(111,226,214,0.25)]' },
]

// ─── BubbleBlock component ────────────────────────────────────────────────────

function BubbleBlock({
  label,
  items,
  pillClass,
  onAdd,
  onRemove }: {
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
    <div style={{ marginBottom: 16 }}>
      {/* Label row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--color-foreground-muted)' }}
        >
          {label}
        </span>
        <button
          onClick={() => setAdding(true)}
          style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            backgroundColor: 'var(--color-muted)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0 }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-border)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-muted)')}
          title="Aggiungi elemento"
        >
          <Plus size={10} style={{ color: 'var(--color-foreground-muted)' }} />
        </button>
      </div>

      {/* Bubbles */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, minHeight: 28 }}>
        {items.map((item, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15 }}
            layout
            className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg ${pillClass}`}
          >
            <span>{item}</span>
            <button
              onClick={() => onRemove(i)}
              style={{ opacity: 0.5, display: 'flex', alignItems: 'center', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.5')}
            >
              <X size={9} />
            </button>
          </motion.span>
        ))}

        {items.length === 0 && !adding && (
          <span
            style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--color-foreground-faint)' }}
          >
            Nessun elemento — clicca + per aggiungere
          </span>
        )}
      </div>

      {/* Inline input */}
      {adding && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
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
              fontSize: 12,
              padding: '5px 10px',
              borderRadius: 8,
              border: '0.5px solid var(--color-primary)',
              backgroundColor: '#FFFFFF',
              outline: 'none',
              color: 'var(--color-foreground)' }}
          />
          <button
            onClick={submit}
            style={{
              fontSize: 11,
              padding: '5px 10px',
              borderRadius: 8,
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-primary-foreground)',
              border: 'none',
              cursor: 'pointer',
              flexShrink: 0 }}
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
            <X size={12} style={{ color: 'var(--color-foreground-faint)' }} />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ImportVPCPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const supabase = createClient()
  const [projectId, setProjectId] = useState<string | null>(null)
  const [blocks, setBlocks] = useState<Record<string, string[]>>({
    productsAndServices: [],
    gainCreators: [],
    painRelievers: [],
    jobs: [],
    gains: [],
    pains: [] })
  const [opportunityName, setOpportunityName] = useState('')
  const [saving, setSaving] = useState(false)
  const [filling, setFilling] = useState(false)

  useEffect(() => {
    params.then(({ id }) => setProjectId(id))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function addItem(key: string, text: string) {
    setBlocks((prev) => ({ ...prev, [key]: [...prev[key], text] }))
  }

  function removeItem(key: string, index: number) {
    setBlocks((prev) => ({ ...prev, [key]: prev[key].filter((_, i) => i !== index) }))
  }

  function hasAnyData(): boolean {
    return Object.values(blocks).some((arr) => arr.length > 0)
  }

  function hasSomeGaps(): boolean {
    const filled = Object.values(blocks).filter((arr) => arr.length > 0).length
    return filled > 0 && filled < VPC_BLOCKS.length
  }

  async function handleAIFill() {
    if (!hasSomeGaps() || filling || !projectId) return
    setFilling(true)
    try {
      const { data: abilitiesData } = await supabase
        .from('abilities')
        .select('name, description')
        .eq('project_id', projectId)
      const res = await fetch('/api/generate-vpc-value-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityName: opportunityName || 'Nuova opportunità',
          opportunityDescription: '',
          abilities: abilitiesData ?? [],
          aggregatedPains: blocks.pains,
          aggregatedGains: blocks.gains,
          aggregatedJobs: blocks.jobs,
          twinProfile: { name: '', role: '', segment: '' },
          existingVPCItems: {
            productsAndServices: blocks.productsAndServices,
            gainCreators: blocks.gainCreators,
            painRelievers: blocks.painRelievers } }) })
      if (res.ok) {
        const data = await res.json()
        const vm = data.valueMap ?? data
        setBlocks((prev) => {
          const next = { ...prev }
          if (!prev.productsAndServices.length && vm.productsAndServices?.length)
            next.productsAndServices = vm.productsAndServices
          if (!prev.gainCreators.length && vm.gainCreators?.length)
            next.gainCreators = vm.gainCreators
          if (!prev.painRelievers.length && vm.painRelievers?.length)
            next.painRelievers = vm.painRelievers
          return next
        })
      }
    } catch (err) {
      console.error('[ImportVPC] AI fill error:', err)
    } finally {
      setFilling(false)
    }
  }

  async function handleImport() {
    if (!projectId || !hasAnyData()) return
    setSaving(true)
    try {
      const { data: opp, error: oppErr } = await supabase
        .from('opportunities')
        .insert({
          project_id: projectId,
          name: opportunityName.trim() || 'VPC importato',
          application: '',
          customer_segment: '',
          description: '',
          phase: 'abilities' })
        .select()
        .single()

      if (oppErr || !opp) {
        setSaving(false)
        return
      }

      const vpcValueMap = {
        productsAndServices: blocks.productsAndServices.map((t) => ({ text: t, twinIdx: 0 })),
        gainCreators:        blocks.gainCreators.map((t) => ({ text: t, twinIdx: 0 })),
        painRelievers:       blocks.painRelievers.map((t) => ({ text: t, twinIdx: 0 })),
        jobs:                blocks.jobs.map((t) => ({ text: t, twinIdx: 0 })),
        gains:               blocks.gains.map((t) => ({ text: t, twinIdx: 0 })),
        pains:               blocks.pains.map((t) => ({ text: t, twinIdx: 0 })) }

      await supabase.from('twin_sessions').upsert(
        { opportunity_id: opp.id, vpc_value_map: vpcValueMap, suggested_segments: [], report: null },
        { onConflict: 'opportunity_id' }
      )

      router.push(`/project/${projectId}/opportunity/${opp.id}/vpc`)
    } catch (err) {
      console.error('[ImportVPC] save error:', err)
      setSaving(false)
    }
  }

  if (!projectId) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ backgroundColor: 'var(--color-background)' }}
      >
        <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    )
  }

  const leftBlocks  = VPC_BLOCKS.filter((b) => b.side === 'left')
  const rightBlocks = VPC_BLOCKS.filter((b) => b.side === 'right')

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <TopNav projectId={projectId} />

      <motion.div className="pt-14 px-6 pb-16 max-w-5xl mx-auto" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
        <button
          onClick={() => router.push(`/project/${projectId}/start-vpc`)}
          style={{
            fontSize: 12,
            color: 'var(--color-foreground-muted)',
            marginBottom: 24,
            marginTop: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0 }}
        >
          ← Indietro
        </button>

        <div className="flex items-start justify-between mb-2">
          <div>
            <h1
              style={{
                fontWeight: 400,
                fontSize: 34,
                letterSpacing: '-0.03em',
                color: 'var(--color-foreground)',
                marginBottom: 6 }}
            >
              Importa il tuo VPC
            </h1>
            <p style={{ fontSize: 13, color: 'var(--color-foreground-muted)' }}>
              Aggiungi gli elementi del tuo Value Proposition Canvas come bolle.
            </p>
          </div>
        </div>

        {/* Opportunity name */}
        <div style={{ marginBottom: 28, marginTop: 24, maxWidth: 420 }}>
          <label
            style={{
              display: 'block',
              fontSize: 10,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--color-foreground-muted)',
              marginBottom: 6 }}
          >
            Nome dell&apos;opportunità
          </label>
          <input
            value={opportunityName}
            onChange={(e) => setOpportunityName(e.target.value)}
            placeholder="es. Piattaforma B2B per PMI"
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: 14,
              backgroundColor: '#FFFFFF',
              border: '0.5px solid var(--color-border)',
              borderRadius: 8,
              color: 'var(--color-foreground)',
              outline: 'none',
              boxSizing: 'border-box' }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--color-primary)'
              e.target.style.boxShadow = '0 0 0 3px rgba(19,163,137,0.12)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--color-border)'
              e.target.style.boxShadow = 'none'
            }}
          />
        </div>

        {/* Two-column VPC grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
          {/* Left column: Value Proposition */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '0.5px solid var(--color-border)',
              borderRadius: 12,
              padding: 20 }}
          >
            <p
              style={{
                fontSize: 10,
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--color-primary)',
                marginBottom: 16 }}
            >
              Value Proposition
            </p>
            {leftBlocks.map((block) => (
              <BubbleBlock
                key={block.key}
                label={block.label}
                items={blocks[block.key]}
                pillClass={block.pillClass}
                onAdd={(text) => addItem(block.key, text)}
                onRemove={(i) => removeItem(block.key, i)}
              />
            ))}
          </div>

          {/* Right column: Customer Profile */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '0.5px solid var(--color-border)',
              borderRadius: 12,
              padding: 20 }}
          >
            <p
              style={{
                fontSize: 10,
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--color-foreground-muted)',
                marginBottom: 16 }}
            >
              Customer Profile
            </p>
            {rightBlocks.map((block) => (
              <BubbleBlock
                key={block.key}
                label={block.label}
                items={blocks[block.key]}
                pillClass={block.pillClass}
                onAdd={(text) => addItem(block.key, text)}
                onRemove={(i) => removeItem(block.key, i)}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {hasSomeGaps() && (
            <button
              onClick={handleAIFill}
              disabled={filling || saving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: 500,
                backgroundColor: '#FFFFFF',
                color: 'var(--color-primary)',
                border: '0.5px solid var(--color-primary)',
                borderRadius: 8,
                cursor: filling || saving ? 'default' : 'pointer',
                transition: 'background-color 0.15s ease' }}
              onMouseEnter={(e) => {
                if (!filling && !saving)
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    'color-mix(in srgb, var(--color-primary) 10%, transparent)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#FFFFFF'
              }}
            >
              {filling ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              Completa VPC con AI
            </button>
          )}

          <button
            onClick={handleImport}
            disabled={!hasAnyData() || saving || filling}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              fontSize: 13,
              fontWeight: 500,
              backgroundColor:
                hasAnyData() && !saving && !filling
                  ? 'var(--color-primary)'
                  : 'var(--color-muted)',
              color:
                hasAnyData() && !saving && !filling ? '#FFFFFF' : 'var(--color-foreground-muted)',
              border: 'none',
              borderRadius: 8,
              cursor:
                hasAnyData() && !saving && !filling ? 'pointer' : 'default',
              transition: 'background-color 0.15s ease' }}
            onMouseEnter={(e) => {
              if (hasAnyData() && !saving && !filling) {
                ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-primary-hover)'
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(19,163,137,0.25)'
              }
            }}
            onMouseLeave={(e) => {
              if (hasAnyData() && !saving && !filling) {
                ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-primary)'
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'
              }
            }}
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ArrowRight size={14} />
            )}
            Importa VPC
          </button>
        </div>
      </motion.div>
    </div>
  )
}
