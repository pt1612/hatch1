'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import TopNav from '@/components/TopNav'
import { Loader2, ArrowRight } from 'lucide-react'

type BlockKey =
  | 'key_partners' | 'key_activities' | 'key_resources'
  | 'value_propositions' | 'customer_relationships' | 'channels'
  | 'customer_segments' | 'cost_structure' | 'revenue_streams'

type BMCBlock = { key: BlockKey; label: string; placeholder: string }

const BMC_BLOCKS: BMCBlock[] = [
  { key: 'key_partners',           label: 'Key Partners',            placeholder: 'One item per line…' },
  { key: 'key_activities',         label: 'Key Activities',           placeholder: 'One item per line…' },
  { key: 'key_resources',          label: 'Key Resources',            placeholder: 'One item per line…' },
  { key: 'value_propositions',     label: 'Value Propositions',       placeholder: 'One item per line…' },
  { key: 'customer_relationships', label: 'Customer Relationships',   placeholder: 'One item per line…' },
  { key: 'channels',               label: 'Channels',                 placeholder: 'One item per line…' },
  { key: 'customer_segments',      label: 'Customer Segments',        placeholder: 'One item per line…' },
  { key: 'cost_structure',         label: 'Cost Structure',           placeholder: 'One item per line…' },
  { key: 'revenue_streams',        label: 'Revenue Streams',          placeholder: 'One item per line…' },
]

export default function ImportBMCPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const supabase = createClient()
  const [projectId, setProjectId] = useState<string | null>(null)
  const [opportunityName, setOpportunityName] = useState('')
  const [blocks, setBlocks] = useState<Record<BlockKey, string>>(
    Object.fromEntries(BMC_BLOCKS.map((b) => [b.key, ''])) as Record<BlockKey, string>
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    params.then(({ id }) => setProjectId(id))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function parseLines(text: string): string[] {
    return text.split('\n').map((l) => l.trim()).filter(Boolean)
  }

  function hasAnyData(): boolean {
    return Object.values(blocks).some((v) => v.trim().length > 0)
  }

  async function handleImport() {
    if (!projectId || !hasAnyData()) return
    setSaving(true)
    try {
      // Create a placeholder opportunity
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

      if (oppErr || !opp) { setSaving(false); return }

      // Build bmc_data
      const bmcData = Object.fromEntries(
        BMC_BLOCKS.map((b) => [b.key, parseLines(blocks[b.key])])
      )

      // Upsert aggregated BMC
      await supabase.from('business_model_canvases').upsert(
        {
          opportunity_id: opp.id,
          ...bmcData,
        },
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
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: 'var(--color-cream)' }}>
        <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-amber)' }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-cream)' }}>
      <TopNav projectId={projectId} />

      <div className="pt-4 px-6 pb-16 max-w-5xl mx-auto">
        <button
          onClick={() => router.back()}
          style={{
            fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 24, marginTop: 16,
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          }}
        >
          ← Indietro
        </button>

        <h1
          style={{
            fontFamily: "'Lora', Georgia, serif", fontWeight: 400,
            fontSize: 28, letterSpacing: '-0.02em', color: 'var(--color-ink)', marginBottom: 6,
          }}
        >
          Importa il tuo BMC
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 28 }}>
          Inserisci gli elementi del tuo Business Model Canvas, un elemento per riga.
        </p>

        {/* Opportunity name */}
        <div style={{ marginBottom: 28, maxWidth: 420 }}>
          <label style={{
            display: 'block', fontSize: 10, fontWeight: 500,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            color: 'var(--color-text-muted)', marginBottom: 6,
          }}>
            Nome dell'opportunità
          </label>
          <input
            value={opportunityName}
            onChange={(e) => setOpportunityName(e.target.value)}
            placeholder="es. Piattaforma SaaS B2B"
            style={{
              width: '100%', padding: '10px 14px', fontSize: 14,
              backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)',
              borderRadius: 8, color: 'var(--color-ink)', outline: 'none', boxSizing: 'border-box',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--color-amber)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
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
                padding: 16,
              }}
            >
              <label
                style={{
                  display: 'block', fontSize: 11, fontWeight: 500,
                  color: 'var(--color-ink)', marginBottom: 8,
                }}
              >
                {block.label}
              </label>
              <textarea
                value={blocks[block.key]}
                onChange={(e) =>
                  setBlocks((prev) => ({ ...prev, [block.key]: e.target.value }))
                }
                placeholder={block.placeholder}
                rows={4}
                style={{
                  width: '100%', padding: '8px 10px', fontSize: 12,
                  backgroundColor: 'var(--color-cream)', border: '0.5px solid var(--color-border)',
                  borderRadius: 6, color: 'var(--color-ink)', outline: 'none',
                  resize: 'vertical', lineHeight: '1.6', boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--color-amber)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleImport}
          disabled={!hasAnyData() || saving}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 24px', fontSize: 14, fontWeight: 500,
            backgroundColor: hasAnyData() && !saving ? 'var(--color-amber)' : 'var(--color-linen)',
            color: hasAnyData() && !saving ? '#FFFFFF' : 'var(--color-text-muted)',
            border: 'none', borderRadius: 10,
            cursor: hasAnyData() && !saving ? 'pointer' : 'default',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (hasAnyData() && !saving)
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#A8612A'
          }}
          onMouseLeave={(e) => {
            if (hasAnyData() && !saving)
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-amber)'
          }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
          Importa BMC
        </button>
      </div>
    </div>
  )
}
