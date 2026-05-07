'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import TopNav from '@/components/TopNav'
import { Loader2, Sparkles, ArrowRight } from 'lucide-react'

type VPCBlock = {
  key: string
  label: string
  side: 'left' | 'right'
  placeholder: string
}

const VPC_BLOCKS: VPCBlock[] = [
  { key: 'productsAndServices', label: 'Products & Services', side: 'left', placeholder: 'One item per line…' },
  { key: 'gainCreators',        label: 'Gain Creators',        side: 'left', placeholder: 'One item per line…' },
  { key: 'painRelievers',       label: 'Pain Relievers',       side: 'left', placeholder: 'One item per line…' },
  { key: 'jobs',                label: 'Customer Jobs',        side: 'right', placeholder: 'One item per line…' },
  { key: 'gains',               label: 'Gains',                side: 'right', placeholder: 'One item per line…' },
  { key: 'pains',               label: 'Pains',                side: 'right', placeholder: 'One item per line…' },
]

export default function ImportVPCPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const supabase = createClient()
  const [projectId, setProjectId] = useState<string | null>(null)
  const [blocks, setBlocks] = useState<Record<string, string>>({
    productsAndServices: '', gainCreators: '', painRelievers: '',
    jobs: '', gains: '', pains: '',
  })
  const [opportunityName, setOpportunityName] = useState('')
  const [saving, setSaving] = useState(false)
  const [filling, setFilling] = useState(false)

  useEffect(() => {
    params.then(({ id }) => setProjectId(id))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function parseLines(text: string): { text: string; twinIdx: number }[] {
    return text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((text) => ({ text, twinIdx: 0 }))
  }

  function hasAnyData(): boolean {
    return Object.values(blocks).some((v) => v.trim().length > 0)
  }

  function hasSomeGaps(): boolean {
    const filled = Object.values(blocks).filter((v) => v.trim().length > 0).length
    return filled > 0 && filled < VPC_BLOCKS.length
  }

  async function handleAIFill() {
    if (!hasSomeGaps() || filling || !projectId) return
    setFilling(true)
    try {
      const abilities = await supabase.from('abilities').select('name, description').eq('project_id', projectId)
      const existingVPCItems = {
        productsAndServices: parseLines(blocks.productsAndServices).map((i) => i.text),
        gainCreators:        parseLines(blocks.gainCreators).map((i) => i.text),
        painRelievers:       parseLines(blocks.painRelievers).map((i) => i.text),
      }
      const res = await fetch('/api/generate-vpc-value-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityName: opportunityName || 'Nuova opportunità',
          opportunityDescription: '',
          abilities: abilities.data ?? [],
          aggregatedPains: parseLines(blocks.pains).map((i) => i.text),
          aggregatedGains: parseLines(blocks.gains).map((i) => i.text),
          aggregatedJobs: parseLines(blocks.jobs).map((i) => i.text),
          twinProfile: { name: '', role: '', segment: '' },
          existingVPCItems,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const newBlocks = { ...blocks }
        // Only fill empty blocks
        const fill = (key: string, arr?: string[]) => {
          if (!blocks[key].trim() && arr?.length) {
            newBlocks[key] = arr.join('\n')
          }
        }
        fill('productsAndServices', data.productsAndServices)
        fill('gainCreators', data.gainCreators)
        fill('painRelievers', data.painRelievers)
        fill('jobs', data.jobs)
        fill('gains', data.gains)
        fill('pains', data.pains)
        setBlocks(newBlocks)
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
      // Create a placeholder opportunity
      const { data: opp, error: oppErr } = await supabase
        .from('opportunities')
        .insert({
          project_id: projectId,
          name: opportunityName.trim() || 'VPC importato',
          application: '',
          customer_segment: '',
          description: '',
          phase: 'abilities',
        })
        .select()
        .single()

      if (oppErr || !opp) { setSaving(false); return }

      // Build vpc_value_map in the FinalVPCItem[] format
      const vpcValueMap = {
        productsAndServices: parseLines(blocks.productsAndServices),
        gainCreators:        parseLines(blocks.gainCreators),
        painRelievers:       parseLines(blocks.painRelievers),
        jobs:                parseLines(blocks.jobs),
        gains:               parseLines(blocks.gains),
        pains:               parseLines(blocks.pains),
      }

      // Upsert twin_session with vpc_value_map
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
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: 'var(--color-cream)' }}>
        <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-amber)' }} />
      </div>
    )
  }

  const leftBlocks  = VPC_BLOCKS.filter((b) => b.side === 'left')
  const rightBlocks = VPC_BLOCKS.filter((b) => b.side === 'right')

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

        <div className="flex items-start justify-between mb-2">
          <div>
            <h1
              style={{
                fontFamily: "'Lora', Georgia, serif", fontWeight: 400,
                fontSize: 28, letterSpacing: '-0.02em', color: 'var(--color-ink)', marginBottom: 6,
              }}
            >
              Importa il tuo VPC
            </h1>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
              Inserisci gli elementi del tuo Value Proposition Canvas, un elemento per riga.
            </p>
          </div>
        </div>

        {/* Opportunity name */}
        <div style={{ marginBottom: 28, marginTop: 24, maxWidth: 420 }}>
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
            placeholder="es. Piattaforma B2B per PMI"
            style={{
              width: '100%', padding: '10px 14px', fontSize: 14,
              backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)',
              borderRadius: 8, color: 'var(--color-ink)', outline: 'none', boxSizing: 'border-box',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--color-amber)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
          />
        </div>

        {/* Two-column VPC grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
          {/* Left column: Value Proposition */}
          <div
            style={{
              backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)',
              borderRadius: 12, padding: 20,
            }}
          >
            <p style={{
              fontSize: 10, fontWeight: 500, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--color-amber)', marginBottom: 16,
            }}>
              Value Proposition
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {leftBlocks.map((block) => (
                <div key={block.key}>
                  <label style={{
                    display: 'block', fontSize: 11, fontWeight: 500,
                    color: 'var(--color-ink)', marginBottom: 5,
                  }}>
                    {block.label}
                  </label>
                  <textarea
                    value={blocks[block.key]}
                    onChange={(e) => setBlocks((prev) => ({ ...prev, [block.key]: e.target.value }))}
                    placeholder={block.placeholder}
                    rows={3}
                    style={{
                      width: '100%', padding: '8px 12px', fontSize: 13,
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
          </div>

          {/* Right column: Customer Profile */}
          <div
            style={{
              backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)',
              borderRadius: 12, padding: 20,
            }}
          >
            <p style={{
              fontSize: 10, fontWeight: 500, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginBottom: 16,
            }}>
              Customer Profile
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {rightBlocks.map((block) => (
                <div key={block.key}>
                  <label style={{
                    display: 'block', fontSize: 11, fontWeight: 500,
                    color: 'var(--color-ink)', marginBottom: 5,
                  }}>
                    {block.label}
                  </label>
                  <textarea
                    value={blocks[block.key]}
                    onChange={(e) => setBlocks((prev) => ({ ...prev, [block.key]: e.target.value }))}
                    placeholder={block.placeholder}
                    rows={3}
                    style={{
                      width: '100%', padding: '8px 12px', fontSize: 13,
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
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {hasSomeGaps() && (
            <button
              onClick={handleAIFill}
              disabled={filling || saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', fontSize: 13, fontWeight: 500,
                backgroundColor: '#FFFFFF', color: 'var(--color-amber)',
                border: '0.5px solid var(--color-amber)', borderRadius: 8,
                cursor: filling || saving ? 'default' : 'pointer',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!filling && !saving)
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-amber-bg)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#FFFFFF'
              }}
            >
              {filling ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Completa VPC con AI
            </button>
          )}

          <button
            onClick={handleImport}
            disabled={!hasAnyData() || saving || filling}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', fontSize: 13, fontWeight: 500,
              backgroundColor: hasAnyData() && !saving && !filling ? 'var(--color-amber)' : 'var(--color-linen)',
              color: hasAnyData() && !saving && !filling ? '#FFFFFF' : 'var(--color-text-muted)',
              border: 'none', borderRadius: 8,
              cursor: hasAnyData() && !saving && !filling ? 'pointer' : 'default',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (hasAnyData() && !saving && !filling)
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#A8612A'
            }}
            onMouseLeave={(e) => {
              if (hasAnyData() && !saving && !filling)
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-amber)'
            }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
            Importa VPC
          </button>
        </div>
      </div>
    </div>
  )
}
