'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import TopNav from '@/components/TopNav'
import { Loader2, ChevronRight, CheckSquare, Square, Layers } from 'lucide-react'
import { motion } from 'framer-motion'
import { useToast } from '@/components/ui/toast'
import { useI18n } from '@/lib/i18n/context'

interface VPC {
  id: string
  customer_profile_name: string
  source_type: string
  customer_profile: { jobs?: string[]; pains?: string[]; gains?: string[] } | null
  value_map: { productsAndServices?: string[]; painRelievers?: string[]; gainCreators?: string[] } | null
  is_aggregate: boolean | null
  created_at: string
  interview_attachment?: { twin_name?: string | null; twin_segment?: string | null } | null
}

interface Opportunity {
  id: string
  name: string
}

interface VPCOpportunityLink {
  vpc_id: string
  opportunity_id: string
}

interface AggregateLink {
  aggregate_vpc_id: string
  source_vpc_id: string
}

interface VPCDashboardClientProps {
  project: { id: string; title: string }
  opportunities: Opportunity[]
  vpcs: VPC[]
  vpcOpportunities: VPCOpportunityLink[]
  aggregateLinks: AggregateLink[]
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

function vpcHasValueMap(vpc: VPC): boolean {
  const vm = vpc.value_map
  if (!vm) return false
  return (
    (Array.isArray(vm.productsAndServices) && vm.productsAndServices.length > 0) ||
    (Array.isArray(vm.painRelievers) && vm.painRelievers.length > 0) ||
    (Array.isArray(vm.gainCreators) && vm.gainCreators.length > 0)
  )
}

export default function VPCDashboardClient({
  project,
  opportunities,
  vpcs,
  vpcOpportunities,
  aggregateLinks,
}: VPCDashboardClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { t } = useI18n()

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [aggregating, setAggregating] = useState(false)

  const leafVpcs = vpcs.filter((v) => !v.is_aggregate)
  const aggregateVpcs = vpcs.filter((v) => v.is_aggregate)

  const oppMap = new Map(opportunities.map((o) => [o.id, o]))

  // Build vpc_id → opportunity names map from the junction table
  const vpcOppNames = new Map<string, string[]>()
  for (const link of vpcOpportunities) {
    const oppName = oppMap.get(link.opportunity_id)?.name
    if (!oppName) continue
    const arr = vpcOppNames.get(link.vpc_id) ?? []
    arr.push(oppName)
    vpcOppNames.set(link.vpc_id, arr)
  }

  // Build vpc_id → first opportunity id (for grouping)
  const vpcFirstOpp = new Map<string, string>()
  for (const link of vpcOpportunities) {
    if (!vpcFirstOpp.has(link.vpc_id)) {
      vpcFirstOpp.set(link.vpc_id, link.opportunity_id)
    }
  }

  // Group leaf VPCs by their first linked opportunity
  const vpcsByOpp = new Map<string, VPC[]>()
  const noOppVpcs: VPC[] = []
  for (const vpc of leafVpcs) {
    const oppId = vpcFirstOpp.get(vpc.id)
    if (oppId && oppMap.has(oppId)) {
      const arr = vpcsByOpp.get(oppId) ?? []
      arr.push(vpc)
      vpcsByOpp.set(oppId, arr)
    } else {
      noOppVpcs.push(vpc)
    }
  }

  // Map vpc id → display name for aggregate source listings
  const vpcNameMap = new Map(vpcs.map((v) => [v.id, v.customer_profile_name]))

  function toggleSelect(vpcId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(vpcId)) next.delete(vpcId)
      else next.add(vpcId)
      return next
    })
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
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const detail = data?.error ?? `HTTP ${res.status}`
        console.error('[VPCDashboard] aggregate-vpcs failed:', detail, data)
        toast(`Aggregation failed: ${detail}`, 'error')
        return
      }
      setSelected(new Set())
      router.refresh()
      toast('Aggregate VPC created', 'success')
    } catch (err) {
      console.error('[VPCDashboard] aggregate error:', err)
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
            {leafVpcs.length > 0 && (
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
                        {oppVpcs.map((vpc) => (
                          <VPCLeafRow
                            key={vpc.id}
                            vpc={vpc}
                            projectId={project.id}
                            opportunityNames={vpcOppNames.get(vpc.id) ?? []}
                            isSelected={selected.has(vpc.id)}
                            onToggle={() => toggleSelect(vpc.id)}
                            isReady={vpcHasValueMap(vpc)}
                            t={t}
                          />
                        ))}
                      </div>
                    </div>
                  ))}

                  {noOppVpcs.length > 0 && (
                    <div>
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: 'var(--color-text-muted)',
                          marginBottom: 8,
                          paddingBottom: 8,
                          borderBottom: '0.5px solid var(--color-border)',
                          fontStyle: 'italic',
                        }}
                      >
                        {t.vpcd_unassigned ?? 'Unassigned'}
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {noOppVpcs.map((vpc) => (
                          <VPCLeafRow
                            key={vpc.id}
                            vpc={vpc}
                            projectId={project.id}
                            opportunityNames={[]}
                            isSelected={selected.has(vpc.id)}
                            onToggle={() => toggleSelect(vpc.id)}
                            isReady={vpcHasValueMap(vpc)}
                            t={t}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

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
                  {aggregateVpcs.map((vpc) => {
                    const sources = aggregateLinks
                      .filter((al) => al.aggregate_vpc_id === vpc.id)
                      .map((al) => vpcNameMap.get(al.source_vpc_id) ?? al.source_vpc_id)
                    return (
                      <VPCAggregateRow
                        key={vpc.id}
                        vpc={vpc}
                        projectId={project.id}
                        sources={sources}
                        isSelected={selected.has(vpc.id)}
                        onToggle={() => toggleSelect(vpc.id)}
                        isReady={vpcHasValueMap(vpc)}
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
  opportunityNames,
  isSelected,
  onToggle,
  isReady,
  t,
}: {
  vpc: VPC
  projectId: string
  opportunityNames: string[]
  isSelected: boolean
  onToggle: () => void
  isReady: boolean
  t: ReturnType<typeof useI18n>['t']
}) {
  const twinName = vpc.interview_attachment?.twin_name ?? vpc.customer_profile_name
  const segment = vpc.interview_attachment?.twin_segment ?? null
  const subtitle = [
    segment,
    opportunityNames.length > 0 ? opportunityNames.join(' · ') : null,
  ]
    .filter(Boolean)
    .join(' — ')

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
      <button
        onClick={onToggle}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, color: isSelected ? 'var(--color-amber)' : 'var(--color-border)', display: 'flex' }}
        aria-label={isSelected ? 'Deselect' : 'Select'}
      >
        {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--color-ink)',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {twinName}
        </p>
        {subtitle && (
          <p
            style={{
              fontSize: 11,
              color: 'var(--color-text-muted)',
              margin: '2px 0 0 0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      <Badge
        label={isReady ? t.vpcd_badge_ready : t.vpcd_badge_missing_map}
        variant={isReady ? 'ready' : 'missing'}
      />

      <span style={{ fontSize: 11, color: 'var(--color-text-faint)', whiteSpace: 'nowrap' }}>
        {new Date(vpc.created_at).toLocaleDateString()}
      </span>

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
      <button
        onClick={onToggle}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, color: isSelected ? 'var(--color-amber)' : 'var(--color-border)', display: 'flex' }}
        aria-label={isSelected ? 'Deselect' : 'Select'}
      >
        {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)', margin: '0 0 2px' }}>
          {vpc.customer_profile_name}
        </p>
        {sources.length > 0 && (
          <p style={{ fontSize: 11, color: 'var(--color-text-faint)', margin: 0 }}>
            {t.vpcd_sources}: {sources.join(' · ')}
          </p>
        )}
      </div>

      <Badge label={t.vpcd_badge_aggregate} variant="aggregate" />
      <Badge
        label={isReady ? t.vpcd_badge_ready : t.vpcd_badge_missing_map}
        variant={isReady ? 'ready' : 'missing'}
      />

      <span style={{ fontSize: 11, color: 'var(--color-text-faint)', whiteSpace: 'nowrap' }}>
        {new Date(vpc.created_at).toLocaleDateString()}
      </span>

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
