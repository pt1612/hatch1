'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import TopNav from '@/components/TopNav'
import { Loader2, ChevronRight, CheckSquare, Square, Layers } from 'lucide-react'
import type { VPC, VPCAggregate } from '@/lib/types'
import { motion } from 'framer-motion'
import { useToast } from '@/components/ui/toast'
import { useI18n } from '@/lib/i18n/context'

interface Opportunity {
  id: string
  name: string
}

interface VPCDashboardClientProps {
  project: { id: string; title: string }
  opportunities: Opportunity[]
  vpcs: VPC[]
  aggregateLinks: VPCAggregate[]
}

function Badge({ label, variant }: { label: string; variant: 'ready' | 'missing' | 'aggregate' }) {
  const styles = {
    ready: {
      backgroundColor: 'rgba(76,175,125,0.10)',
      color: '#2D7A57',
      border: '0.5px solid rgba(76,175,125,0.20)',
    },
    missing: {
      backgroundColor: 'rgba(136,136,128,0.08)',
      color: 'var(--color-text-muted)',
      border: '0.5px solid var(--color-border)',
    },
    aggregate: {
      backgroundColor: 'rgba(199,123,58,0.10)',
      color: 'var(--color-amber)',
      border: '0.5px solid rgba(199,123,58,0.30)',
    },
  }
  return (
    <span
      style={{
        ...styles[variant],
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        padding: '2px 8px',
        borderRadius: 4,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}

export default function VPCDashboardClient({
  project,
  opportunities,
  vpcs,
  aggregateLinks,
}: VPCDashboardClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { t } = useI18n()

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [aggregating, setAggregating] = useState(false)

  const leafVpcs = vpcs.filter(v => !v.is_aggregate)
  const aggregateVpcs = vpcs.filter(v => v.is_aggregate)

  // Group leaf VPCs by opportunity
  const oppMap = new Map(opportunities.map(o => [o.id, o]))
  const vpcsByOpp = new Map<string, VPC[]>()
  const noOppVpcs: VPC[] = []

  for (const vpc of leafVpcs) {
    if (vpc.opportunity_id && oppMap.has(vpc.opportunity_id)) {
      const arr = vpcsByOpp.get(vpc.opportunity_id) ?? []
      arr.push(vpc)
      vpcsByOpp.set(vpc.opportunity_id, arr)
    } else {
      noOppVpcs.push(vpc)
    }
  }

  // Build source VPC name map for aggregates
  const vpcNameMap = new Map(vpcs.map(v => [v.id, v.name]))

  function toggleSelect(vpcId: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(vpcId)) next.delete(vpcId)
      else next.add(vpcId)
      return next
    })
  }

  function isReady(vpc: VPC) {
    return vpc.value_map !== null
  }

  async function handleAggregate() {
    if (selected.size < 2) return
    setAggregating(true)
    try {
      const res = await fetch('/api/aggregate-vpcs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project.id,
          source_vpc_ids: Array.from(selected),
        }),
      })
      if (!res.ok) throw new Error('Aggregation failed')
      setSelected(new Set())
      router.refresh()
      toast('Aggregate VPC created', 'success')
    } catch (err) {
      console.error(err)
      toast('Aggregation failed', 'error')
    } finally {
      setAggregating(false)
    }
  }

  const hasAnyVpc = vpcs.length > 0

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-cream)' }}>
      <TopNav projectId={project.id} projectTitle={project.title} />

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '88px 24px 60px' }}>
        {/* Header */}
        <div style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <h1
              style={{
                fontFamily: "'Lora', Georgia, serif",
                fontWeight: 400,
                fontSize: 28,
                color: 'var(--color-ink)',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              {t.vpcd_title}
            </h1>
          </div>

          {/* Aggregate button */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
            <button
              onClick={handleAggregate}
              disabled={selected.size < 2 || aggregating}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                cursor: selected.size >= 2 && !aggregating ? 'pointer' : 'not-allowed',
                border: '0.5px solid',
                transition: 'all 0.15s ease',
                backgroundColor: selected.size >= 2 && !aggregating ? 'var(--color-amber)' : 'var(--color-linen)',
                borderColor: selected.size >= 2 && !aggregating ? 'var(--color-amber)' : 'var(--color-border)',
                color: selected.size >= 2 && !aggregating ? '#FFFFFF' : 'var(--color-text-faint)',
              }}
            >
              {aggregating ? (
                <>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  {t.vpcd_generating_agg}
                </>
              ) : (
                <>
                  <Layers size={14} />
                  {t.vpcd_aggregate_btn}
                  {selected.size >= 2 && ` (${selected.size})`}
                </>
              )}
            </button>
            {selected.size < 2 && (
              <p style={{ fontSize: 11, color: 'var(--color-text-faint)', margin: 0 }}>
                {t.vpcd_select_hint}
              </p>
            )}
          </div>
        </div>

        {!hasAnyVpc ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: 40,
              borderRadius: 16,
              backgroundColor: '#FFFFFF',
              border: '0.5px solid var(--color-border)',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-ink)', marginBottom: 8 }}>
              {t.vpcd_no_vpcs}
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', maxWidth: 400, margin: '0 auto' }}>
              {t.vpcd_no_vpcs_hint}
            </p>
          </motion.div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
            {/* Section A — VPC per opportunità */}
            {(leafVpcs.length > 0) && (
              <section>
                <h2
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--color-text-muted)',
                    marginBottom: 16,
                    margin: '0 0 16px 0',
                  }}
                >
                  {t.vpcd_section_a}
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {/* Grouped by opportunity */}
                  {Array.from(vpcsByOpp.entries()).map(([oppId, oppVpcs]) => (
                    <div key={oppId}>
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: 'var(--color-ink)',
                          marginBottom: 8,
                          paddingBottom: 8,
                          borderBottom: '0.5px solid var(--color-border)',
                        }}
                      >
                        {oppMap.get(oppId)?.name ?? oppId}
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {oppVpcs.map(vpc => (
                          <VPCLeafRow
                            key={vpc.id}
                            vpc={vpc}
                            projectId={project.id}
                            isSelected={selected.has(vpc.id)}
                            onToggle={() => toggleSelect(vpc.id)}
                            isReady={isReady(vpc)}
                            t={t}
                          />
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* VPCs without opportunity */}
                  {noOppVpcs.length > 0 && (
                    <div>
                      {noOppVpcs.map(vpc => (
                        <VPCLeafRow
                          key={vpc.id}
                          vpc={vpc}
                          projectId={project.id}
                          isSelected={selected.has(vpc.id)}
                          onToggle={() => toggleSelect(vpc.id)}
                          isReady={isReady(vpc)}
                          t={t}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Section B — Aggregati */}
            <section>
              <h2
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--color-text-muted)',
                  margin: '0 0 16px 0',
                }}
              >
                {t.vpcd_section_b}
              </h2>

              {aggregateVpcs.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--color-text-faint)', fontStyle: 'italic' }}>
                  {t.vpcd_no_aggregates}
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {aggregateVpcs.map(vpc => {
                    const sources = aggregateLinks
                      .filter(al => al.aggregate_vpc_id === vpc.id)
                      .map(al => vpcNameMap.get(al.source_vpc_id) ?? al.source_vpc_id)
                    return (
                      <VPCAggregateRow
                        key={vpc.id}
                        vpc={vpc}
                        projectId={project.id}
                        sources={sources}
                        isSelected={selected.has(vpc.id)}
                        onToggle={() => toggleSelect(vpc.id)}
                        isReady={isReady(vpc)}
                        t={t}
                      />
                    )
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

function VPCLeafRow({
  vpc,
  projectId,
  isSelected,
  onToggle,
  isReady,
  t,
}: {
  vpc: VPC
  projectId: string
  isSelected: boolean
  onToggle: () => void
  isReady: boolean
  t: ReturnType<typeof useI18n>['t']
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        border: '0.5px solid var(--color-border)',
      }}
    >
      {/* Checkbox */}
      <button
        onClick={onToggle}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, color: isSelected ? 'var(--color-amber)' : 'var(--color-border)', display: 'flex' }}
        aria-label={isSelected ? 'Deselect' : 'Select'}
      >
        {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
      </button>

      {/* Name */}
      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--color-ink)' }}>
        {vpc.name}
      </span>

      {/* Badge */}
      <Badge
        label={isReady ? t.vpcd_badge_ready : t.vpcd_badge_missing_map}
        variant={isReady ? 'ready' : 'missing'}
      />

      {/* Date */}
      <span style={{ fontSize: 11, color: 'var(--color-text-faint)', whiteSpace: 'nowrap' }}>
        {new Date(vpc.created_at).toLocaleDateString()}
      </span>

      {/* Open link */}
      <Link
        href={`/project/${projectId}/vpcs/${vpc.id}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 12,
          color: 'var(--color-amber)',
          textDecoration: 'none',
          flexShrink: 0,
        }}
      >
        {t.vpcd_open}
        <ChevronRight size={14} />
      </Link>
    </motion.div>
  )
}

function VPCAggregateRow({
  vpc,
  projectId,
  sources,
  isSelected,
  onToggle,
  isReady,
  t,
}: {
  vpc: VPC
  projectId: string
  sources: string[]
  isSelected: boolean
  onToggle: () => void
  isReady: boolean
  t: ReturnType<typeof useI18n>['t']
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        border: '1.5px solid rgba(199,123,58,0.30)',
      }}
    >
      {/* Checkbox */}
      <button
        onClick={onToggle}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, color: isSelected ? 'var(--color-amber)' : 'var(--color-border)', display: 'flex' }}
        aria-label={isSelected ? 'Deselect' : 'Select'}
      >
        {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
      </button>

      {/* Name + sources */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-ink)', margin: '0 0 2px' }}>
          {vpc.name}
        </p>
        {sources.length > 0 && (
          <p style={{ fontSize: 11, color: 'var(--color-text-faint)', margin: 0 }}>
            {t.vpcd_sources}: {sources.join(' · ')}
          </p>
        )}
      </div>

      {/* Badges */}
      <Badge label={t.vpcd_badge_aggregate} variant="aggregate" />
      <Badge
        label={isReady ? t.vpcd_badge_ready : t.vpcd_badge_missing_map}
        variant={isReady ? 'ready' : 'missing'}
      />

      {/* Date */}
      <span style={{ fontSize: 11, color: 'var(--color-text-faint)', whiteSpace: 'nowrap' }}>
        {new Date(vpc.created_at).toLocaleDateString()}
      </span>

      {/* Open link */}
      <Link
        href={`/project/${projectId}/vpcs/${vpc.id}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 12,
          color: 'var(--color-amber)',
          textDecoration: 'none',
          flexShrink: 0,
        }}
      >
        {t.vpcd_open}
        <ChevronRight size={14} />
      </Link>
    </motion.div>
  )
}
